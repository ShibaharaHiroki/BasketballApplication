/**
 * 画面が使うデータ処理。サーバーのプログラムは使わず、すべてブラウザの中で行う。
 *
 * 公開フォルダの data/ にある JSON（npm run data:build で作る）を読み、backend/core の集計処理にかける。
 * 利用者の制限はサーバーの Basic 認証で行う（DEPLOY.md）。
 */
import { parseFilterRequest, parseGetEventsRequest } from '../../../backend/api/validation.js';
import { buildBoxScore, summarizeEvents } from '../../../backend/core/aggregations.js';
import { buildContribution, buildShotChart } from '../../../backend/core/analysis.js';
import { filterEvents } from '../../../backend/core/filters.js';

// 読み込んだイベント。ブラウザの画面ごとに持つので、他の利用者には影響しない
let loadedEvents = null;
// data/index.json の内容（ファイル名 → 一覧の項目）
let fileEntries = new Map();

const fetchJson = async (path) => {
  const res = await fetch(`data/${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`data/${path} を読み込めませんでした（${res.status}）`);
  try {
    return await res.json();
  } catch {
    throw new Error(`data/${path} が見つからないか、形式が正しくありません`);
  }
};

const getLoadedEvents = () => {
  if (loadedEvents === null) throw new Error('データが読み込まれていません');
  return loadedEvents;
};

export const listFiles = async () => {
  const { files } = await fetchJson('index.json');
  fileEntries = new Map(files.map((f) => [f.file_name, f]));
  return { files };
};

/** 同じ試合が複数のファイルに入っていると二重に集計されるため、警告を作る。 */
const duplicateGameWarnings = (entries) => {
  const filesByGame = new Map();
  for (const f of entries) {
    for (const gameId of f.game_ids) {
      filesByGame.set(gameId, [...(filesByGame.get(gameId) ?? []), f.file_name]);
    }
  }
  return [...filesByGame]
    .filter(([, names]) => names.length > 1)
    .map(([gameId, names]) => `試合ID ${gameId} が複数のファイルに含まれています: ${names.join(', ')}`);
};

export const loadData = async ({ file_names: fileNames }) => {
  const entries = fileNames.map((name) => {
    const entry = fileEntries.get(name);
    if (!entry) throw new Error(`一覧にないファイルです: ${name}`);
    return entry;
  });
  const eventsByFile = await Promise.all(entries.map((f) => fetchJson(f.data_file)));
  const events = eventsByFile.flat();
  loadedEvents = events;

  return {
    files: entries.map(({ file_name, file_format, encoding, row_count, game_ids }) => ({
      file_name,
      file_format,
      encoding,
      row_count,
      game_ids,
    })),
    warnings: [...entries.flatMap((f) => f.warnings), ...duplicateGameWarnings(entries)],
    ...summarizeEvents(events),
  };
};

export const getEvents = async (req) => {
  const { filter, offset, limit } = parseGetEventsRequest(req);
  const events = filterEvents(getLoadedEvents(), filter);
  return { total: events.length, offset, limit, events: events.slice(offset, offset + limit) };
};

export const getShotChart = async (req) => {
  const { filter } = parseFilterRequest(req);
  return buildShotChart(filterEvents(getLoadedEvents(), { ...filter, shots_only: true }));
};

export const getBoxScore = async (req) => {
  const { filter } = parseFilterRequest(req);
  return buildBoxScore(getLoadedEvents(), filter);
};

export const getContribution = async (req) => {
  const { filter } = parseFilterRequest(req);
  return buildContribution(getLoadedEvents(), filter);
};

export const extractErrorMessage = (err) => (err instanceof Error ? err.message : String(err));
