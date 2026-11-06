"""集計処理。"""
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from core import filters, utils

# ---------- 汎用の集計 ----------


def unique_sorted(df: pd.DataFrame, column: str) -> List[Any]:
    """欠損を除いた一意な値を昇順で返す。"""
    return sorted(df[column].dropna().unique().tolist())


def summarize_events(df: pd.DataFrame) -> Dict[str, Any]:
    """読み込んだイベント全体の概要。"""
    return {
        "total_rows": len(df),
        "game_ids": unique_sorted(df, "game_id"),
        "teams": unique_sorted(df, "team"),
        "quarters": [int(q) for q in unique_sorted(df, "quarter")],
        "players": list_players(df),
    }


def list_players(df: pd.DataFrame) -> List[Dict[str, str]]:
    """記録に出てくる選手（チーム・背番号）。チーム名、背番号の数値順。"""
    pairs = df[df["jersey_number"].notna()][["team", "jersey_number"]].drop_duplicates()
    pairs = pairs.assign(_n=pairs["jersey_number"].astype(int)).sort_values(["team", "_n"])
    return [{"team": t, "jersey_number": j} for t, j in zip(pairs["team"], pairs["jersey_number"])]


# ---------- 試合時間 ----------

REGULATION_QUARTERS = 4
QUARTER_SEC = 600   # 高校・FIBA: 1 クォーター 10 分
OVERTIME_SEC = 300  # 延長: 5 分


def quarter_start_sec(quarter: int) -> int:
    if quarter <= REGULATION_QUARTERS:
        return (quarter - 1) * QUARTER_SEC
    return REGULATION_QUARTERS * QUARTER_SEC + (quarter - REGULATION_QUARTERS - 1) * OVERTIME_SEC


def quarter_length_sec(quarter: int) -> int:
    return QUARTER_SEC if quarter <= REGULATION_QUARTERS else OVERTIME_SEC


def game_clock_sec(df: pd.DataFrame) -> pd.Series:
    """試合開始からの経過秒（time_sec はクォーター内の経過秒）。"""
    return df["quarter"].map(quarter_start_sec) + df["time_sec"]


# ---------- 出場時間（選手交代から計算） ----------

SUB_IN_ACTION = "選手交代(出)"   # コートに出る
SUB_OUT_ACTION = "選手交代(戻)"  # ベンチに戻る

PlayerKey = Tuple[str, str]  # (チーム, 背番号)
Interval = Tuple[int, int]   # (開始秒, 終了秒)


def on_court_intervals(game_df: pd.DataFrame) -> Dict[PlayerKey, List[Interval]]:
    """1 試合分のイベントから、選手ごとのコートにいた時間帯を求める。

    最初の交代が「戻」の選手、または交代せずに記録がある選手を先発とみなす。
    """
    game_end = quarter_start_sec(int(game_df["quarter"].max())) + quarter_length_sec(int(game_df["quarter"].max()))
    clock = game_clock_sec(game_df)
    intervals: Dict[PlayerKey, List[Interval]] = {}

    players = game_df[game_df["jersey_number"].notna()]
    for (team, jersey), g in players.groupby(["team", "jersey_number"], sort=False):
        subs = g[g["action"].isin([SUB_IN_ACTION, SUB_OUT_ACTION])]
        is_starter = subs.empty or subs["action"].iloc[0] == SUB_OUT_ACTION
        on_since: Optional[int] = 0 if is_starter else None
        result: List[Interval] = []
        for idx, action in subs["action"].items():
            t = int(clock[idx])
            if action == SUB_IN_ACTION and on_since is None:
                on_since = t
            elif action == SUB_OUT_ACTION and on_since is not None:
                result.append((on_since, t))
                on_since = None
        if on_since is not None:
            result.append((on_since, game_end))
        intervals[(team, jersey)] = result
    return intervals


def overlap_sec(intervals: List[Interval], window: Optional[Interval]) -> int:
    if window is None:
        return sum(end - start for start, end in intervals)
    lo, hi = window
    return sum(max(0, min(end, hi) - max(start, lo)) for start, end in intervals)


# ---------- ボックススコア ----------

# アクション名 → スタッツ（NFKC 正規化後のアクション名に対して判定）
STAT_ACTION_PATTERNS: Dict[str, re.Pattern] = {
    "oreb": re.compile(r"^オフェンスリバウンド$"),
    "dreb": re.compile(r"^ディフェンスリバウンド$"),
    "ast": re.compile(r"^アシスト$"),
    "stl": re.compile(r"^スティール$"),
    "blk": re.compile(r"^ブロック$"),
    "tov": re.compile(r"^ターンオーバー$"),
    "pf": re.compile(r"ファウル"),
}


