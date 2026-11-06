import axios from 'axios';
import {
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
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 重い計算に備えて timeout は長めにする
const API_TIMEOUT_MS = 300_000;

const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

export const getHealth = async (): Promise<HealthResponse> => {
  const res = await client.get<HealthResponse>('/health');
  return res.data;
};

export const listFiles = async (): Promise<ListFilesResponse> => {
  const res = await client.post<ListFilesResponse>('/list-files', {});
  return res.data;
};

export const loadData = async (req: LoadDataRequest): Promise<LoadDataResponse> => {
  const res = await client.post<LoadDataResponse>('/load-data', req);
  return res.data;
};

export const getEvents = async (req: GetEventsRequest): Promise<GetEventsResponse> => {
  const res = await client.post<GetEventsResponse>('/get-events', req);
  return res.data;
};

export const getShotChart = async (req: GetShotChartRequest): Promise<GetShotChartResponse> => {
  const res = await client.post<GetShotChartResponse>('/get-shot-chart', req);
  return res.data;
};

export const getBoxScore = async (req: GetBoxScoreRequest): Promise<GetBoxScoreResponse> => {
  const res = await client.post<GetBoxScoreResponse>('/get-box-score', req);
  return res.data;
};

export const getContribution = async (req: GetContributionRequest): Promise<GetContributionResponse> => {
  const res = await client.post<GetContributionResponse>('/get-contribution', req);
  return res.data;
};

// バックエンドの HTTPException の detail を取り出す
export const extractErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail) return JSON.stringify(detail);
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
};
