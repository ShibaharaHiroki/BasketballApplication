"""API のリクエスト/レスポンスモデル。frontend/src/types/index.ts と対応させる。"""
from typing import List, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str


# ---------- データファイル ----------

class DataFileInfo(BaseModel):
    file_name: str
    size_bytes: int
    modified_at: str


class ListFilesResponse(BaseModel):
    data_dir: str
    files: List[DataFileInfo]


class LoadDataRequest(BaseModel):
    # None のときは入力フォルダ内のすべてのファイルを読み込む
    file_names: Optional[List[str]] = None


class LoadedFileSummary(BaseModel):
    file_name: str
    file_format: str
    encoding: Optional[str]
    row_count: int
    game_ids: List[str]


class PlayerRef(BaseModel):
    team: str
    jersey_number: str


class LoadDataResponse(BaseModel):
    files: List[LoadedFileSummary]
    total_rows: int
    game_ids: List[str]
    teams: List[str]
    quarters: List[int]
    players: List[PlayerRef]
    warnings: List[str]


# ---------- 共通の絞り込み条件（イベントを扱うすべての API で使う） ----------

class EventFilter(BaseModel):
    # None の条件は無視する
    game_id: Optional[str] = None
    team: Optional[str] = None
    quarter: Optional[int] = None
    jersey_number: Optional[str] = None
    shots_only: bool = False


# ---------- イベント（プレーバイプレーの 1 行） ----------

class EventRecord(BaseModel):
    game_id: str
    team: str
    jersey_number: Optional[str]
    action: str
    area: Optional[int]
    x: Optional[float]
    y: Optional[float]
    quarter: int
    time_sec: int
    is_shot: bool
    shot_points: Optional[int]
    is_made: Optional[bool]
    source_file: str


class GetEventsRequest(BaseModel):
    filter: EventFilter = Field(default_factory=EventFilter)
    offset: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)


class GetEventsResponse(BaseModel):
    total: int
    offset: int
    limit: int
    events: List[EventRecord]


# ---------- シュートチャート ----------

class CourtGeometry(BaseModel):
    # データ座標の 1m あたりの値と原点（core/court.py で定義）
    scale_x: float
    scale_y: float
    baseline_x: float
    center_y: float
    # FIBA 規格の寸法（m）
    court_width_m: float
    half_court_length_m: float
    basket_from_baseline_m: float
    three_point_radius_m: float
    three_point_corner_m: float
    key_width_m: float
    free_throw_line_m: float
    free_throw_circle_radius_m: float
    restricted_area_radius_m: float
    backboard_from_baseline_m: float
    backboard_width_m: float
    rim_radius_m: float
    center_circle_radius_m: float


class ShotPoint(BaseModel):
    game_id: str
    team: str
    jersey_number: Optional[str]
    action: str
    quarter: int
    time_sec: int
    is_made: bool
    area: Optional[int]
    x: float
    y: float
    distance_m: float


class ZoneStat(BaseModel):
    area: int
    attempts: int
    made: int
    fg_pct: Optional[float]
    # エリア内のシュート位置の平均（ラベルの表示位置）
    x: float
    y: float


class ShotSummary(BaseModel):
    # フィールドゴールのうち、座標がある（チャートに点として出る）/ ない試投数
    located_attempts: int
    unlocated_attempts: int


class GetShotChartRequest(BaseModel):
    # shots_only は無視される（常にシュートだけを対象にする）
    filter: EventFilter = Field(default_factory=EventFilter)


class GetShotChartResponse(BaseModel):
    court: CourtGeometry
    shots: List[ShotPoint]
    zones: List[ZoneStat]
    summary: ShotSummary


# ---------- ボックススコア ----------

class StatLine(BaseModel):
    seconds_played: int
    pts: int
    fgm: int
    fga: int
    fg_pct: Optional[float]
    fg3m: int
    fg3a: int
    fg3_pct: Optional[float]
    ftm: int
    fta: int
    ft_pct: Optional[float]
    oreb: int
    dreb: int
    reb: int
    ast: int
    stl: int
    blk: int
    tov: int
    pf: int


class PlayerBoxScore(StatLine):
    # None は背番号不明（?番）の記録をまとめた行
    jersey_number: Optional[str]
    is_starter: bool


class QuarterScore(BaseModel):
    quarter: int
    points: int


class TeamBoxScore(BaseModel):
    team: str
    players: List[PlayerBoxScore]
    totals: StatLine
    line_score: List[QuarterScore]


class GetBoxScoreRequest(BaseModel):
    # shots_only は無視される
    filter: EventFilter = Field(default_factory=EventFilter)


class GetBoxScoreResponse(BaseModel):
    game_ids: List[str]
    quarters: List[int]
    teams: List[TeamBoxScore]


# ---------- 貢献度 ----------

class PlayerContribution(BaseModel):
    jersey_number: str
    # 分母が 0 の指標は None。% の指標は 100 倍した値
    ast_to: Optional[float]
    ast_pct: Optional[float]
    tov_per40: Optional[float]
    tov_pct: Optional[float]
    ft_rate: Optional[float]      # FT Set（FTA / FGA × 100）
    fg3a_rate: Optional[float]    # 3PA / FGA
    ts_pct: Optional[float]
    usg_pct: Optional[float]
    fga_per40: Optional[float]
    pts_per40: Optional[float]
    efg_pct: Optional[float]
    reb_per40: Optional[float]
    game_score: float
    eff: float


class TeamContribution(BaseModel):
    team: str
    players: List[PlayerContribution]


class GetContributionRequest(BaseModel):
    # shots_only は無視される
    filter: EventFilter = Field(default_factory=EventFilter)


class GetContributionResponse(BaseModel):
    teams: List[TeamContribution]
