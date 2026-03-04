# CPU対戦機能 要件定義書（Rev2）

## 1. 概要

電気イスゲームにCPU対戦モードを追加する。プレイヤーが1人でもゲームを楽しめるように、CPUが対戦相手として振る舞う機能を実装する。

### Rev1からの方針変更

- **Firestore不使用**: 通信節約のため、CPU対戦はFirestoreに接続せずクライアントサイドで完結させる
- **難易度→性格**: CPUの難易度選択（かんたん/ふつう/むずかしい）を廃止し、CPUに「性格」を持たせてバリエーションを設ける。性格はUIとして明示しない

---

## 2. 機能要件

### 2.1 CPU対戦モードの開始

- トップ画面をセクション分けし、「ひとりで遊ぶ」セクションにCPU対戦ボタン、「オンライン対戦」セクションに既存ボタンを配置する
  - CPU対戦は1人で即座に遊べるため最上部に配置
  - セクションラベル（text-gray-500、区切り線付き）で意図を明確化
- **CPU対戦ボタン押下で即ゲーム開始**（難易度選択ダイアログは不要）
- CPUの性格はクライアント側でランダムに決定される（プレイヤーには見えない）
- 対人戦の「相手入室待ち」画面（CreaterWaitingStartDialog）はスキップし、StartTurnDialogから開始する

### 2.2 CPU対戦のゲームルール

- ゲームルールは対人戦と完全に同一
  - 12脚の椅子、攻撃側/防御側の交替、感電/セーフの判定
  - 勝利条件: 40点到達 / 相手3回感電 / 残り椅子1脚で高得点者勝利
- 先攻（最初の攻撃側）はプレイヤー固定とする

### 2.3 CPUの性格バリエーション

性格はUIに明示せず、プレイヤーが対戦中に「このCPUはこういうタイプかも」と推測する楽しさを提供する。

#### 性格一覧（7種）

| 性格 | コンセプト | 体感難易度 |
|------|-----------|----------|
| **チキン**（臆病） | リスク回避徹底。低得点でコツコツ稼ぐ | やさしめ |
| **ギャンブラー**（博打好き） | 高得点を一気に狙う。一発逆転or大事故 | ムラがある |
| **アナリスト**（分析家） | 期待値重視。勝利条件を逆算して最適手を打つ | 中〜やや難 |
| **ミラー**（模倣者） | プレイヤーの直前行動の番号帯を真似る | プレイヤー依存 |
| **リベンジャー**（復讐者） | 感電回数が増えるほど攻撃的になる | 状況依存 |
| **ハンター**（狩人） | 序盤探索→中盤以降パターン分析で狙い撃ち | やや難〜難 |
| **トリックスター**（いたずら者） | 毎ターン他6性格の戦略をランダム採用。予測不能 | ムラが激しい |

#### 各性格のアルゴリズム概要

**チキン:**
- 攻撃: 低番号を強く優先（下位1/3に80%の重み）
- 防御: 低〜中番号にトラップ（相手も安全策を取ると想定）

**ギャンブラー:**
- 攻撃: 高番号に極端に偏った選択（上位1/3に70%の重み）
- 防御: 高番号にトラップ集中（相手も高得点を狙うと想定）

**アナリスト:**
- 攻撃: 期待値計算（椅子番号 × セーフ確率 − 現在得点 × 感電確率）で70%最適手、30%ランダム
- 防御: 相手の勝利条件を逆算し、到達させる椅子を重点トラップ

**ミラー:**
- 攻撃: 前ターンで相手が設置した電気椅子と同じ番号帯を選択。履歴なしはランダム
- 防御: 前ターンで相手が座った椅子と同じ番号帯にトラップ

**リベンジャー:**
- 攻撃: 感電0回→中番号中心、感電1回→高番号寄り、感電2回→上位1/3に90%（捨て身）
- 防御: 直近で感電させられた→高番号に全力トラップ、平常時→均等配置

**ハンター:**
- 攻撃: 履歴4ターン未満はランダム。以降は相手のトラップ傾向を分析し手薄な番号帯を狙う
- 防御: 直近3回の着席履歴を加重平均し、最も座られやすい番号帯にトラップ

**トリックスター:**
- 攻撃/防御: 毎ターン他6性格のいずれかの戦略をランダム採用。同じ戦略を2連続で使わない

#### 共通仕様

- 全性格に状況補正を薄く適用（勝利リーチ時のボーナス、感電2回時のリスク回避）
- 意思決定には確率的な揺らぎを入れ、完全に予測可能にならないようにする
- パターン履歴はゲーム内メモリで保持、ゲーム終了でリセット（永続化不要）

