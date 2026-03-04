# CPU対戦機能 ホワイトボード

各専門家による調査・検討内容をここに共有する。

---

## ゲームAI設計

### ゲーム分析：AIが考慮すべき情報

コードベース調査（`action.ts:120-190`, `types/room.ts`）より、AIが利用可能な情報を整理。

**利用可能なゲーム状態:**
- `remainingChairs: number[]` — 残り椅子リスト（番号=得点、初期値は1-12の12脚）
- `players[].point` — 各プレイヤーの現在得点
- `players[].shockedCount` — 各プレイヤーの感電回数
- `round.count` / `round.turn` — 現在のラウンド情報

**ゲームの重要な非対称性:**
- 感電時：得点が**全リセット**（0に戻る）、椅子は残る → 高得点時の感電は大ダメージ
- セーフ時：椅子番号分の得点を獲得、その椅子は除外される
- つまり高番号椅子は**ハイリスク・ハイリターン**（防御側がトラップしやすいが、成功すれば大量得点）

### 難易度設計

3段階の難易度を提案: **かんたん / ふつう / むずかしい**

| レベル | コンセプト | 想定勝率（プレイヤー視点） |
|--------|-----------|------------------------|
| かんたん | 初心者でも勝てる。ランダム寄りの判断。気持ちよく勝たせる | 70-80% |
| ふつう | 適度な戦略性。基本的なゲーム理解に基づく判断 | 45-55% |
| むずかしい | プレイヤーの行動パターンを読み、状況適応する強敵 | 30-40% |

### 攻撃側AI（座る椅子を選択）

攻撃側の目標：**感電を避けつつ、効率よく得点する**

**かんたん — ランダム + 低得点バイアス:**
- 残り椅子からランダム選択だが、低い番号の椅子を選びやすい（重み付け）
  - 椅子番号が小さいほど選択確率が高い（逆順重み: 椅子1→重み12, 椅子12→重み1）
- 意図：プレイヤーが高得点椅子を取りやすくなり、初心者にとって「勝てる」体験を提供

**ふつう — 期待値ベースの基本戦略:**
- 各椅子の「期待値」を計算して重み付きランダム選択
  - 期待値 = 椅子番号 × セーフ確率 − 現在得点 × 感電確率
  - セーフ確率は均等分布仮定: (残り椅子数 - 1) / 残り椅子数
- 状況補正:
  - 感電2回 → リスク回避モード（低〜中番号を優先）
  - 勝利まであと少し（残り10点以内）→ ちょうど足りる椅子を狙う
  - 得点リード時 → 安全策（低番号優先）

**むずかしい — パターン認識 + 状況適応:**
- 対戦相手の防御パターンを記録・分析
  - 相手が電気椅子に選びやすい番号帯を推定（直近N回の履歴を記憶）
  - 高番号好み / 低番号好み / 分散型などの傾向を判定
- パターンベースの回避
  - 相手が高番号をトラップしがち → 高番号を避ける
  - 相手が前回セーフの椅子の隣をトラップしがち → それを避ける
- 逆張り戦略（メタ読み）
  - 「相手はプレイヤーが高得点を狙うと読む」→ あえて低番号を選ぶ
- ゲーム状況の完全活用
  - 勝利に必要な最小得点の椅子を効率的に選択
  - ただし最適手を100%選ばない（70-80%）→ 残りはランダム（読まれ防止）

### 防御側AI（電気椅子を設置）

防御側の目標：**相手が座る椅子を予測し、感電させる**

**かんたん — ほぼランダム:**
- 残り椅子から完全ランダム配置
- プレイヤーに有利な配置になりやすい

**ふつう — 得点ベースの予測:**
- 「プレイヤーは高得点椅子を狙いやすい」という仮定
  - 残り椅子の上位1/3に50%、中位1/3に30%、下位1/3に20%の重み
- 状況補正:
  - プレイヤーの残り必要点数に近い椅子を優先トラップ
    （例: プレイヤー32点 → 8以上の椅子をトラップ候補に優先、40点到達を阻止）
  - プレイヤーの感電回数が2回 → あえて低番号にも設置
    （プレイヤーが安全策を取ると予測）

**むずかしい — 行動パターン分析 + ベイズ推定:**
- プレイヤーの過去の椅子選択パターンを記録
  - 好む番号帯（高/中/低）
  - 前回の選択からの傾向（同じ番号帯を繰り返すか、変えるか）
  - 感電後の行動変化（リスク回避に転じるか、逆に攻めるか）
- ベイズ推定による次の選択予測
  - 過去の選択履歴から各椅子の選択確率を推定
  - 最も選ばれやすい椅子にトラップ設置
- メタ読み
  - プレイヤーが「AIの予測を読んでいる」と判断した場合、予測の裏をかく（2段階読み）
  - 一定確率でランダムに戻す（読まれすぎ防止）

### 心理戦要素の再現

このゲームの本質はじゃんけん的な読み合い。CPUの「人間らしさ」が楽しさに直結する。

#### 思考時間のシミュレーション
- 即座に選択せず、1〜3秒のランダムな「思考時間」を設ける
- 難しい局面（残り椅子が少ない、得点が拮抗）ではやや長めに
- 意図: 「CPUも考えている」感を演出

#### パターンの揺らぎ（非決定性）
- どの難易度でも一定のランダム性を保持
- むずかしいでも最適手を100%選ばない（70-80%程度）
- 時々「ミス」や「意外な手」を混ぜて人間らしさを演出
- 連続して同じ戦略パターンを避ける（人間は飽きる）

#### ゲーム中の傾向変化
- 前半: やや攻撃的（高得点狙い）
- 後半リード時: 守備的に転換
- 追い込まれ時: 大胆な選択が増える
- CPUが「焦っている」「調子に乗っている」とプレイヤーに感じさせる

### 戦略テーブル案

ゲーム状況を以下のパラメータで評価し、戦略を決定:

| パラメータ | 評価内容 |
|-----------|---------|
| 自分のポイント | 40に近いほど攻撃的 |
| 相手のポイント | 40に近いほど防御的 |
| 自分の感電回数 | 2回なら慎重 |
| 相手の感電回数 | 2回なら攻撃的 |
| 残り椅子数 | 少ないほど終盤戦略 |
| 残り椅子の得点分布 | 高得点が多ければリスクテイク可能 |

#### 得点差による戦略シフト

| 状況 | 攻撃AI | 防御AI |
|------|--------|--------|
| 大幅リード（15点以上） | 低〜中番号で安全に得点を重ねる | 相手の「一発逆転」椅子（高番号）をトラップ |
| 僅差（5点以内） | バランス型、期待値重視 | 相手の勝利条件を逆算してトラップ |
| 大幅ビハインド | ハイリスク・ハイリターン（高番号狙い） | 低番号にも散らす（相手が安全策を取る可能性） |

#### 感電回数による戦略シフト

| CPU感電回数 | 攻撃時の変化 | 防御時の変化 |
|-------------|-------------|-------------|
| 0回 | 通常戦略 | 通常戦略 |
| 1回 | やや慎重に | バランス型 |
| 2回（あと1回で負け） | 極めて慎重。低番号中心 | 積極的に相手の感電を狙う |

| 相手感電回数 | 攻撃時の変化 | 防御時の変化 |
|-------------|-------------|-------------|
| 2回（あと1回で勝ち） | リスクを取って攻める | 全力で感電を狙う。行動パターンから最有力候補にトラップ |

#### 残り椅子数による戦略シフト

| 残り椅子数 | 戦略変化 |
|-----------|---------|
| 8脚以上（序盤） | 探索的。様々な椅子を試してプレイヤーの傾向を把握 |
| 4〜7脚（中盤） | パターンが見えてくる。得点効率と安全性のバランス |
| 2〜3脚（終盤） | 選択肢が極めて限定。読み合いが激化。残り椅子の得点構成が最重要 |

#### 勝利条件の逆算（ふつう以上で適用）

```
攻撃時:
- 「あと何点で40点か」を計算 → 到達可能な椅子を特定
- 例: 現在35点 → 5以上の椅子で勝利可能 → 狙うか、トラップを読んで避けるか

防御時:
- 相手の「あと何点で40点か」を計算 → 到達させる椅子を重点的にトラップ
- 例: 相手33点、残り椅子に7,9,11 → 7,9,11をトラップ候補に
```

### AI決定関数のインターフェース案

```typescript
type AIDecision = {
  selectedChair: number;
  thinkingTimeMs: number; // 思考時間演出用
};

type AIContext = {
  difficulty: "easy" | "normal" | "hard";
  remainingChairs: number[];
  myPoint: number;
  opponentPoint: number;
  myShockedCount: number;
  opponentShockedCount: number;
  roundCount: number;
  // むずかしい用: 過去の選択履歴
  history: {
    electricChairs: number[];  // 相手が設置した電気椅子の履歴
    seatedChairs: number[];    // 相手が座った椅子の履歴
  };
};

function selectChairAsAttacker(ctx: AIContext): AIDecision;
function selectChairAsDefender(ctx: AIContext): AIDecision;
```

### パターン履歴の保持（むずかしい用）

- ゲーム中の選択履歴をメモリ上（React state or Server内変数）で保持
- ゲーム終了でリセット（ゲームごとに学習し直す設計）
- 永続化は不要（1ゲーム内の短期学習で十分）

---

## 技術アーキテクチャ

### 1. 現在のアーキテクチャ整理

#### データフロー（対人戦）
```
Player A (Client)                    Firestore                     Player B (Client)
     |                                  |                               |
     |-- Server Action (椅子選択) ------>|                               |
     |                                  |-- onSnapshot ----------------->|
     |                                  |                               |
     |                                  |<-- Server Action (椅子選択) ---|
     |<-- onSnapshot ------------------|                               |
```

#### 状態遷移（1ターンのフロー）
```
setting → sitting → activating → result → (次のターンのsetting or ゲーム終了)

setting:    防御側が電気椅子を設置（椅子番号を選択）
sitting:    攻撃側が座る椅子を選択
activating: 防御側が電流を起動（UIでボタン押下）
result:     結果表示 → 両プレイヤーが確認 → 次のターンへ
```

#### 主要コンポーネントの責務
| ファイル | 責務 |
|---|---|
| `types/room.ts` | GameRoom, Round, Player の型定義 |
| `libs/firestore/index.ts` | Firestore CRUD（createRoom, joinRoom, updateRoom, confirmTurnResult） |
| `features/room/action.ts` | Server Actions（createRoomAction, joinRoomAction, selectChairAction, activateAction, changeTurnAction） |
| `hooks/useRoomWatcher.ts` | onSnapshotでFirestoreリアルタイム監視 |
| `hooks/usePlayerOperation.ts` | 現在のフェーズ・ロールに基づく操作判定 |
| `hooks/useRoomEffect.ts` | フェーズ変更時のUI副作用（モーダル表示、SE再生） |
| `hooks/useRoomActions.ts` | ユーザー操作→Server Action呼び出し |
| `hooks/useRoomPhaseHandlers.ts` | フェーズごとのUI演出（遅延付きモーダル表示等） |

---

### 2. CPU処理の実行場所

#### 推奨: サーバーサイド（Server Actions内）

