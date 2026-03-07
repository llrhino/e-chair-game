import { GameRoom, Player } from "@/types/room";
import { plainRoundData } from "@/utils/room";

/**
 * 勝敗判定
 * - 40点以上到達 → 攻撃側の勝利
 * - 感電3回 → 防御側の勝利
 * - 残り椅子1脚 → 高得点者の勝利（同点なら引き分け）
 */
export function determineWinner(
  players: Player[],
  remainingChairs: number[],
  attackerId: string
): string | null {
  const defenderId = players.find((p) => p.id !== attackerId)?.id ?? null;

  if (players.some((p) => p.point >= 40)) {
    return attackerId;
  }

  if (players.some((p) => p.shockedCount === 3)) {
    return defenderId;
  }

  if (remainingChairs.length === 1) {
    const winner = players.reduce((prev, current) => {
      if (current.point > prev.point) {
        return current;
      } else if (current.point === prev.point) {
        return { id: "draw" } as Player;
      }
      return prev;
    });
    return winner.id;
  }

  return null;
}

/**
 * 感電判定 → スコア更新 → 勝敗判定 → resultフェーズ遷移
 */
export function applyActivation(room: GameRoom): GameRoom {
  const { players, round, remainingChairs } = room;
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

  const updatedRemainingChairs = isShocked
    ? remainingChairs
    : remainingChairs.filter((chair) => chair !== round.seatedChair);

  const winnerId = determineWinner(
    updatedPlayers,
    updatedRemainingChairs,
    round.attackerId
  );

  return {
    ...room,
    players: updatedPlayers,
    remainingChairs: updatedRemainingChairs,
    winnerId,
    round: {
      ...round,
      phase: "result",
      result: {
        ...round.result,
        status: isShocked ? "shocked" : "safe",
      },
    },
  };
}

/**
 * ターン遷移ロジック
 * top → bottom（同じcount）、bottom → top（count+1）
 */
export function applyChangeTurn(room: GameRoom): GameRoom {
  const { round } = room;
  const nextAttackerId =
    room.players.find((p) => p.id !== round.attackerId)?.id ?? round.attackerId;

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
  }

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
