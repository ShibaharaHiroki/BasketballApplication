// backend/models.py と対応させる（フィールド名は snake_case のまま）

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

// ---------- データファイル ----------

export interface DataFileInfo {
  file_name: string;
  size_bytes: number;
  modified_at: string;
}

export interface ListFilesResponse {
  data_dir: string;
  files: DataFileInfo[];
}

export interface LoadDataRequest {
  // null のときは入力フォルダ内のすべてのファイルを読み込む
  file_names: string[] | null;
}

export interface LoadedFileSummary {
  file_name: string;
  file_format: string;
  encoding: string | null;
  row_count: number;
  game_ids: string[];
}

export interface PlayerRef {
  team: string;
  jersey_number: string;
}

export interface LoadDataResponse {
  files: LoadedFileSummary[];
  total_rows: number;
  game_ids: string[];
  teams: string[];
  quarters: number[];
  players: PlayerRef[];
  warnings: string[];
}

// ---------- 共通の絞り込み条件（イベントを扱うすべての API で使う） ----------

export interface EventFilter {
  // null / 未指定の条件は無視される
  game_id?: string | null;
  team?: string | null;
  quarter?: number | null;
  jersey_number?: string | null;
  shots_only?: boolean;
}

// ---------- イベント（プレーバイプレーの 1 行） ----------

export interface EventRecord {
  game_id: string;
  team: string;
  jersey_number: string | null;
  action: string;
  area: number | null;
  x: number | null;
  y: number | null;
  quarter: number;
  time_sec: number;
  is_shot: boolean;
  shot_points: number | null;
  is_made: boolean | null;
  source_file: string;
}

export interface GetEventsRequest {
  filter: EventFilter;
  offset: number;
  limit: number;
}

export interface GetEventsResponse {
  total: number;
  offset: number;
  limit: number;
  events: EventRecord[];
}

// ---------- シュートチャート ----------

export interface CourtGeometry {
  // データ座標の 1m あたりの値と原点（backend/core/court.py で定義）
  scale_x: number;
  scale_y: number;
  baseline_x: number;
  center_y: number;
  // FIBA 規格の寸法（m）
  court_width_m: number;
  half_court_length_m: number;
  basket_from_baseline_m: number;
  three_point_radius_m: number;
  three_point_corner_m: number;
  key_width_m: number;
  free_throw_line_m: number;
  free_throw_circle_radius_m: number;
  restricted_area_radius_m: number;
  backboard_from_baseline_m: number;
  backboard_width_m: number;
  rim_radius_m: number;
  center_circle_radius_m: number;
}

export interface ShotPoint {
  game_id: string;
  team: string;
  jersey_number: string | null;
  action: string;
  quarter: number;
  time_sec: number;
  is_made: boolean;
  area: number | null;
  x: number;
  y: number;
  distance_m: number;
}

export interface ZoneStat {
  area: number;
  attempts: number;
  made: number;
  fg_pct: number | null;
  x: number;
  y: number;
}

export interface ShotSummary {
  // フィールドゴールのうち、座標がある（チャートに点として出る）/ ない試投数
  located_attempts: number;
  unlocated_attempts: number;
}

export interface GetShotChartRequest {
  filter: EventFilter;
}

export interface GetShotChartResponse {
  court: CourtGeometry;
  shots: ShotPoint[];
  zones: ZoneStat[];
  summary: ShotSummary;
}

// ---------- ボックススコア ----------

export interface StatLine {
  seconds_played: number;
  pts: number;
  fgm: number;
  fga: number;
  fg_pct: number | null;
  fg3m: number;
  fg3a: number;
  fg3_pct: number | null;
  ftm: number;
  fta: number;
  ft_pct: number | null;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
}

export interface PlayerBoxScore extends StatLine {
  // null は背番号不明（?番）の記録をまとめた行
  jersey_number: string | null;
  is_starter: boolean;
}

export interface QuarterScore {
  quarter: number;
  points: number;
}

export interface TeamBoxScore {
  team: string;
  players: PlayerBoxScore[];
  totals: StatLine;
  line_score: QuarterScore[];
}

export interface GetBoxScoreRequest {
  filter: EventFilter;
}

export interface GetBoxScoreResponse {
  game_ids: string[];
  quarters: number[];
  teams: TeamBoxScore[];
}

// ---------- 貢献度 ----------

export interface PlayerContribution {
  jersey_number: string;
  // 分母が 0 の指標は null。% の指標は 100 倍した値
  ast_to: number | null;
  ast_pct: number | null;
  tov_per40: number | null;
  tov_pct: number | null;
  ft_rate: number | null; // FT Set（FTA / FGA × 100）
  fg3a_rate: number | null; // 3PA / FGA
  ts_pct: number | null;
  usg_pct: number | null;
  fga_per40: number | null;
  pts_per40: number | null;
  efg_pct: number | null;
  reb_per40: number | null;
  game_score: number;
  eff: number;
}

export interface TeamContribution {
  team: string;
  players: PlayerContribution[];
}

export interface GetContributionRequest {
  filter: EventFilter;
}

export interface GetContributionResponse {
  teams: TeamContribution[];
}
