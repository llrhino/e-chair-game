import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Button } from "@/components/buttons/Button";
import { TurnHistory } from "@/types/room";
import { Ref } from "react";

type HistoryDialogProps = {
  dialogRef: Ref<HTMLDialogElement>;
  history: TurnHistory[];
  userId: string;
  close: () => void;
  opponentLabel?: string;
};

function getTurnLabel(turn: TurnHistory["turn"]) {
  return turn === "top" ? "表" : "裏";
}

export function HistoryDialog({
  dialogRef,
  history,
  userId,
  close,
  opponentLabel,
}: HistoryDialogProps) {
  return (
    <InfoDialog ref={dialogRef} borderColor="border-sky-500">
      <div className="grid gap-4">
        <h2 className="text-2xl font-bold text-sky-400">ヒストリー</h2>
        {history.length === 0 ? (
          <p className="text-gray-300">まだ履歴はありません。</p>
        ) : (
          <ul className="grid gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {history.map((entry, index) => {
              const attackerLabel =
                entry.attackerId === userId ? "自分" : opponentLabel ?? "相手";
              return (
                <li
                  key={`${entry.roundCount}-${entry.turn}-${index}`}
                  className="rounded-md border border-gray-600 bg-gray-900/70 p-3 text-sm"
                >
                  <div className="font-semibold text-gray-100">
                    {entry.roundCount}回 {getTurnLabel(entry.turn)} ({attackerLabel}
                    攻撃)
                  </div>
                  <div className="text-gray-300">
                    電気椅子: {entry.electricChair} / 座った椅子: {entry.seatedChair}
                  </div>
                  <div
                    className={`font-semibold ${
                      entry.result === "shocked" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    結果: {entry.result === "shocked" ? "感電" : "セーフ"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Button type="button" onClick={close} bgColor="bg-sky-600">
          閉じる
        </Button>
      </div>
    </InfoDialog>
  );
}
