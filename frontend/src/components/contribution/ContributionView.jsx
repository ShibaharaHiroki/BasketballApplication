import { useCallback } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { useAppContext } from '../../context/AppContext';
import { useAutoFetch } from '../../hooks/useAutoFetch';
import { getContribution } from '../../services/api';
import { formatDecimal } from '../../utils/format';
import DataTable from '../common/DataTable';
import EmptyState from '../common/EmptyState';

const metric = (key, header) => ({
  key,
  header,
  isNumeric: true,
  render: (p) => formatDecimal(p[key]),
});

const CONTRIBUTION_COLUMNS = [
  { key: 'no', header: 'No.', render: (p) => p.jersey_number },
  metric('ast_to', 'AST/TO'),
  metric('ast_pct', 'AST%'),
  metric('tov_per40', 'TO/40MIN'),
  metric('tov_pct', 'TO%'),
  metric('ft_rate', 'FT Set'),
  metric('fg3a_rate', '3PA/FGA'),
  metric('ts_pct', 'TRUE SHOOTING%'),
  metric('usg_pct', 'USAGE RATE'),
  metric('fga_per40', 'FGA/40MIN'),
  metric('pts_per40', 'Point/40MIN'),
  metric('efg_pct', 'EFG%'),
  metric('reb_per40', 'RBD/40MIN'),
  metric('game_score', 'Game Score'),
  metric('eff', 'EFF'),
];

/** 貢献度（共通の絞り込み条件に連動） */
const ContributionView = () => {
  const { loadSummary, eventFilter, contribution, setContribution } = useAppContext();

  const fetchContribution = useCallback(
    () => getContribution({ filter: eventFilter }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadSummary, eventFilter]
  );
  useAutoFetch(loadSummary ? fetchContribution : null, setContribution, '貢献度の取得に失敗しました');

  if (!loadSummary) {
    return <EmptyState message="左のパネルでファイルを選んで「読み込む」を押してください" />;
  }
  if (!contribution) {
    return <EmptyState message="読み込み中…" />;
  }

  return (
    <Box h="100%" overflowY="auto" pr={1}>
      {contribution.teams.map((t) => (
        <Box key={t.team} mb={6}>
          <Heading size="sm" mb={2}>
            {t.team}
          </Heading>
          <DataTable
            columns={CONTRIBUTION_COLUMNS}
            rows={t.players}
            getRowKey={(p) => p.jersey_number}
            fill={false}
            dense
          />
        </Box>
      ))}
    </Box>
  );
};

export default ContributionView;
