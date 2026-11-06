/**
 * データの読み込みと前処理。
 *
 * 入力フォルダ（DATA_DIR）にあるプレーバイプレーの CSV / Excel を読み込み、
 * 列名を英語の snake_case にそろえた 1 つのイベント配列にまとめる。
 *
 * 汎用部品（他のデータ形式でも使える）:
 *     readTable        CSV / Excel を文字コード自動判定で読む
 *     normalizeText    全角→半角・前後の空白除去
 *     renameColumns    列名の別名を内部名に置き換え、必須列を確認する
 * プレーバイプレー固有:
 *     preprocess       上の部品を組み合わせた前処理
 *     classifyShot     アクション名からシュート情報を判定する
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

import { compareAsc, localIsoSeconds, uniqueSorted } from './utils.js';

const BACKEND_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_DATA_DIR = 'data/input';

const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xlsm'];

// 先頭から順に試す。cp932 は Shift_JIS の上位互換（Excel で保存した日本語 CSV の多く）
const CSV_DECODERS = [
  { encoding: 'utf-8-sig', decode: (buffer) => new TextDecoder('utf-8', { fatal: true }).decode(buffer) },
  { encoding: 'cp932', decode: (buffer) => new TextDecoder('shift_jis', { fatal: true }).decode(buffer) },
  {
    encoding: 'utf-16',
    decode: (buffer) => {
      const isBigEndian = buffer[0] === 0xfe && buffer[1] === 0xff;
      return new TextDecoder(isBigEndian ? 'utf-16be' : 'utf-16le', { fatal: true }).decode(buffer);
    },
  },
];

// 元データの列名（NFKC 正規化・空白除去後）→ 内部の列名
const COLUMN_ALIASES = {
  試合ID: 'game_id',
  チーム: 'team',
  背番号: 'jersey_number',
  アクション: 'action',
  エリア: 'area',
  位置X: 'x',
  位置Y: 'y',
  クォーター: 'quarter',
  '時刻[sec]': 'time_sec',
};

// 座標・エリアが無いことを表す値
const MISSING_VALUE = -1;

const SHOT_PATTERNS = [
  { pattern: /^3ポイント(成功|失敗)$/, points: 3 },
  { pattern: /^2ポイント(成功|失敗)$/, points: 2 },
  { pattern: /^(左|右)?レイアップ(成功|失敗)$/, points: 2 },
  { pattern: /^フリースロー(成功|失敗)$/, points: 1 },
];

const NUMERIC_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/** 入力フォルダに読み込めるファイルがない、または指定のファイルがない。 */
export class FileNotFoundError extends Error {}

/** ファイルの中身や名前が想定の形式ではない。 */
export class DataFormatError extends Error {}

/** 同じ名前のファイルがすでに入力フォルダにある。 */
export class FileExistsError extends Error {}

// ---------- 入力フォルダ ----------

export function getDataDir() {
  return path.resolve(BACKEND_DIR, process.env.DATA_DIR || DEFAULT_DATA_DIR);
}

/** 入力フォルダ内の対応ファイル一覧（Excel の一時ファイル ~$ は除く）。 */
export function listDataFiles() {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) return [];

  const files = [];
  for (const name of fs.readdirSync(dataDir).sort(compareAsc)) {
    const stat = fs.statSync(path.join(dataDir, name));
    if (name.startsWith('~$') || !stat.isFile()) continue;
    if (!SUPPORTED_EXTENSIONS.includes(path.extname(name).toLowerCase())) continue;
    files.push({ file_name: name, size_bytes: stat.size, modified_at: localIsoSeconds(stat.mtime) });
  }
  return files;
}

// ---------- アップロード ----------

