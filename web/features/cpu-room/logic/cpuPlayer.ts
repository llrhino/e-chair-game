import { CpuPersonality } from "@/types/room";

// ─── インターフェース ───

export type AIContext = {
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

export type AIDecision = {
  selectedChair: number;
  thinkingTimeMs: number;
};

// ─── 公開API ───

export function selectChairAsAttacker(ctx: AIContext): AIDecision {
  const chair = applyCommonCorrection(ctx, selectAttackChair(ctx), "attack");
  return { selectedChair: chair, thinkingTimeMs: randomThinkingTime() };
}

export function selectChairAsDefender(ctx: AIContext): AIDecision {
  const chair = applyCommonCorrection(ctx, selectDefenseChair(ctx), "defense");
  return { selectedChair: chair, thinkingTimeMs: randomThinkingTime() };
}

// ─── 性格選択 ───

export function pickRandomPersonality(
  previous?: CpuPersonality
): CpuPersonality {
  const all: CpuPersonality[] = [
    "chicken",
    "gambler",
    "analyst",
    "mirror",
    "revenger",
    "hunter",
    "trickster",
  ];
  const candidates = previous ? all.filter((p) => p !== previous) : all;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── 内部: 性格別ルーター ───

function selectAttackChair(ctx: AIContext): number {
  switch (ctx.personality) {
    case "chicken":
      return chickenAttack(ctx);
    case "gambler":
      return gamblerAttack(ctx);
    case "analyst":
      return analystAttack(ctx);
    case "mirror":
      return mirrorAttack(ctx);
    case "revenger":
      return revengerAttack(ctx);
    case "hunter":
      return hunterAttack(ctx);
    case "trickster":
      return tricksterAttack(ctx);
  }
}

function selectDefenseChair(ctx: AIContext): number {
  switch (ctx.personality) {
    case "chicken":
      return chickenDefense(ctx);
    case "gambler":
      return gamblerDefense(ctx);
    case "analyst":
      return analystDefense(ctx);
    case "mirror":
      return mirrorDefense(ctx);
    case "revenger":
      return revengerDefense(ctx);
    case "hunter":
      return hunterDefense(ctx);
    case "trickster":
      return tricksterDefense(ctx);
  }
}

// ─── チキン ───

function chickenAttack(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const lowerThird = getLowerThird(chairs);
  return weightedPick(chairs, (c) => (lowerThird.includes(c) ? 0.8 : 0.2));
}

function chickenDefense(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const lowerTwoThirds = getLowerTwoThirds(chairs);
  return weightedPick(chairs, (c) =>
    lowerTwoThirds.includes(c) ? 0.7 : 0.3
  );
}

// ─── ギャンブラー ───

function gamblerAttack(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const upperThird = getUpperThird(chairs);
  return weightedPick(chairs, (c) => (upperThird.includes(c) ? 0.7 : 0.3));
}

function gamblerDefense(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const upperThird = getUpperThird(chairs);
  return weightedPick(chairs, (c) => (upperThird.includes(c) ? 0.7 : 0.3));
}

// ─── アナリスト ───

function analystAttack(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  if (Math.random() < 0.3) {
    return uniformPick(chairs);
  }
  // 期待値: 椅子番号 × セーフ確率 − 現在得点 × 感電確率
  // セーフ確率 = (n-1)/n, 感電確率 = 1/n  (n = 椅子数)
  const n = chairs.length;
  const safeProb = (n - 1) / n;
  const shockProb = 1 / n;
  const scores = chairs.map((c) => c * safeProb - ctx.myPoint * shockProb);
  const maxScore = Math.max(...scores);
  const bestChairs = chairs.filter((_, i) => scores[i] === maxScore);
  return uniformPick(bestChairs);
}

function analystDefense(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  // 相手の勝利条件逆算: 相手が40点に到達するのに必要な得点
  const needed = 40 - ctx.opponentPoint;
  // 相手が座りそうな椅子（needed以上 or 最大番号付近）を重点トラップ
  const targetChairs = chairs.filter((c) => c >= needed);
  if (targetChairs.length > 0 && Math.random() < 0.7) {
    return uniformPick(targetChairs);
  }
  return uniformPick(chairs);
}

// ─── ミラー ───

function mirrorAttack(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const lastElectric =
    ctx.history.electricChairs[ctx.history.electricChairs.length - 1];
  if (lastElectric === undefined) {
    return uniformPick(chairs);
  }
  return pickFromSameBand(chairs, lastElectric);
}

function mirrorDefense(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const lastSeated =
    ctx.history.seatedChairs[ctx.history.seatedChairs.length - 1];
  if (lastSeated === undefined) {
    return uniformPick(chairs);
  }
  return pickFromSameBand(chairs, lastSeated);
}

// ─── リベンジャー ───

function revengerAttack(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  switch (ctx.myShockedCount) {
    case 0:
      return pickFromMiddle(chairs);
    case 1: {
      const upperThird = getUpperThird(chairs);
      return weightedPick(chairs, (c) =>
        upperThird.includes(c) ? 0.65 : 0.35
      );
    }
    default: {
      // 2回以上: 捨て身 — 上位1/3に90%
      const upperThird = getUpperThird(chairs);
      return weightedPick(chairs, (c) =>
        upperThird.includes(c) ? 0.9 : 0.1
      );
    }
  }
}

function revengerDefense(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  // 直近で感電させられた場合は高番号に全力トラップ
  const wasRecentlyShocked =
    ctx.myShockedCount > 0 && ctx.history.seatedChairs.length > 0;
  if (wasRecentlyShocked) {
    const upperThird = getUpperThird(chairs);
    return weightedPick(chairs, (c) =>
      upperThird.includes(c) ? 0.8 : 0.2
    );
  }
  // 平常時は均等配置
  return uniformPick(chairs);
}

// ─── ハンター ───

function hunterAttack(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  // 履歴4ターン未満はランダム
  if (ctx.history.electricChairs.length < 4) {
    return uniformPick(chairs);
  }
  // 相手のトラップ傾向を分析し、手薄な番号帯を狙う
  const trapCounts = buildFrequencyMap(ctx.history.electricChairs);
  // トラップが少ない椅子ほど重みが高い
  const maxCount = Math.max(...chairs.map((c) => trapCounts.get(c) ?? 0), 1);
  return weightedPick(chairs, (c) => {
    const count = trapCounts.get(c) ?? 0;
    return maxCount - count + 1;
  });
}

function hunterDefense(ctx: AIContext): number {
  const chairs = ctx.remainingChairs;
  const recent = ctx.history.seatedChairs.slice(-3);
  if (recent.length === 0) {
    return uniformPick(chairs);
  }
  // 直近3回の着席履歴を加重平均し、最も座られやすい番号帯にトラップ
  const weights = [1, 2, 3]; // 新しいほど重い
  const weightedSum = recent.reduce(
    (sum, chair, i) => sum + chair * weights[i],
    0
  );
  const totalWeight = weights.slice(0, recent.length).reduce((a, b) => a + b);
  const target = weightedSum / totalWeight;
  // ターゲット付近の椅子を優先
  return weightedPick(chairs, (c) => {
    const dist = Math.abs(c - target);
    return 1 / (dist + 1);
  });
}

// ─── トリックスター ───

// トリックスター用の内部状態（モジュールスコープで保持）
let lastTricksterStrategy: CpuPersonality | null = null;

export function resetTricksterState(): void {
  lastTricksterStrategy = null;
}

function tricksterAttack(ctx: AIContext): number {
  const strategy = pickTricksterStrategy();
  const fakeCtx = { ...ctx, personality: strategy };
  return selectAttackChair(fakeCtx);
}

function tricksterDefense(ctx: AIContext): number {
  const strategy = pickTricksterStrategy();
  const fakeCtx = { ...ctx, personality: strategy };
  return selectDefenseChair(fakeCtx);
}

function pickTricksterStrategy(): CpuPersonality {
  const others: CpuPersonality[] = [
    "chicken",
    "gambler",
    "analyst",
    "mirror",
    "revenger",
    "hunter",
  ];
  const candidates = lastTricksterStrategy
    ? others.filter((p) => p !== lastTricksterStrategy)
    : others;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  lastTricksterStrategy = picked;
  return picked;
}

// ─── 共通補正 ───

function applyCommonCorrection(
  ctx: AIContext,
  baseChoice: number,
  role: "attack" | "defense"
): number {
  const chairs = ctx.remainingChairs;

  // 勝利リーチ時のボーナス（攻撃時のみ）
  if (role === "attack") {
    const needed = 40 - ctx.myPoint;
    const reachChairs = chairs.filter((c) => c >= needed);
    if (reachChairs.length > 0 && Math.random() < 0.15) {
      return uniformPick(reachChairs);
    }
  }

  // 感電2回時のリスク回避（攻撃時のみ）
  if (role === "attack" && ctx.myShockedCount === 2) {
    const lowerHalf = chairs
      .slice()
      .sort((a, b) => a - b)
      .slice(0, Math.ceil(chairs.length / 2));
    if (Math.random() < 0.2) {
      return uniformPick(lowerHalf);
    }
  }

  // 確率的な揺らぎ: 10%でランダムに変更
  if (Math.random() < 0.1) {
    return uniformPick(chairs);
  }

  return baseChoice;
}

// ─── ユーティリティ ───

function uniformPick(chairs: number[]): number {
  return chairs[Math.floor(Math.random() * chairs.length)];
}

function weightedPick(
  chairs: number[],
  weightFn: (chair: number) => number
): number {
  const weights = chairs.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < chairs.length; i++) {
    r -= weights[i];
    if (r <= 0) return chairs[i];
  }
  return chairs[chairs.length - 1];
}

function getLowerThird(chairs: number[]): number[] {
  const sorted = [...chairs].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.ceil(sorted.length / 3));
  return sorted.slice(0, cutoff);
}

function getUpperThird(chairs: number[]): number[] {
  const sorted = [...chairs].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.ceil(sorted.length / 3));
  return sorted.slice(-cutoff);
}

function getLowerTwoThirds(chairs: number[]): number[] {
  const sorted = [...chairs].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.ceil((sorted.length * 2) / 3));
  return sorted.slice(0, cutoff);
}

function pickFromMiddle(chairs: number[]): number {
  const sorted = [...chairs].sort((a, b) => a - b);
  const third = Math.max(1, Math.ceil(sorted.length / 3));
  const middle = sorted.slice(third, sorted.length - third);
  if (middle.length === 0) return uniformPick(chairs);
  return uniformPick(middle);
}

function pickFromSameBand(chairs: number[], target: number): number {
  // target付近（±椅子数の1/3）の範囲から選択
  const range = Math.max(1, Math.ceil(chairs.length / 3));
  const band = chairs.filter(
    (c) => c >= target - range && c <= target + range
  );
  if (band.length === 0) return uniformPick(chairs);
  return uniformPick(band);
}

function buildFrequencyMap(values: number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const v of values) {
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}

function randomThinkingTime(): number {
  return 1500 + Math.random() * 1500; // 1.5〜3秒
}
