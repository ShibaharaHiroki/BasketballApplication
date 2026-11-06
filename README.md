# BasketballApplication

バスケットボールの指導者・選手向けの、データ分析用可視化 Web アプリです。
既存システム「BasketballShootPerformanceAnalysis」と同じアーキテクチャ・技術スタックで構成しています。

## 主な機能

プレーバイプレーのデータ（CSV / Excel）を読み込み、次の画面で表示します。
画面上部の絞り込み（試合・チーム・選手・クォーター）は、すべての画面で共通です。
レイアウトは左の操作パネルと中央の表示領域の 2 列です（右側の詳細パネルは置きません）。

| 画面 | 内容 |
|---|---|
| シュートチャート | コート上のシュート位置（成功 ● / 失敗 ×）。エリア別成功率の表示切り替え |
| ボックススコア | クォーター別得点、選手ごとの出場時間・得点・FG / 3P / FT・リバウンド・アシストなど |
| データ | 読み込んだイベントの一覧（ページ送り） |

## 技術スタック

| 区分 | 技術 |
|---|---|
| バックエンド | Python 3.10+ / FastAPI / Uvicorn / Pydantic v2 |
| データ処理・分析 | NumPy / Pandas / openpyxl / scikit-learn / SciPy |
| 設定 | python-dotenv（`backend/.env`） |
| フロントエンド | React 18 + TypeScript（react-scripts 5 + react-app-rewired） |
| UI | Chakra UI v2（@chakra-ui/icons, Emotion, Framer Motion） |
| グラフ | Plotly.js / react-plotly.js |
| 通信 | Axios |

## 前提条件

- Windows 10 / 11
- Python 3.10 以上（`python` コマンドで実行できること）
- Node.js 18 以上 / npm

## セットアップと起動

### かんたん起動（推奨）

1. `start_backend.bat` をダブルクリックします（初回は仮想環境の作成とパッケージのインストールを行います）。
2. `start_frontend.bat` をダブルクリックします（初回は `npm install` を行います）。
3. ブラウザで http://localhost:3000 を開きます。

### 手動で起動する場合

```bash
# バックエンド
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# フロントエンド（別のターミナルで）
cd frontend
npm install
npm start
```

### 動作確認

- API: http://localhost:8000/api/health が `{"status":"ok", ...}` を返すこと
- API ドキュメント: http://localhost:8000/docs
- 画面: 左のサイドバーの「バックエンド接続」に緑の `ok` バッジが表示され、「読み込む」を押すとシュートチャートが表示されること

### 入力データ

分析対象のファイル（CSV / Excel）は `backend/data/input/` に置いてください。
別の場所を使う場合は、`backend/.env` の `DATA_DIR` を変更します。

- 対応形式: `.csv`（文字コードは UTF-8 / Shift_JIS(cp932) / UTF-16 を自動判定）、`.xlsx`、`.xlsm`
- 複数ファイルを置くと、画面で選んだファイルを 1 つにまとめて読み込みます
- 必要な列: `試合ID` `チーム` `背番号` `アクション` `エリア` `位置X` `位置Y` `クォーター` `時刻[sec]`
- 読み込み時の前処理
  - 全角英数字を半角にそろえ、前後の空白・タブを除く
  - `エリア` `位置X` `位置Y` の `-1` は「値なし」として扱う
  - `?番` のように背番号が不明な行は、背番号を空にする
  - アクション名からシュートを判定し、`is_shot`（シュートか）、`shot_points`（1/2/3）、`is_made`（成功か）を付け加える
- 同じ試合IDが複数のファイルに含まれていると、二重集計を防ぐため警告を表示します

### スタッツ計算の前提

- **シュート座標**: `位置X` はエンドラインからの距離、`位置Y` はコートの幅方向。両チームとも同じハーフコートに記録されている前提です。
  データ座標とメートルの換算値は `backend/core/court.py` にあり、サンプルデータの 2P / 3P が 3P ライン（FIBA 規格）と一致するように推定しています。
  記録ツールが変わって点の位置がずれる場合は、この値を調整してください。
- **座標のないシュート**（レイアップなど）は、シュートチャートの点には出ません（本数はチャート上部に表示）。ボックススコアの成功率には含めます。
- **出場時間**: `選手交代(出)` = コートに出る、`選手交代(戻)` = ベンチに戻る、として計算します。最初の交代が「戻」の選手を先発とみなします。
  1 クォーター 10 分、延長 5 分です（`backend/core/aggregations.py` の定数）。
- **背番号不明（?番）** の記録は、ボックススコアの「チーム・背番号不明」の行にまとめ、チーム合計には含めます。

### 環境変数

| ファイル | 変数 | 既定値 | 説明 |
|---|---|---|---|
| `backend/.env` | `HOST` / `PORT` | `127.0.0.1` / `8000` | `python main.py` で起動するときの待ち受け先 |
| `backend/.env` | `DATA_DIR` | `data/input` | 入力 CSV を置くフォルダ（`backend/` からの相対パス、または絶対パス） |
| `frontend/.env` | `REACT_APP_API_URL` | `http://localhost:8000` | バックエンドの URL |

## プロジェクト構成

