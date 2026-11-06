import { useCallback } from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { useAppContext } from '../../context/AppContext';
import { useAutoFetch } from '../../hooks/useAutoFetch';
import { getBoxScore } from '../../services/api';
import EmptyState from '../common/EmptyState';
import LineScoreTable from './LineScoreTable';
import TeamBoxScoreTable from './TeamBoxScoreTable';

/** ボックススコア（共通の絞り込み条件に連動。クォーターを選ぶとそのクォーターだけの成績になる） */
const BoxScoreView = () => {
  const { loadSummary, eventFilter, boxScore, setBoxScore } = useAppContext();

  const fetchBoxScore = useCallback(
    () => getBoxScore({ filter: eventFilter }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadSummary, eventFilter]
  );
  useAutoFetch(loadSummary ? fetchBoxScore : null, setBoxScore, 'ボックススコアの取得に失敗しました');

  if (!loadSummary) {
    return <EmptyState message="左のパネルでファイルを選んで「読み込む」を押してください" />;
  }
  if (!boxScore) {
    return <EmptyState message="読み込み中…" />;
  }

  return (
    <Box h="100%" overflowY="auto" pr={1}>
      {boxScore.game_ids.length > 1 && (
        <Text fontSize="sm" color="gray.600" mb={2}>
          {boxScore.game_ids.length} 試合の合計です（試合で絞り込むと 1 試合ごとに見られます）
        </Text>
      )}
      <Heading size="sm" mb={2}>
        スコア
      </Heading>
      <Box mb={6}>
        <LineScoreTable boxScore={boxScore} />
      </Box>
      {boxScore.teams.map((t) => (
        <TeamBoxScoreTable key={t.team} teamBoxScore={t} />
      ))}
      <Text fontSize="xs" color="gray.500">
        出場時間は選手交代の記録から計算しています（最初の交代が「戻」の選手を先発とみなします）。
      </Text>
    </Box>
  );
};

export default BoxScoreView;
