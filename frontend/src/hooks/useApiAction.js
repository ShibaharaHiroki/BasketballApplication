import { useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAppContext } from '../context/AppContext';
import { extractErrorMessage } from '../services/api';

/**
 * API 呼び出しの共通処理（isLoading / error の更新とトースト表示）をまとめたフック。
 * 失敗したときは null を返すので、呼び出し側は結果が null かどうかだけを見ればよい。
 */
export const useApiAction = () => {
  const { setIsLoading, setError } = useAppContext();
  const toast = useToast();

  return useCallback(
    async ( action, options) => {
      const { errorTitle, successTitle, trackLoading = true } = options;
      if (trackLoading) setIsLoading(true);
      setError(null);
      try {
        const result = await action();
        if (successTitle) {
          toast({ title: successTitle(result), status: 'success', isClosable: true });
        }
        return result;
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        toast({ title: errorTitle, description: message, status: 'error', isClosable: true });
        return null;
      } finally {
        if (trackLoading) setIsLoading(false);
      }
    },
    [setIsLoading, setError, toast]
  );
};
