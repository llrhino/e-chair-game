"use server";

import {
  createRoom,
  getRoom,
  joinRoom,
  updateRoom,
  confirmTurnResult,
} from "@/libs/firestore";
import { GameRoom, Player, Round } from "@/types/room";
import { isSuccessfulGetRoomResponse, plainRoundData } from "@/utils/room";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createRoomAction() {
  const res = await createRoom();
  if (res.status !== 200) {
    return { error: res.error };
  }

  await setCookies([
    { name: "roomId", value: res.roomId as string },
    { name: "userId", value: res.userId as string },
  ]);

  return redirect(`/room/${res.roomId}`);
}

export async function joinRoomAction(
  _: { error?: string },
  formData: FormData
) {
  const roomId = formData.get("roomId") as string;
  if (!roomId) {
    return { error: "ルームIDを入力してください" };
  }

  const res = await joinRoom(roomId);

  if (res.status !== 200) {
    return { error: res.error };
  }
  await setCookies([
    { name: "roomId", value: res.roomId as string },
    { name: "userId", value: res.userId as string },
  ]);

  return redirect(`/room/${roomId}`);
}

const setCookies = async (
  nameValues: Array<{ name: string; value: string }>
) => {
  const cookieStore = await cookies();
  nameValues.forEach(({ name, value }) => {
    cookieStore.set({
      name: name,
      value: value || "",
      sameSite: "strict",
      secure: true,
      httpOnly: true,
    });
  });
};

export async function entryRoomAction({
  userId,
  roomId,
}: {
  userId: string;
  roomId: string;
}) {
  const room = await getRoom(roomId);
  if (!isSuccessfulGetRoomResponse(room)) {
    return { error: room.error };
  }

  const isPlayer = room.data.players.some((player) => player.id === userId);
  if (!isPlayer) {
    return { error: "このルームのプレイヤーではありません" };
  }

  const playersData = room.data.players.map((player) => {
    if (player.id === userId) {
      return {
        ...player,
        ready: true,
      };
    }
    return player;
  });

  const data = {
    ...room.data,
    players: playersData,
  };

  const res = await updateRoom(roomId, data);
  if (res.status !== 200) {
    return { status: res.status, error: res.error };
  }
  return { status: res.status, room: res.data as GameRoom };
}

export async function selectChairAction(data: {
  roomId: string | null;
  roundData: Round | undefined;
}) {
  const { roomId, roundData } = data;
  if (!roomId || !roundData) {
    return { status: 400, error: "ルームIDとラウンドデータを指定してください" };
  }
  const res = await updateRoom(roomId, { round: roundData });
  if (res.status !== 200) {
    return { status: res.status, error: res.error };
  }
  return { status: 200, error: "" };
}

export async function activateAction(roomId: string) {
  const room = await getRoom(roomId);

  if (!isSuccessfulGetRoomResponse(room)) {
    return { status: room.status, error: room.error };
  }

  const { players, round } = room.data;
  const isShocked = round.electricChair === round.seatedChair;

  // isShocked が true の場合、attackerId のプレイヤーの shockedCount を +1 する
  // isShockedでないばあい、attackerId のプレイヤーの point を seatedChair の値だけ増やす
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

  // shockedでない場合、remainingChairs から seatedChair を削除する
  const remainingChairs = isShocked
    ? room.data.remainingChairs
    : room.data.remainingChairs.filter((chair) => chair !== round.seatedChair);

  // 勝敗判定
  let winnerId = null;
  const attackerId = round.attackerId;
  const defenderId = room.data.players.find(
    (player) => player.id !== attackerId
  )?.id;
  if (updatedPlayers.some((player) => player.point >= 40)) {
    winnerId = round.attackerId;
  } else if (updatedPlayers.some((player) => player.shockedCount === 3)) {
    winnerId = defenderId;
  } else if (remainingChairs.length === 1) {
    const winner = updatedPlayers.reduce((prev, current) => {
      if (current.point > prev.point) {
        return current;
      } else if (current.point === prev.point) {
        return { id: "draw" } as Player;
      }
      return prev;
    });
    winnerId = winner.id;
  }

  const data: Partial<GameRoom> = {
    players: updatedPlayers,
    remainingChairs,
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

  const res = await updateRoom(roomId, data);

  if (res.status !== 200) {
    return { status: res.status, error: res.error };
  }
  return { status: res.status, room: res.data as GameRoom };
}

export async function changeTurnAction({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const res = await confirmTurnResult(roomId, userId, (round, confirmedIds) => {
    if (confirmedIds.length === 1) {
      // 最初の確認: 結果表示フラグを立てて待機
      return {
        round: {
          ...round,
          result: {
            ...round.result,
            confirmedIds,
            shownResult: true,
          },
        },
      };
    }

    if (confirmedIds.length === 2) {
      // 2人目の確認: 次のラウンドへ
      const nextAttackerId =
        confirmedIds.find((id) => id !== round.attackerId) ?? confirmedIds[0];

      if (round.turn === "top") {
        return {
          round: {
            ...plainRoundData.round,
            attackerId: nextAttackerId,
            turn: "bottom" as const,
            count: round.count,
          },
        };
      } else {
        return {
          round: {
            ...plainRoundData.round,
            attackerId: nextAttackerId,
            turn: "top" as const,
            count: round.count + 1,
          },
        };
      }
    }

    return null;
  });

  if (res.status !== 200) {
    return { status: res.status, error: res.error };
  }
  return { status: res.status, room: res.data };
}
