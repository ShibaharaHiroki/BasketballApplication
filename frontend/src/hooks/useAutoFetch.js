import { useEffect } from 'react';
import { useApiAction } from './useApiAction';

/**
 * fetcher が変わるたびに API を呼び、結果を onResult に渡すフック。
 * 絞り込み条件に応じて表示を取り直す画面（表・グラフ）で共通に使う。
 *
 * - fetcher は useCallback でメモ化し、依存する条件（絞り込みなど）を deps に入れること
 * - fetcher が null のときは何もしない（データ未読み込みのときなど）
 * - 古いリクエストの結果は捨てる（条件を素早く切り替えたときの表示の逆転を防ぐ）
 */
export const useAutoFetch = (
  fetcher,
  onResult,
  errorTitle
) => {
  const runApi = useApiAction();

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    runApi(fetcher, { errorTitle, trackLoading: false }).then((res) => {
      if (!cancelled && res !== null) onResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [fetcher, onResult, errorTitle, runApi]);
};