#### 性格の選択方法

- ゲーム開始時に7種から完全ランダムで1つ選択
- 1ゲーム中は性格固定（状況補正はあるが性格自体は変わらない）
- 連続同性格を回避（前回と別の性格になる。ブラウザセッション中のみ記憶）

#### AI決定関数のインターフェース

```typescript
type CpuPersonality =
  | "chicken" | "gambler" | "analyst" | "mirror"
  | "revenger" | "hunter" | "trickster";

type AIContext = {
  personality: CpuPersonality;
  remainingChairs: number[];
  myPoint: number;
  opponentPoint: number;
  myShockedCount: number;
  opponentShockedCount: number;
  roundCount: number;
  history: {
    electricChairs: number[];
    seatedChairs: number[];
  };
};

type AIDecision = {
  selectedChair: number;
  thinkingTimeMs: number;
};

function selectChairAsAttacker(ctx: AIContext): AIDecision;
function selectChairAsDefender(ctx: AIContext): AIDecision;
```

### 2.4 CPUの応答演出

- CPUのターンでは「{表示名}が〜しています...」のメッセージを表示する
  - 対人戦の「相手」→ CPUの表示名にテキストを切り替える
  - utility関数 `getOpponentLabel(isCpu, displayName?)` で表示名/「相手」を返す
- CPUの応答には以下の遅延を入れる（ランダムにばらつかせる）:
  - 電気椅子設置（setting）: 1.5〜3秒
  - 座る椅子選択（sitting）: 1.5〜3秒
  - 電流起動（activating）: 0.8〜1.5秒
  - 結果確認: 自動（プレイヤーが「次へ」を押した時点で即遷移）

#### activatingフェーズのCPU自動処理

- **CPUが守備側の場合**: CPUが自動で電流を起動する。プレイヤーには「{表示名}が電流を起動します...」を表示し、0.8〜1.5秒後に自動起動→resultフェーズへ
- **CPUが攻撃側の場合**: プレイヤーが「起動」ボタンを押す（対人戦と同じ）

### 2.5 ターン結果確認

- CPU対戦時、プレイヤーが「次へ」を押した時点で即座に次のターンに遷移する
- CPUの結果確認待ちは発生させない

### 2.6 ゲーム結果画面

- ゲーム終了後に以下のボタンを表示する:
  - **もういちど**: 新しい性格のCPUと即再戦
  - **トップにもどる**: トップ画面に戻る
- 対戦相手の表示名は性格ごとに異なる人名を表示する（人と対戦している感を出すため）
  - 性格自体は明示しない（名前から性格が推測できないようにする）
  - 表示名と性格は別々に定義し、対応を入れ替えられるようにする

### 2.7 対人戦との画面差分

| 要素 | 対人戦 | CPU対戦 |
|------|-------|--------|
| ルームID表示/コピー | あり | なし |
| CreaterWaitingStartDialog | あり（相手入室待ち） | なし（即開始） |
| Ready待機 | あり | なし（CPU即Ready） |
| PlayerStatus 対戦相手名 | "相手" | CPUの表示名（例: "ヒヨリ"） |
| InstructionMessage | 「相手が〜しています」 | 「{表示名}が〜しています」 |
| RoomPhaseHandlers メッセージ | 「相手が電気椅子を仕掛けました」 | 「{表示名}が電気椅子を仕掛けました」 |
| TurnResultDialog | 「相手の」スコア | 「{表示名}の」スコア |
| ターン結果確認 | 両者確認が必要 | プレイヤー確認のみ（CPU自動） |
| activating（CPU守備時） | プレイヤーが起動ボタン押下 | CPU自動起動 |
| ゲーム結果画面 | 「ゲーム終了」のみ | 「もういちど」「トップに戻る」 |

---

## 3. 技術要件

### 3.1 アーキテクチャ方針

- CPU対戦は**Firestoreを使用せず、クライアントサイドで完結**させる（通信ゼロ）
- ゲーム状態は**useReducer**でローカル管理する
- ゲームロジック（感電判定、スコア計算、勝敗判定、ターン遷移）は**純粋関数として切り出し**、Server Actions（対人戦）とReducer（CPU対戦）の両方から共有する
- 既存の対人戦コードへの影響を最小限にし、CPU対戦固有のロジックは新規モジュールとして追加する

### 3.2 データモデル

#### 既存GameRoom型は変更しない

CPU対戦用の型をスーパーセットとして定義する:

