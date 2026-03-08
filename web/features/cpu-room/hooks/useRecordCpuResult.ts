import { useEffect, useRef } from "react";
import { recordCpuBattleResult } from "@/libs/firestore/cpuBattleStats";
import type { CpuGameRoom, CpuPersonality } from "@/types/room";

const PLAYER_ID = "player";
const CPU_ID = "cpu";

export function useRecordCpuResult(gameRoom: CpuGameRoom, personality: CpuPersonality) {
  const recordedRef = useRef(false);

  useEffect(() => {
    if (gameRoom.winnerId === null) return;
    if (recordedRef.current) return;
    recordedRef.current = true;

    const player = gameRoom.players.find((p) => p.id === PLAYER_ID);
    const cpu = gameRoom.players.find((p) => p.id === CPU_ID);
    if (!player || !cpu) return;

    const result =
      gameRoom.winnerId === PLAYER_ID
        ? "win"
        : gameRoom.winnerId === CPU_ID
          ? "lose"
          : ("draw" as const);

    // fire-and-forget
    recordCpuBattleResult({
      result,
      personality,
      playerScore: player.point,
      cpuScore: cpu.point,
      playerShockedCount: player.shockedCount,
      cpuShockedCount: cpu.shockedCount,
    });
  }, [gameRoom.winnerId, gameRoom.players, personality]);
}
