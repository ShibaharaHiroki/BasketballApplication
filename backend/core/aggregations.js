/** 集計処理。 */
import { filterEvents } from './filters.js';
import { compareAsc, ratio, uniqueSorted } from './utils.js';

// ---------- 汎用の集計 ----------

/** 読み込んだイベント全体の概要。 */
export function summarizeEvents(events) {
  return {
    total_rows: events.length,
    game_ids: uniqueSorted(events, 'game_id'),
    teams: uniqueSorted(events, 'team'),
    quarters: uniqueSorted(events, 'quarter'),
    players: listPlayers(events),
  };
}

const playerKey = (team, jersey) => JSON.stringify([team, jersey]);

/** 記録に出てくる選手（チーム・背番号）。チーム名、背番号の数値順。 */
function listPlayers(events) {
  const players = new Map();
  for (const { team, jersey_number: jersey } of events) {
    if (jersey !== null) players.set(playerKey(team, jersey), { team, jersey_number: jersey });
  }
  return [...players.values()].sort(
    (a, b) => compareAsc(a.team, b.team) || Number(a.jersey_number) - Number(b.jersey_number),
  );
}

// ---------- 試合時間 ----------

const REGULATION_QUARTERS = 4;
const QUARTER_SEC = 600; // 高校・FIBA: 1 クォーター 10 分
const OVERTIME_SEC = 300; // 延長: 5 分

function quarterStartSec(quarter) {
  if (quarter <= REGULATION_QUARTERS) return (quarter - 1) * QUARTER_SEC;
  return REGULATION_QUARTERS * QUARTER_SEC + (quarter - REGULATION_QUARTERS - 1) * OVERTIME_SEC;
}

function quarterLengthSec(quarter) {
  return quarter <= REGULATION_QUARTERS ? QUARTER_SEC : OVERTIME_SEC;
}

/** 試合開始からの経過秒（time_sec はクォーター内の経過秒）。 */
function gameClockSec(event) {
  return quarterStartSec(event.quarter) + event.time_sec;
}

// ---------- 出場時間（選手交代から計算） ----------

const SUB_IN_ACTION = '選手交代(出)'; // コートに出る
const SUB_OUT_ACTION = '選手交代(戻)'; // ベンチに戻る

/**
 * 1 試合分のイベントから、選手ごとのコートにいた時間帯 [開始秒, 終了秒] を求める。
 *
 * 最初の交代が「戻」の選手、または交代せずに記録がある選手を先発とみなす。
 * Map のキーは playerKey、値は { team, jersey, intervals }。
 */
function onCourtIntervals(gameEvents) {
  const lastQuarter = Math.max(...gameEvents.map((e) => e.quarter));
  const gameEnd = quarterStartSec(lastQuarter) + quarterLengthSec(lastQuarter);

  const byPlayer = new Map();
  for (const event of gameEvents) {
    if (event.jersey_number === null) continue;
    const key = playerKey(event.team, event.jersey_number);
    if (!byPlayer.has(key)) byPlayer.set(key, { team: event.team, jersey: event.jersey_number, events: [] });
    byPlayer.get(key).events.push(event);
  }

  const result = new Map();
  for (const [key, { team, jersey, events }] of byPlayer) {
    const subs = events.filter((e) => e.action === SUB_IN_ACTION || e.action === SUB_OUT_ACTION);
    const isStarter = subs.length === 0 || subs[0].action === SUB_OUT_ACTION;
    let onSince = isStarter ? 0 : null;
    const intervals = [];
    for (const sub of subs) {
      const t = gameClockSec(sub);
      if (sub.action === SUB_IN_ACTION && onSince === null) {
        onSince = t;
      } else if (sub.action === SUB_OUT_ACTION && onSince !== null) {
        intervals.push([onSince, t]);
        onSince = null;
      }
    }
    if (onSince !== null) intervals.push([onSince, gameEnd]);
    result.set(key, { team, jersey, intervals });
  }
  return result;
}

function overlapSec(intervals, window) {
  let total = 0;
  for (const [start, end] of intervals) {
    total += window === null ? end - start : Math.max(0, Math.min(end, window[1]) - Math.max(start, window[0]));
  }
  return total;
}

// ---------- ボックススコア ----------

// アクション名 → スタッツ（NFKC 正規化後のアクション名に対して判定）
const STAT_ACTION_PATTERNS = {
  oreb: /^オフェンスリバウンド$/,
  dreb: /^ディフェンスリバウンド$/,
  ast: /^アシスト$/,
  stl: /^スティール$/,
  blk: /^ブロック$/,
  tov: /^ターンオーバー$/,
  pf: /ファウル/,
};