**理由:**
- 既存のすべてのゲームロジック（椅子選択、起動、結果判定、ターン遷移）がServer Actionsで実行されている
- CPUの意思決定もServer Action内で完結させれば、クライアントコードへの影響を最小化できる
- CPUの思考ロジック（電気椅子の設置位置、座る椅子の選択）をクライアントに露出させない（チート防止）
- Firestoreトランザクションとの親和性が高い

**実装イメージ:**
```
Player (Client)                     Server Action                   Firestore
     |                                  |                               |
     |-- selectChairAction ------------>|                               |
     |                                  |-- updateRoom (player選択) --->|
     |                                  |                               |
     |                                  |   [CPUモードの場合]            |
     |                                  |   CPU意思決定を実行            |
     |                                  |-- updateRoom (CPU選択) ------>|
     |                                  |                               |
     |<-- onSnapshot (結果反映) --------|-------------------------------|
```

**具体的な処理フロー（CPUが防御側の場合）:**
1. ルーム作成時にCPUプレイヤーが自動参加し、ready: true に設定
2. ゲーム開始後、setting フェーズで自動的にCPUの電気椅子設置を実行
3. 攻撃側（人間）が椅子を選択 → activating フェーズへ
4. CPUの起動アクションを自動実行 → result フェーズへ
5. result確認もCPU側を自動実行

**具体的な処理フロー（CPUが攻撃側の場合）:**
1. 人間（防御側）が電気椅子を設置 → sitting フェーズへ
2. CPUが座る椅子を自動選択 → activating フェーズへ
3. 人間（防御側）が起動ボタン押下 → result フェーズへ
4. result確認もCPU側を自動実行

---

### 3. Firestoreの利用方針

#### 推奨: CPU対戦でもFirestoreを使う

**理由:**
- 既存コードの大部分をそのまま再利用できる（Server Actions, hooks, コンポーネント）
- onSnapshotによるリアルタイム同期の仕組みがそのまま使える（CPUのアクションもクライアントに自動反映）
- 対人戦とCPU対戦で同じデータモデル・フローを使うことで、メンテナンスコストを最小化
- CPU対戦専用のローカル状態管理を作ると、ゲームロジックが二重管理になる

**ローカル状態管理（不採用）の問題点:**
- ゲームロジック（勝敗判定、スコア計算、ターン遷移）をクライアントに再実装する必要がある
- useRoomWatcher, useRoomEffect, usePlayerOperation を全面的に書き換えが必要
- Server Actions の activateAction, changeTurnAction の判定ロジックもクライアント側に二重実装
- テスト・デバッグの負荷が大幅増加

**Firestore利用時のコスト懸念:**
- CPU対戦は1人プレイなので、readコストはonSnapshotの1クライアント分のみ
- writeコストは対人戦と同等（1ターンあたり3-4 writes）
- 無料枠（1日50,000 reads / 20,000 writes）で十分な規模
- 将来コストが問題になった場合はその時点でローカル化を検討すればよい

---

### 4. 既存コードの変更影響分析

#### 4.1 データモデルの変更（`types/room.ts`）

```typescript
// GameRoom に追加
export type GameRoom = {
  createrId: string;
  status: "waiting" | "ready" | "inProgress";
  players: Player[];
  round: Round;
  remainingChairs: number[];
  winnerId: string | null;
  isCpuBattle: boolean;         // 追加: CPU対戦フラグ
  cpuPlayerId: string | null;   // 追加: CPUプレイヤーのID（nullなら対人戦）
};
```

**設計判断: `isCpuBattle` と `cpuPlayerId` の両方を持つ理由**
- `isCpuBattle`: ルーム種別の判定に使う（UIの出し分け、待機画面のスキップ等）
- `cpuPlayerId`: どのプレイヤーがCPUかを特定するために必要（攻撃/防御の判定時）

#### 4.2 Firestore操作（`libs/firestore/index.ts`）

**変更: `createRoom` にCPUモード対応を追加**
```typescript
export const createRoom = async (options?: { cpuBattle?: boolean }) => {
  // ... 既存のルーム作成ロジック

  if (options?.cpuBattle) {
    // CPUプレイヤーを自動追加
    const cpuId = "cpu-player";
    data.isCpuBattle = true;
    data.cpuPlayerId = cpuId;
    data.players.push({
      id: cpuId,
      point: 0,
      shockedCount: 0,
      ready: true, // CPUは常にready
    });
    // CPUは即座にreadyなので、status を "ready" にする
  }
};
```

**変更なし:** `joinRoom`, `updateRoom`, `getRoom`, `confirmTurnResult` — 既存のまま使える

#### 4.3 Server Actions（`features/room/action.ts`）

**追加: `createCpuRoomAction`**（または `createRoomAction` を拡張）
```typescript
export async function createCpuRoomAction() {
  const res = await createRoom({ cpuBattle: true });
  // Cookie設定してリダイレクト（既存と同じ流れ）
}
```

**変更: `entryRoomAction`**
- CPU対戦の場合、CPUプレイヤーのreadyは最初からtrue
- 人間プレイヤーがreadyになった時点でゲーム開始

**追加: CPU自動応答の仕組み**

CPU対戦時、人間の操作後にCPUの応答を自動的にトリガーする必要がある。以下の2つのアプローチを検討:

##### アプローチA: Server Action チェーン（推奨）
人間の操作を処理するServer Actionの中で、CPUの応答も続けて実行する。

```typescript
export async function selectChairAction(data) {
  // 1. 人間プレイヤーの選択を保存
  await updateRoom(roomId, { round: roundData });

  // 2. CPU対戦かチェック
  const room = await getRoom(roomId);
  if (room.data.isCpuBattle) {
    // 3. 遅延を入れてCPUの応答を実行
    await delay(1000 + Math.random() * 2000); // 1-3秒のランダム遅延
    const cpuChoice = cpuDecide(room.data);
    await updateRoom(roomId, cpuChoice);
  }
}
```

**メリット:**
- 単一のリクエスト内で完結、追加のインフラ不要
- 既存のServer Action構造の自然な拡張
- CPUの遅延はServer Action内のawait delayで実現

**デメリット:**
- Server Actionのレスポンスが遅延分だけ遅くなる（ただしonSnapshotで中間状態は即座に反映）

##### アプローチB: クライアント側トリガー（代替案）
useRoomEffect内でCPU対戦のフェーズ遷移を検知し、setTimeout後にServer Actionを呼ぶ。

```typescript
// useRoomEffect内
if (roomData.isCpuBattle && shouldCpuAct(roomData, userId)) {
  setTimeout(() => {
    cpuAction(roomId);
  }, 1000 + Math.random() * 2000);
}
```

**メリット:**
- Server Actionのレスポンスに影響しない
- CPUの「考え中」演出をクライアント側で柔軟に制御可能

**デメリット:**
- CPU判断ロジックの一部がクライアントに漏れる可能性
- クライアント側のsetTimeoutに依存するため、ブラウザがバックグラウンドになった場合にタイマーが止まるリスク

##### 推奨: アプローチA + onSnapshot中間反映

Server Action内でCPU処理を行うが、人間のアクション → Firestore書き込み → CPU処理 → Firestore書き込みの各段階でonSnapshotがクライアントに通知するため、UI上は自然な遅延に見える。ただし、Server Actionの応答遅延が問題になる場合は非同期化（Server Actionは即座に返し、バックグラウンドでCPU処理を走らせる）も可能。

#### 4.4 Hooks の変更

**`useRoomWatcher.ts`** — 変更なし（onSnapshotの仕組みはそのまま）

**`usePlayerOperation.ts`** — 変更なし（CPUのターンでは人間は常に`wait: true`になるだけ）

**`useRoomEffect.ts`** — 軽微な変更
- CPU対戦時、待機画面（CreaterWaitingStartDialog）をスキップ
- CPUの操作に対する演出の調整（「相手が電気椅子を仕掛けました」等のメッセージはそのまま使える）
- CPU対戦時の`changeTurnAction`呼び出し：CPUのconfirmも自動で行うため、人間が「次へ」を押した時点で両者confirm完了として処理

**`useRoomActions.ts`** — 変更
- `changeTurn` でCPU対戦時はCPU側のconfirmも同時に実行する必要がある
  - 方法: `changeTurnAction` をCPU対戦用に拡張し、CPUのconfirmを内部で処理

#### 4.5 コンポーネントの変更（`Room.tsx`）

- `CreaterWaitingStartDialog`: CPU対戦時は表示しない（CPUは即座に参加・ready済み）
- `RoundStatus`, `PlayerStatus`: CPUプレイヤーの名前表示を「CPU」に
- ルームID共有機能: CPU対戦時は不要（非表示にする）
- その他のUI（椅子選択、結果表示等）: 変更なし

---

### 5. ゲームフロー変更の詳細

#### 5.1 ルーム作成〜ゲーム開始

**対人戦（現在）:**
```
ルーム作成 → 待機画面 → 相手参加 → 両者ready → ゲーム開始
```

**CPU対戦:**
```
ルーム作成（CPU自動参加・ready済み） → 人間ready → ゲーム開始
```

#### 5.2 CPUの自動応答タイミング

CPUの応答に人間らしい遅延を入れることが重要（即座に反応すると不自然）。

| アクション | 遅延 | 理由 |
|---|---|---|
| 電気椅子設置 | 1.5〜3秒 | 「考えている」感を出す |
| 椅子に座る | 1〜2.5秒 | 同上 |
| 電流起動 | 0.5〜1秒 | 起動は即決でよい |
| 結果確認（next） | 0.5秒 | 即座に確認してよい |

遅延はサーバーサイド（`await delay()`）で実装。

#### 5.3 結果確認（changeTurn）のCPU対応

現在の `changeTurnAction` は `confirmTurnResult` でFirestoreトランザクションを使い、2人の確認を順次処理している。

CPU対戦時の選択肢:
1. **人間が確認 → CPUも同時に確認済みとして処理**（confirmedIds に両方のIDを入れる）
2. **人間が確認 → 短い遅延 → CPUが確認**（現在の2段階処理をそのまま使う）

推奨: **選択肢1** — 人間がnextを押した時点で即座に次のターンへ遷移。CPU対戦で「相手の確認待ち」は不要なUX。

実装: `changeTurnAction` を修正し、CPU対戦時は `confirmedIds` に両者のIDを同時に入れる。

---

### 6. データモデル変更案まとめ

```typescript
// types/room.ts

export type Player = {
  id: string;
  point: number;
  shockedCount: number;
  ready: boolean;
  isCpu: boolean;    // 追加: CPUプレイヤーかどうか
};

export type GameRoom = {
  createrId: string;
  status: "waiting" | "ready" | "inProgress";
  players: Player[];
  round: Round;
  remainingChairs: number[];
  winnerId: string | null;
  isCpuBattle: boolean;       // 追加
  cpuPlayerId: string | null;  // 追加
};
```

**補足: `Player.isCpu` vs `GameRoom.cpuPlayerId`**
- `Player.isCpu` をPlayerに持たせることで、コンポーネントレベルでの表示分岐が容易（名前表示等）
- `GameRoom.cpuPlayerId` をGameRoomに持たせることで、Server Actionレベルでの判定が容易
- 冗長だが、それぞれの利用箇所で自然にアクセスできる

---

### 7. 新規ファイル・モジュール構成案

