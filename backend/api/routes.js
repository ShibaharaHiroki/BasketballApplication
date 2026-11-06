/** API エンドポイント。処理は core/ に任せ、ここは薄く保つ。 */
import { Router } from 'express';
import multer from 'multer';

import { authRouter, requireAuth } from './auth.js';
import * as aggregations from '../core/aggregations.js';
import * as analysis from '../core/analysis.js';
import * as dataLoader from '../core/data_loader.js';
import { filterEvents } from '../core/filters.js';
import { HttpError, localIsoSeconds } from '../core/utils.js';
import { parseFilterRequest, parseGetEventsRequest, parseLoadDataRequest } from './validation.js';

const API_VERSION = '0.1.0';

const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_FILE_COUNT = 20;

const receiveUploads = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_FILE_BYTES, files: MAX_UPLOAD_FILE_COUNT },
  defParamCharset: 'utf8', // 日本語のファイル名を正しく受け取る
}).array('files');

export const router = Router();

router.use(authRouter);
router.use(requireAuth);

// 読み込んだイベント。サーバー全体で 1 つだけ持つ（利用者ごとには分かれない）
let loadedEvents = null;

// ---------- 共通部品 ----------

function getLoadedEvents() {
  if (loadedEvents === null) {
    throw new HttpError(400, 'データが読み込まれていません。先に /api/load-data を実行してください');
  }
  return loadedEvents;
}

// ---------- エンドポイント ----------

router.get('/health', (req, res) => {
  res.json({ status: 'ok', version: API_VERSION, timestamp: localIsoSeconds(new Date()) });
});

router.post('/list-files', (req, res) => {
  res.json({ data_dir: dataLoader.getDataDir(), files: dataLoader.listDataFiles() });
});

function handleUploadRequest(req, res, next) {
  receiveUploads(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(413, `ファイルが大きすぎます（上限 ${MAX_UPLOAD_FILE_BYTES / 1024 / 1024} MB）`));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new HttpError(413, `一度に送れるのは ${MAX_UPLOAD_FILE_COUNT} ファイルまでです`));
    }
    return next(new HttpError(400, 'アップロードの形式が正しくありません'));
  });
}

router.post('/upload-files', handleUploadRequest, async (req, res) => {
  try {
    res.json({ file_names: await dataLoader.saveUploadedFiles(req.files ?? []) });
  } catch (e) {
    if (e instanceof dataLoader.FileExistsError) throw new HttpError(409, e.message);
    if (e instanceof dataLoader.DataFormatError) throw new HttpError(422, e.message);
    throw e;
  }
});

router.post('/load-data', async (req, res) => {
  const { file_names: fileNames } = parseLoadDataRequest(req.body);
  let result;
  try {
    result = await dataLoader.loadFiles(fileNames);
  } catch (e) {
    if (e instanceof dataLoader.FileNotFoundError) throw new HttpError(404, e.message);
    if (e instanceof dataLoader.DataFormatError) throw new HttpError(422, e.message);
    throw e;
  }

  loadedEvents = result.events;

  res.json({
    files: result.loaded.map(({ warnings, ...summary }) => summary),
    warnings: result.loaded.flatMap((f) => f.warnings),
    ...aggregations.summarizeEvents(result.events),
  });
});

router.post('/get-events', (req, res) => {
  const { filter, offset, limit } = parseGetEventsRequest(req.body);
  const events = filterEvents(getLoadedEvents(), filter);
  res.json({ total: events.length, offset, limit, events: events.slice(offset, offset + limit) });
});

router.post('/get-shot-chart', (req, res) => {
  const { filter } = parseFilterRequest(req.body);
  const shots = filterEvents(getLoadedEvents(), { ...filter, shots_only: true });
  res.json(analysis.buildShotChart(shots));
});

router.post('/get-box-score', (req, res) => {
  const { filter } = parseFilterRequest(req.body);
  res.json(aggregations.buildBoxScore(getLoadedEvents(), filter));
});

router.post('/get-contribution', (req, res) => {
  const { filter } = parseFilterRequest(req.body);
  res.json(analysis.buildContribution(getLoadedEvents(), filter));
});
