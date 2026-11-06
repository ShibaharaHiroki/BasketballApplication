"""データの読み込みと前処理。

入力フォルダ（DATA_DIR）にあるプレーバイプレーの CSV / Excel を読み込み、
列名を英語の snake_case にそろえた 1 つの DataFrame にまとめる。

汎用部品（他のデータ形式でも使える）:
    read_table        CSV / Excel を文字コード自動判定で読む
    normalize_text    全角→半角・前後の空白除去
    rename_columns    列名の別名を内部名に置き換え、必須列を確認する
プレーバイプレー固有:
    preprocess        上の部品を組み合わせた前処理
    classify_shot     アクション名からシュート情報を判定する
"""
import os
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pandas as pd

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_DIR = "data/input"

SUPPORTED_EXTENSIONS = (".csv", ".xlsx", ".xlsm")
# 先頭から順に試す。cp932 は Shift_JIS の上位互換（Excel で保存した日本語 CSV の多く）
CSV_ENCODINGS = ("utf-8-sig", "cp932", "utf-16")

# 元データの列名（NFKC 正規化・空白除去後）→ 内部の列名
COLUMN_ALIASES: Dict[str, str] = {
    "試合ID": "game_id",
    "チーム": "team",
    "背番号": "jersey_number",
    "アクション": "action",
    "エリア": "area",
    "位置X": "x",
    "位置Y": "y",
    "クォーター": "quarter",
    "時刻[sec]": "time_sec",
}

# 座標・エリアが無いことを表す値
MISSING_VALUE = -1

SHOT_PATTERNS: List[Tuple[re.Pattern, int]] = [
    (re.compile(r"^3ポイント(成功|失敗)$"), 3),
    (re.compile(r"^2ポイント(成功|失敗)$"), 2),
    (re.compile(r"^(左|右)?レイアップ(成功|失敗)$"), 2),
    (re.compile(r"^フリースロー(成功|失敗)$"), 1),
]


@dataclass
class LoadedFile:
    file_name: str
    file_format: str
    encoding: Optional[str]
    row_count: int
    game_ids: List[str]
    warnings: List[str] = field(default_factory=list)


# ---------- 入力フォルダ ----------

def get_data_dir() -> str:
    data_dir = os.getenv("DATA_DIR", DEFAULT_DATA_DIR)
    if not os.path.isabs(data_dir):
        data_dir = os.path.join(BACKEND_DIR, data_dir)
    return os.path.normpath(data_dir)


def list_data_files() -> List[Dict]:
    """入力フォルダ内の対応ファイル一覧（Excel の一時ファイル ~$ は除く）。"""
    data_dir = get_data_dir()
    if not os.path.isdir(data_dir):
        return []
    files = []
    for name in sorted(os.listdir(data_dir)):
        path = os.path.join(data_dir, name)
        if name.startswith("~$") or not os.path.isfile(path):
            continue
        if not name.lower().endswith(SUPPORTED_EXTENSIONS):
            continue
        stat = os.stat(path)
        files.append({
            "file_name": name,
            "size_bytes": stat.st_size,
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
        })
    return files


# ---------- 汎用部品 ----------

def normalize_text(value: object) -> object:
    """全角英数字を半角にし、前後の空白・タブを除く。文字列以外はそのまま返す。"""
    if not isinstance(value, str):
        return value
    return unicodedata.normalize("NFKC", value).strip()


def read_table(path: str) -> Tuple[pd.DataFrame, str, Optional[str]]:
    """CSV / Excel をすべて文字列として読む。(DataFrame, 形式, CSV の文字コード) を返す。"""
    ext = os.path.splitext(path)[1].lower()
    if ext != ".csv":
        return pd.read_excel(path, dtype=str, keep_default_na=False), "xlsx", None

    last_error: Optional[Exception] = None
    for encoding in CSV_ENCODINGS:
        try:
            return pd.read_csv(path, dtype=str, encoding=encoding, keep_default_na=False), "csv", encoding
        except (UnicodeDecodeError, UnicodeError) as e:
            last_error = e
    raise ValueError(f"文字コードを判定できませんでした（{', '.join(CSV_ENCODINGS)} を試行）: {last_error}")


