import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Config, Data, Layout } from 'plotly.js';

// チャートの共通スタイル（文字は本文色、グリッドは控えめに）
export const CHART_TEXT_COLOR = '#52514e';
export const CHART_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Meiryo", sans-serif';

const BASE_LAYOUT: Partial<Layout> = {
  autosize: true,
  margin: { l: 40, r: 16, t: 16, b: 40 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: CHART_FONT_FAMILY, size: 12, color: CHART_TEXT_COLOR },
  hoverlabel: { font: { family: CHART_FONT_FAMILY } },
};

const BASE_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['toImage', 'autoScale2d'],
};

interface BaseChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
}

/**
 * react-plotly.js の共通ラッパー。親要素の大きさいっぱいに描き、
 * 共通のフォント・余白・ツールバー設定を適用する（layout / config で上書き可）。
 *
 * 注意: 範囲選択などのイベントを使うときは、react-plotly.js の onSelected などの props ではなく
 * onInitialized で graphDiv.on(...) を自前で登録すること。React 18 の StrictMode（開発時の再マウント）で
 * react-plotly.js がハンドラーを付け直さず、イベントが届かなくなるため。
 *
 * data / layout / config は呼び出し側で useMemo しておくこと。毎回新しいオブジェクトを渡すと
 * そのたびに再描画され、範囲選択などの操作状態がリセットされる。
 */
const BaseChart: React.FC<BaseChartProps> = ({ data, layout, config }) => {
  const mergedLayout = useMemo(() => ({ ...BASE_LAYOUT, ...layout }), [layout]);
  const mergedConfig = useMemo(() => ({ ...BASE_CONFIG, ...config }), [config]);

  return (
    <Plot
      data={data}
      layout={mergedLayout}
      config={mergedConfig}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default BaseChart;
