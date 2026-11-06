/** リクエストの検証。不正な値は 422 にする。 */
import { HttpError } from '../core/utils.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const invalid = (field, reason) => new HttpError(422, `${field}: ${reason}`);

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function parseBody(body) {
  if (body === undefined) return {};
  if (!isObject(body)) throw invalid('body', 'オブジェクトを指定してください');
  return body;
}

function parseInteger(value, field) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(number)) throw invalid(field, '整数を指定してください');
  return number;
}

function parseOptionalString(value, field) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw invalid(field, '文字列を指定してください');
  return value;
}

/** 共通の絞り込み条件。null の条件は無視される。 */
function parseFilter(raw) {
  if (raw === undefined) return { game_id: null, team: null, quarter: null, jersey_number: null, shots_only: false };
  if (!isObject(raw)) throw invalid('filter', 'オブジェクトを指定してください');
  const shotsOnly = raw.shots_only ?? false;
  if (typeof shotsOnly !== 'boolean') throw invalid('filter.shots_only', '真偽値を指定してください');
  return {
    game_id: parseOptionalString(raw.game_id, 'filter.game_id'),
    team: parseOptionalString(raw.team, 'filter.team'),
    quarter: raw.quarter === undefined || raw.quarter === null ? null : parseInteger(raw.quarter, 'filter.quarter'),
    jersey_number: parseOptionalString(raw.jersey_number, 'filter.jersey_number'),
    shots_only: shotsOnly,
  };
}

export function parseFilterRequest(rawBody) {
  return { filter: parseFilter(parseBody(rawBody).filter) };
}

export function parseGetEventsRequest(rawBody) {
  const body = parseBody(rawBody);
  const offset = parseInteger(body.offset ?? 0, 'offset');
  const limit = parseInteger(body.limit ?? DEFAULT_LIMIT, 'limit');
  if (offset < 0) throw invalid('offset', '0 以上を指定してください');
  if (limit < 1 || limit > MAX_LIMIT) throw invalid('limit', `1 以上 ${MAX_LIMIT} 以下を指定してください`);
  return { filter: parseFilter(body.filter), offset, limit };
}

/** file_names が null のときは入力フォルダ内のすべてのファイルを読み込む。 */
export function parseLoadDataRequest(rawBody) {
  const fileNames = parseBody(rawBody).file_names ?? null;
  if (fileNames !== null && !(Array.isArray(fileNames) && fileNames.every((n) => typeof n === 'string'))) {
    throw invalid('file_names', '文字列の配列を指定してください');
  }
  return { file_names: fileNames };
}