def count_actions(df: pd.DataFrame, pattern: re.Pattern) -> int:
    return sum(1 for action in df["action"] if pattern.search(action))


def stat_line(df: pd.DataFrame) -> Dict[str, Any]:
    """イベントの集合（選手 1 人分でもチーム全体でもよい）から 1 行分のスタッツを作る。"""
    shots = df[df["is_shot"]]
    made = utils.as_bool(shots["is_made"])
    points = shots["shot_points"]
    is_fg = points.isin([2, 3]).fillna(False).astype(bool)
    is_3 = points.eq(3).fillna(False).astype(bool)
    is_ft = points.eq(1).fillna(False).astype(bool)

    fgm, fga = int((is_fg & made).sum()), int(is_fg.sum())
    fg3m, fg3a = int((is_3 & made).sum()), int(is_3.sum())
    ftm, fta = int((is_ft & made).sum()), int(is_ft.sum())

    line: Dict[str, Any] = {
        "pts": (fgm - fg3m) * 2 + fg3m * 3 + ftm,
        "fgm": fgm, "fga": fga, "fg_pct": utils.ratio(fgm, fga),
        "fg3m": fg3m, "fg3a": fg3a, "fg3_pct": utils.ratio(fg3m, fg3a),
        "ftm": ftm, "fta": fta, "ft_pct": utils.ratio(ftm, fta),
    }
    for key, pattern in STAT_ACTION_PATTERNS.items():
        line[key] = count_actions(df, pattern)
    line["reb"] = line["oreb"] + line["dreb"]
    return line


def has_any_stat(line: Dict[str, Any]) -> bool:
    return any(line[k] for k in ("pts", "fga", "fta", "reb", "ast", "stl", "blk", "tov", "pf"))


def line_score(team_df: pd.DataFrame, quarters: List[int]) -> List[Dict[str, int]]:
    """クォーターごとの得点。"""
    made = team_df[team_df["is_shot"] & utils.as_bool(team_df["is_made"])]
    by_quarter = made.groupby("quarter")["shot_points"].sum()
    return [{"quarter": q, "points": int(by_quarter.get(q, 0))} for q in quarters]


def build_box_score(
    df_all: pd.DataFrame,
    game_id: Optional[str] = None,
    team: Optional[str] = None,
    quarter: Optional[int] = None,
    jersey_number: Optional[str] = None,
    **_: Any,
) -> Dict[str, Any]:
    """チームごとのボックススコア。models.EventFilter の内容を **kwargs で渡せる（shots_only は無視）。

    出場時間は、クォーターで絞る前の試合全体の交代記録から求め、指定クォーターと重なる分を数える。
    """
    games_df = filters.filter_events(df_all, game_id=game_id)
    filtered = filters.filter_events(df_all, game_id=game_id, team=team, quarter=quarter, jersey_number=jersey_number)

    window = None
    if quarter is not None:
        window = (quarter_start_sec(quarter), quarter_start_sec(quarter) + quarter_length_sec(quarter))
    seconds: Dict[PlayerKey, int] = defaultdict(int)
    starters: set = set()
    for _, game_df in games_df.groupby("game_id"):
        for key, intervals in on_court_intervals(game_df).items():
            seconds[key] += overlap_sec(intervals, window)
            if intervals and intervals[0][0] == 0:
                starters.add(key)

    quarters = [quarter] if quarter is not None else [int(q) for q in unique_sorted(games_df, "quarter")]
    teams = [team] if team is not None else unique_sorted(games_df, "team")

    result = []
    for team_name in teams:
        team_df = filtered[filtered["team"] == team_name]

        jerseys = set(team_df["jersey_number"].dropna())
        if jersey_number is None:
            jerseys |= {j for (t, j), sec in seconds.items() if t == team_name and sec > 0}
        players = []
        for jersey in jerseys:
            players.append({
                "jersey_number": jersey,
                "is_starter": (team_name, jersey) in starters,
                "seconds_played": seconds.get((team_name, jersey), 0),
                **stat_line(team_df[team_df["jersey_number"] == jersey]),
            })
        players.sort(key=lambda p: (not p["is_starter"], int(p["jersey_number"])))

        # 背番号不明（?番）の記録はチームの行にまとめる
        unknown = stat_line(team_df[team_df["jersey_number"].isna()])
        if jersey_number is None and has_any_stat(unknown):
            players.append({"jersey_number": None, "is_starter": False, "seconds_played": 0, **unknown})

        result.append({
            "team": team_name,
            "players": players,
            "totals": {"seconds_played": sum(p["seconds_played"] for p in players), **stat_line(team_df)},
            "line_score": line_score(team_df, quarters),
        })

    return {"game_ids": unique_sorted(games_df, "game_id"), "quarters": quarters, "teams": result}
