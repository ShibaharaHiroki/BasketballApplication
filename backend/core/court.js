/**
 * コートの座標系（データの 位置X / 位置Y とメートルの対応）。
 *
 * 入力データの座標は、エンドライン（ベースライン）からの距離が x、コートの幅方向が y。
 * 両チームとも同じハーフコートに記録されている。
 *
 * 下の換算値は、2P / 3P のラベルと 3P ライン（FIBA: 半径 6.75m、コーナーはサイドラインから 0.9m）が
 * 一致するように、サンプルデータ（0923 鳴門渦潮 vs 鳥羽）から推定したもの。
 * 記録ツールが変わって位置がずれる場合は、ここの値を調整する。
 */

// データ座標の 1m あたりの値
const SCALE_X = 22.5; // エンドラインからの距離方向
const SCALE_Y = 21.75; // コートの幅方向
// エンドラインの x、コート中央（リングの真正面）の y
const BASELINE_X = 0.0;
const CENTER_Y = 173.0;

// FIBA 規格（メートル）
const BASKET_FROM_BASELINE_M = 1.575;

/** フロントでコートを描くための換算値と寸法。 */
export function courtGeometry() {
  return {
    scale_x: SCALE_X,
    scale_y: SCALE_Y,
    baseline_x: BASELINE_X,
    center_y: CENTER_Y,
    court_width_m: 15.0,
    half_court_length_m: 14.0,
    basket_from_baseline_m: BASKET_FROM_BASELINE_M,
    three_point_radius_m: 6.75,
    three_point_corner_m: 0.9, // コーナーの 3P ラインとサイドラインの距離
    key_width_m: 4.9,
    free_throw_line_m: 5.8, // エンドラインからフリースローラインまで
    free_throw_circle_radius_m: 1.8,
    restricted_area_radius_m: 1.25,
    backboard_from_baseline_m: 1.2,
    backboard_width_m: 1.8,
    rim_radius_m: 0.225,
    center_circle_radius_m: 1.8,
  };
}

/** リング中心からの距離（m）。 */
export function shotDistanceM(x, y) {
  const dxM = (x - BASELINE_X) / SCALE_X - BASKET_FROM_BASELINE_M;
  const dyM = (y - CENTER_Y) / SCALE_Y;
  return Math.hypot(dxM, dyM);
}