```typescript
// types/room.ts に追加

export type CpuPersonality =
  | "chicken" | "gambler" | "analyst" | "mirror"
  | "revenger" | "hunter" | "trickster";

// 表示名の定義（性格とは独立。対応を入れ替え可能）
export const CPU_DISPLAY_NAMES: Record<CpuPersonality, string> = {
  chicken: "ヒヨリ",
  gambler: "カケル",
  analyst: "リクト",
  mirror: "マネミ",
  revenger: "ヤイバ",
  hunter: "サグル",
  trickster: "イタズ",
};

export type CpuGameRoom = GameRoom & {
  isCpuBattle: true;
  cpuPlayerId: string;
  cpuPersonality: CpuPersonality;
  cpuDisplayName: string;
};
```

- `GameRoom`型は変更しない → 対人戦の既存コードに影響なし
- `CpuGameRoom`は`GameRoom`のスーパーセット → `GameRoom`を受け取るコンポーネントにそのまま渡せる

### 3.3 ゲームロジックの純粋関数化

既存Server Actionsからゲームロジックを純粋関数として切り出す:

```typescript
// features/room/logic/gameLogic.ts（新規）
// "use server"も"use client"も付けない = どこからでもimport可能

export function applyActivation(room: GameRoom): GameRoom;
// 元: activateAction (action.ts:120-190) のロジック部分
// 感電判定 → スコア更新 → 勝敗判定 → resultフェーズへ遷移

export function determineWinner(players: Player[], remainingChairs: number[], attackerId: string): string | null;
// 元: activateAction内の判定ロジック (action.ts:149-168)

export function applyChangeTurn(room: GameRoom): GameRoom;
// 元: changeTurnAction内のコールバック (action.ts:216-237)
```

**Server Actionsのリファクタリング:**
- 既存のServer Actionsは「純粋関数を呼ぶ → Firestoreに保存」の薄いラッパーになる
- ゲームロジックの二重管理をゼロにする

### 3.4 useReducerによるCPU対戦の状態管理

```typescript
type CpuGameAction =
  | { type: "SELECT_ELECTRIC_CHAIR"; chair: number }
  | { type: "SELECT_SEATED_CHAIR"; chair: number }
  | { type: "ACTIVATE" }
  | { type: "SHOW_RESULT" }
  | { type: "CHANGE_TURN" };

function cpuGameReducer(state: CpuGameRoom, action: CpuGameAction): CpuGameRoom {
  switch (action.type) {
    case "ACTIVATE":
      return applyActivation(state);  // 純粋関数を呼ぶだけ
    case "CHANGE_TURN":
      return applyChangeTurn(state);  // 純粋関数を呼ぶだけ
    // ...
  }
}
```

### 3.5 CPUの自動応答

`useCpuAutoPlay` hookでsetTimeoutベースの自動応答を実装する。

```
データフロー（通信ゼロ）:
dispatch → reducer(gameLogic) → state更新 → 再レンダリング
  → useCpuAutoPlayがCPUのターンを検知 → setTimeout → dispatch
```

### 3.6 ルーティング

| パス | 用途 |
|------|------|
| `/` | トップ画面（「ひとりで遊ぶ」「ルーム作成」「ルーム入室」） |
| `/room/[roomId]` | 対人戦（既存、変更なし） |
| `/cpu` | CPU対戦画面（新規、パラメータ不要） |

- CPU対戦ページは全体が`"use client"`で完結
- Cookie/middleware不要

### 3.7 新規ファイル構成

```
web/
├── app/
│   └── cpu/
│       └── page.tsx                      # CPU対戦ページ（"use client"）
├── features/
│   ├── room/
│   │   └── logic/
│   │       └── gameLogic.ts              # 共有純粋関数（Server Actions/Reducer共用）
│   └── cpu-room/
│       ├── page/
│       │   └── CpuRoom.tsx               # CPU対戦メインコンポーネント
│       ├── hooks/
│       │   ├── useCpuGame.ts             # useReducer + 初期状態生成
│       │   ├── useCpuAutoPlay.ts         # CPU自動応答（setTimeout）
│       │   └── useCpuRoomActions.ts      # dispatch版アクション
│       └── logic/
│           └── cpuPlayer.ts              # CPU性格別意思決定ロジック
└── types/
    └── room.ts                           # CpuGameRoom, CpuPersonality型を追加（既存型は変更なし）
```

### 3.8 既存ファイルの変更

