import { useCallback } from 'react';
import { Badge, Flex } from '@chakra-ui/react';
import { EVENTS_PAGE_SIZE, useAppContext } from '../../context/AppContext';
import { useAutoFetch } from '../../hooks/useAutoFetch';
import { getEvents } from '../../services/api';
import { formatTime } from '../../utils/format';
import DataTable from '../common/DataTable';
import EmptyState from '../common/EmptyState';
import Pagination from '../common/Pagination';

const EVENT_COLUMNS = [
  { key: 'quarter', header: 'Q', render: (e) => e.quarter },
  { key: 'time', header: '時刻', render: (e) => formatTime(e.time_sec) },
  { key: 'team', header: 'チーム', render: (e) => e.team },
  { key: 'jersey', header: '背番号', render: (e) => e.jersey_number ?? '?' },
  {
    key: 'action',
    header: 'アクション',
    render: (e) => (
      <>
        {e.action}
        {e.is_shot && (
          <Badge ml={2} colorScheme={e.is_made ? 'green' : 'red'}>
            {e.shot_points}P
          </Badge>
        )}
      </>
    ),
  },
  { key: 'area', header: 'エリア', isNumeric: true, render: (e) => e.area ?? '' },
  { key: 'x', header: 'X', isNumeric: true, render: (e) => e.x ?? '' },
  { key: 'y', header: 'Y', isNumeric: true, render: (e) => e.y ?? '' },
];

/** 読み込んだイベントを、共通の絞り込み条件で表にして見る（絞り込みバーは MainPanel に置く） */
const DataExplorer = () => {
  const { loadSummary, eventFilter, eventsOffset, setEventsOffset, eventsPage, setEventsPage } = useAppContext();

  const fetchEvents = useCallback(
    () => getEvents({ filter: eventFilter, offset: eventsOffset, limit: EVENTS_PAGE_SIZE }),
    // loadSummary が変わる（読み込み直す）たびに取り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadSummary, eventFilter, eventsOffset]
  );
  useAutoFetch(loadSummary ? fetchEvents : null, setEventsPage, 'イベントの取得に失敗しました');

  if (!loadSummary) {
    return <EmptyState message="左のパネルでファイルを選んで「読み込む」を押してください" />;
  }

  return (
    <Flex direction="column" h="100%">
      <Flex mb={3} justify="flex-end">
        <Pagination
          offset={eventsOffset}
          limit={EVENTS_PAGE_SIZE}
          total={eventsPage?.total ?? 0}
          onChange={setEventsOffset}
        />
      </Flex>
      <DataTable columns={EVENT_COLUMNS} rows={eventsPage?.events ?? []} getRowKey={(_, i) => eventsOffset + i} />
    </Flex>
  );
};

export default DataExplorer;
