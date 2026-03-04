import { CpuGameRoom, GameRoom, RoomResponse } from "@/types/room";

export const plainRoundData: Pick<GameRoom, "round"> = {
  round: {
    count: 1,
    turn: "top",
    attackerId: "",
    phase: "setting",
    electricChair: null,
    seatedChair: null,
    result: {
      status: null,
      confirmedIds: [],
      shownResult: false,
    },
  },
};

export const isSuccessfulGetRoomResponse = (
  room: RoomResponse
): room is { status: 200; data: GameRoom } => {
  return room.status === 200;
};

const isCpuGameRoom = (
  roomData: GameRoom | CpuGameRoom
): roomData is CpuGameRoom => {
  return "cpuDisplayName" in roomData;
};

export const getOpponentLabel = (
  roomData: GameRoom | CpuGameRoom
): string => {
  if (isCpuGameRoom(roomData)) {
    return roomData.cpuDisplayName;
  }
  return "相手";
};
