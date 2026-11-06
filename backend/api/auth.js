/**
 * パスワードによるログイン。
 *
 * パスワードは環境変数 APP_PASSWORD の 1 つを全員で共有する。
 * ログインすると署名付きの Cookie を渡す。署名の鍵は起動ごとに作るので、再起動すると再ログインが必要になる。
 */
import crypto from 'node:crypto';

import { Router } from 'express';

import { HttpError } from '../core/utils.js';

export const MIN_PASSWORD_LENGTH = 8;

const COOKIE_NAME = 'session';
const SESSION_MS = 12 * 60 * 60 * 1000;

// 総当たり対策。IP は偽装できるので、サーバー全体で失敗回数を数える
const MAX_FAILURES_PER_WINDOW = 10;
const FAILURE_WINDOW_MS = 60 * 1000;

const SIGNING_KEY = crypto.randomBytes(32);

let failureCount = 0;
let failureWindowStart = 0;

const sign = (expiresAt) => crypto.createHmac('sha256', SIGNING_KEY).update(String(expiresAt)).digest('hex');

const sha256 = (text) => crypto.createHash('sha256').update(text).digest();

/** 長さに関係なく一定時間で比較する。 */
const isSamePassword = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

function readSessionCookie(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === COOKIE_NAME) return value ?? '';
  }
  return '';
}

function isAuthenticated(req) {
  const [expiresAt, signature] = readSessionCookie(req).split('.');
  if (!expiresAt || !signature || Number(expiresAt) <= Date.now()) return false;
  const expected = Buffer.from(sign(expiresAt));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    // HTTPS で公開するときは、前段のプロキシが x-forwarded-proto で知らせてくる
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };
}

function assertNotRateLimited() {
  if (Date.now() - failureWindowStart >= FAILURE_WINDOW_MS) {
    failureCount = 0;
    failureWindowStart = Date.now();
  }
  if (failureCount >= MAX_FAILURES_PER_WINDOW) {
    throw new HttpError(429, 'ログインの失敗が続いたため制限中です。1 分ほど待ってから試してください');
  }
}

export const authRouter = Router();

authRouter.get('/auth/status', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

authRouter.post('/auth/login', (req, res) => {
  assertNotRateLimited();
  const password = req.body?.password;
  if (typeof password !== 'string' || !isSamePassword(password, process.env.APP_PASSWORD)) {
    failureCount++;
    throw new HttpError(401, 'パスワードが違います');
  }
  const expiresAt = Date.now() + SESSION_MS;
  res.cookie(COOKIE_NAME, `${expiresAt}.${sign(expiresAt)}`, { ...cookieOptions(req), maxAge: SESSION_MS });
  res.json({ authenticated: true });
});

authRouter.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions(req));
  res.json({ authenticated: false });
});

/** これより後ろのエンドポイントはログインが必要になる。 */
export function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) throw new HttpError(401, 'ログインしてください');
  next();
}
