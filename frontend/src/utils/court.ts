// コートの描画と座標変換。
// 描画はメートル単位の座標系で行う:
//   横軸 u = コート中央からの横方向の距離（m、-7.5〜7.5）
//   縦軸 v = エンドラインからの距離（m、0〜14）。リングは画面の下側
import type { Shape } from 'plotly.js';
import { CourtGeometry } from '../types';

export const COURT_LINE_COLOR = '#8a8984';

export interface CourtPoint {
  u: number;
  v: number;
}

/** データの 位置X / 位置Y をメートル座標に変換する */
export const toCourtMeters = (court: CourtGeometry, x: number, y: number): CourtPoint => ({
  u: (y - court.center_y) / court.scale_y,
  v: (x - court.baseline_x) / court.scale_x,
});

/** 中心 (cu, cv)・半径 r の円弧を、角度 from〜to（ラジアン、0 = 右方向・反時計回り）で点列にする */
const arcPoints = (cu: number, cv: number, r: number, from: number, to: number, steps = 48): CourtPoint[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / steps;
    return { u: cu + r * Math.cos(t), v: cv + r * Math.sin(t) };
  });

const toPath = (points: CourtPoint[]): string =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.u.toFixed(3)},${p.v.toFixed(3)}`).join(' ');

/** FIBA 規格のハーフコートのライン（Plotly の shapes） */
export const buildCourtShapes = (court: CourtGeometry): Partial<Shape>[] => {
  const halfW = court.court_width_m / 2;
  const basketV = court.basket_from_baseline_m;
  const r3 = court.three_point_radius_m;
  const cornerU = halfW - court.three_point_corner_m;
  // コーナーの直線と円弧がつながる角度・高さ
  const theta = Math.acos(cornerU / r3);
  const cornerTopV = basketV + r3 * Math.sin(theta);
  const keyHalf = court.key_width_m / 2;
  const line = { color: COURT_LINE_COLOR, width: 1.5 };

  const path = (points: CourtPoint[]): Partial<Shape> => ({ type: 'path', path: toPath(points), line, layer: 'below' });
  const rect = (u0: number, v0: number, u1: number, v1: number): Partial<Shape> => ({
    type: 'rect', x0: u0, y0: v0, x1: u1, y1: v1, line, layer: 'below',
  });
  const circle = (cu: number, cv: number, r: number): Partial<Shape> => ({
    type: 'circle', x0: cu - r, y0: cv - r, x1: cu + r, y1: cv + r, line, layer: 'below',
  });

  return [
    // 外枠（エンドライン・サイドライン・センターライン）
    rect(-halfW, 0, halfW, court.half_court_length_m),
    // 制限区域とフリースローサークル
    rect(-keyHalf, 0, keyHalf, court.free_throw_line_m),
    circle(0, court.free_throw_line_m, court.free_throw_circle_radius_m),
    // 3P ライン（コーナーの直線 + 円弧）
    path([{ u: -cornerU, v: 0 }, { u: -cornerU, v: cornerTopV }]),
    path([{ u: cornerU, v: 0 }, { u: cornerU, v: cornerTopV }]),
    path(arcPoints(0, basketV, r3, theta, Math.PI - theta)),
    // ノーチャージセミサークル
    path(arcPoints(0, basketV, court.restricted_area_radius_m, 0, Math.PI, 24)),
    // バックボードとリング
    path([
      { u: -court.backboard_width_m / 2, v: court.backboard_from_baseline_m },
      { u: court.backboard_width_m / 2, v: court.backboard_from_baseline_m },
    ]),
    circle(0, basketV, court.rim_radius_m),
    // センターサークル（ハーフコート側の半分）
    path(arcPoints(0, court.half_court_length_m, court.center_circle_radius_m, Math.PI, 2 * Math.PI, 24)),
  ];
};

/** コートを縦横同じ縮尺で表示するための軸設定 */
export const courtAxes = (court: CourtGeometry, margin = 0.3) => ({
  xaxis: {
    range: [-court.court_width_m / 2 - margin, court.court_width_m / 2 + margin],
    visible: false,
    fixedrange: true,
  },
  yaxis: {
    range: [-margin, court.half_court_length_m + margin],
    visible: false,
    fixedrange: true,
    scaleanchor: 'x' as const,
    scaleratio: 1,
  },
});
