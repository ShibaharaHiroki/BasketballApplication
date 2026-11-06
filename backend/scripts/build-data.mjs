/**
 * 入力フォルダの CSV / Excel を、公開用の JSON に変換する（npm run data:build）。
 *
 * 出力先: frontend/public/data/（ビルドすると build/data/ に入る）
 *   index.json          ファイルの一覧
 *   events-<ハッシュ>.json   1 ファイル分のイベント
 *
 * 大学のサーバーでは日本語のファイル名が使えないので、出力のファイル名は中身のハッシュにする。
 * 1 つでも読めないファイルがあれば、出力を変更せずに止まる。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { getDataDir, listDataFiles, loadFiles } from '../core/data_loader.js';

const BACKEND_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUTPUT_DIR = path.resolve(BACKEND_DIR, '../frontend/public/data');

dotenv.config({ path: path.join(BACKEND_DIR, '.env'), quiet: true });

const sources = listDataFiles();
if (sources.length === 0) {
  console.error(`[error] 入力フォルダに CSV / Excel がありません: ${getDataDir()}`);
  process.exit(1);
}

const outputs = new Map();
const files = [];
try {
  for (const { file_name: name, size_bytes, modified_at } of sources) {
    const { events, loaded } = await loadFiles([name]);
    const json = JSON.stringify(events);
    const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
    const dataFile = `events-${hash}.json`;
    outputs.set(dataFile, json);
    const { file_format, encoding, row_count, game_ids, warnings } = loaded[0];
    files.push({ file_name: name, data_file: dataFile, size_bytes, modified_at, file_format, encoding, row_count, game_ids, warnings });
    for (const warning of warnings) console.warn(`[warn] ${warning}`);
  }
} catch (e) {
  console.error(`[error] ${e.message}`);
  process.exit(1);
}

// 検証がすべて通ってから、前回の出力と入れ替える
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [name, json] of outputs) fs.writeFileSync(path.join(OUTPUT_DIR, name), json);
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify({ files }));

console.log(`[ok] ${files.length} ファイルを変換しました: ${OUTPUT_DIR}`);
