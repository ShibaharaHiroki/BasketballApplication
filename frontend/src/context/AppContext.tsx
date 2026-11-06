import React, { createContext, ReactNode, useContext, useState } from 'react';
import {
  DataFileInfo,
  EventFilter,
  GetBoxScoreResponse,
  GetContributionResponse,
  GetEventsResponse,
  GetShotChartResponse,
  HealthResponse,
  LoadDataResponse,
} from '../types';

export const EVENTS_PAGE_SIZE = 100;

/** 中央に表示する画面 */
export type ActiveView = 'shotChart' | 'boxScore' | 'contribution' | 'events';

interface AppContextValue {
  health: HealthResponse | null;
  setHealth: (health: HealthResponse | null) => void;

  // 入力フォルダとファイル選択
  dataDir: string;
  setDataDir: (dataDir: string) => void;
  dataFiles: DataFileInfo[];
  setDataFiles: (files: DataFileInfo[]) => void;
  selectedFileNames: string[];
  setSelectedFileNames: (names: string[]) => void;

  // 読み込み結果
  loadSummary: LoadDataResponse | null;
  setLoadSummary: (summary: LoadDataResponse | null) => void;

  // 絞り込み条件（データエクスプローラーや今後のグラフで共通に使う）
  eventFilter: EventFilter;
  setEventFilter: (filter: EventFilter) => void;

  // データエクスプローラー
  eventsOffset: number;
  setEventsOffset: (offset: number) => void;
  eventsPage: GetEventsResponse | null;
  setEventsPage: (page: GetEventsResponse | null) => void;

  // 表示中の画面
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // シュートチャート
  shotChart: GetShotChartResponse | null;
  setShotChart: (chart: GetShotChartResponse | null) => void;
  showZoneLabels: boolean;
  setShowZoneLabels: (show: boolean) => void;

  // ボックススコア
  boxScore: GetBoxScoreResponse | null;
  setBoxScore: (boxScore: GetBoxScoreResponse | null) => void;

  // 貢献度
  contribution: GetContributionResponse | null;
  setContribution: (contribution: GetContributionResponse | null) => void;

  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dataDir, setDataDir] = useState<string>('');
  const [dataFiles, setDataFiles] = useState<DataFileInfo[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [loadSummary, setLoadSummary] = useState<LoadDataResponse | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>({});
  const [eventsOffset, setEventsOffset] = useState<number>(0);
  const [eventsPage, setEventsPage] = useState<GetEventsResponse | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('shotChart');
  const [shotChart, setShotChart] = useState<GetShotChartResponse | null>(null);
  const [showZoneLabels, setShowZoneLabels] = useState<boolean>(false);
  const [boxScore, setBoxScore] = useState<GetBoxScoreResponse | null>(null);
  const [contribution, setContribution] = useState<GetContributionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{
        health,
        setHealth,
        dataDir,
        setDataDir,
        dataFiles,
        setDataFiles,
        selectedFileNames,
        setSelectedFileNames,
        loadSummary,
        setLoadSummary,
        eventFilter,
        setEventFilter,
        eventsOffset,
        setEventsOffset,
        eventsPage,
        setEventsPage,
        activeView,
        setActiveView,
        shotChart,
        setShotChart,
        showZoneLabels,
        setShowZoneLabels,
        boxScore,
        setBoxScore,
        contribution,
        setContribution,
        isLoading,
        setIsLoading,
        error,
        setError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext は AppProvider の内側で使ってください');
  }
  return ctx;
};
