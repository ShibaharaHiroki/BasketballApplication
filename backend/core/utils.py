"""core/ の共通ユーティリティ。"""
from typing import Any, Dict, List, Optional

import pandas as pd


def dataframe_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """pandas の欠損（NaN / pd.NA）を None にしてレコードのリストにする（Pydantic にそのまま渡せる）。"""
    return df.astype(object).where(df.notna(), None).to_dict(orient="records")


def paginate(df: pd.DataFrame, offset: int, limit: int) -> pd.DataFrame:
    return df.iloc[offset:offset + limit]


def ratio(numerator: float, denominator: float) -> Optional[float]:
    """割合（0〜1）。分母が 0 のときは None（「-」と表示する想定）。"""
    if not denominator:
        return None
    return float(numerator) / float(denominator)


def as_bool(series: pd.Series) -> pd.Series:
    """nullable な boolean（pd.NA を含む）を、NA を False とみなした bool にする。"""
    return series.fillna(False).astype(bool)
