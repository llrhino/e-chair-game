import { useReducer } from "react";
import {
  CpuGameRoom,
  CpuPersonality,
  CPU_DISPLAY_NAMES,
  GameRoom,
  TurnHistory,
} from "@/types/room";
import { plainRoundData } from "@/utils/room";
import { applyActivation, applyChangeTurn } from "@/features/room/logic/gameLogic";

// ─── Action型 ───

export type CpuGameAction =
  | { type: "SELECT_ELECTRIC_CHAIR"; chair: number }
  | { type: "SELECT_SEATED_CHAIR"; chair: number }
  | { type: "ACTIVATE" }
  | { type: "SHOW_RESULT" }
  | { type: "CHANGE_TURN" };

export function buildTurnHistoryEntry(
  previousState: CpuGameRoom,
  activatedState: CpuGameRoom
): TurnHistory | null {
  const result = activatedState.round.result.status;

  if (
    activatedState.round.phase !== "result" ||
    previousState.round.phase === "result" ||
    (result !== "shocked" && result !== "safe") ||
    previousState.round.electricChair === null ||
    previousState.round.seatedChair === null
  ) {
    return null;
  }

  return {
    roundCount: previousState.round.count,
    turn: previousState.round.turn,
    attackerId: previousState.round.attackerId,
    electricChair: previousState.round.electricChair,
    seatedChair: previousState.round.seatedChair,
    result,
  };
}

// ─── Reducer ───

export function cpuGameReducer(
  state: CpuGameRoom,
  action: CpuGameAction
): CpuGameRoom {
  switch (action.type) {
    case "SELECT_ELECTRIC_CHAIR":
      return {
        ...state,
        round: {
          ...state.round,
          electricChair: action.chair,
          phase: "sitting",
        },
      };
    case "SELECT_SEATED_CHAIR":
      return {
        ...state,
        round: {
          ...state.round,
          seatedChair: action.chair,
          phase: "activating",
        },
      };
    case "ACTIVATE":
      const activatedState = applyActivation(state) as CpuGameRoom;
      const historyEntry = buildTurnHistoryEntry(state, activatedState);
      if (!historyEntry) {
        return activatedState;
      }
      return {
        ...activatedState,
        history: [...state.history, historyEntry],
      };
    case "SHOW_RESULT":
      return {
        ...state,
        round: {
          ...state.round,
          result: {
            ...state.round.result,
            shownResult: true,
          },
        },
      };
    case "CHANGE_TURN":
      return applyChangeTurn(state) as CpuGameRoom;
  }
}

// ─── 初期状態生成 ───

const PLAYER_ID = "player";
const CPU_ID = "cpu";

export function createInitialCpuRoom(personality: CpuPersonality): CpuGameRoom {
  const baseRoom: GameRoom = {
    createrId: PLAYER_ID,
    status: "inProgress",
    players: [
      { id: PLAYER_ID, point: 0, shockedCount: 0, ready: true },
      { id: CPU_ID, point: 0, shockedCount: 0, ready: true },
    ],
    round: {
      ...plainRoundData.round,
      attackerId: PLAYER_ID,
    },
    remainingChairs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    winnerId: null,
  };

  return {
    ...baseRoom,
    cpuDisplayName: CPU_DISPLAY_NAMES[personality],
    history: [],
  };
}

// ─── Hook ───

export function useCpuGame(personality: CpuPersonality) {
  const [gameRoom, dispatch] = useReducer(
    cpuGameReducer,
    personality,
    createInitialCpuRoom
  );

  return { gameRoom, dispatch };
}
