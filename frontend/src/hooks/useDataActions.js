import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { listFiles, loadData } from '../services/api';
import { useApiAction } from './useApiAction';

/** 公開されている試合データの一覧を取得する */
export const useReloadDataFiles = () => {
  const { setDataFiles, setSelectedFileNames } = useAppContext();
  const runApi = useApiAction();

  return useCallback(async () => {
    const res = await runApi(listFiles, { errorTitle: '試合データの一覧を取得できません' });
    if (!res) return;
    setDataFiles(res.files);
    setSelectedFileNames(res.files.map((f) => f.file_name));
  }, [runApi, setDataFiles, setSelectedFileNames]);
};

/** 選択中のファイルを読み込み、絞り込み条件と各画面の表示をリセットする */
export const useLoadSelectedFiles = () => {
  const {
    selectedFileNames,
    setLoadSummary,
    setEventFilter,
    setEventsOffset,
    setEventsPage,
    setShotChart,
    setBoxScore,
    setContribution,
  } = useAppContext();
  const runApi = useApiAction();

  return useCallback(async () => {
    const res = await runApi(() => loadData({ file_names: selectedFileNames }), {
      errorTitle: 'データの読み込みに失敗しました',
      successTitle: (r) => `${r.total_rows} 行を読み込みました`,
    });
    if (!res) return;
    setEventsPage(null);
    setShotChart(null);
    setBoxScore(null);
    setContribution(null);
    setEventFilter({});
    setEventsOffset(0);
    setLoadSummary(res);
  }, [
    runApi,
    selectedFileNames,
    setLoadSummary,
    setEventFilter,
    setEventsOffset,
    setEventsPage,
    setShotChart,
    setBoxScore,
    setContribution,
  ]);
};