```
web/
├── features/
│   └── room/
│       ├── action.ts              # 既存: CPU対戦用の分岐を追加
│       ├── cpu/
│       │   ├── cpuPlayer.ts       # 新規: CPU意思決定ロジック
│       │   └── cpuAction.ts       # 新規: CPU自動応答のServer Action
│       └── hooks/
│           └── (既存hooksに軽微な変更)
├── app/
│   └── (トップページにCPU対戦ボタン追加)
```

**`cpuPlayer.ts`** — CPU意思決定ロジック
- `decidePlacement(remainingChairs, gameState): number` — 電気椅子を置く椅子を決定
- `decideSeating(remainingChairs, gameState): number` — 座る椅子を決定
- 難易度別の戦略パターン（AI設計チームの検討結果を反映）

**`cpuAction.ts`** — CPU自動応答のServer Action
- `executeCpuTurn(roomId: string): Promise<void>` — CPUのターン処理を実行
- 遅延の挿入、意思決定の呼び出し、Firestoreの更新を一貫して管理

---

### 8. リスク・懸念事項

| リスク | 影響 | 対策 |
|---|---|---|
| Server Action内のdelay()がVercelのタイムアウトに引っかかる | CPUの応答が実行されない | Vercelの関数タイムアウト（デフォルト10秒）内に収まる遅延に設定（最大3秒程度） |
| Firestoreのコスト増 | 運用コスト増加 | CPU対戦のFirestore操作は対人戦と同等。無料枠で問題ない規模 |
| CPU対戦のルームがFirestoreに残り続ける | ストレージの無駄 | TTLまたは定期クリーンアップ（将来課題、初期リリースでは不要） |
| CPUの応答中にユーザーがブラウザを閉じる | ゲーム状態の不整合 | Firestoreにデータが残るため、再アクセス時に復帰可能 |

---

## UX/画面フロー設計

### 1. 現状のUI分析

#### トップ画面 (Top.tsx)
- ダークテーマ (bg-gray-900) のフルスクリーン、中央にカード型メニュー (TopMenu: bg-gray-800, border-red-500)
- タイトル「電気椅子ゲーム」(赤、Boltアイコンpulse付き) + サブタイトル「緊張と興奮の椅子取り合戦」
- 2つのボタン: 「ルームを作成」(赤系Button) / 「ルームに入室」(bg-gray-600 Button)
- 「ルームに入室」→ JoinDialog（InfoDialogベース、ルームID入力フォーム）

#### ゲーム画面 (Room.tsx)
- RoundStatus: ラウンド表示 (例: "1回 表") + 攻撃/守備ターン表示
- PlayerStatus x2: 「あなた」/「相手」(得点、感電回数)
- 椅子: 円形配置 (radius=45%、12個)、選択時に白ハイライト
- InstructionMessage: フェーズに応じた指示メッセージ（中央配置）
- ダイアログ群:
  - CreaterWaitingStartDialog: ルームID表示 + 対戦相手待ち + IDコピー機能
  - StartTurnDialog: ゲーム開始/攻守交代 (2秒自動閉じ、攻撃=emerald/守備=orange)
  - NoticeDialog: フェーズごとの指示 (電気椅子設置/座る椅子選択/電流起動)
  - TurnResultDialog: 感電orセーフ + スコア変動表示 + 「次へ進む」ボタン
  - GameResultDialog: 勝利(金)/敗北(赤)/引き分け(灰) + スコア一覧 + 「ゲーム終了」ボタン
  - ActivateEffect: 全画面エフェクト (感電=黄色+Zap振動 / セーフ=黒+SAFE文字)
- 効果音: shock.mp3 (playbackRate:0.7), safe.mp3

#### フェーズ遷移とタイミング
- setting → sitting → activating → result
- SHOW_DELAY_MS = 2000ms（フェーズ開始前の遅延）
- SHOW_NOTICE_MS = 2000ms（通知の表示時間）
- EFFECT_DURATION_MS = 1500ms（結果エフェクト表示時間）

---

### 2. トップ画面のCPU対戦ボタン設計

#### 推奨案: セクション分け

```
┌─────────────────────────┐
│   ⚡ 電気椅子ゲーム ⚡    │
│   緊張と興奮の椅子取り合戦  │
│                         │
│  ── ひとりで遊ぶ ──      │
│  ┌─────────────────────┐│
│  │   CPU対戦            ││  ← 新規追加（赤系ボタン）
│  └─────────────────────┘│
│                         │
│  ── オンライン対戦 ──    │
│  ┌─────────────────────┐│
│  │   ルームを作成        ││  ← 既存
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │   ルームに入室        ││  ← 既存（グレー）
│  └─────────────────────┘│
└─────────────────────────┘
```

**設計理由**:
- CPU対戦は1人でも即座に遊べるため、最もアクセスしやすい位置（最上部）に配置
- 初めてのユーザーがルールを覚えるためにもCPU対戦が入口になる
- ボタンが3つになると目的が曖昧になるため、セクションラベル（「ひとりで遊ぶ」「オンライン対戦」）で意図を明確化
- 将来的にモード追加時も構造が破綻しない

**実装方針**: TopOperationsコンポーネントにセクションラベルとCPU対戦ボタンを追加。セクションラベルはtext-gray-500の小さめテキストで区切り線付き。

---

### 3. 難易度選択UI

#### 推奨案: CPU対戦ボタン押下後にダイアログ表示

```
┌─────────────────────────────┐
│        難易度を選択           │
│                             │
│  ┌───────────────────────┐  │
│  │  🟢 かんたん            │  │
│  │  CPUはランダムに選択     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  🟡 ふつう             │  │
│  │  CPUは少し考えて選択     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  🔴 むずかしい          │  │
│  │  CPUは最善手を狙う       │  │
│  └───────────────────────┘  │
│                             │
│      [ キャンセル ]          │
└─────────────────────────────┘
```

**設計理由**:
- 別画面遷移ではなくダイアログ表示 → 軽量なインタラクション維持
- 既存のInfoDialogベースで実装可能（UIの一貫性）
- 各難易度に短い説明文 → 初見でも迷わない
- 3段階（選択肢が多すぎるとストレス）
- ひらがな表記で親しみやすさ演出

**実装方針**: DifficultySelectDialogを新規作成。InfoDialogの子要素として3つのボタンカード（hover時にborder-red-500ハイライト）とキャンセルボタン。

#### 難易度選択後のフロー
1. 難易度を選択
2. LoadingOverlay表示（既存コンポーネント再利用）
3. CPU対戦ルーム作成 → 即座にゲーム画面遷移
4. CreaterWaitingStartDialogスキップ → StartTurnDialogから開始

---

### 4. CPU対戦中の演出設計

#### 4.1 CPUの「考え中」メッセージ

| 対人戦メッセージ | CPU対戦メッセージ |
|---|---|
| 相手が電流を仕掛けています。。。 | CPUが電流を仕掛けています。。。 |
| 相手が座る椅子を選んでいます。。。 | CPUが座る椅子を選んでいます。。。 |
| まもなく電流が起動します。。。 | まもなく電流が起動します。。。（変更なし） |
| 相手が電気椅子を仕掛けました | CPUが電気椅子を仕掛けました |
| 相手が椅子に座りました | CPUが椅子に座りました |

**実装方針**: InstructionMessageとRoomPhaseHandlersに`isCpuBattle`フラグを渡し、テキストを切替。utility関数 `getOpponentLabel(isCpu: boolean)` で「CPU」/「相手」を返す。

**将来的な演出強化案（Phase2以降）**:
- 椅子がランダムにハイライト（点滅）→ 1つに収束して確定するアニメーション
- 実装コストが高いため初期リリースではメッセージ変更のみで十分

#### 4.2 CPUの待ち時間設計

| フェーズ | CPU役割 | 推奨待ち時間 | 理由 |
|---------|---------|------------|------|
| setting | 守備(電気椅子設置) | 1.5〜3.0秒 | 考えているフリ。短すぎると機械的、長すぎるとストレス |
| sitting | 攻撃(椅子選択) | 1.5〜3.0秒 | 同上 |
| activating | 守備(電流起動) | 0.8〜1.5秒 | 起動は迷う要素がないため短め |
| result確認 | 次へ進む | 自動（人間が押した時点で即遷移） | CPUの確認待ちは不要 |

**ランダム性**: 毎回同じ秒数だと機械的に感じるため、範囲内でランダム化。
**技術チーム設計との整合**: サーバーサイドの`await delay()`で実装（Vercelタイムアウト10秒内に収まる）。

---

### 5. 対人戦との画面差分

#### 5.1 不要になる画面/機能

| 画面/機能 | 対人戦 | CPU対戦 | 備考 |
|----------|--------|---------|------|
| CreaterWaitingStartDialog | 必要 | **不要** | CPUは即座に参加 |
| ルームID表示/コピー | 必要 | **不要** | 共有相手がいない |
| Ready待機 | 必要 | **不要** | CPU即Ready |

#### 5.2 変更が必要な表示

| 要素 | 対人戦 | CPU対戦 |
|------|--------|---------|
| PlayerStatus 相手名 | 「相手」 | 「CPU」 |
| InstructionMessage | 「相手が〜しています」 | 「CPUが〜しています」 |
| TurnResultDialog 見出し | 「相手の」スコア | 「CPUの」スコア |
| GameResultDialog 見出し | 「相手のスコア」 | 「CPUのスコア」 |
| RoomPhaseHandlers メッセージ | 「相手が電気椅子を仕掛けました」 | 「CPUが電気椅子を仕掛けました」 |

#### 5.3 activatingフェーズのCPU自動処理

対人戦ではdefender(守備側)が「起動」ボタンを押す。

**CPUが守備側の場合:**
- CPUが自動で電流を起動
- 人間にNoticeDialog「CPUが電流を起動します...」を表示
- 0.8〜1.5秒後に自動起動 → resultフェーズへ

**CPUが攻撃側の場合:**
- 人間が「起動」ボタンを押す（対人戦と同じ）

---

### 6. ゲーム終了後のフロー

#### 推奨案: GameResultDialogのボタンをCPU対戦用に変更

**対人戦（現状）:**
```
┌─────────────────────┐
│     ゲーム終了        │
│     🏆 勝利!         │
│     ...              │
│  [ ゲーム終了 ]       │  ← トップに戻る
└─────────────────────┘
```

**CPU対戦:**
```
┌──────────────────────────┐
│       ゲーム終了           │
│       🏆 勝利!            │
│       ...                │
│                          │
│  ┌──────────────────────┐│
│  │   もう一度 (同じ難易度) ││  ← メインアクション（勝利色ボタン）
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │   難易度を変えて再戦    ││  ← サブアクション（bg-gray-600）
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │   トップに戻る         ││  ← テキストリンク風（控えめ）
│  └──────────────────────┘│
└──────────────────────────┘
```

**設計理由**:
- CPU対戦の魅力は「すぐにもう一度遊べる」こと → 最も目立つ位置に再戦ボタン
- 勝ち → 難易度上げたい、負け → リベンジしたい、どちらにも対応
- ルーム管理不要で即座に再戦可能

#### 各ボタンのフロー
1. **もう一度**: 新しいCPUルーム作成(同難易度) → ゲーム画面リセット → StartTurnDialogから再開
2. **難易度を変えて再戦**: 難易度選択ダイアログ表示 → 選択後に新ルーム作成
3. **トップに戻る**: トップ画面に遷移（対人戦と同じ）

---

### 7. 全体画面フロー図