| ファイル | 変更内容 |
|---------|---------|
| `features/room/action.ts` | `activateAction`, `changeTurnAction`をリファクタリング（純粋関数呼び出し+Firestore保存の薄いラッパー化） |
| `features/top/page/Top.tsx` | 「ひとりで遊ぶ」ボタン追加 |
| `features/top/components/TopOperations.tsx` | セクション分け + CPU対戦ボタン追加 |
| `features/room/components/PlayerStatus.tsx` | `isCpu`で名前を「CPU」に切替 |
| `features/room/components/InstructionMessage.tsx` | `isCpuBattle`でテキスト切替 |
| `features/room/components/dialogs/GameResultDialog.tsx` | CPU対戦用に「もういちど」「トップに戻る」の2ボタン化 |
| `features/room/components/dialogs/TurnResultDialog.tsx` | テキスト変更 |
| `features/room/hooks/useRoomPhaseHandlers.ts` | メッセージ変更 |

### 3.9 既存Hooksの再利用方針

| Hook | CPU対戦での扱い |
|------|----------------|
| `useRoomWatcher` | **不使用**（Firestore監視不要） |
| `usePlayerOperation` | **そのまま再利用**（シグネチャ互換、データソースがReducer stateに変わるだけ） |
| `useRoomEffect` | **そのまま再利用**（コールバックの差し替えで対応） |
| `useRoomPhaseHandlers` | **そのまま再利用** |
| `useRoomActions` | **CPU用に`useCpuRoomActions`を新規作成**（dispatch版） |
| `useRoomDialogs` | **そのまま再利用** |

### 3.10 コンポーネント共通化

#### そのまま再利用
- `Chair.tsx`, `ChairContainer.tsx`, `RoomContainer.tsx`
- `RoundStatus.tsx`, `GameStatusContainer.tsx`
- `ActivateEffect.tsx`, `StartTurnDialog.tsx`
- `InstructionContainer.tsx`, `PlayerStatusContainer.tsx`

#### props/条件分岐が必要
- `PlayerStatus.tsx`（`isCpu`で名前を「CPU」に切替）
- `InstructionMessage.tsx`（`isCpuBattle`でテキスト切替）
- `GameResultDialog.tsx`（CPU対戦時は2ボタン化）
- `TurnResultDialog.tsx`（テキスト変更）
- `useRoomPhaseHandlers.ts`（メッセージ変更）

#### CPU対戦では不使用
- `CreaterWaitingStartDialog.tsx`
- `JoinDialog.tsx`

### 3.11 表示テキスト切替の設計

- utility関数 `getOpponentLabel(roomData: GameRoom | CpuGameRoom): string` を新規作成
  - CPU対戦: `roomData.cpuDisplayName` を返す（例: "ヒヨリ"）
  - 対人戦: "相手" を返す
- 各コンポーネントに`roomData`を渡し、表示名を動的に取得する
- `CPU_DISPLAY_NAMES`マッピングは`types/room.ts`に定義し、ルーム初期化時に`cpuDisplayName`へセットする
  - 表示名と性格の対応は`CPU_DISPLAY_NAMES`の値を入れ替えるだけで変更可能

---

## 4. 非機能要件

### 4.1 パフォーマンス

- CPU対戦はクライアントサイド完結のため、ネットワーク遅延なし
- CPUの応答遅延はsetTimeoutによる演出のみ（1.5〜3秒）
- ゲーム全体のテンポを損なわないこと

### 4.2 通信コスト

- CPU対戦ではFirestoreへの読み書きは一切発生しない
- 対人戦の既存Firestoreコストに影響なし

### 4.3 拡張性

- 新しい性格の追加が容易な設計とすること（`CpuPersonality`型にユニオン追加 + 攻撃/防御関数の実装のみ）
- CPUの意思決定ロジックは独立したモジュール（`cpuPlayer.ts`）とし、入れ替え・改良が容易であること
- ゲームロジック（`gameLogic.ts`）は対人戦/CPU対戦で完全共有し、二重管理を回避すること
- **性格の決定とルーム初期化を分離すること**: `createInitialCpuRoom(personality: CpuPersonality)`は性格を引数で受け取り、性格のランダム選択ロジック（`pickRandomPersonality`）は呼び出し側に置く。将来ユーザーが性格を選択するUI改修時に、`createInitialCpuRoom`を変更せず対応できるようにする

### 4.4 既存機能への影響

- 対人戦の既存フローに影響を与えないこと
- 既存の`GameRoom`型、Firestoreデータを変更しないこと
- Server Actionsのリファクタリング（純粋関数の切り出し）は、動作に影響を与えない内部構造の変更とすること
