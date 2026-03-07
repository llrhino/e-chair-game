import { ShowNoticeModalFn } from "@/features/room/types/dialog";
import { GameRoom } from "@/types/room";

const SHOW_NOTICE_MS = 2000;
const SHOW_DELAY_MS = 2000;
const EFFECT_DURATION_MS = 1500;

function handleSettingPhase(
  showNoticeModal: ShowNoticeModalFn,
  closeNoticeModal: () => void
) {
  setTimeout(() => {
    showNoticeModal(
      {
        title: "電気椅子設置",
        message: "電流を仕掛ける椅子を選択してください",
        button: { label: "OK", action: () => closeNoticeModal() },
      },
      SHOW_NOTICE_MS
    );
  }, SHOW_DELAY_MS);
}

function handleSittingPhase(
  showNoticeModal: ShowNoticeModalFn,
  closeNoticeModal: () => void,
  opponentLabel?: string
) {
  const label = opponentLabel ?? "相手";
  showNoticeModal(
    {
      title: `${label}が電気椅子を仕掛けました`,
      message: "座る椅子を選択してください",
      button: { label: "OK", action: () => closeNoticeModal() },
    },
    SHOW_DELAY_MS
  );
}

function handleActivatingPhase(
  showNoticeModal: ShowNoticeModalFn,
  submitActivate: () => void,
  opponentLabel?: string
) {
  const label = opponentLabel ?? "相手";
  showNoticeModal({
    title: `${label}が椅子に座りました`,
    message: "電流を起動してください",
    button: { label: "起動", action: () => submitActivate() },
  });
}

function handleResultPhase(
  roomData: GameRoom,
  showGameResultModal: () => void,
  showTurnResultModal: () => void,
  setShowShock: React.Dispatch<React.SetStateAction<"" | "shock" | "safe">>,
  playShockEffect: (options?: { playbackRate?: number }) => void,
  playSafeEffect: () => void
) {
  const effectType =
    roomData.round.result.status === "shocked" ? "shock" : "safe";
  if (effectType === "shock") {
    playShockEffect({
      playbackRate: 0.7,
    });
  } else {
    playSafeEffect();
  }
  setShowShock(effectType);
  setTimeout(() => {
    setShowShock("");
    if (roomData.winnerId) {
      showGameResultModal();
    } else {
      showTurnResultModal();
    }
  }, EFFECT_DURATION_MS);
}

export const RoomPhaseHandlers = {
  handleSettingPhase,
  handleSittingPhase,
  handleActivatingPhase,
  handleResultPhase,
};
