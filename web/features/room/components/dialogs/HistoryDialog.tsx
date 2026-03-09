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

      const actionLabel = isAttacker ? "座る椅子を選択" : "電気を仕掛ける椅子を選択";
      const chair = isAttacker ? entry.seatedChair : entry.electricChair;
      const actorLabel = isSelfTab ? selfLabel : rivalLabel;
      const roleLabel = isAttacker ? "座った側" : "仕掛けた側";
      const roleStyle = isAttacker
        ? "bg-sky-500/20 text-sky-200 border-sky-400/40"
        : "bg-orange-500/20 text-orange-200 border-orange-400/40";
      const actionStyle = isAttacker ? "text-sky-300" : "text-orange-300";
      const chairStyle = isAttacker
        ? "border-sky-500/50 bg-sky-950/40 text-sky-200"
        : "border-orange-500/50 bg-orange-950/40 text-orange-200";

      return {
        key: `${entry.roundCount}-${entry.turn}-${index}`,
        roundLabel: `${entry.roundCount}回 ${getTurnLabel(entry.turn)}`,
        actorLabel,
        roleLabel,
        roleStyle,
        actionStyle,
        actionLabel,
        chair,
        chairStyle,
        didSucceed,
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
                  className="rounded-md border border-gray-600 bg-gray-900/70 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-100">{entry.roundLabel}</div>
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        entry.didSucceed
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {entry.didSucceed ? "成功" : "失敗"}
                    </div>
                  </div>
                  <div className="mt-2 rounded border border-gray-600/80 bg-gray-950/50 p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`rounded-full border px-2 py-1 text-xs font-bold ${entry.roleStyle}`}
                      >
                        {entry.roleLabel}
                      </div>
                      <div className={`text-xs font-semibold ${entry.actionStyle}`}>
                        {entry.actionLabel}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1 font-semibold text-gray-100">
                      {entry.actionLabel === "座る椅子を選択" ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      {entry.actorLabel}
                    </div>
                    <div
                      className={`mt-2 inline-flex items-baseline gap-1 rounded-md border px-2 py-1 ${entry.chairStyle}`}
                    >
                      <span className="text-[11px]">選択した椅子</span>
                      <span className="text-xl font-black leading-none">{entry.chair}</span>
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