```
[トップ画面]
  │
  ├── 「CPU対戦」 ──→ [難易度選択ダイアログ]
  │                      │
  │                      ├── かんたん ──→ [ゲーム画面 (CPU)]
  │                      ├── ふつう   ──→ [ゲーム画面 (CPU)]
  │                      ├── むずかしい ──→ [ゲーム画面 (CPU)]
  │                      └── キャンセル ──→ [トップ画面]
  │
  ├── 「ルームを作成」 ──→ [ゲーム画面 (対人)] ── 待機ダイアログ
  │
  └── 「ルームに入室」 ──→ [入室ダイアログ] ──→ [ゲーム画面 (対人)]

[ゲーム画面 (CPU)]
  │
  ├── StartTurnDialog (ゲーム開始/攻守交代)  ※CreaterWaitingStartDialogスキップ
  │
  ├── [ゲームプレイ]
  │     ├── setting: CPUまたは人間が電気椅子を設置
  │     ├── sitting: CPUまたは人間が椅子を選択
  │     ├── activating: 電流起動（CPU自動 or 人間ボタン）
  │     └── result: エフェクト(1.5秒) → TurnResultDialog
  │           └── 「次へ進む」→ CPUのconfirmも同時処理 → 即遷移
  │
  └── [ゲーム終了] → GameResultDialog (CPU用3ボタン)
        ├── もう一度 ──→ 新ルーム作成 → [ゲーム画面 (CPU)]
        ├── 難易度変更 ──→ [難易度選択ダイアログ] → [ゲーム画面 (CPU)]
        └── トップに戻る ──→ [トップ画面]
```

---

### 8. 実装上の考慮事項

#### コンポーネントの再利用戦略
- **そのまま再利用**: Chair, ChairContainer, RoundStatus, ActivateEffect, StartTurnDialog, RoomContainer, GameStatusContainer, InstructionContainer, PlayerStatusContainer
- **props/条件分岐が必要**: PlayerStatus(`isCpu`で名前切替), InstructionMessage(`isCpuBattle`でテキスト切替), GameResultDialog(ボタン変更), TurnResultDialog(テキスト変更), useRoomPhaseHandlers(メッセージ変更)
- **CPU対戦では不使用**: CreaterWaitingStartDialog, JoinDialog
- **新規作成**: DifficultySelectDialog (InfoDialogベース)

#### 表示テキスト切替の設計
- utility関数 `getOpponentLabel(isCpu: boolean): string` → "CPU" or "相手"
- 各コンポーネントに `isCpuBattle` を渡す（roomData.isCpuBattleから取得）
- 技術チームのデータモデル設計（`GameRoom.isCpuBattle`, `Player.isCpu`）と整合

#### アクセシビリティ
- 難易度選択ダイアログ: キーボード操作対応（Tab/Enter）— InfoDialogベースで実現
- CPU思考中メッセージ: aria-live="polite"設定（スクリーンリーダー対応）
- 難易度カードのフォーカス表示: focus-visible時にborderハイライト

---

## 【Rev2】クライアントサイド完結アーキテクチャ

> **方針変更**: Rev1ではCPU対戦でもFirestoreを使う設計だったが、**通信節約のためFirestoreに接続せずクライアントサイドで完結させる**方針に変更。

### 1. ゲーム状態管理: useReducer + GameRoom型の流用

#### useReducer を採用する理由

- ゲームの状態遷移は「フェーズ遷移」「スコア更新」「ターン切替」など明確なアクションに分類できる
- useReducer は「現在の状態 + アクション → 次の状態」を純粋関数で表現でき、テストしやすい
- useState だと複数のset関数呼び出しで不整合が起きやすい（例: playersとroundを別々に更新する間のちらつき）
- reducer関数は Server Actions のロジックと共有できる（後述）

#### GameRoom型の流用方針

既存の `GameRoom` 型は**ほぼそのまま流用**する。CPU対戦用のフィールドを追加：

```typescript
// types/room.ts に追加
export type CpuGameRoom = GameRoom & {
  isCpuBattle: true;
  cpuPlayerId: string;
  difficulty: "easy" | "normal" | "hard";
};
```

**`GameRoom` 自体は変更しない**理由:
- 対人戦の既存コードに影響を与えない
- `CpuGameRoom` は `GameRoom` のスーパーセットなので、`GameRoom` を受け取るコンポーネントに渡せる
- 型レベルで対人戦/CPU戦を区別できる

#### Reducer の型定義

```typescript
type CpuGameAction =
  | { type: "SELECT_ELECTRIC_CHAIR"; chair: number }
  | { type: "SELECT_SEATED_CHAIR"; chair: number }
  | { type: "ACTIVATE" }
  | { type: "SHOW_RESULT" }
  | { type: "CHANGE_TURN" };

function cpuGameReducer(state: CpuGameRoom, action: CpuGameAction): CpuGameRoom {
  switch (action.type) {
    case "SELECT_ELECTRIC_CHAIR":
      return { ...state, round: { ...state.round, electricChair: action.chair, phase: "sitting" } };
    case "SELECT_SEATED_CHAIR":
      return { ...state, round: { ...state.round, seatedChair: action.chair, phase: "activating" } };
    case "ACTIVATE":
      return applyActivation(state);  // ← 純粋関数（後述）
    case "SHOW_RESULT":
      return { ...state, round: { ...state.round, result: { ...state.round.result, shownResult: true } } };
    case "CHANGE_TURN":
      return applyChangeTurn(state);  // ← 純粋関数（後述）
  }
}
```

---

### 2. ゲームロジックの移植: 純粋関数への切り出し

#### 現状の問題

Server Actions内のロジックはFirestore操作と密結合している:

```
activateAction (action.ts:120-190)
  ├── getRoom(roomId)         ← Firestore読み取り
  ├── 感電判定・スコア計算・勝敗判定  ← 純粋なゲームロジック
  └── updateRoom(roomId, data) ← Firestore書き込み
```

#### 解決策: 純粋関数レイヤーの抽出

ゲームロジックの核心部分を**純粋関数**として切り出し、Server ActionとクライアントReducer両方から呼べるようにする。

```typescript
// web/features/room/logic/gameLogic.ts (新規)
// ★ "use server" も "use client" も付けない = どこからでもimport可能

import { GameRoom, Player } from "@/types/room";
import { plainRoundData } from "@/utils/room";

/**
 * 起動処理: 感電判定 → スコア更新 → 勝敗判定 → result フェーズへ遷移
 * 元: activateAction (action.ts:120-190) のロジック部分
 */
export function applyActivation(room: GameRoom): GameRoom {
  const { players, round } = room;
  const isShocked = round.electricChair === round.seatedChair;

  const updatedPlayers = players.map((player) => {
    if (player.id === round.attackerId) {
      return {
        ...player,
        point: isShocked ? 0 : player.point + (round.seatedChair || 0),
        shockedCount: isShocked ? player.shockedCount + 1 : player.shockedCount,
      };
    }
    return player;
  });

  const remainingChairs = isShocked
    ? room.remainingChairs
    : room.remainingChairs.filter((chair) => chair !== round.seatedChair);

  const winnerId = determineWinner(updatedPlayers, remainingChairs, round.attackerId);

  return {
    ...room,
    players: updatedPlayers,
    remainingChairs,
    winnerId,
    round: {
      ...round,
      phase: "result",
      result: { ...round.result, status: isShocked ? "shocked" : "safe" },
    },
  };
}

/**
 * 勝敗判定（純粋関数）
 * 元: activateAction 内の判定ロジック (action.ts:149-168)
 */
export function determineWinner(
  players: Player[],
  remainingChairs: number[],
  attackerId: string
): string | null {
  const defenderId = players.find((p) => p.id !== attackerId)?.id ?? null;

  if (players.some((p) => p.point >= 40)) return attackerId;
  if (players.some((p) => p.shockedCount === 3)) return defenderId;
  if (remainingChairs.length === 1) {
    const winner = players.reduce((prev, current) => {
      if (current.point > prev.point) return current;
      if (current.point === prev.point) return { id: "draw" } as Player;
      return prev;
    });
    return winner.id;
  }
  return null;
}

/**
 * ターン遷移（純粋関数）
 * 元: changeTurnAction 内のコールバック (action.ts:216-237)
 */
export function applyChangeTurn(room: GameRoom): GameRoom {
  const { round } = room;
  const nextAttackerId = room.players.find((p) => p.id !== round.attackerId)?.id ?? round.attackerId;

  if (round.turn === "top") {
    return {
      ...room,
      round: {
        ...plainRoundData.round,
        attackerId: nextAttackerId,
        turn: "bottom",
        count: round.count,
      },
    };
  } else {
    return {
      ...room,
      round: {
        ...plainRoundData.round,
        attackerId: nextAttackerId,
        turn: "top",
        count: round.count + 1,
      },
    };
  }
}
```

#### Server Actions のリファクタリング

純粋関数抽出後、Server Actions は薄いラッパーになる:

```typescript
// action.ts の activateAction をリファクタリング
export async function activateAction(roomId: string) {
  const room = await getRoom(roomId);
  if (!isSuccessfulGetRoomResponse(room)) {
    return { status: room.status, error: room.error };
  }

  const updatedRoom = applyActivation(room.data);  // ← 純粋関数を呼ぶだけ

  const res = await updateRoom(roomId, {
    players: updatedRoom.players,
    remainingChairs: updatedRoom.remainingChairs,
    winnerId: updatedRoom.winnerId,
    round: updatedRoom.round,
  });

  if (res.status !== 200) return { status: res.status, error: res.error };
  return { status: res.status, room: res.data as GameRoom };
}
```

**これにより、ゲームロジックの二重管理が完全に回避される。**

---

### 3. 既存Hooksの再利用方針

#### useRoomWatcher → CPU対戦では**不要（使わない）**

- 対人戦: Firestore `onSnapshot` でリアルタイム同期
- CPU対戦: `useReducer` の `dispatch` が状態更新を担当。外部データソースへの監視は不要
- CPU対戦用コンポーネントでは `useRoomWatcher` を呼ばない

#### usePlayerOperation → **ロジックはそのまま再利用**

```typescript
// 現在のシグネチャ:
usePlayerOperation(roomData: GameRoom | null, userId: string): PlayerOperation
```

- `roomData` のデータソースが Firestore → useReducer に変わるだけ
- フック内部のロジック（attackerId/phase/椅子選択状態による判定）は完全に同一
- **変更不要でそのまま使える**

#### useRoomEffect → **フェーズ遷移ロジックは共通、一部差分あり**

- 基本構造はそのまま使える（roomData の変更を検知 → フェーズに応じたUI副作用）
- **差分**:
  - `isAllReady()` → CPU対戦では初期状態から true（CPUは即ready）
  - `showCreaterWaitingStartModal` → CPU対戦では呼ばない
  - `handleSubmitActivate` → CPU対戦では dispatch を呼ぶ（Server Action ではなく）

**方針**: useRoomEffect 自体は変更しない。呼び出し側（Room.tsx / CpuRoom.tsx）で渡すコールバックを差し替えることで対応。

#### useRoomActions → **CPU対戦用に新規作成**

現在の useRoomActions は内部で Server Actions を直接呼んでいる:
- `selectChairAction` → Firestore更新
- `activateAction` → Firestore読み取り＋更新
- `changeTurnAction` → Firestoreトランザクション

CPU対戦では、これらを `dispatch` に置き換えた `useCpuRoomActions` を新規作成する:

```typescript
// web/features/cpu-room/hooks/useCpuRoomActions.ts (新規)
export function useCpuRoomActions({
  roomData,
  dispatch,
  playerOperation,
}: {
  roomData: CpuGameRoom;
  dispatch: React.Dispatch<CpuGameAction>;
  playerOperation: PlayerOperation;
}) {
  const [selectedChair, setSelectedChair] = useState<number | null>(null);

  const selectChair = () => {
    if (playerOperation.setElectricShock && selectedChair !== null) {
      dispatch({ type: "SELECT_ELECTRIC_CHAIR", chair: selectedChair });
    } else if (playerOperation.selectSitChair && selectedChair !== null) {
      dispatch({ type: "SELECT_SEATED_CHAIR", chair: selectedChair });
    }
  };

  const submitActivate = () => {
    dispatch({ type: "ACTIVATE" });
  };

  const changeTurn = () => {
    dispatch({ type: "CHANGE_TURN" });
  };

  return { selectedChair, setSelectedChair, selectChair, submitActivate, changeTurn };
}
```

#### useRoomPhaseHandlers → **変更不要**

- 純粋なUI演出ロジック（モーダル表示、遅延制御）
- データソースに依存しない
- そのまま再利用

---

### 4. コンポーネント共通化

#### 方針: Room.tsx をベースに CpuRoom.tsx を新規作成

Room.tsx を丸ごとコピーするのではなく、**共通UI部分を切り出して共有**する。

#### 共通化の粒度

| コンポーネント | 共通化 | 備考 |
|---|---|---|
| Chair, ChairContainer | ✅ そのまま | データソースに非依存 |
| RoundStatus | ✅ そのまま | `round` を受け取るだけ |
| PlayerStatus | ✅ そのまま | `Player` を受け取るだけ。名前表示は呼び出し側で制御 |
| InstructionMessage | ✅ そのまま | `playerOperation`, `round` を受け取るだけ |
| ActivateEffect | ✅ そのまま | `result` を受け取るだけ |
| StartTurnDialog | ✅ そのまま | `round`, `userId` を受け取るだけ |
| TurnResultDialog | ✅ そのまま | `roomData` を受け取るだけ |
| GameResultDialog | 🔧 propsで分岐 | CPU対戦時: 再戦ボタン追加（Rev1 UX設計の通り） |
| NoticeDialog | ✅ そのまま | 汎用コンポーネント |
| RoomPhaseHandlers | 🔧 テキスト差替 | `isCpuBattle` フラグでメッセージ切替 |
| CreaterWaitingStartDialog | ❌ 不使用 | CPU対戦では不要 |

#### CpuRoom.tsx の構造

```typescript
// web/features/cpu-room/page/CpuRoom.tsx (新規)
export default function CpuRoom({ difficulty }: { difficulty: "easy" | "normal" | "hard" }) {
  const [roomData, dispatch] = useReducer(cpuGameReducer, createInitialCpuRoom(difficulty));
  const userId = roomData.players.find(p => p.id !== roomData.cpuPlayerId)!.id;

  const playerOperation = usePlayerOperation(roomData, userId);  // ← そのまま再利用

  // CPU自動応答 hook（後述）
  useCpuAutoPlay({ roomData, dispatch });

  const { selectedChair, setSelectedChair, selectChair, submitActivate, changeTurn }
    = useCpuRoomActions({ roomData, dispatch, playerOperation });

  useRoomEffect({
    roomData,
    userId,
    isAllReady: () => true,  // ← CPU対戦では常にtrue
    // ... 他のコールバックはRoom.tsxとほぼ同じ（handleSubmitActivateだけdispatch版）
    handleSubmitActivate: () => dispatch({ type: "ACTIVATE" }),
    // ...
  });

  // JSX は Room.tsx とほぼ同一。以下が異なる:
  // - useRoomWatcher を呼ばない
  // - CreaterWaitingStartDialog を表示しない
  // - form の action が Server Action ではなく selectChair 関数
  // - GameResultDialog にCPU対戦用ボタン（もう一度/難易度変更/トップに戻る）
}
```

**Room.tsx を直接変更しない理由**:
- 対人戦コードへの影響ゼロ
- CPU対戦固有の状態管理（useReducer、CPU自動応答）を独立して管理できる
- 将来的にRoom.tsxから共通レイアウトを抽出してさらにDRYにすることも可能

---

### 5. ルーティング・認証

#### Cookie / Middleware は不要

対人戦では以下の理由でCookieを使っている:
- `roomId`: どのルームに所属しているかの識別
- `userId`: どちらのプレイヤーかの識別

CPU対戦ではFirestoreにルームを作らないため、これらは不要。

#### ルーティング設計

```
/cpu?difficulty=easy    → CPU対戦画面（クエリパラメータで難易度指定）
/room/[id]              → 対人戦画面（既存のまま）
```

**設計判断**:
- `/cpu` を専用ルートにすることで、対人戦のmiddleware（Cookie検証）を完全にバイパス
- 難易度はクエリパラメータで渡す（URLで共有可能だが、ゲーム状態はクライアント内で完結）
- Server Component は不要。`"use client"` の CpuRoom コンポーネントを直接レンダリング

```typescript
// web/app/cpu/page.tsx (新規)
"use client";

import { useSearchParams } from "next/navigation";
import CpuRoom from "@/features/cpu-room/page/CpuRoom";

export default function CpuPage() {
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get("difficulty") ?? "normal") as "easy" | "normal" | "hard";
  return <CpuRoom difficulty={difficulty} />;
}
```

---

### 6. CPUの応答タイミング

#### クライアントサイドの setTimeout で実装

Rev1 ではサーバーサイドの `await delay()` を使っていたが、Rev2 ではクライアント完結のため `setTimeout` で実装する。

#### useCpuAutoPlay Hook

```typescript
// web/features/cpu-room/hooks/useCpuAutoPlay.ts (新規)
export function useCpuAutoPlay({
  roomData,
  dispatch,
}: {
  roomData: CpuGameRoom;
  dispatch: React.Dispatch<CpuGameAction>;
}) {
  const cpuId = roomData.cpuPlayerId;
  const isCpuAttacker = roomData.round.attackerId === cpuId;
  const isCpuDefender = !isCpuAttacker;

  useEffect(() => {
    if (roomData.winnerId) return; // ゲーム終了時は何もしない

    let timer: ReturnType<typeof setTimeout>;

    // CPUが防御側 → settingフェーズで電気椅子を設置
    if (roomData.round.phase === "setting" && isCpuDefender) {
      const delay = randomDelay(1500, 3000);
      timer = setTimeout(() => {
        const chair = cpuSelectChairAsDefender(roomData);
        dispatch({ type: "SELECT_ELECTRIC_CHAIR", chair });
      }, delay);
    }

    // CPUが攻撃側 → sittingフェーズで座る椅子を選択
    if (roomData.round.phase === "sitting" && isCpuAttacker) {
      const delay = randomDelay(1500, 3000);
      timer = setTimeout(() => {
        const chair = cpuSelectChairAsAttacker(roomData);
        dispatch({ type: "SELECT_SEATED_CHAIR", chair });
      }, delay);
    }

    // CPUが防御側 → activatingフェーズで電流起動
    if (roomData.round.phase === "activating" && isCpuDefender) {
      const delay = randomDelay(800, 1500);
      timer = setTimeout(() => {
        dispatch({ type: "ACTIVATE" });
      }, delay);
    }

    // resultフェーズ → CPU側のconfirmは不要（人間がnextを押せば即遷移）

    return () => clearTimeout(timer);
  }, [roomData.round.phase, roomData.round.turn, roomData.winnerId]);
}

function randomDelay(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
```

#### Rev1との比較

| 項目 | Rev1 (Server Action内delay) | Rev2 (クライアントsetTimeout) |
|------|-----|-----|
| 実装場所 | サーバー | クライアント |
| Vercelタイムアウトリスク | あり | なし |
| ブラウザバックグラウンド | 影響なし | タイマー遅延の可能性あり（※） |
| 通信コスト | 遅延中もServer Action接続保持 | 通信なし |

※ ブラウザがバックグラウンドになった場合、setTimeoutが遅延する可能性があるが、CPU対戦はアクティブにプレイしている前提であり実質問題にならない。

---

### 7. 具体的なファイル構成案

```
web/
├── features/
│   ├── room/                          # 対人戦（既存・変更なし）
│   │   ├── action.ts                  # Server Actions（リファクタ: 純粋関数を呼ぶように変更）
│   │   ├── hooks/
│   │   │   ├── usePlayerOperation.ts  # ★ CPU対戦でも再利用
│   │   │   ├── useRoomWatcher.ts      # 対人戦専用（CPU対戦では不使用）
│   │   │   ├── useRoomEffect.ts       # ★ CPU対戦でも再利用
│   │   │   ├── useRoomActions.ts      # 対人戦専用
│   │   │   ├── useRoomPhaseHandlers.ts # ★ CPU対戦でも再利用
│   │   │   └── useRoomDialogs.ts      # ★ CPU対戦でも再利用
│   │   ├── logic/                     # 新規ディレクトリ
│   │   │   └── gameLogic.ts           # ★ 純粋関数（applyActivation, applyChangeTurn, determineWinner）
│   │   ├── components/                # ★ 大部分がCPU対戦でも再利用
│   │   └── page/
│   │       └── Room.tsx               # 対人戦画面（変更なし）
│   │
│   └── cpu-room/                      # CPU対戦（新規）
│       ├── hooks/
│       │   ├── useCpuRoomActions.ts    # CPU対戦用アクション（dispatch版）
│       │   ├── useCpuAutoPlay.ts       # CPU自動応答（setTimeout）
│       │   └── useCpuGameReducer.ts    # useReducer + reducer関数 + 初期状態生成
│       ├── logic/
│       │   └── cpuPlayer.ts           # CPU意思決定ロジック（AI設計チームの成果物）
│       └── page/
│           └── CpuRoom.tsx            # CPU対戦画面
│
├── app/
│   ├── cpu/
│   │   └── page.tsx                   # 新規: CPU対戦ルート
│   └── room/
│       └── [id]/
│           └── page.tsx               # 既存: 対人戦ルート（変更なし）
│
├── types/
│   └── room.ts                        # 既存型 + CpuGameRoom 型追加
│
└── utils/
    └── room.ts                        # 既存（変更なし）
```

#### ファイル間の依存関係

```
CpuRoom.tsx
  ├── useCpuGameReducer (状態管理)
  │     └── gameLogic.ts (純粋関数: applyActivation, applyChangeTurn)
  ├── useCpuAutoPlay (CPU自動応答)
  │     └── cpuPlayer.ts (AI意思決定)
  ├── useCpuRoomActions (ユーザー操作→dispatch)
  ├── usePlayerOperation (既存・共有)
  ├── useRoomEffect (既存・共有)
  ├── useRoomDialogs (既存・共有)
  ├── RoomPhaseHandlers (既存・共有)
  └── components/* (既存・共有)

Room.tsx (対人戦・既存)
  ├── action.ts (Server Actions)
  │     └── gameLogic.ts (純粋関数: 同じものを使う)
  ├── useRoomWatcher (Firestore監視)
  ├── useRoomActions (Server Action呼び出し)
  ├── usePlayerOperation (共有)
  ├── useRoomEffect (共有)
  └── components/* (共有)
```

