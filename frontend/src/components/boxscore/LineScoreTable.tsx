import React from 'react';
import { GetBoxScoreResponse } from '../../types';
import { formatQuarter } from '../../utils/format';
import DataTable, { DataTableColumn } from '../common/DataTable';

interface LineScoreRow {
  team: string;
  points: Record<number, number>;
  total: number;
}

interface LineScoreTableProps {
  boxScore: GetBoxScoreResponse;
}

/** クォーターごとの得点表 */
const LineScoreTable: React.FC<LineScoreTableProps> = ({ boxScore }) => {
  const rows: LineScoreRow[] = boxScore.teams.map((t) => ({
    team: t.team,
    points: Object.fromEntries(t.line_score.map((q) => [q.quarter, q.points])),
    total: t.totals.pts,
  }));
  const columns: DataTableColumn<LineScoreRow>[] = [
    { key: 'team', header: 'チーム', render: (r) => r.team },
    ...boxScore.quarters.map<DataTableColumn<LineScoreRow>>((q) => ({
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
