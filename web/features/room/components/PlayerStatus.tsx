import { Player } from "@/types/room";
import { Skull } from "lucide-react";

type PlayerStatusProps = {
  userId: string | null;
  status: Player | undefined;
  opponentLabel?: string;
};

export function PlayerStatus({ userId, status, opponentLabel }: PlayerStatusProps) {
  const playerStatus = status;
  const playerName = status?.id === userId ? "あなた" : (opponentLabel ?? "相手");

  return (
    <div className="p-6 bg-gray-700 text-center rounded-lg">
      <p className="text-xl text-red-400 font-bold">{playerName}</p>
      {playerStatus?.ready && (
        <>
          <p className="text-yellow-300">得点:{playerStatus?.point}</p>
          <div className="flex items-center justify-center text-red-300">
            <Skull className="mr-1" />
            <p>感電:{playerStatus?.shockedCount}</p>
          </div>
        </>
      )}
    </div>
  );
}
