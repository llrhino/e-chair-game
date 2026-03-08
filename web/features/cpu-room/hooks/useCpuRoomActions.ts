import { useCallback, useState } from "react";
import type { CpuGameAction } from "@/features/cpu-room/hooks/useCpuGame";
import type { PlayerOperation } from "@/features/room/hooks/usePlayerOperation";

type UseCpuRoomActionsProps = {
  dispatch: React.Dispatch<CpuGameAction>;
  playerOperation: PlayerOperation;
};

export function useCpuRoomActions({
  dispatch,
  playerOperation,
}: UseCpuRoomActionsProps) {
  const [selectedChair, setSelectedChair] = useState<number | null>(null);

  const selectChair = useCallback(() => {
    if (selectedChair === null) return;

    if (playerOperation.setElectricShock) {
      dispatch({ type: "SELECT_ELECTRIC_CHAIR", chair: selectedChair });
    } else if (playerOperation.selectSitChair) {
      dispatch({ type: "SELECT_SEATED_CHAIR", chair: selectedChair });
    }
  }, [selectedChair, playerOperation, dispatch]);

  const submitActivate = useCallback(
    (onBeforeActivate?: () => void) => {
      onBeforeActivate?.();
      dispatch({ type: "ACTIVATE" });
    },
    [dispatch]
  );

  const changeTurn = useCallback(
    (onBeforeChange?: () => void) => {
      onBeforeChange?.();
      dispatch({ type: "SHOW_RESULT" });
      dispatch({ type: "CHANGE_TURN" });
    },
    [dispatch]
  );

  return {
    selectedChair,
    setSelectedChair,
    selectChair,
    submitActivate,
    changeTurn,
  };
}
