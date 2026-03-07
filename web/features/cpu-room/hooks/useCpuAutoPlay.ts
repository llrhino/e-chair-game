import { useEffect, useRef } from "react";
import type { CpuGameRoom, CpuPersonality } from "@/types/room";
import type { CpuGameAction } from "@/features/cpu-room/hooks/useCpuGame";
import {
  selectChairAsAttacker,
  selectChairAsDefender,
  type AIContext,
} from "@/features/cpu-room/logic/cpuPlayer";

const CPU_ID = "cpu";

const ACTIVATE_DELAY_MIN = 800;
const ACTIVATE_DELAY_MAX = 1500;

type UseCpuAutoPlayProps = {
  gameRoom: CpuGameRoom;
  dispatch: React.Dispatch<CpuGameAction>;
  personality: CpuPersonality;
};

export function useCpuAutoPlay({
  gameRoom,
  dispatch,
  personality,
}: UseCpuAutoPlayProps) {
  const historyRef = useRef<{ electricChairs: number[]; seatedChairs: number[] }>({
    electricChairs: [],
    seatedChairs: [],
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 履歴をresultフェーズで更新
  useEffect(() => {
    if (gameRoom.round.phase !== "result") return;
    const { electricChair, seatedChair } = gameRoom.round;
    const history = historyRef.current;
    if (
      electricChair !== null &&
      history.electricChairs[history.electricChairs.length - 1] !== electricChair
    ) {
      history.electricChairs.push(electricChair);
    }
    if (
      seatedChair !== null &&
      history.seatedChairs[history.seatedChairs.length - 1] !== seatedChair
    ) {
      history.seatedChairs.push(seatedChair);
    }
  }, [gameRoom.round]);

  // CPUのターン検知と自動応答
  useEffect(() => {
    const { round, players } = gameRoom;
    const isCpuAttacker = round.attackerId === CPU_ID;
    const isCpuDefender = round.attackerId !== CPU_ID;

    const cpuPlayer = players.find((p) => p.id === CPU_ID);
    const playerObj = players.find((p) => p.id !== CPU_ID);
    if (!cpuPlayer || !playerObj) return;

    const buildContext = (): AIContext => ({
      personality,
      remainingChairs: gameRoom.remainingChairs,
      myPoint: cpuPlayer.point,
      opponentPoint: playerObj.point,
      myShockedCount: cpuPlayer.shockedCount,
      opponentShockedCount: playerObj.shockedCount,
      roundCount: round.count,
      history: { ...historyRef.current },
    });

    // CPUが守備側: settingフェーズで電気椅子を設置
    if (round.phase === "setting" && isCpuDefender) {
      const ctx = buildContext();
      const decision = selectChairAsDefender(ctx);
      timerRef.current = setTimeout(() => {
        dispatch({ type: "SELECT_ELECTRIC_CHAIR", chair: decision.selectedChair });
      }, decision.thinkingTimeMs);
      return;
    }

    // CPUが攻撃側: sittingフェーズで座る椅子を選択
    if (round.phase === "sitting" && isCpuAttacker) {
      const ctx = buildContext();
      const decision = selectChairAsAttacker(ctx);
      timerRef.current = setTimeout(() => {
        dispatch({ type: "SELECT_SEATED_CHAIR", chair: decision.selectedChair });
      }, decision.thinkingTimeMs);
      return;
    }

    // CPUが守備側: activatingフェーズで電流を起動
    if (round.phase === "activating" && isCpuDefender) {
      const delay =
        ACTIVATE_DELAY_MIN +
        Math.random() * (ACTIVATE_DELAY_MAX - ACTIVATE_DELAY_MIN);
      timerRef.current = setTimeout(() => {
        dispatch({ type: "ACTIVATE" });
      }, delay);
      return;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameRoom.round.phase, gameRoom.round.attackerId, dispatch, personality, gameRoom]);
}
