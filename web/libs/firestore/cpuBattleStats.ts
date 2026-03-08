"use server";

import { collection, doc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { getFirestoreApp } from "./config";
import type { CpuPersonality } from "@/types/room";

type BattleResult = "win" | "lose" | "draw";

export async function recordCpuBattleResult({
  result,
  personality,
  playerScore,
  cpuScore,
  playerShockedCount,
  cpuShockedCount,
}: {
  result: BattleResult;
  personality: CpuPersonality;
  playerScore: number;
  cpuScore: number;
  playerShockedCount: number;
  cpuShockedCount: number;
}): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[cpuBattleStats] Skipped recording (non-production environment)");
    return;
  }

  try {
    const db = await getFirestoreApp();

    // プレイヤー視点 → CPU視点に変換
    const cpuResult: BattleResult =
      result === "win" ? "lose" : result === "lose" ? "win" : "draw";

    const batch = writeBatch(db);

    // 1. 個別記録（プレイヤー視点）
    const resultRef = doc(collection(db, "cpuBattleResults"));
    batch.set(resultRef, {
      result,
      personality,
      playerScore,
      cpuScore,
      playerShockedCount,
      cpuShockedCount,
      createdAt: serverTimestamp(),
    });

    // 2. 全体集計カウンター（CPU視点）
    batch.set(
      doc(db, "cpuBattleStats", "total"),
      {
        [cpuResult]: increment(1),
        totalGames: increment(1),
      },
      { merge: true }
    );

    // 3. パーソナリティ別集計カウンター（CPU視点）
    batch.set(
      doc(db, "cpuBattleStats", `personality_${personality}`),
      {
        [cpuResult]: increment(1),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    console.error("[cpuBattleStats] Failed to record result:", error);
  }
}
