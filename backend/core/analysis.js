/** 分析アルゴリズム。 */
import { buildBoxScore } from './aggregations.js';
import { courtGeometry, shotDistanceM } from './court.js';
import { compareAsc, ratio } from './utils.js';

/** エリア（元データの エリア 列）ごとの成功率と、表示位置（シュート位置の平均）。 */
function zoneStats(located) {
  const byArea = new Map();
  for (const shot of located) {
    if (shot.area === null) continue;
    if (!byArea.has(shot.area)) byArea.set(shot.area, { attempts: 0, made: 0, sumX: 0, sumY: 0 });
    const zone = byArea.get(shot.area);
    zone.attempts++;
    if (shot.is_made) zone.made++;
    zone.sumX += shot.x;
    zone.sumY += shot.y;
  }
  return [...byArea.entries()]
    .sort(([a], [b]) => compareAsc(a, b))
    .map(([area, { attempts, made, sumX, sumY }]) => ({
      area,
      attempts,
      made,
      fg_pct: ratio(made, attempts),
      x: sumX / attempts,
      y: sumY / attempts,
    }));
}

/**
 * シュートのイベント（is_shot の行）から、シュートチャートの点とエリア別集計を作る。
 *
 * 点にするのは座標のあるフィールドゴール（2P / 3P）。座標が無いシュート（レイアップなど）の本数は
 * summary.unlocated_attempts として返す（チャート上部の注記に使う）。
 */
export function buildShotChart(shots) {
  const fieldGoals = shots.filter((e) => e.shot_points === 2 || e.shot_points === 3);
  const located = fieldGoals.filter((e) => e.x !== null && e.y !== null);

  return {
    court: courtGeometry(),
    shots: located.map((e) => ({
      game_id: e.game_id,
      team: e.team,
      jersey_number: e.jersey_number,
      action: e.action,
      quarter: e.quarter,
      time_sec: e.time_sec,
      is_made: e.is_made,
      area: e.area,
      x: e.x,
      y: e.y,
      distance_m: Math.round(shotDistanceM(e.x, e.y) * 100) / 100,
    })),
    zones: zoneStats(located),
    summary: {
      located_attempts: located.length,
      unlocated_attempts: fieldGoals.length - located.length,
    },
  };
}

// ---------- 貢献度 ----------

const MINUTES_BASE_SEC = 40 * 60; // 「/40MIN」の基準（40 分）

/** 割り算（分母が 0 以下のときは null）。 */
function div(numerator, denominator, scale = 1.0) {
  if (denominator <= 0) return null;
  return (numerator / denominator) * scale;
}

/**
 * ボックススコアの選手 1 人分の行とチーム合計から、貢献度の指標を計算する。
 *
 * AST% / TO% / USAGE RATE は Basketball-Reference の定義。% の指標は 100 倍した値。
 * 分母が 0 の指標は null。
 */
function contributionLine(p, teamTotals) {
  const sec = p.seconds_played;
  const teamSec = teamTotals.seconds_played;
  const { fga, fta, tov } = p;
  const teamPossessions = teamTotals.fga + 0.44 * teamTotals.fta + teamTotals.tov;
  return {
    jersey_number: p.jersey_number,
    ast_to: div(p.ast, tov),
    ast_pct: teamSec > 0 && sec > 0 ? div(p.ast, div(sec, teamSec / 5) * teamTotals.fgm - p.fgm, 100) : null,
    tov_per40: div(tov * MINUTES_BASE_SEC, sec),
    tov_pct: div(tov, fga + 0.44 * fta + tov, 100),
    ft_rate: div(fta, fga, 100), // FT Set（FTA / FGA × 100）
    fg3a_rate: div(p.fg3a, fga), // 3PA / FGA
    ts_pct: div(p.pts, 2 * (fga + 0.44 * fta), 100),
    usg_pct: div((fga + 0.44 * fta + tov) * (teamSec / 5), sec * teamPossessions, 100),
    fga_per40: div(fga * MINUTES_BASE_SEC, sec),
    pts_per40: div(p.pts * MINUTES_BASE_SEC, sec),
    efg_pct: div(p.fgm + 0.5 * p.fg3m, fga, 100),
    reb_per40: div(p.reb * MINUTES_BASE_SEC, sec),
    // Game Score（Hollinger）
    game_score:
      p.pts + 0.4 * p.fgm - 0.7 * fga - 0.4 * (fta - p.ftm) + 0.7 * p.oreb + 0.3 * p.dreb + p.stl + 0.7 * p.ast +
      0.7 * p.blk - 0.4 * p.pf - tov,
    // EFF（貢献度）
    eff: p.pts + p.reb + p.ast + p.stl + p.blk - (fga - p.fgm) - (fta - p.ftm) - tov,
  };
}

/**
 * チームごとの選手の貢献度（shots_only は無視）。
 *
 * チームの数値（AST% / USAGE RATE に使う）は背番号で絞らずに計算し、表示する選手だけを背番号で絞る。
 * 背番号不明（?番）の記録は選手ではないため含めない。
 */
export function buildContribution(allEvents, { jersey_number = null, ...filter } = {}) {
  const box = buildBoxScore(allEvents, filter);
  return {
    teams: box.teams.map((t) => ({
      team: t.team,
      players: t.players
        .filter((p) => p.jersey_number !== null && (jersey_number === null || p.jersey_number === jersey_number))
        .map((p) => contributionLine(p, t.totals)),
    })),
  };
}
