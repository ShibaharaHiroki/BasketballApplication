import { Badge, Box, Heading, HStack, Text } from '@chakra-ui/react';
import { formatMadeAttempts, formatPct, formatTime, playerLabel } from '../../utils/format';
import DataTable from '../common/DataTable';

const stat = (key, header) => ({
  key,
  header,
  isNumeric: true,
  render: (r) => r[key],
});

const shooting = (made, att, pct, header) => [
  { key: made, header, isNumeric: true, render: (r) => formatMadeAttempts(r[made], r[att]) },
  { key: pct, header: `${header}%`, isNumeric: true, render: (r) => formatPct(r[pct]) },
];

const BOX_SCORE_COLUMNS = [
  {
    key: 'label',
    header: '選手',
    render: (r) => (
      <HStack spacing={1}>
        <Text as="span">{r.label}</Text>
        {r.is_starter && (
          <Badge colorScheme="gray" fontSize="0.6em">
            先発
          </Badge>
        )}
      </HStack>
    ),
  },
  { key: 'min', header: '出場', isNumeric: true, render: (r) => (r.seconds_played ? formatTime(r.seconds_played) : '-') },
  stat('pts', '得点'),
  ...shooting('fgm', 'fga', 'fg_pct', 'FG'),
  ...shooting('fg3m', 'fg3a', 'fg3_pct', '3P'),
  ...shooting('ftm', 'fta', 'ft_pct', 'FT'),
  stat('oreb', 'OR'),
  stat('dreb', 'DR'),
  stat('reb', 'REB'),
  stat('ast', 'AST'),
  stat('stl', 'STL'),
  stat('blk', 'BLK'),
  stat('tov', 'TO'),
  stat('pf', 'PF'),
];

/** 1 チーム分のボックススコア */
const TeamBoxScoreTable = ({ teamBoxScore }) => {
  const rows = teamBoxScore.players.map((p) => ({
    ...p,
    label: p.jersey_number == null ? 'チーム・背番号不明' : playerLabel(p.jersey_number),
  }));
  const totals = { ...teamBoxScore.totals, label: '合計', is_starter: false };

  return (
    <Box mb={6}>
      <Heading size="sm" mb={2}>
        {teamBoxScore.team}
      </Heading>
      <DataTable columns={BOX_SCORE_COLUMNS} rows={rows} getRowKey={(r) => r.label} footerRows={[totals]} fill={false} dense />
    </Box>
  );
};

export default TeamBoxScoreTable;
