import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { getHealth, listFiles, loadData } from '../services/api';
import { useApiAction } from './useApiAction';

/** バックエンドの稼働確認と、入力フォルダのファイル一覧を取り直す */
export const useReloadBackendInfo = () => {
  const { setHealth, setDataDir, setDataFiles, setSelectedFileNames } = useAppContext();
  const runApi = useApiAction();

  return useCallback(async () => {
    const res = await runApi(() => Promise.all([getHealth(), listFiles()]), {
      errorTitle: 'バックエンドに接続できません',
    });
    if (!res) {
      setHealth(null);
      return;
    }
    const [healthRes, filesRes] = res;
    setHealth(healthRes);
    setDataDir(filesRes.data_dir);
    setDataFiles(filesRes.files);
    setSelectedFileNames(filesRes.files.map((f) => f.file_name));
  }, [runApi, setHealth, setDataDir, setDataFiles, setSelectedFileNames]);
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
