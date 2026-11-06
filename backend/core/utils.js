/** core/ と api/ の共通ユーティリティ。 */

/** API のエラー応答になる例外。 */
export class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}

/** 割合（0〜1）。分母が 0 のときは null（「-」と表示する想定）。 */
export function ratio(numerator, denominator) {
  if (!denominator) return null;
  return numerator / denominator;
}

/** 文字列・数値の昇順比較。 */
export function compareAsc(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** 欠損を除いた一意な値を昇順で返す。 */
export function uniqueSorted(rows, column) {
  const values = new Set(rows.map((row) => row[column]).filter((value) => value !== null));
  return [...values].sort(compareAsc);
}

/** ローカル時刻の ISO 8601（秒まで、タイムゾーンなし）。 */
export function localIsoSeconds(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
