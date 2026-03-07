import { ShowNoticeModalFn } from "@/features/room/types/dialog";
import { GameRoom } from "@/types/room";
import { useEffect } from "react";
import { RoomPhaseHandlers } from "@/features/room/hooks/useRoomPhaseHandlers";

export function useRoomEffect({
  roomData,
  userId,
  isAllReady,
  setShowShock,
  showCreaterWaitingStartModal,
  closeCreaterWaitingStartModal,
  showStartTurnModal,
  showNoticeModal,
  closeNoticeModal,
  handleSubmitActivate,
  playShockEffect,
  playSafeEffect,
  showGameResultModal,
  showTurnResultModal,
  opponentLabel,
}: {
  roomData: GameRoom | null;
  userId: string;
  isAllReady: () => boolean;
  setShowShock: React.Dispatch<React.SetStateAction<"" | "shock" | "safe">>;
  showCreaterWaitingStartModal: () => void;
  closeCreaterWaitingStartModal: () => void;
  showStartTurnModal: (duration?: number) => void;
  showNoticeModal: ShowNoticeModalFn;
  closeNoticeModal: () => void;
  handleSubmitActivate: () => void;
  playShockEffect: (options?: { playbackRate?: number }) => void;
  playSafeEffect: () => void;
  showGameResultModal: () => void;
  showTurnResultModal: () => void;
  opponentLabel?: string;
}) {
  useEffect(() => {
    if (!roomData) return;

    const allReady = isAllReady();
    const isCreater = roomData.createrId === userId;
    const isAttacker = roomData.round.attackerId === userId;
    const isDefender = roomData.round.attackerId !== userId;

    if (!allReady && isCreater) {
      showCreaterWaitingStartModal();
    }

    if (allReady) {
      closeCreaterWaitingStartModal();

      if (roomData.round.phase === "setting") {
        showStartTurnModal(2000);
        if (isDefender) {
          RoomPhaseHandlers.handleSettingPhase(
            showNoticeModal,
            closeNoticeModal
          );
        }
      }

      if (roomData.round.phase === "sitting" && isAttacker) {
        RoomPhaseHandlers.handleSittingPhase(showNoticeModal, closeNoticeModal, opponentLabel);
      }
    }
    if (roomData.round.phase === "activating" && isDefender) {
      RoomPhaseHandlers.handleActivatingPhase(
        showNoticeModal,
        handleSubmitActivate,
        opponentLabel
      );
    }
    if (
      roomData.round.phase === "result" &&
      !roomData.round.result.shownResult
    ) {
      RoomPhaseHandlers.handleResultPhase(
        roomData,
        showGameResultModal,
        showTurnResultModal,
        setShowShock,
        playShockEffect,
        playSafeEffect
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData]);
}