/** イベントの集合（選手 1 人分でもチーム全体でもよい）から 1 行分のスタッツを作る。 */
function statLine(events) {
  let fgm = 0;
  let fga = 0;
  let fg3m = 0;
  let fg3a = 0;
  let ftm = 0;
  let fta = 0;
  for (const { is_shot: isShot, shot_points: points, is_made: isMade } of events) {
    if (!isShot) continue;
    if (points === 2 || points === 3) {
      fga++;
      if (isMade) fgm++;
    }
    if (points === 3) {
      fg3a++;
      if (isMade) fg3m++;
    }
    if (points === 1) {
      fta++;
      if (isMade) ftm++;
    }
  }

  const line = {
    pts: (fgm - fg3m) * 2 + fg3m * 3 + ftm,
    fgm,
    fga,
    fg_pct: ratio(fgm, fga),
    fg3m,
    fg3a,
    fg3_pct: ratio(fg3m, fg3a),
    ftm,
    fta,
    ft_pct: ratio(ftm, fta),
  };
  for (const [key, pattern] of Object.entries(STAT_ACTION_PATTERNS)) {
    line[key] = events.filter((e) => pattern.test(e.action)).length;
  }
  line.reb = line.oreb + line.dreb;
  return line;
}

function hasAnyStat(line) {
  return ['pts', 'fga', 'fta', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf'].some((key) => line[key]);
}

/** クォーターごとの得点。 */
function lineScore(teamEvents, quarters) {
  return quarters.map((quarter) => ({
    quarter,
    points: teamEvents
      .filter((e) => e.is_shot && e.is_made && e.quarter === quarter)
      .reduce((sum, e) => sum + e.shot_points, 0),
  }));
}

/**
 * チームごとのボックススコア（shots_only は無視）。
 *
 * 出場時間は、クォーターで絞る前の試合全体の交代記録から求め、指定クォーターと重なる分を数える。
 */
export function buildBoxScore(allEvents, { game_id = null, team = null, quarter = null, jersey_number = null } = {}) {
  const gamesEvents = filterEvents(allEvents, { game_id });
  const filtered = filterEvents(allEvents, { game_id, team, quarter, jersey_number });

  const window = quarter === null ? null : [quarterStartSec(quarter), quarterStartSec(quarter) + quarterLengthSec(quarter)];

  // キーは playerKey、値は { team, jersey, seconds, isStarter }
  const playedByPlayer = new Map();
  for (const gameId of uniqueSorted(gamesEvents, 'game_id')) {
    const gameEvents = gamesEvents.filter((e) => e.game_id === gameId);
    for (const [key, { team: playerTeam, jersey, intervals }] of onCourtIntervals(gameEvents)) {
      if (!playedByPlayer.has(key)) playedByPlayer.set(key, { team: playerTeam, jersey, seconds: 0, isStarter: false });
      const played = playedByPlayer.get(key);
      played.seconds += overlapSec(intervals, window);
      if (intervals.length > 0 && intervals[0][0] === 0) played.isStarter = true;
    }
  }

  const quarters = quarter !== null ? [quarter] : uniqueSorted(gamesEvents, 'quarter');
  const teamNames = team !== null ? [team] : uniqueSorted(gamesEvents, 'team');

  const teams = teamNames.map((teamName) => {
    const teamEvents = filtered.filter((e) => e.team === teamName);

    const jerseys = new Set(teamEvents.map((e) => e.jersey_number).filter((j) => j !== null));
    if (jersey_number === null) {
      for (const played of playedByPlayer.values()) {
        if (played.team === teamName && played.seconds > 0) jerseys.add(played.jersey);
      }
    }

    const players = [...jerseys].map((jersey) => {
      const played = playedByPlayer.get(playerKey(teamName, jersey));
      return {
        jersey_number: jersey,
        is_starter: played?.isStarter ?? false,
        seconds_played: played?.seconds ?? 0,
        ...statLine(teamEvents.filter((e) => e.jersey_number === jersey)),
      };
    });
    players.sort(
      (a, b) => Number(b.is_starter) - Number(a.is_starter) || Number(a.jersey_number) - Number(b.jersey_number),
    );

    // 背番号不明（?番）の記録はチームの行にまとめる
    const unknown = statLine(teamEvents.filter((e) => e.jersey_number === null));
    if (jersey_number === null && hasAnyStat(unknown)) {
      players.push({ jersey_number: null, is_starter: false, seconds_played: 0, ...unknown });
    }

    return {
      team: teamName,
      players,
      totals: { seconds_played: players.reduce((sum, p) => sum + p.seconds_played, 0), ...statLine(teamEvents) },
      line_score: lineScore(teamEvents, quarters),
    };
  });

  return { game_ids: uniqueSorted(gamesEvents, 'game_id'), quarters, teams };
}
