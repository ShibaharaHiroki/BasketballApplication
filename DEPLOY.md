# 大学サーバーへの公開

アプリを `https://www.research.kobe-u.ac.jp/csi-val/basketball/` に、関係者だけが見られる形で公開する手順です。サーバーではプログラムが動かないので、アプリは静的ファイルとして置き、計算はブラウザで行います。

- 試合データを追加できるのは、サーバーにファイルを送れる管理者だけです。ブラウザからは追加できません。
- パスワードを知っている人は、全試合のデータをダウンロードできます。
- パスワードファイルと試合データは、Git に入れないでください。

## 初回の設定

サーバーへの接続は、学内ネットワーク（学外からは VPN）の PC から、WinSCP などで行います。

1. 大学の「Basic 認証」マニュアル（学内限定）の手順で `.htpasswd` を作り、`/wwwhome/rental/svc08345/htpasswd/.htpasswd` に置きます。`public_html` の中には置かないでください。
2. `frontend/public/.htaccess` を `public_html/basketball/.htaccess` に置きます。
3. 試合データを送る前に、次を確かめます（`basketball/` にダミーの `test.html` を置いて開きます）。
   - 学外（Wi-Fi を切ったスマートフォンなど）と学内の両方で、パスワードを求められる
   - 間違ったパスワードでは表示されない

   確認できないうちは、次へ進まないでください。

## 公開と更新

1. 試合データの CSV / Excel を `backend/data/input/` に置きます。
2. ビルドします。`frontend/public/data/` に JSON ができ、`frontend/build/` に公開用のファイルがまとまります。

   ```bash
   npm run build:static
   ```

3. `frontend/build/` の**中身**を `public_html/basketball/` に置きます。隠しファイルの `.htaccess` も含みます。古いデータを残さないよう、`basketball/data/` と `basketball/static/` の中の前回の分は消します。`basketball/.htaccess` は消さないでください。
4. ブラウザで開き、パスワードを求められることと、試合データが読み込めることを確かめます。

## csi-val との関係

このアプリは、`csi-val` と同じ `public_html/` に置きますが、`csi-val` のリポジトリには含まれません。`csi-val` は `basketball/` を自分のファイルとして扱わないので、公開するときは次のことに注意してください。**`csi-val` の公開担当全員に伝えてください。**

| `csi-val` の操作 | `basketball/` への影響 | 注意 |
| ---------------- | ---------------------- | ---- |
| `pnpm deploy:kobe` | 消えません | 「サーバにだけあるファイル」の一覧に出ますが、問題ありません |
| `pnpm deploy:kobe --prune` | **消えます**（`.htaccess` は残ります） | 削除の確認で一覧に `basketball/` があれば、`N` と答えます |
| 手動での公開 | 消すと消えます | `public_html/` の前回の分を消すときに、`basketball/` を対象から外します |

`--prune` の確認で `N` と答えると、一覧のファイルはどれも消えません。`csi-val` の古いファイルだけを消したいときは、WinSCP などでそのファイルを指定して消します。

誤って消したときは、「公開と更新」の手順でもう一度置けば元に戻ります。元の CSV / Excel は Git に入っていないので、管理者の手元に残しておいてください。