---

### 8. ゲームロジックの二重管理を避ける方法

#### 核心: 「純粋関数レイヤー」の導入

```
                    gameLogic.ts（純粋関数）
                   /                        \
       Server Actions (対人戦)         useReducer (CPU対戦)
       Firestore読み書きを担当         ローカルstate更新を担当
```

#### 具体的な共有ポイント

| ロジック | 元の場所 | 抽出先 | Server Action | Reducer |
|---------|---------|--------|---------------|---------|
| 感電判定 | `action.ts:128` | `gameLogic.ts` `applyActivation` | ✅ 使う | ✅ 使う |
| スコア計算 | `action.ts:132-141` | `gameLogic.ts` `applyActivation` | ✅ 使う | ✅ 使う |
| 椅子除外 | `action.ts:144-146` | `gameLogic.ts` `applyActivation` | ✅ 使う | ✅ 使う |
| 勝敗判定 | `action.ts:149-168` | `gameLogic.ts` `determineWinner` | ✅ 使う | ✅ 使う |
| ターン遷移 | `action.ts:216-237` | `gameLogic.ts` `applyChangeTurn` | ✅ 使う | ✅ 使う |
| 初期ラウンドデータ | `utils/room.ts` | そのまま | ✅ 使う | ✅ 使う |

#### 二重管理ゼロの保証

- **ルール**: ゲームの状態遷移ロジックは **必ず `gameLogic.ts` に書く**
- **Server Actions**: `gameLogic.ts` の関数を呼び、結果を Firestore に保存する「薄いラッパー」
- **Reducer**: `gameLogic.ts` の関数を呼び、結果を return する「薄いラッパー」
- **テスト**: `gameLogic.ts` の純粋関数をユニットテストすれば、対人戦・CPU対戦両方のロジック正しさを保証できる

#### changeTurnAction の特殊性

`changeTurnAction` は `confirmTurnResult`（Firestoreトランザクション）を使い、2人の確認を順次処理している。CPU対戦ではトランザクション不要:
- 人間が「次へ」を押した時点で `dispatch({ type: "CHANGE_TURN" })` → 即座に次のターンへ
- `confirmedIds` の管理は不要（CPU対戦では同時確認扱い）
- ターン遷移の**ロジック自体**（attackerId切替、top/bottom切替、count更新）は `applyChangeTurn` で共有

---

### 9. データフロー比較

#### 対人戦（既存）
```
Human A        Server Action       Firestore        Human B
   |               |                  |                |
   |-- 椅子選択 -->|-- updateRoom -->|                |
   |               |                  |-- onSnapshot ->|
   |               |                  |                |
   |               |                  |<-- 椅子選択 ---|
   |<-- onSnapshot-|-----------------|                |
```

#### CPU対戦（Rev2）
```
Human           useReducer        CPU Logic
  |                 |                 |
  |-- 椅子選択 ---> dispatch -------->|
  |<-- 再レンダリング <----- state更新 |
  |                 |                 |
  |                 |<-- setTimeout後 dispatch (CPU選択)
  |<-- 再レンダリング <----- state更新 |
```

**通信ゼロ**: すべてクライアント内で完結。Firestore接続なし、Server Action呼び出しなし。

---

### 10. 初期状態の生成

```typescript
// web/features/cpu-room/hooks/useCpuGameReducer.ts

import { CpuGameRoom } from "@/types/room";

export function createInitialCpuRoom(difficulty: "easy" | "normal" | "hard"): CpuGameRoom {
  const humanId = "human";
  const cpuId = "cpu";

  // ランダムに先攻・後攻を決定
  const isHumanFirst = Math.random() < 0.5;
  const firstAttackerId = isHumanFirst ? humanId : cpuId;

  return {
    createrId: humanId,
    status: "inProgress",  // CPU対戦はwaiting/readyをスキップ
    players: [
      { id: humanId, point: 0, shockedCount: 0, ready: true },
      { id: cpuId, point: 0, shockedCount: 0, ready: true },
    ],
    round: {
      count: 1,
      turn: "top",
      attackerId: firstAttackerId,
      phase: "setting",
      electricChair: null,
      seatedChair: null,
      result: { status: null, confirmedIds: [], shownResult: false },
    },
    remainingChairs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    winnerId: null,
    isCpuBattle: true,
    cpuPlayerId: cpuId,
    difficulty,
  };
}
```

---

### 11. リスク・懸念事項

| リスク | 影響 | 対策 |
|---|---|---|
| ブラウザリロードでゲーム状態消失 | ゲームが最初からやり直し | CPU対戦は1ゲーム5-10分程度であり、リロード時はトップに戻す設計で許容範囲。永続化は将来課題 |
| ゲームロジックがクライアントに露出 | チート（DevToolsでdispatch操作）が可能 | CPU対戦は1人プレイであり、チートの影響は自分自身のみ。対人戦のロジックはServer Actions内に残るため問題なし |
| useReducer の状態が大きくなる | パフォーマンスへの影響 | GameRoom型は小さなオブジェクト（プレイヤー2人、椅子12個）であり問題にならない |
| CPU AI ロジックのクライアント露出 | AIの手の内がわかる | 対人戦ではなく1人プレイなので許容。気になる場合は難易度パラメータをサーバーから取得する等の対策も可能 |
| gameLogic.ts のServer Action / Reducer間の不整合 | 対人戦とCPU対戦で挙動が異なる | 純粋関数のユニットテストで防止。両方が同じ関数を呼ぶため、構造的に不整合が起きにくい |

---

## 【Rev2】CPU性格バリエーション設計

> **方針変更**: 難易度（かんたん/ふつう/むずかしい）をUIで選択させる方式を廃止し、CPUに「性格」を持たせてバリエーションを設ける。性格はプレイヤーに明示しない。

### 1. 性格の種類（7種）

各性格は「攻撃側（座る椅子を選ぶ）」と「防御側（電気椅子を仕掛ける）」で異なる振る舞いを持つ。

#### 1-1. チキン（臆病）

**コンセプト**: リスクを徹底的に避ける。低得点でもコツコツ稼ぎ、感電を何より恐れる。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 常に残り椅子の中で最も低い番号を強く優先（下位1/3に80%の重み）。感電回数が増えると更に保守的に |
| 防御 | 「相手も安全策を取る」と想定し低〜中番号にトラップ。高番号はほぼ無視 |

**体感難易度**: やさしめ。プレイヤーが高得点椅子を自由に取れるため、得点差がつきやすい。
**プレイヤーの印象**: 「このCPU、小さい数字ばかり取る…」「高い椅子が残っているのに行かない」

#### 1-2. ギャンブラー（博打好き）

**コンセプト**: 高得点を一気に狙う。一発逆転か大事故か、極端な選択をする。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 残り椅子の上位1/3に70%の重み。感電リスクを軽視。得点が低くても高番号に突っ込む |
| 防御 | 「相手も高得点を狙うだろう」と読んで高番号にトラップ集中。裏をかかれやすい |

**体感難易度**: ムラがある。CPUが大当たりすると一気に詰められるが、感電3回で自滅することも多い。
**プレイヤーの印象**: 「えっ、また12を狙ってきた？」「自滅してくれた…ラッキー」

#### 1-3. アナリスト（分析家）

**コンセプト**: 期待値を重視し、合理的に判断する。勝利条件を逆算して最適手を打つ。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 各椅子の期待値（= 椅子番号 × セーフ確率 − 現在得点 × 感電確率）を計算し、最も高い椅子を選択（70%）+ ランダム（30%）。勝利に必要な最小得点の椅子を効率的に狙う |
| 防御 | 相手の勝利条件を逆算し、到達させる椅子を重点的にトラップ。残りの必要点数に近い椅子を優先 |

**体感難易度**: 中〜やや難。合理的で隙が少ない。ただし読みやすいパターンにもなりうる。
**プレイヤーの印象**: 「いつも効率的な椅子を選んでくる」「勝てそうな椅子をピンポイントで塞いでくる」

#### 1-4. ミラー（模倣者）

**コンセプト**: プレイヤーの直前の行動を真似る。相手が高得点を狙えば自分も高得点を狙い、相手がリスク回避すれば自分もリスク回避する。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 前ターンで相手（防御側）が設置した電気椅子と同じ番号帯（高/中/低）の椅子を選択する。序盤（履歴なし）はランダム |
| 防御 | 前ターンで相手（攻撃側）が座った椅子と同じ番号帯にトラップを設置。相手のパターンに同調する |

**体感難易度**: プレイヤー依存。一貫した戦略を取るプレイヤーには強いが、戦略を変えるプレイヤーには弱い。
**プレイヤーの印象**: 「なんか自分と同じような動きしてる…？」「こっちが変えたら向こうも変わった」

#### 1-5. リベンジャー（復讐者）

**コンセプト**: 感電させられたら報復する。感電回数が多いほど攻撃的になり、逆に順調なら穏やかに振る舞う。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 感電0回→ バランス型（中番号中心）。感電1回→ やや攻撃的（高番号寄り）。感電2回→ 極めて攻撃的（上位1/3に90%、捨て身の勝負） |
| 防御 | 相手が感電させてきた直後→ 相手が次に座りそうな高番号に全力トラップ。直近で感電なし→ 均等配置 |

**体感難易度**: 状況依存。追い詰めると凶暴化するので油断できない。序盤は穏やか。
**プレイヤーの印象**: 「感電させたら急に怒った？」「追い詰めたらヤケクソで攻めてきた」

#### 1-6. ハンター（狩人）

**コンセプト**: 相手の行動パターンを観察し、狙い撃つ。序盤は探索的、中盤以降は一気に仕留める。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 相手の防御パターン（トラップ位置の履歴）を記録。相手がトラップを置きやすい番号帯を回避し、手薄な番号帯を狙う。履歴が4ターン未満のうちはランダム寄り |
| 防御 | 相手の攻撃パターン（着席位置の履歴）を記録。過去の選択から次の選択を予測（直近3回の加重平均）。最も座りやすい椅子にトラップを設置 |

**体感難易度**: やや難〜難。ゲーム後半になるほど正確に読まれる。ワンパターンだと狩られる。
**プレイヤーの印象**: 「最初は適当だったのに途中から的確になった」「パターン変えないとやられる」

#### 1-7. トリックスター（いたずら者）

**コンセプト**: 予測不能。毎ターン戦略が変わり、一貫性がない。時に天才的、時に大失態。

| 役割 | 振る舞い |
|------|---------|
| 攻撃 | 毎ターン、他の6性格のいずれかの攻撃戦略をランダムに採用（均等確率）。同じ戦略を2連続で使わない |
| 防御 | 同様に毎ターン異なる防御戦略をランダム採用。一貫したパターンが存在しないため、読みづらい |

**体感難易度**: ムラが激しい。読みが通じない不気味さがある一方、自滅もある。
**プレイヤーの印象**: 「何考えてるかまったくわからない」「急にうまいプレイをしたと思ったらすぐ自滅する」

---

### 2. 性格の選択方法

#### 2-1. ゲーム開始時の決定: 完全ランダム

```
ゲーム開始時:
  personality = random(全7性格から1つ)
```

**理由**:
- 「今回のCPUはどんなタイプだろう？」という推測の楽しさが最大化される
- プレイヤーの実力に関係なく、毎回新鮮な対戦体験を提供
- 実装がシンプル

