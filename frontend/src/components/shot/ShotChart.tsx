import React, { useCallback, useMemo } from 'react';
import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import type { Config, Data, Layout } from 'plotly.js';
import { useAppContext } from '../../context/AppContext';
import { useAutoFetch } from '../../hooks/useAutoFetch';
import { getShotChart } from '../../services/api';
import { GetShotChartResponse, ShotPoint } from '../../types';
import { buildCourtShapes, courtAxes, toCourtMeters } from '../../utils/court';
import { formatMadeAttempts, formatPct, formatQuarter, formatTime, playerLabel } from '../../utils/format';
import BaseChart, { CHART_TEXT_COLOR } from '../common/BaseChart';
import EmptyState from '../common/EmptyState';
import ToggleFilter from '../common/ToggleFilter';

// 成功 / 失敗は色と形の両方で区別する（色だけに頼らない）
const MADE_COLOR = '#2a78d6';
const MISSED_COLOR = '#eb6834';

const CHART_CONFIG: Partial<Config> = {
  // コートは固定表示（拡大・移動・範囲選択はしない）
  displayModeBar: false,
};

const shotHoverText = (s: ShotPoint): string =>
  `${playerLabel(s.jersey_number)}（${s.team}）<br>${s.action}<br>` +
  `${formatQuarter(s.quarter)} ${formatTime(s.time_sec)} ・ ${s.distance_m.toFixed(1)}m` +
  (s.area != null ? ` ・ エリア${s.area}` : '');

const buildShotTrace = (chart: GetShotChartResponse, made: boolean): Data => {
  const shots = chart.shots.filter((s) => s.is_made === made);
  const points = shots.map((s) => toCourtMeters(chart.court, s.x, s.y));
  return {
    type: 'scatter',
    mode: 'markers',
    name: made ? '成功' : '失敗',
    x: points.map((p) => p.u),
    y: points.map((p) => p.v),
    text: shots.map(shotHoverText),
    hovertemplate: '%{text}<extra></extra>',
    marker: made
      ? { symbol: 'circle', size: 10, color: MADE_COLOR, line: { color: '#ffffff', width: 1.5 } }
      : { symbol: 'x-thin', size: 10, color: MISSED_COLOR, line: { color: MISSED_COLOR, width: 2 } },
  };
};

const buildZoneLabelTrace = (chart: GetShotChartResponse): Data => {
  const points = chart.zones.map((z) => toCourtMeters(chart.court, z.x, z.y));
  return {
    type: 'scatter',
    mode: 'text',
    name: 'エリア別成功率',
    x: points.map((p) => p.u),
    y: points.map((p) => p.v),
    text: chart.zones.map((z) => `${formatMadeAttempts(z.made, z.attempts)}<br>${formatPct(z.fg_pct, 0)}`),
    textfont: { size: 11, color: CHART_TEXT_COLOR },
    hoverinfo: 'skip',
    showlegend: false,
  };
};

/** シュートチャート（共通の絞り込み条件に連動） */
const ShotChart: React.FC = () => {
  const { loadSummary, eventFilter, shotChart, setShotChart, showZoneLabels, setShowZoneLabels } = useAppContext();

  const fetchShotChart = useCallback(
    () => getShotChart({ filter: eventFilter }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadSummary, eventFilter]
  );
  useAutoFetch(loadSummary ? fetchShotChart : null, setShotChart, 'シュートチャートの取得に失敗しました');

  const data = useMemo<Data[]>(() => {
    if (!shotChart) return [];
    const traces = [buildShotTrace(shotChart, true), buildShotTrace(shotChart, false)];
    return showZoneLabels ? [...traces, buildZoneLabelTrace(shotChart)] : traces;
  }, [shotChart, showZoneLabels]);

  const layout = useMemo<Partial<Layout>>(
    () =>
      shotChart
        ? {
            ...courtAxes(shotChart.court),
            shapes: buildCourtShapes(shotChart.court),
            dragmode: false,
            hovermode: 'closest',
            margin: { l: 8, r: 8, t: 8, b: 8 },
            legend: { orientation: 'h', x: 0, y: 1, yanchor: 'bottom' },
          }
        : {},
    [shotChart]
  );

  if (!loadSummary) {
    return <EmptyState message="左のパネルでファイルを選んで「読み込む」を押してください" />;
  }
  if (!shotChart) {
    return <EmptyState message="読み込み中…" />;
  }

  const { summary } = shotChart;
  return (
    <Flex direction="column" h="100%">
      <HStack justify="space-between" mb={2} flexWrap="wrap">
        <Text fontSize="sm" color="gray.600">
          チャートの点: {summary.located_attempts} 本
          {summary.unlocated_attempts > 0 && `（座標なしのシュート ${summary.unlocated_attempts} 本は点に含まれません）`}
        </Text>
        <ToggleFilter
          id="zone-labels"
          label="エリア別成功率を表示"
          isChecked={showZoneLabels}
          onChange={setShowZoneLabels}
        />
      </HStack>
      <Box flex="1" minH="300px">
        {shotChart.shots.length === 0 ? (
          <EmptyState message="条件に合うシュートがありません" />
        ) : (
          <BaseChart
            data={data}
            layout={layout}
            config={CHART_CONFIG}
          />
        )}
      </Box>
    </Flex>
  );
};

export default ShotChart;
