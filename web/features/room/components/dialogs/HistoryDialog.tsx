import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Button } from "@/components/buttons/Button";
import { TurnHistory } from "@/types/room";
import { Shield, Zap } from "lucide-react";
import { Ref, useMemo, useState } from "react";

type HistoryDialogProps = {
  dialogRef: Ref<HTMLDialogElement>;
  history: TurnHistory[];
  userId: string;
  close: () => void;
  opponentLabel?: string;
};

type ActiveTab = "self" | "opponent";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("self");
  const selfLabel = "自分";
  const rivalLabel = opponentLabel ?? "相手";

  const entries = useMemo(() => {
    return history.map((entry, index) => {
      const isSelfTab = activeTab === "self";
      const isAttacker = isSelfTab
        ? entry.attackerId === userId
        : entry.attackerId !== userId;
      const didSucceed = isAttacker
        ? entry.result === "safe"
        : entry.result === "shocked";

      const chair = isAttacker ? entry.seatedChair : entry.electricChair;
      const roleLabel = isAttacker ? "座った側" : "仕掛け側";
      const roleStyle = isAttacker
        ? "bg-sky-500/20 text-sky-200 border-sky-400/40"
        : "bg-orange-500/20 text-orange-200 border-orange-400/40";
      const chairStyle = isAttacker
        ? "border-sky-500/50 bg-sky-950/40 text-sky-200"
        : "border-orange-500/50 bg-orange-950/40 text-orange-200";
      const resultStyle = didSucceed
        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
        : "bg-red-500/20 text-red-300 border-red-400/40";

      return {
        key: `${entry.roundCount}-${entry.turn}-${index}`,
        roundLabel: `${entry.roundCount}回 ${getTurnLabel(entry.turn)}`,
        roleLabel,
        roleStyle,
        chair,
        chairStyle,
        didSucceed,
        resultStyle,
      };
    });
  }, [activeTab, history, rivalLabel, userId]);

  return (
    <InfoDialog ref={dialogRef} borderColor="border-sky-500">
      <div className="grid gap-4">
        <h2 className="text-2xl font-bold text-sky-400">ヒストリー</h2>
        {history.length === 0 ? (
          <p className="text-gray-300">まだ履歴はありません。</p>
        ) : (
          <>
            <div className="inline-flex rounded-lg border border-gray-600 p-1 bg-gray-800/70">
              <button
                type="button"
                onClick={() => setActiveTab("self")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === "self"
                    ? "bg-sky-500 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {selfLabel}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("opponent")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === "opponent"
                    ? "bg-sky-500 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {rivalLabel}
              </button>
            </div>
            <ul className="grid gap-2 max-h-[55vh] overflow-y-auto pr-1">
              {entries.map((entry) => (
                <li
                  key={entry.key}
                  className="rounded-md border border-gray-600 bg-gray-900/70 p-2"
                >
                  <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm">
                    <div className="min-w-fit font-semibold text-gray-100">{entry.roundLabel}</div>
                    <div
                      className={`w-20 shrink-0 rounded-full border px-2 py-1 text-center text-xs font-bold ${entry.roleStyle}`}
                    >
                      {entry.roleLabel}
                    </div>
                    <div
                      className={`inline-flex min-w-fit items-center gap-1 rounded-md border px-2 py-1 ${entry.chairStyle}`}
                    >
                      {entry.roleLabel === "座った側" ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      <span className="text-[11px]">椅子</span>
                      <span className="text-lg font-black leading-none">{entry.chair}</span>
                    </div>
                    <div className="ml-auto" />
                    <div
                      className={`w-20 shrink-0 text-center rounded-full border px-2 py-1 text-xs font-bold ${entry.resultStyle}`}
                    >
                      結果: {entry.didSucceed ? "成功" : "失敗"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button type="button" onClick={close} bgColor="bg-sky-600">
          閉じる
        </Button>
      </div>
    </InfoDialog>
  );
}
