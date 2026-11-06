"""コートの座標系（データの 位置X / 位置Y とメートルの対応）。

入力データの座標は、エンドライン（ベースライン）からの距離が x、コートの幅方向が y。
両チームとも同じハーフコートに記録されている。

下の換算値は、2P / 3P のラベルと 3P ライン（FIBA: 半径 6.75m、コーナーはサイドラインから 0.9m）が
一致するように、サンプルデータ（0923 鳴門渦潮 vs 鳥羽）から推定したもの。
記録ツールが変わって位置がずれる場合は、ここの値を調整する。
"""
from typing import Any, Dict

import numpy as np
import pandas as pd

# データ座標の 1m あたりの値
SCALE_X = 22.5   # エンドラインからの距離方向
SCALE_Y = 21.75  # コートの幅方向
# エンドラインの x、コート中央（リングの真正面）の y
BASELINE_X = 0.0
CENTER_Y = 173.0

# FIBA 規格（メートル）
COURT_WIDTH_M = 15.0
HALF_COURT_LENGTH_M = 14.0
BASKET_FROM_BASELINE_M = 1.575
THREE_POINT_RADIUS_M = 6.75
THREE_POINT_CORNER_M = 0.9       # コーナーの 3P ラインとサイドラインの距離
KEY_WIDTH_M = 4.9
FREE_THROW_LINE_M = 5.8          # エンドラインからフリースローラインまで
FREE_THROW_CIRCLE_RADIUS_M = 1.8
RESTRICTED_AREA_RADIUS_M = 1.25
BACKBOARD_FROM_BASELINE_M = 1.2
BACKBOARD_WIDTH_M = 1.8
RIM_RADIUS_M = 0.225
CENTER_CIRCLE_RADIUS_M = 1.8


def court_geometry() -> Dict[str, Any]:
    """フロントでコートを描くための換算値と寸法（models.CourtGeometry と同じ形）。"""
    return {
        "scale_x": SCALE_X,
        "scale_y": SCALE_Y,
        "baseline_x": BASELINE_X,
        "center_y": CENTER_Y,
        "court_width_m": COURT_WIDTH_M,
        "half_court_length_m": HALF_COURT_LENGTH_M,
        "basket_from_baseline_m": BASKET_FROM_BASELINE_M,
        "three_point_radius_m": THREE_POINT_RADIUS_M,
        "three_point_corner_m": THREE_POINT_CORNER_M,
        "key_width_m": KEY_WIDTH_M,
        "free_throw_line_m": FREE_THROW_LINE_M,
        "free_throw_circle_radius_m": FREE_THROW_CIRCLE_RADIUS_M,
        "restricted_area_radius_m": RESTRICTED_AREA_RADIUS_M,
        "backboard_from_baseline_m": BACKBOARD_FROM_BASELINE_M,
        "backboard_width_m": BACKBOARD_WIDTH_M,
        "rim_radius_m": RIM_RADIUS_M,
        "center_circle_radius_m": CENTER_CIRCLE_RADIUS_M,
    }


def shot_distance_m(x: pd.Series, y: pd.Series) -> pd.Series:
    """リング中心からの距離（m）。"""
    dx_m = (x - BASELINE_X) / SCALE_X - BASKET_FROM_BASELINE_M
    dy_m = (y - CENTER_Y) / SCALE_Y
    return pd.Series(np.hypot(dx_m, dy_m), index=x.index)
