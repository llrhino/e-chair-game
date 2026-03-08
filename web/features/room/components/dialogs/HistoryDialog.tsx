import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Button } from "@/components/buttons/Button";
import { TurnHistory } from "@/types/room";
import { Shield, Target, Zap } from "lucide-react";
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
              const seatedLabel =
                entry.attackerId === userId ? opponentLabel ?? "相手" : "自分";
              const strategyResult =
                entry.result === "shocked"
                  ? "電気を仕掛けた側の作戦成功"
                  : "座った側の回避成功";
              return (
                <li
                  key={`${entry.roundCount}-${entry.turn}-${index}`}
                  className="rounded-md border border-gray-600 bg-gray-900/70 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-100">
                      {entry.roundCount}回 {getTurnLabel(entry.turn)}
                    </div>
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        entry.result === "shocked"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {strategyResult}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div className="rounded border border-orange-400/40 bg-orange-950/30 p-2">
                      <div className="flex items-center gap-1 text-orange-300 font-semibold">
                        <Zap className="h-4 w-4" />
                        電気を仕掛けた側
                      </div>
                      <div className="text-white font-bold">{attackerLabel}</div>
                      <div className="text-gray-300 text-xs mt-1">
                        狙い: 椅子{entry.electricChair}
                      </div>
                    </div>
                    <div className="rounded border border-sky-400/40 bg-sky-950/30 p-2">
                      <div className="flex items-center gap-1 text-sky-300 font-semibold">
                        <Shield className="h-4 w-4" />
                        座った側
                      </div>
                      <div className="text-white font-bold">{seatedLabel}</div>
                      <div className="text-gray-300 text-xs mt-1">
                        選択: 椅子{entry.seatedChair}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                    <Target className="h-4 w-4 text-gray-400" />
                    結果:
                    <span
                      className={`font-semibold ${
                        entry.result === "shocked" ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {entry.result === "shocked" ? "感電" : "セーフ"}
                    </span>
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