#### 2-2. 1ゲーム中の性格は固定

**性格は1ゲームを通じて変化しない。**

**理由**:
- 性格が途中で変わると、プレイヤーが「このCPUはこういうタイプ」と推測する楽しさが損なわれる
- 固定だからこそ「読み切った！」という達成感がある
- 途中で変化する設計は実装・テスト・バランス調整が格段に複雑になる

**ただし、状況適応はある**:
- 各性格の基本方針は固定だが、ゲーム状況（得点差・感電回数・残り椅子数）に応じた補正は既存の戦略テーブル（得点差シフト・感電回数シフト等）を軽く適用する
- これは「性格の変化」ではなく「性格の中での状況対応」という位置づけ
- 例: チキンは常に保守的だが、40点目前なら「保守的な範囲で」到達可能な椅子を狙う

#### 2-3. 重複排除（連続同性格の回避）

```
次のゲーム開始時:
  personality = random(全7性格から前回以外の6つ)
```

- 同じ性格が2連続で出ないようにする（ブラウザセッション中のみ記憶）
- 「さっきと同じだ」という印象を避け、バリエーション感を高める
- セッション跨ぎでは記憶しない（永続化不要、実装の簡潔さ優先）

---

### 3. UIへの影響

#### 3-1. トップ画面の変更

難易度選択UIが不要になるため、トップ画面のフローが簡素化される。

**変更前（Rev1）:**
```
「CPU対戦」ボタン → 難易度選択ダイアログ → ゲーム画面
```

**変更後（Rev2）:**
```
「ひとりで遊ぶ」ボタン → 即ゲーム画面（性格はクライアント側でランダム決定）
```

**トップ画面レイアウト:**
```
┌─────────────────────────┐
│   ⚡ 電気椅子ゲーム ⚡    │
│   緊張と興奮の椅子取り合戦  │
│                         │
│  ── ひとりで遊ぶ ──      │
│  ┌─────────────────────┐│
│  │   CPU対戦            ││  ← ワンタップで即開始
│  └─────────────────────┘│
│                         │
│  ── オンライン対戦 ──    │
│  ┌─────────────────────┐│
│  │   ルームを作成        ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │   ルームに入室        ││
│  └─────────────────────┘│
└─────────────────────────┘
```

**不要になるもの:**
- `DifficultySelectDialog` → 作成不要
- 難易度パラメータの受け渡し → 不要
- ルーティングのクエリパラメータ `?difficulty=` → 不要

#### 3-2. ゲーム結果画面の変更

```
┌──────────────────────────┐
│       ゲーム終了           │
│       🏆 勝利!            │
│       ...                │
│                          │
│  ┌──────────────────────┐│
│  │   もういちど           ││  ← メインアクション（即再戦、新しい性格で）
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │   トップに戻る         ││  ← テキストリンク風
│  └──────────────────────┘│
└──────────────────────────┘
```

- 「もういちど」で即再戦 → 新しい性格のCPUと対戦（前回と別の性格になる）
- 難易度選択が不要なのでボタンが2つに減り、よりシンプルに
- 「次はどんなCPUだろう？」という期待感で再戦率向上

#### 3-3. データモデルの変更

```typescript
// Rev1（難易度ベース）からの変更
type CpuPersonality =
  | "chicken"      // チキン
  | "gambler"      // ギャンブラー
  | "analyst"      // アナリスト
  | "mirror"       // ミラー
  | "revenger"     // リベンジャー
  | "hunter"       // ハンター
  | "trickster";   // トリックスター

// CpuGameRoom の変更
export type CpuGameRoom = GameRoom & {
  isCpuBattle: true;
  cpuPlayerId: string;
  cpuPersonality: CpuPersonality;  // difficulty を置換
};
```

**注意**: `cpuPersonality` はクライアントの state に存在するが、UIコンポーネントには渡さない。CPU意思決定ロジック（`cpuPlayer.ts`）のみが参照する。

#### 3-4. ルーティングの簡素化

```
変更前: /cpu?difficulty=easy    → クエリパラメータで難易度指定
変更後: /cpu                   → パラメータ不要（性格はクライアント内部で決定）
```

```typescript
// web/app/cpu/page.tsx（簡素化）
"use client";
import CpuRoom from "@/features/cpu-room/page/CpuRoom";
export default function CpuPage() {
  return <CpuRoom />;
}
```

---

### 4. ゲーム体験の設計

#### 4-1. 「読み合い」の楽しさ

性格を明示しないことで、プレイヤーに以下の思考プロセスが生まれる:

```
序盤（1〜3ターン）:
  「今回のCPUはどういうタイプだろう？」
  → 低い番号ばかり取る → 「臆病タイプかも」
  → いきなり高番号 → 「攻撃的？ギャンブラー？」

中盤（4〜6ターン）:
  「パターンが見えてきた。この傾向なら…」
  → 仮説に基づいて戦略を調整
  → 仮説が当たる → 快感。外れる → 「思ったのと違う？」

終盤（7ターン以降）:
  「読み切った！ここにトラップを仕掛ければ…」
  → CPUの行動を予測して勝ち切る達成感
  → or 読みが外れて逆転される緊張感
```

#### 4-2. 毎回違う対戦相手の感覚

- 7種の性格 × ランダム選択 → 毎回異なる対戦体験
- 「さっきのCPUとは違う動きだ」と自然に感じられる
- 同じゲームでもリプレイ性が高い
- 人間の対戦相手のように「クセ」がある → 愛着・印象に残る

#### 4-3. 体感難易度のグラデーション

性格によって自然と難易度が変わるが、それ自体がゲームの一部:

| 性格 | 体感難易度 | 理由 |
|------|----------|------|
| チキン | ★☆☆☆☆ | 高得点椅子を譲ってくれる |
| ギャンブラー | ★★☆☆☆〜★★★☆☆ | 自滅も多いがハマると怖い |
| ミラー | ★★★☆☆ | プレイヤー次第、対応しやすい |
| リベンジャー | ★★★☆☆ | 序盤穏やか、追い詰めると凶暴 |
| アナリスト | ★★★★☆ | 合理的で隙が少ない |
| ハンター | ★★★★☆ | 後半の読みが鋭い |
| トリックスター | ★★☆☆☆〜★★★★☆ | 完全に運次第、読めない怖さ |

**意図的な設計ポイント**:
- 「やさしめ」寄りの性格が多い（チキン、ギャンブラー）→ カジュアルプレイヤーでも楽しめる
- 「難しめ」の性格（アナリスト、ハンター）は戦略的プレイヤーへの挑戦
- どの性格でも「絶対勝てない」はない → フラストレーションの軽減

---

### 5. 各性格の具体的なアルゴリズム概要

#### 5-0. 共通: 状況補正（全性格に適用）

全性格に対して、以下の状況補正を薄く適用する。性格ごとの基本戦略に対する「微調整」の位置づけ。

```typescript
// 共通補正の適用強度（性格ごとの基本戦略を1.0として）
const SITUATION_MODIFIER_WEIGHT = 0.3; // 基本戦略70%、状況補正30%

function applySituationModifier(
  baseWeights: Map<number, number>,  // 性格の基本戦略による重み
  ctx: AIContext
): Map<number, number> {
  const modified = new Map(baseWeights);

  // 勝利リーチ時: 到達可能な椅子にボーナス
  const pointsNeeded = 40 - ctx.myPoint;
  for (const chair of ctx.remainingChairs) {
    if (chair >= pointsNeeded) {
      modified.set(chair, (modified.get(chair) || 0) * 1.5);
    }
  }

  // 感電2回（瀕死）: 全体的にリスク回避方向へ
  if (ctx.myShockedCount === 2) {
    for (const chair of ctx.remainingChairs) {
      const base = modified.get(chair) || 0;
      // 低番号にボーナス、高番号にペナルティ
      const rank = ctx.remainingChairs.indexOf(chair) / ctx.remainingChairs.length;
      modified.set(chair, base * (1.5 - rank));
    }
  }

  return modified; // 最終的にnormalizeして確率分布にする
}
```

#### 5-1. チキンのアルゴリズム

```typescript
function chickenAttack(ctx: AIContext): number {
  // 低番号に極端に偏った重み
  const weights = new Map<number, number>();
  const sorted = [...ctx.remainingChairs].sort((a, b) => a - b);
  sorted.forEach((chair, i) => {
    // 逆順重み: 最も低い椅子が最大重み
    weights.set(chair, Math.pow(sorted.length - i, 2)); // 二乗で急落
  });
  return weightedRandom(applySituationModifier(weights, ctx));
}

function chickenDefend(ctx: AIContext): number {
  // 相手も低〜中番号を狙うと想定してトラップ
  const weights = new Map<number, number>();
  const sorted = [...ctx.remainingChairs].sort((a, b) => a - b);
  const lowerHalf = Math.ceil(sorted.length / 2);
  sorted.forEach((chair, i) => {
    weights.set(chair, i < lowerHalf ? 3 : 1); // 下位半分に3倍の重み
  });
  return weightedRandom(weights);
}
```

#### 5-2. ギャンブラーのアルゴリズム

```typescript
function gamblerAttack(ctx: AIContext): number {
  // 高番号に極端に偏った重み
  const weights = new Map<number, number>();
  const sorted = [...ctx.remainingChairs].sort((a, b) => a - b);
  sorted.forEach((chair, i) => {
    weights.set(chair, Math.pow(i + 1, 2)); // 高い椅子ほど二乗で重み増
  });
  // 感電回数による補正は弱め（ギャンブラーはリスクを恐れない）
  return weightedRandom(weights); // 状況補正は適用しない or 弱く適用
}

function gamblerDefend(ctx: AIContext): number {
  // 「相手も高得点を狙う」前提で高番号にトラップ
  const weights = new Map<number, number>();
  const sorted = [...ctx.remainingChairs].sort((a, b) => a - b);
  sorted.forEach((chair, i) => {
    weights.set(chair, Math.pow(i + 1, 1.5)); // 高番号寄りだがAttackほど極端でない
  });
  return weightedRandom(weights);
}
```

#### 5-3. アナリストのアルゴリズム

```typescript
function analystAttack(ctx: AIContext): number {
  const weights = new Map<number, number>();
  const n = ctx.remainingChairs.length;
  const safeProbability = (n - 1) / n;
  const trapProbability = 1 / n;

  for (const chair of ctx.remainingChairs) {
    // 期待値 = 得点 × セーフ確率 − 現在得点 × 感電確率
    const ev = chair * safeProbability - ctx.myPoint * trapProbability;
    weights.set(chair, Math.max(ev, 0.1)); // 最低値を保証
  }

  // 70%で最適手、30%でランダム
  if (Math.random() < 0.7) {
    return weightedRandom(applySituationModifier(weights, ctx));
  } else {
    return uniformRandom(ctx.remainingChairs);
  }
}

function analystDefend(ctx: AIContext): number {
  // 相手の勝利条件を逆算
  const opponentNeeds = 40 - ctx.opponentPoint;
  const weights = new Map<number, number>();

  for (const chair of ctx.remainingChairs) {
    if (chair >= opponentNeeds) {
      // 相手が勝てる椅子 → 重点トラップ
      weights.set(chair, 5);
    } else {
      // 得点が高い椅子ほどトラップ優先
      weights.set(chair, 1 + chair / 12);
    }
  }
  return weightedRandom(weights);
}
```