// フォルダの区切りや OS が特別扱いする文字を含む名前は受け付けない（別フォルダへの書き込みを防ぐ）
const UNSAFE_FILE_NAME = /[<>:"/\\|?*\u0000-\u001f]|^\.|^~\$|[. ]$|^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i;

function assertSafeFileName(name) {
  if (UNSAFE_FILE_NAME.test(name) || path.basename(name) !== name) {
    throw new DataFormatError(`${name}: 使えないファイル名です`);
  }
  if (!SUPPORTED_EXTENSIONS.includes(path.extname(name).toLowerCase())) {
    throw new DataFormatError(`${name}: 対応していない形式です（${SUPPORTED_EXTENSIONS.join(' / ')} のみ）`);
  }
}

/** 一時ファイルに書いて実際に読み込み、プレーバイプレーとして読めることを確かめる。 */
async function assertReadable(name, buffer) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basketball-upload-'));
  try {
    const tempPath = path.join(tempDir, `upload${path.extname(name)}`);
    fs.writeFileSync(tempPath, buffer);
    const { events } = preprocess(await readTable(tempPath), name);
    if (events.length === 0) throw new DataFormatError(`${name}: 読み込める行がありません`);
  } catch (e) {
    if (e instanceof DataFormatError) throw e;
    throw new DataFormatError(`${name}: ファイルを読み取れませんでした`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * アップロードされたファイル（[{ originalname, buffer }]）を入力フォルダに保存し、ファイル名の配列を返す。
 *
 * すべて検証してから保存するので、1 つでも不正なら何も保存しない。既存のファイルは上書きしない。
 */
export async function saveUploadedFiles(files) {
  if (files.length === 0) throw new DataFormatError('ファイルが選ばれていません');

  const dataDir = getDataDir();
  const names = files.map((f) => f.originalname);
  for (const name of names) assertSafeFileName(name);
  if (new Set(names).size !== names.length) throw new DataFormatError('同じ名前のファイルが複数選ばれています');

  for (const name of names) {
    if (fs.existsSync(path.join(dataDir, name))) {
      throw new FileExistsError(`同じ名前のファイルがすでにあります: ${name}`);
    }
  }
  for (const file of files) await assertReadable(file.originalname, file.buffer);

  fs.mkdirSync(dataDir, { recursive: true });
  for (const file of files) {
    try {
      fs.writeFileSync(path.join(dataDir, file.originalname), file.buffer, { flag: 'wx' });
    } catch (e) {
      if (e.code === 'EEXIST') throw new FileExistsError(`同じ名前のファイルがすでにあります: ${file.originalname}`);
      throw e;
    }
  }
  return names;
}

// ---------- 汎用部品 ----------

/** 全角英数字を半角にし、前後の空白・タブを除く。 */
export function normalizeText(value) {
  return value.normalize('NFKC').trim();
}

function readCsv(filePath) {
  const buffer = fs.readFileSync(filePath);
  let lastError;
  for (const { encoding, decode } of CSV_DECODERS) {
    let text;
    try {
      text = decode(buffer);
    } catch (e) {
      lastError = e;
      continue;
    }
    try {
      const [header = [], ...rows] = parseCsv(text, {
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count_less: true,
      });
      return { header, rows, fileFormat: 'csv', encoding };
    } catch (e) {
      throw new DataFormatError(`CSV を読み取れませんでした: ${e.message}`);
    }
  }
  const tried = CSV_DECODERS.map((d) => d.encoding).join(', ');
  throw new DataFormatError(`文字コードを判定できませんでした（${tried} を試行）: ${lastError.message}`);
}

async function readExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  const rows = [];
  const columnCount = sheet.getRow(1).cellCount;
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells = [];
    for (let c = 1; c <= columnCount; c++) cells.push(row.getCell(c).text);
    rows.push(cells);
  }
  const [header = [], ...dataRows] = rows;
  return { header, rows: dataRows, fileFormat: 'xlsx', encoding: null };
}

/** CSV / Excel をすべて文字列として読む。{ header, rows, fileFormat, encoding } を返す。 */
export async function readTable(filePath) {
  return path.extname(filePath).toLowerCase() === '.csv' ? readCsv(filePath) : readExcel(filePath);
}

/** 列名を正規化してから aliases で内部名に置き換え、aliases にある列だけを持つ行の配列にする。 */
export function renameColumns({ header, rows }, aliases, source) {
  const normalized = header.map(normalizeText);
  const names = Object.keys(aliases);
  const missing = names.filter((name) => !normalized.includes(name));
  if (missing.length > 0) {
    throw new DataFormatError(`${source}: 必要な列がありません: ${missing.join(', ')}`);
  }
  const columns = names.map((name) => [aliases[name], normalized.indexOf(name)]);
  return rows.map((cells) => Object.fromEntries(columns.map(([key, index]) => [key, cells[index] ?? ''])));
}

function toNumber(value) {
  return NUMERIC_PATTERN.test(value) ? Number(value) : null;
}

function toCoordinate(value) {
  const number = toNumber(value);
  return number === MISSING_VALUE ? null : number;
}

// ---------- プレーバイプレー固有 ----------

/** アクション名から { is_shot, shot_points, is_made } を返す。 */
export function classifyShot(action) {
  for (const { pattern, points } of SHOT_PATTERNS) {
    if (pattern.test(action)) {
      return { is_shot: true, shot_points: points, is_made: action.endsWith('成功') };
    }
  }
  return { is_shot: false, shot_points: null, is_made: null };
}

/** 生の表を 1 ファイル分のイベント配列にする。{ events, warnings } を返す。 */
export function preprocess(table, fileName) {
  const events = [];
  let invalidCount = 0;

  for (const raw of renameColumns(table, COLUMN_ALIASES, fileName)) {
    const row = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, normalizeText(value)]));
    if (row.action === '') continue;

    const quarter = toNumber(row.quarter);
    const timeSec = toNumber(row.time_sec);
    if (quarter === null || timeSec === null) {
      invalidCount++;
      continue;
    }

    const area = toCoordinate(row.area);
    if (area !== null && !Number.isInteger(area)) {
      throw new DataFormatError(`${fileName}: エリアが整数ではありません: ${row.area}`);
    }

    const jersey = row.jersey_number.replaceAll('番', '');
    events.push({
      game_id: row.game_id,
      team: row.team,
      jersey_number: /^\d+$/.test(jersey) ? jersey : null,
      action: row.action,
      area,
      x: toCoordinate(row.x),
      y: toCoordinate(row.y),
      quarter: Math.trunc(quarter),
      time_sec: Math.trunc(timeSec),
      ...classifyShot(row.action),
      source_file: fileName,
    });
  }

  const warnings = invalidCount > 0 ? [`${fileName}: クォーターまたは時刻が読めない ${invalidCount} 行を除外しました`] : [];
  return { events, warnings };
}