def rename_columns(raw: pd.DataFrame, aliases: Dict[str, str], source: str) -> pd.DataFrame:
    """列名を正規化してから aliases で内部名に置き換え、aliases にある列だけを残す。"""
    raw = raw.rename(columns=lambda c: normalize_text(str(c)))
    missing = [name for name in aliases if name not in raw.columns]
    if missing:
        raise ValueError(f"{source}: 必要な列がありません: {', '.join(missing)}")
    return raw[list(aliases)].rename(columns=aliases)


# ---------- プレーバイプレー固有 ----------

def classify_shot(action: str) -> Tuple[bool, Optional[int], Optional[bool]]:
    """アクション名から (シュートか, 得点の種類, 成功したか) を返す。"""
    for pattern, points in SHOT_PATTERNS:
        if pattern.match(action):
            return True, points, action.endswith("成功")
    return False, None, None


def preprocess(raw: pd.DataFrame, file_name: str) -> Tuple[pd.DataFrame, List[str]]:
    warnings: List[str] = []

    df = rename_columns(raw, COLUMN_ALIASES, file_name)
    df = df.apply(lambda s: s.map(normalize_text))
    df = df[df["action"] != ""].copy()

    df["jersey_number"] = df["jersey_number"].str.replace("番", "", regex=False)
    df.loc[~df["jersey_number"].str.fullmatch(r"\d+"), "jersey_number"] = None

    for col in ("area", "x", "y", "quarter", "time_sec"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ("area", "x", "y"):
        df.loc[df[col] == MISSING_VALUE, col] = None

    invalid = df["quarter"].isna() | df["time_sec"].isna()
    if invalid.any():
        warnings.append(f"{file_name}: クォーターまたは時刻が読めない {int(invalid.sum())} 行を除外しました")
        df = df[~invalid]

    df["area"] = df["area"].astype("Int64")
    df["quarter"] = df["quarter"].astype(int)
    df["time_sec"] = df["time_sec"].astype(int)

    shots = df["action"].map(classify_shot)
    df["is_shot"] = shots.map(lambda t: t[0])
    df["shot_points"] = shots.map(lambda t: t[1]).astype("Int64")
    df["is_made"] = shots.map(lambda t: t[2]).astype("boolean")
    df["source_file"] = file_name

    return df.reset_index(drop=True), warnings


def load_files(file_names: Optional[List[str]] = None) -> Tuple[pd.DataFrame, List[LoadedFile]]:
    """指定したファイル（None ならフォルダ内すべて）を読み込んで結合する。"""
    data_dir = get_data_dir()
    available = [f["file_name"] for f in list_data_files()]
    if file_names is None:
        targets = available
    else:
        unknown = [n for n in file_names if n not in available]
        if unknown:
            raise FileNotFoundError(f"入力フォルダにないファイルです: {', '.join(unknown)}")
        targets = file_names
    if not targets:
        raise FileNotFoundError(f"入力フォルダに読み込めるファイルがありません: {data_dir}")

    frames: List[pd.DataFrame] = []
    loaded: List[LoadedFile] = []
    for name in targets:
        raw, file_format, encoding = read_table(os.path.join(data_dir, name))
        df, warnings = preprocess(raw, name)
        frames.append(df)
        loaded.append(LoadedFile(
            file_name=name,
            file_format=file_format,
            encoding=encoding,
            row_count=len(df),
            game_ids=sorted(df["game_id"].unique().tolist()),
            warnings=warnings,
        ))

    # 同じ試合が複数ファイルに入っていると二重に集計されるため警告する
    files_by_game: Dict[str, List[str]] = {}
    for f in loaded:
        for game_id in f.game_ids:
            files_by_game.setdefault(game_id, []).append(f.file_name)
    for game_id, names in files_by_game.items():
        if len(names) > 1:
            loaded[-1].warnings.append(f"試合ID {game_id} が複数のファイルに含まれています: {', '.join(names)}")

    return pd.concat(frames, ignore_index=True), loaded
