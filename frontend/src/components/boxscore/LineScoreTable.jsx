import { formatQuarter } from '../../utils/format';
import DataTable from '../common/DataTable';

/** クォーターごとの得点表 */
const LineScoreTable = ({ boxScore }) => {
  const rows = boxScore.teams.map((t) => ({
    team: t.team,
    points: Object.fromEntries(t.line_score.map((q) => [q.quarter, q.points])),
    total: t.totals.pts,
  }));
  const columns = [
    { key: 'team', header: 'チーム', render: (r) => r.team },
    ...boxScore.quarters.map((q) => ({
      key: `q${q}`,
      header: formatQuarter(q),
      isNumeric: true,
      render: (r) => r.points[q] ?? 0,
    })),
    { key: 'total', header: '合計', isNumeric: true, render: (r) => <b>{r.total}</b> },
  ];

  return <DataTable columns={columns} rows={rows} getRowKey={(r) => r.team} fill={false} />;
};

export default LineScoreTable;
