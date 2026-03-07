import { Round } from "@/types/room";

type InstructionMessageProps = {
  playerOperation: {
    setElectricShock: boolean;
    selectSitChair: boolean;
    activate: boolean;
    wait: boolean;
  };
  round: Round | undefined;
  userId: string | null;
  opponentLabel?: string;
};

export function InstructionMessage({
  playerOperation,
  round,
  userId,
  opponentLabel,
}: InstructionMessageProps) {
  const label = opponentLabel ?? "相手";
  const getInstruction = () => {
    if (playerOperation.setElectricShock) {
      return "電流を仕掛ける椅子を選んでください";
    }
    if (playerOperation.selectSitChair) {
      return "座る椅子を選んでください";
    }
    if (playerOperation.wait) {
      if (round?.phase === "setting") {
        return `${label}が電流を仕掛けています。。。`;
      }
      if (round?.phase === "sitting") {
        return `${label}が座る椅子を選んでいます。。。`;
      }
      if (round?.phase === "activating") {
        if (round?.attackerId === userId) {
          return "まもなく電流が起動します。。。";
        } else {
          return "電流を起動してください";
        }
      }
    }
    return "お待ちください。。。";
  };
  return (
    <div className="text-center">
      <p
        className={`font-bold text-white text-sm bg-gray-800 bg-opacity-75 p-3 rounded-full whitespace-nowrap ${
          !playerOperation.wait && "animate-pulse"
        }`}
      >
        {getInstruction()}
      </p>
    </div>
  );
}
