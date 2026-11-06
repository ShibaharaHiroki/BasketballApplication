/** BasketballApplication サーバーのエントリーポイント。API とビルド済みの画面を同じポートで配信する。 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';

import { MIN_PASSWORD_LENGTH } from './api/auth.js';
import { router } from './api/routes.js';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_BUILD_DIR = path.join(BACKEND_DIR, '..', 'frontend', 'build');

dotenv.config({ path: path.join(BACKEND_DIR, '.env'), quiet: true });

// パスワードなしで公開してしまわないよう、未設定なら起動しない
if ((process.env.APP_PASSWORD ?? '').length < MIN_PASSWORD_LENGTH) {
  console.error(`[error] 環境変数 APP_PASSWORD に ${MIN_PASSWORD_LENGTH} 文字以上のパスワードを設定してください（backend/.env など）`);
  process.exit(1);
}

const app = express();

app.use('/api', express.json(), router);
app.use('/api', (req, res) => res.status(404).json({ detail: 'Not Found' }));
app.use(express.static(FRONTEND_BUILD_DIR));

// エラーは { detail } の形で返す（フロントの extractErrorMessage が読む）。
// 想定外のエラーの内容は外部に見せず、サーバーのログにだけ残す。
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ detail: status >= 500 ? 'Internal Server Error' : err.message });
});

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8000);

app.listen(port, host, () => {
  console.log(`[start] http://${host}:${port} でサーバーを起動しました`);
});
