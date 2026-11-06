"""API エンドポイント。処理は core/ に任せ、ここは薄く保つ。"""
from datetime import datetime
from typing import Any, Dict

import pandas as pd
from fastapi import APIRouter, HTTPException

from core import aggregations, analysis, data_loader, filters, utils
from models import (
    DataFileInfo,
    EventFilter,
    EventRecord,
    GetBoxScoreRequest,
    GetBoxScoreResponse,
    GetContributionRequest,
    GetContributionResponse,
    GetEventsRequest,
    GetEventsResponse,
    GetShotChartRequest,
    GetShotChartResponse,
    HealthResponse,
    ListFilesResponse,
    LoadDataRequest,
    LoadDataResponse,
    LoadedFileSummary,
)

API_VERSION = "0.1.0"

router = APIRouter()

# 計算結果のキャッシュ（ユーザー 1 人のローカル利用が前提）
#   events: 読み込んだイベントの DataFrame
app_state: Dict[str, Any] = {}


# ---------- 共通部品 ----------

def get_events_df() -> pd.DataFrame:
    df = app_state.get("events")
    if df is None:
        raise HTTPException(status_code=400, detail="データが読み込まれていません。先に /api/load-data を実行してください")
    return df


def get_filtered_events(event_filter: EventFilter, **overrides: Any) -> pd.DataFrame:
    """読み込み済みイベントを共通の絞り込み条件で絞る。分析系エンドポイントはここから始める。

    overrides で条件の一部を上書きできる（例: shots_only=True）。
    """
    return filters.filter_events(get_events_df(), **{**event_filter.model_dump(), **overrides})


# ---------- エンドポイント ----------

@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=API_VERSION,
        timestamp=datetime.now().isoformat(timespec="seconds"),
    )


@router.post("/list-files", response_model=ListFilesResponse)
def list_files() -> ListFilesResponse:
    return ListFilesResponse(
        data_dir=data_loader.get_data_dir(),
        files=[DataFileInfo(**f) for f in data_loader.list_data_files()],
    )


@router.post("/load-data", response_model=LoadDataResponse)
def load_data(req: LoadDataRequest) -> LoadDataResponse:
    try:
        df, loaded = data_loader.load_files(req.file_names)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    app_state.clear()
    app_state["events"] = df

    return LoadDataResponse(
        files=[
            LoadedFileSummary(
                file_name=f.file_name,
                file_format=f.file_format,
                encoding=f.encoding,
                row_count=f.row_count,
                game_ids=f.game_ids,
            )
            for f in loaded
        ],
        warnings=[w for f in loaded for w in f.warnings],
        **aggregations.summarize_events(df),
    )


@router.post("/get-events", response_model=GetEventsResponse)
def get_events(req: GetEventsRequest) -> GetEventsResponse:
    df = get_filtered_events(req.filter)
    page = utils.paginate(df, req.offset, req.limit)
    return GetEventsResponse(
        total=len(df),
        offset=req.offset,
        limit=req.limit,
        events=[EventRecord(**r) for r in utils.dataframe_to_records(page)],
    )


@router.post("/get-shot-chart", response_model=GetShotChartResponse)
def get_shot_chart(req: GetShotChartRequest) -> GetShotChartResponse:
    shots = get_filtered_events(req.filter, shots_only=True)
    return GetShotChartResponse(**analysis.build_shot_chart(shots))


@router.post("/get-box-score", response_model=GetBoxScoreResponse)
def get_box_score(req: GetBoxScoreRequest) -> GetBoxScoreResponse:
    return GetBoxScoreResponse(**aggregations.build_box_score(get_events_df(), **req.filter.model_dump()))


@router.post("/get-contribution", response_model=GetContributionResponse)
def get_contribution(req: GetContributionRequest) -> GetContributionResponse:
    return GetContributionResponse(**analysis.build_contribution(get_events_df(), **req.filter.model_dump()))