```
BasketballApplication/
├── backend/
│   ├── main.py              # FastAPI アプリ。CORS 設定と router の /api 登録
│   ├── models.py            # リクエスト/レスポンスの Pydantic モデル（共通の EventFilter を含む）
│   ├── api/routes.py        # エンドポイント（処理は core/ に任せる）
│   ├── core/
│   │   ├── data_loader.py   # データの読み込みと前処理
│   │   ├── filters.py       # イベントの絞り込み（全 API 共通）
│   │   ├── aggregations.py  # 集計処理（ボックススコア・出場時間）
│   │   ├── analysis.py      # 分析アルゴリズム（シュートチャート）
│   │   ├── court.py         # コート座標の換算と寸法
│   │   └── utils.py         # DataFrame → レコード変換、ページ分割
│   ├── data/                # キャッシュ用 JSON など
│   │   └── input/           # 入力 CSV / Excel を置くフォルダ
│   ├── requirements.txt
│   └── Procfile
├── frontend/
│   ├── config-overrides.js  # webpack 5 用 Node ポリフィル設定
│   └── src/
│       ├── App.tsx              # ChakraProvider > AppProvider > AppContent
│       ├── context/AppContext.tsx  # アプリ全体の状態
│       ├── services/api.ts      # Axios クライアント
│       ├── types/index.ts       # backend/models.py に対応する型
│       ├── hooks/               # 共通フック（API 呼び出し、データ操作）
│       ├── utils/               # フォーマット、コート描画、シュート集計
│       └── components/
│           ├── common/          # 汎用 UI 部品（どの画面でも使える）
│           ├── data/            # データ読み込み・閲覧・絞り込みの機能部品
│           ├── shot/            # シュートチャートの機能部品
│           ├── boxscore/        # ボックススコアの機能部品
│           └── Sidebar / MainPanel.tsx  # レイアウト（部品を並べるだけ）
├── start_backend.bat
└── start_frontend.bat
```

## 開発方針（部品化と再利用）

機能は、下の共通部品を組み合わせて作ります。新しい機能を作るときは、まず既存の部品で組めないかを確認し、
2 か所以上で使いそうな処理は部品として切り出します。

### バックエンドの共通部品

| 部品 | 場所 | 用途 |
|---|---|---|
| `EventFilter` | models.py | 試合・チーム・クォーター・背番号・シュートのみの絞り込み条件。イベントを扱う API のリクエストに含める |
| `get_filtered_events()` | api/routes.py | 読み込み済みデータを `EventFilter` で絞る。分析系エンドポイントはここから始める |
| `filter_events()` | core/filters.py | DataFrame の絞り込み本体 |
| `summarize_events()` / `unique_sorted()` / `list_players()` | core/aggregations.py | 読み込んだデータの概要（試合・チーム・クォーター・選手の一覧） |
| `dataframe_to_records()` / `paginate()` / `ratio()` / `as_bool()` | core/utils.py | 欠損を None にしたレコード化、ページ分割、割合（分母 0 は None）、nullable bool の変換 |
| `stat_line()` | core/aggregations.py | イベントの集合から 1 行分のスタッツ（得点・FG・3P・FT・リバウンドなど）。選手の行とチーム合計で共通 |
| `on_court_intervals()` / `overlap_sec()` | core/aggregations.py | 選手交代からコートにいた時間帯を求め、指定区間との重なりを数える |
| `court_geometry()` / `shot_distance_m()` | core/court.py | コートの換算値・寸法、リングからの距離 |
| `read_table()` / `normalize_text()` / `rename_columns()` | core/data_loader.py | CSV/Excel の読み込み（文字コード自動判定）、全角→半角、列名の対応付け |

### フロントエンドの共通部品

| 部品 | 場所 | 用途 |
|---|---|---|
| `useApiAction` | hooks/ | API 呼び出しの isLoading・error・トースト表示をまとめて行う |
| `useAutoFetch` | hooks/ | 絞り込み条件などが変わるたびに API を呼び直す（古い結果は捨てる）。表・グラフの画面で共通 |
| `useReloadBackendInfo` / `useLoadSelectedFiles` | hooks/ | 接続確認・ファイル一覧の再取得、選択ファイルの読み込み |
| `BaseChart` | components/common/ | Plotly の共通ラッパー（共通スタイル）。data / layout は useMemo して渡す |
| `SidePanel` / `PanelSection` | components/common/ | サイドパネルの枠、見出し付きセクション |
| `DataTable` | components/common/ | 列定義を渡すだけで描ける汎用テーブル（合計行 `footerRows`、詰めた表示 `dense`） |
| `Pagination` | components/common/ | 件数表示と前へ・次へ |
| `SelectFilter` / `ToggleFilter` | components/common/ | 「すべて / 1 つ選ぶ」のドロップダウン、オン/オフスイッチ |
| `EmptyState` | components/common/ | データが無いときの表示 |
| `EventFilterBar` | components/data/ | 共通の絞り込み条件（AppContext の `eventFilter`）を編集する。グラフ画面でも使う |
| `formatTime` / `formatPct` / `formatMadeAttempts` / `formatQuarter` / `playerLabel` など | utils/format.ts | 表示用フォーマット |
| `buildCourtShapes()` / `toCourtMeters()` / `courtAxes()` | utils/court.ts | FIBA 規格のコートを Plotly に描く、データ座標 → メートル変換 |

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/health` | 稼働確認 |
| POST | `/api/list-files` | 入力フォルダのファイル一覧 |
| POST | `/api/load-data` | ファイルを読み込み、前処理してメモリに保持する（`file_names` が null ならすべて） |
| POST | `/api/get-events` | 読み込んだイベントを `EventFilter` で絞り込み、ページ単位で取得 |
| POST | `/api/get-shot-chart` | シュートの点（座標・成否・距離）、エリア別成功率、座標あり/なしの本数、コートの寸法 |
| POST | `/api/get-box-score` | チームごとのボックススコア、クォーター別得点 |
