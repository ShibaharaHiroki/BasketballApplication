/** イベントの絞り込み。どの分析・集計 API からも同じ条件で使う。 */

/** null / undefined の条件は無視する。 */
export function filterEvents(events, { game_id = null, team = null, quarter = null, jersey_number = null, shots_only = false } = {}) {
  return events.filter(
    (e) =>
      (game_id === null || e.game_id === game_id) &&
      (team === null || e.team === team) &&
      (quarter === null || e.quarter === quarter) &&
      (jersey_number === null || e.jersey_number === jersey_number) &&
      (!shots_only || e.is_shot),
  );
}
