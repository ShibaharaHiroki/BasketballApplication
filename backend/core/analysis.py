"""分析アルゴリズム。"""
from typing import Any, Dict, Optional

import pandas as pd

from core import aggregations, court, utils

# シュートチャートで返す列（models.ShotPoint と同じ）
SHOT_POINT_COLUMNS = [
    "game_id", "team", "jersey_number", "action", "quarter", "time_sec",
    "is_made", "area", "x", "y", "distance_m",
]

def zone_stats(located: pd.DataFrame) -> pd.DataFrame:
    """エリア（元データの エリア 列）ごとの成功率と、表示位置（シュート位置の平均）。"""
    if located.empty:
        return pd.DataFrame(columns=["area", "attempts", "made", "fg_pct", "x", "y"])
    df = located[located["area"].notna()].assign(made_flag=utils.as_bool(located["is_made"]).astype(int))
    zones = df.groupby("area").agg(
        attempts=("made_flag", "size"),
        made=("made_flag", "sum"),
        x=("x", "mean"),
        y=("y", "mean"),
    ).reset_index()
    zones["fg_pct"] = [utils.ratio(m, a) for m, a in zip(zones["made"], zones["attempts"])]
    return zones


def build_shot_chart(shots: pd.DataFrame) -> Dict[str, Any]:
    """シュートのイベント（is_shot の行）から、シュートチャートの点とエリア別集計を作る。

    点にするのは座標のあるフィールドゴール（2P / 3P）。座標が無いシュート（レイアップなど）の本数は
    summary.unlocated_attempts として返す（チャート上部の注記に使う）。
    """
    field_goals = shots[shots["shot_points"].isin([2, 3]).fillna(False).astype(bool)]
    located = field_goals[field_goals["x"].notna() & field_goals["y"].notna()].copy()
    located["distance_m"] = court.shot_distance_m(located["x"], located["y"]).round(2)

    return {
        "court": court.court_geometry(),
        "shots": utils.dataframe_to_records(located[SHOT_POINT_COLUMNS]),
        "zones": utils.dataframe_to_records(zone_stats(located)),
        "summary": {
            "located_attempts": len(located),
            "unlocated_attempts": len(field_goals) - len(located),
        },
    }


# ---------- 貢献度 ----------

MINUTES_BASE_SEC = 40 * 60  # 「/40MIN」の基準（40 分）


def _div(numerator: float, denominator: float, scale: float = 1.0) -> Optional[float]:
    """割り算（分母が 0 以下のときは None）。"""
    if denominator <= 0:
        return None
    return float(numerator) / float(denominator) * scale


def contribution_line(p: Dict[str, Any], team_totals: Dict[str, Any]) -> Dict[str, Any]:
    """ボックススコアの選手 1 人分の行とチーム合計から、貢献度の指標を計算する。

    AST% / TO% / USAGE RATE は Basketball-Reference の定義。% の指標は 100 倍した値。
    """
    sec = p["seconds_played"]
    team_sec = team_totals["seconds_played"]
    fga, fta, tov = p["fga"], p["fta"], p["tov"]
    team_possessions = team_totals["fga"] + 0.44 * team_totals["fta"] + team_totals["tov"]
    return {
        "jersey_number": p["jersey_number"],
        "ast_to": _div(p["ast"], tov),
        "ast_pct": _div(p["ast"], _div(sec, team_sec / 5) * team_totals["fgm"] - p["fgm"], 100)
        if team_sec > 0 and sec > 0 else None,
        "tov_per40": _div(tov * MINUTES_BASE_SEC, sec),
        "tov_pct": _div(tov, fga + 0.44 * fta + tov, 100),
        "ft_rate": _div(fta, fga, 100),
        "fg3a_rate": _div(p["fg3a"], fga),
        "ts_pct": _div(p["pts"], 2 * (fga + 0.44 * fta), 100),
        "usg_pct": _div((fga + 0.44 * fta + tov) * (team_sec / 5), sec * team_possessions, 100),
        "fga_per40": _div(fga * MINUTES_BASE_SEC, sec),
        "pts_per40": _div(p["pts"] * MINUTES_BASE_SEC, sec),
        "efg_pct": _div(p["fgm"] + 0.5 * p["fg3m"], fga, 100),
        "reb_per40": _div(p["reb"] * MINUTES_BASE_SEC, sec),
        # Game Score（Hollinger）
        "game_score": p["pts"] + 0.4 * p["fgm"] - 0.7 * fga - 0.4 * (fta - p["ftm"])
        + 0.7 * p["oreb"] + 0.3 * p["dreb"] + p["stl"] + 0.7 * p["ast"] + 0.7 * p["blk"]
        - 0.4 * p["pf"] - tov,
        # EFF（貢献度）
        "eff": p["pts"] + p["reb"] + p["ast"] + p["stl"] + p["blk"]
        - (fga - p["fgm"]) - (fta - p["ftm"]) - tov,
    }


def build_contribution(df_all: pd.DataFrame, jersey_number: Optional[str] = None, **filter_params: Any) -> Dict[str, Any]:
    """チームごとの選手の貢献度。models.EventFilter の内容を **kwargs で渡せる（shots_only は無視）。

    チームの数値（AST% / USAGE RATE に使う）は背番号で絞らずに計算し、表示する選手だけを背番号で絞る。
    背番号不明（?番）の記録は選手ではないため含めない。
    """
    box = aggregations.build_box_score(df_all, **filter_params)
    teams = []
    for t in box["teams"]:
        players = [
            p for p in t["players"]
            if p["jersey_number"] is not None and (jersey_number is None or p["jersey_number"] == jersey_number)
        ]
        teams.append({"team": t["team"], "players": [contribution_line(p, t["totals"]) for p in players]})
    return {"teams": teams}