#### 5-4. ミラーのアルゴリズム

```typescript
function mirrorAttack(ctx: AIContext): number {
  if (ctx.history.electricChairs.length === 0) {
    return uniformRandom(ctx.remainingChairs); // 履歴なし→ランダム
  }

  // 相手の直近のトラップ位置の番号帯を真似る
  const lastTrap = ctx.history.electricChairs[ctx.history.electricChairs.length - 1];
  const tier = getTier(lastTrap, 12); // "low" | "mid" | "high"

  const weights = new Map<number, number>();
  for (const chair of ctx.remainingChairs) {
    const chairTier = getTier(chair, 12);
    weights.set(chair, chairTier === tier ? 3 : 1); // 同じ番号帯に3倍
  }
  return weightedRandom(weights);
}

function mirrorDefend(ctx: AIContext): number {
  if (ctx.history.seatedChairs.length === 0) {
    return uniformRandom(ctx.remainingChairs);
  }

  // 相手の直近の着席位置の番号帯にトラップ
  const lastSeat = ctx.history.seatedChairs[ctx.history.seatedChairs.length - 1];
  const tier = getTier(lastSeat, 12);

  const weights = new Map<number, number>();
  for (const chair of ctx.remainingChairs) {
    const chairTier = getTier(chair, 12);
    weights.set(chair, chairTier === tier ? 3 : 1);
  }
  return weightedRandom(weights);
}

// 番号帯の判定
function getTier(value: number, max: number): "low" | "mid" | "high" {
  const third = max / 3;
  if (value <= third) return "low";
  if (value <= third * 2) return "mid";
  return "high";
}
```

#### 5-5. リベンジャーのアルゴリズム

```typescript
function revengerAttack(ctx: AIContext): number {
  const weights = new Map<number, number>();
  const sorted = [...ctx.remainingChairs].sort((a, b) => a - b);

  // 感電回数に応じて攻撃性が増す
  const aggressiveness = ctx.myShockedCount; // 0, 1, 2

  sorted.forEach((chair, i) => {
    const rank = i / (sorted.length - 1 || 1); // 0.0〜1.0 (高いほど高番号)
    switch (aggressiveness) {
      case 0: // 穏やか: 中番号中心のベルカーブ
        weights.set(chair, 1 + Math.sin(rank * Math.PI));
        break;
      case 1: // やや攻撃的: 高番号寄り
        weights.set(chair, 1 + rank * 2);
        break;
      case 2: // 捨て身: 上位1/3に90%
        weights.set(chair, rank > 0.66 ? 9 : 1);
        break;
    }
  });
  return weightedRandom(weights);
}

function revengerDefend(ctx: AIContext): number {
  const weights = new Map<number, number>();

  // 直近で相手に感電させられた直後かどうか
  const wasJustShocked = ctx.myShockedCount > 0 &&
    ctx.history.electricChairs.length > 0; // 簡易判定

  for (const chair of ctx.remainingChairs) {
    if (wasJustShocked) {
      // 報復モード: 高番号に集中トラップ
      weights.set(chair, chair); // 椅子番号がそのまま重み
    } else {
      // 平常時: 均等配置
      weights.set(chair, 1);
    }
  }
  return weightedRandom(weights);
}
```

#### 5-6. ハンターのアルゴリズム

```typescript
function hunterAttack(ctx: AIContext): number {
  const history = ctx.history.electricChairs;

  if (history.length < 4) {
    // 探索フェーズ: ランダムに近い選択（情報収集）
    return uniformRandom(ctx.remainingChairs);
  }

  // 分析フェーズ: 相手のトラップ傾向を分析
  const trapFrequency = new Map<string, number>(); // tier → 回数
  for (const trap of history) {
    const tier = getTier(trap, 12);
    trapFrequency.set(tier, (trapFrequency.get(tier) || 0) + 1);
  }

  // 最も手薄な番号帯を狙う
  const weights = new Map<number, number>();
  for (const chair of ctx.remainingChairs) {
    const tier = getTier(chair, 12);
    const freq = trapFrequency.get(tier) || 0;
    // トラップ頻度が低い番号帯ほど重み大（逆数）
    weights.set(chair, 1 / (freq + 1));
  }
  return weightedRandom(applySituationModifier(weights, ctx));
}

function hunterDefend(ctx: AIContext): number {
  const history = ctx.history.seatedChairs;

  if (history.length < 4) {
    // 探索フェーズ: 均等配置
    return uniformRandom(ctx.remainingChairs);
  }

  // 分析フェーズ: 直近3回に加重平均を適用
  const recent = history.slice(-3);
  const recentWeights = [0.5, 0.3, 0.2]; // 最新ほど重い

  const tierScores = { low: 0, mid: 0, high: 0 };
  recent.forEach((seat, i) => {
    const tier = getTier(seat, 12);
    tierScores[tier] += recentWeights[i] || 0;
  });

  // 最も着席されやすい番号帯にトラップ
  const weights = new Map<number, number>();
  for (const chair of ctx.remainingChairs) {
    const tier = getTier(chair, 12);
    weights.set(chair, tierScores[tier] + 0.1); // 最低値保証
  }
  return weightedRandom(weights);
}
```

#### 5-7. トリックスターのアルゴリズム

```typescript
// 他の6性格の攻撃/防御関数への参照
const ATTACK_STRATEGIES = [
  chickenAttack, gamblerAttack, analystAttack,
  mirrorAttack, revengerAttack, hunterAttack
];
const DEFEND_STRATEGIES = [
  chickenDefend, gamblerDefend, analystDefend,
  mirrorDefend, revengerDefend, hunterDefend
];

let lastAttackIndex = -1;
let lastDefendIndex = -1;

function tricksterAttack(ctx: AIContext): number {
  // 前回と異なる戦略をランダム選択
  let index;
  do {
    index = Math.floor(Math.random() * ATTACK_STRATEGIES.length);
  } while (index === lastAttackIndex);
  lastAttackIndex = index;

  return ATTACK_STRATEGIES[index](ctx);
}

function tricksterDefend(ctx: AIContext): number {
  let index;
  do {
    index = Math.floor(Math.random() * DEFEND_STRATEGIES.length);
  } while (index === lastDefendIndex);
  lastDefendIndex = index;

  return DEFEND_STRATEGIES[index](ctx);
}
```

#### 5-8. 共通ユーティリティ

```typescript
// 重み付きランダム選択
function weightedRandom(weights: Map<number, number>): number {
  const entries = [...weights.entries()];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [chair, weight] of entries) {
    random -= weight;
    if (random <= 0) return chair;
  }
  return entries[entries.length - 1][0]; // fallback
}

// 均等ランダム
function uniformRandom(chairs: number[]): number {
  return chairs[Math.floor(Math.random() * chairs.length)];
}
```

---

### 6. AI決定関数のインターフェース（Rev2: 性格ベース）

```typescript
// Rev1からの変更: difficulty → personality
type AIContext = {
  personality: CpuPersonality;
  remainingChairs: number[];
  myPoint: number;
  opponentPoint: number;
  myShockedCount: number;
  opponentShockedCount: number;
  roundCount: number;
  history: {
    electricChairs: number[];  // 相手が設置した電気椅子の履歴
    seatedChairs: number[];    // 相手が座った椅子の履歴
  };
};

type AIDecision = {
  selectedChair: number;
  thinkingTimeMs: number;
};

function selectChairAsAttacker(ctx: AIContext): AIDecision {
  const strategies: Record<CpuPersonality, (ctx: AIContext) => number> = {
    chicken: chickenAttack,
    gambler: gamblerAttack,
    analyst: analystAttack,
    mirror: mirrorAttack,
    revenger: revengerAttack,
    hunter: hunterAttack,
    trickster: tricksterAttack,
  };

  const selectedChair = strategies[ctx.personality](ctx);
  const thinkingTimeMs = 1500 + Math.random() * 1500; // 1.5〜3.0秒

  return { selectedChair, thinkingTimeMs };
}

function selectChairAsDefender(ctx: AIContext): AIDecision {
  const strategies: Record<CpuPersonality, (ctx: AIContext) => number> = {
    chicken: chickenDefend,
    gambler: gamblerDefend,
    analyst: analystDefend,
    mirror: mirrorDefend,
    revenger: revengerDefend,
    hunter: hunterDefend,
    trickster: tricksterDefend,
  };

  const selectedChair = strategies[ctx.personality](ctx);
  const thinkingTimeMs = 1500 + Math.random() * 1500;

  return { selectedChair, thinkingTimeMs };
}
```

---

### 7. 既存設計との整合性

| Rev1（難易度ベース）の項目 | Rev2（性格ベース）での扱い |
|---|---|
| 難易度選択UI（DifficultySelectDialog） | **廃止**: 不要 |
| `difficulty` フィールド | **置換**: `cpuPersonality` に変更 |
| トップ画面「CPU対戦」→ ダイアログ | **簡素化**: ボタン押下で即ゲーム開始 |
| ゲーム結果の「難易度を変えて再戦」 | **廃止**: 「もういちど」のみ（自動で別性格） |
| `/cpu?difficulty=` ルーティング | **簡素化**: `/cpu` のみ（パラメータ不要） |
| 戦略テーブル（得点差/感電回数シフト） | **継承**: 共通補正として全性格に薄く適用 |
| パターン履歴の保持（むずかしい用） | **継承**: ミラー、ハンター、リベンジャー性格で使用 |
| 心理戦要素（思考時間、パターンの揺らぎ） | **継承**: 全性格で適用 |
| クライアントサイド完結アーキテクチャ | **継承**: 変更なし（useReducer方式そのまま） |
| 純粋関数レイヤー（gameLogic.ts） | **継承**: 変更なし |
| コンポーネント共通化方針 | **継承**: GameResultDialogのボタンが2つに減るのみ |

### 8. 初期状態の生成（Rev2版）

#### 設計方針: 性格の決定とルーム初期化を分離

将来ユーザーが性格を選択するUI改修に備え、`createInitialCpuRoom`は性格を引数で受け取る設計にする。
ランダム選択ロジックは呼び出し側に置く。

```typescript
// --- 性格の選択ロジック（呼び出し側で使用） ---

const ALL_PERSONALITIES: CpuPersonality[] = [
  "chicken", "gambler", "analyst", "mirror",
  "revenger", "hunter", "trickster"
];

/**
 * ランダムに性格を選択する。exclude指定で連続同性格を回避。
 * 将来「ユーザーが選択する」場合はこの関数を呼ばず、直接personalityを渡せばよい。
 */
export function pickRandomPersonality(exclude?: CpuPersonality): CpuPersonality {
  const candidates = exclude
    ? ALL_PERSONALITIES.filter(p => p !== exclude)
    : ALL_PERSONALITIES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// --- ルーム初期化（性格を外から受け取る） ---

export function createInitialCpuRoom(personality: CpuPersonality): CpuGameRoom {
  const humanId = "human";
  const cpuId = "cpu";
  const isHumanFirst = Math.random() < 0.5;
  const firstAttackerId = isHumanFirst ? humanId : cpuId;

  return {
    createrId: humanId,
    status: "inProgress",
    players: [
      { id: humanId, point: 0, shockedCount: 0, ready: true },
      { id: cpuId, point: 0, shockedCount: 0, ready: true },
    ],
    round: {
      count: 1,
      turn: "top",
      attackerId: firstAttack
