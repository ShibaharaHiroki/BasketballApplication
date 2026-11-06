"""イベント DataFrame の絞り込み。どの分析・集計 API からも同じ条件で使う。"""
from typing import Optional

import pandas as pd


def filter_events(
    df: pd.DataFrame,
    game_id: Optional[str] = None,
    team: Optional[str] = None,
    quarter: Optional[int] = None,
    jersey_number: Optional[str] = None,
    shots_only: bool = False,
) -> pd.DataFrame:
    """None の条件は無視する。models.EventFilter の内容を **kwargs で渡せる。"""
    mask = pd.Series(True, index=df.index)
    if game_id is not None:
        mask &= df["game_id"] == game_id
    if team is not None:
        mask &= df["team"] == team
    if quarter is not None:
        mask &= df["quarter"] == quarter
    if jersey_number is not None:
        mask &= df["jersey_number"] == jersey_number
    if shots_only:
        mask &= df["is_shot"]
    return df[mask]
