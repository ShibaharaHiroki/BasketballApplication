// 表示用のフォーマット関数

/** 秒を m:ss にする（例: 75 → "1:15"） */
export const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** バイト数を KB / MB にする */
export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** 0〜1 の比率を % にする（例: 0.456 → "45.6%"） */
export const formatPercent = (ratio, digits = 1) => `${(ratio * 100).toFixed(digits)}%`;

/** 割合（null なら「-」）。成功率の表示に使う */
export const formatPct = (ratio, digits = 1) =>
  ratio == null ? '-' : formatPercent(ratio, digits);

/** 「成功/試投」（例: 7/17） */
export const formatMadeAttempts = (made, attempts) => `${made}/${attempts}`;

/** 選手の表示名（背番号が無いときは「不明」） */
export const playerLabel = (jersey) => (jersey == null ? '不明' : `#${jersey}`);

/** クォーター番号の表示（5 以降は延長: OT1, OT2 …） */
export const formatQuarter = (quarter) => (quarter <= 4 ? `${quarter}Q` : `OT${quarter - 4}`);

/** 小数を指定桁で表示（null なら「-」） */
export const formatDecimal = (value, digits = 1) =>
  value == null ? '-' : value.toFixed(digits);
