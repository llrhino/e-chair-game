import test from "node:test";
import assert from "node:assert/strict";
import { cpuGameReducer, createInitialCpuRoom } from "@/features/cpu-room/hooks/useCpuGame";
import type { CpuGameRoom } from "@/types/room";

function withRound(state: CpuGameRoom, round: Partial<CpuGameRoom["round"]>): CpuGameRoom {
  return {
    ...state,
    round: {
      ...state.round,
      ...round,
    },
  };
}

test("ACTIVATEでsafe結果の履歴が追加される", () => {
  const initial = createInitialCpuRoom("chicken");
  const state = withRound(initial, {
    count: 2,
    turn: "top",
    attackerId: "player",
    phase: "activating",
    electricChair: 1,
    seatedChair: 2,
  });

  const next = cpuGameReducer(state, { type: "ACTIVATE" });

  assert.equal(next.history.length, 1);
  assert.deepEqual(next.history[0], {
    roundCount: 2,
    turn: "top",
    attackerId: "player",
    electricChair: 1,
    seatedChair: 2,
    result: "safe",
  });
});

test("感電時にスコアがリセットされても履歴が記録される", () => {
  const initial = createInitialCpuRoom("analyst");
  const withPoints: CpuGameRoom = {
    ...initial,
    players: initial.players.map((player) =>
      player.id === "player" ? { ...player, point: 15, shockedCount: 0 } : player
    ),
    history: [
      {
        roundCount: 1,
        turn: "top",
        attackerId: "player",
        electricChair: 4,
        seatedChair: 5,
        result: "safe",
      },
    ],
  };
  const state = withRound(withPoints, {
    count: 2,
    turn: "bottom",
    attackerId: "player",
    phase: "activating",
    electricChair: 3,
    seatedChair: 3,
  });

  const next = cpuGameReducer(state, { type: "ACTIVATE" });
  const attacker = next.players.find((player) => player.id === "player");

  assert.equal(attacker?.point, 0);
  assert.equal(attacker?.shockedCount, 1);
  assert.equal(next.history.length, 2);
  assert.equal(next.history[1]?.result, "shocked");
});

test("winnerId確定ターンでも最終履歴が追加される", () => {
  const initial = createInitialCpuRoom("hunter");
  const prepared: CpuGameRoom = {
    ...initial,
    players: initial.players.map((player) =>
      player.id === "player" ? { ...player, point: 39 } : player
    ),
    remainingChairs: [5],
  };
  const state = withRound(prepared, {
    count: 3,
    turn: "bottom",
    attackerId: "player",
    phase: "activating",
    electricChair: 1,
    seatedChair: 5,
  });

  const next = cpuGameReducer(state, { type: "ACTIVATE" });

  assert.equal(next.winnerId, "player");
  assert.equal(next.history.length, 1);
  assert.deepEqual(next.history[0], {
    roundCount: 3,
    turn: "bottom",
    attackerId: "player",
    electricChair: 1,
    seatedChair: 5,
    result: "safe",
  });
});