/** 指定したファイル（null ならフォルダ内すべて）を読み込んで結合する。{ events, loaded } を返す。 */
export async function loadFiles(fileNames = null) {
  const dataDir = getDataDir();
  const available = listDataFiles().map((f) => f.file_name);

  let targets = available;
  if (fileNames !== null) {
    const unknown = fileNames.filter((name) => !available.includes(name));
    if (unknown.length > 0) {
      throw new FileNotFoundError(`入力フォルダにないファイルです: ${unknown.join(', ')}`);
    }
    targets = fileNames;
  }
  if (targets.length === 0) {
    throw new FileNotFoundError(`入力フォルダに読み込めるファイルがありません: ${dataDir}`);
  }

  const allEvents = [];
  const loaded = [];
  for (const name of targets) {
    const table = await readTable(path.join(dataDir, name));
    const { events, warnings } = preprocess(table, name);
    allEvents.push(...events);
    loaded.push({
      file_name: name,
      file_format: table.fileFormat,
      encoding: table.encoding,
      row_count: events.length,
      game_ids: uniqueSorted(events, 'game_id'),
      warnings,
    });
  }

  // 同じ試合が複数ファイルに入っていると二重に集計されるため警告する
  const filesByGame = new Map();
  for (const f of loaded) {
    for (const gameId of f.game_ids) {
      filesByGame.set(gameId, [...(filesByGame.get(gameId) ?? []), f.file_name]);
    }
  }
  for (const [gameId, names] of filesByGame) {
    if (names.length > 1) {
      loaded.at(-1).warnings.push(`試合ID ${gameId} が複数のファイルに含まれています: ${names.join(', ')}`);
    }
  }

  return { events: allEvents, loaded };
}
