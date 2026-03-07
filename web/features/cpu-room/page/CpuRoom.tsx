"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSound from "use-sound";

import { useToast } from "@/utils/toast/useToast";
import { getOpponentLabel } from "@/utils/room";

import { Chair } from "@/features/room/components/Chair";
import { PlayerStatus } from "@/features/room/components/PlayerStatus";
import { RoundStatus } from "@/features/room/components/RoundStatus";
import { StartTurnDialog } from "@/features/room/components/dialogs/StartTurnDialog";
import { GameResultDialog } from "@/features/room/components/dialogs/GameResultDialog";
import { TurnResultDialog } from "@/features/room/components/dialogs/TurnResultDialog";

import { InstructionMessage } from "@/features/room/components/InstructionMessage";
import { ActivateEffect } from "@/features/room/components/ActivateEffect";
import { RoomContainer } from "@/features/room/components/RoomContainer";
import { GameStatusContainer } from "@/features/room/components/GameStatusContainer";
import { ChairContainer } from "@/features/room/components/ChairContainer";
import { InstructionContainer } from "@/features/room/components/InstructionContainer";
import { PlayerStatusContainer } from "@/features/room/components/PlayerStatusContainer";
import { Button } from "@/components/buttons/Button";
import { NoticeDialog } from "@/components/dialogs/notice/NoticeDailog";
import { useRoomDialogs } from "@/features/room/hooks/useRoomDialogs";
import { usePlayerOperation } from "@/features/room/hooks/usePlayerOperation";
import { useRoomEffect } from "@/features/room/hooks/useRoomEffect";

import { useCpuGame } from "@/features/cpu-room/hooks/useCpuGame";
import { useCpuAutoPlay } from "@/features/cpu-room/hooks/useCpuAutoPlay";
import { useCpuRoomActions } from "@/features/cpu-room/hooks/useCpuRoomActions";
import {
  pickRandomPersonality,
  resetTricksterState,
} from "@/features/cpu-room/logic/cpuPlayer";
import type { CpuPersonality } from "@/types/room";

const PLAYER_ID = "player";
const SESSION_KEY = "cpuLastPersonality";

function getInitialPersonality(): CpuPersonality {
  if (typeof window === "undefined") return pickRandomPersonality();
  const prev = sessionStorage.getItem(SESSION_KEY) as CpuPersonality | null;
  return pickRandomPersonality(prev ?? undefined);
}

export default function CpuRoom() {
  const [personality, setPersonality] = useState<CpuPersonality>(getInitialPersonality);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, personality);
  }, [personality]);

  const handleRetry = () => {
    resetTricksterState();
    const newPersonality = pickRandomPersonality(personality);
    setPersonality(newPersonality);
    setGameKey((k) => k + 1);
  };

  return (
    <CpuRoomInner
      key={gameKey}
      personality={personality}
      onRetry={handleRetry}
    />
  );
}

function CpuRoomInner({
  personality,
  onRetry,
}: {
  personality: CpuPersonality;
  onRetry: () => void;
}) {
  const [playShockEffect] = useSound("/sounds/shock.mp3");
  const [playSafeEffect] = useSound("/sounds/safe.mp3");
  const router = useRouter();
  const toast = useToast();

  const { gameRoom, dispatch } = useCpuGame(personality);
  const [showShock, setShowShock] = useState<"" | "shock" | "safe">("");
  const previousRoomDataRef = useRef(gameRoom);

  // activatingフェーズに入ったら、その時点のstateをpreviousとして保存
  // (result遷移後のTurnResultDialogでスコア変化前後を表示するため)
  useEffect(() => {
    if (gameRoom.round.phase === "activating") {
      previousRoomDataRef.current = gameRoom;
    }
  }, [gameRoom, gameRoom.round.phase]);

  const opponentLabel = getOpponentLabel(gameRoom);

  const {
    NoticeDialogRef,
    noticeDialogState,
    showNoticeModal,
    closeNoticeModal,
    waitingCreaterStartDialogRef: _waitingRef,
    showCreaterWaitingStartModal,
    closeCreaterWaitingStartModal,
    startTurnDialogRef,
    showStartTurnModal,
    turnResultDialogRef,
    showTurnResultModal,
    closeTurnResultModal,
    gameResultDialogRef,
    showGameResultModal,
  } = useRoomDialogs();

  const playerOperation = usePlayerOperation(gameRoom, PLAYER_ID);

  useCpuAutoPlay({ gameRoom, dispatch, personality });

  const { selectedChair, setSelectedChair, selectChair, submitActivate, changeTurn } =
    useCpuRoomActions({ dispatch, playerOperation });

  const handleSubmitActivate = () => {
    submitActivate(closeNoticeModal);
  };

  const handleChangeTurn = () => {
    changeTurn(() => {
      closeTurnResultModal();
      setSelectedChair(null);
    });
  };

  const isAllReady = () => true;

  const toTop = () => {
    router.push("/");
  };

  useRoomEffect({
    roomData: gameRoom,
    userId: PLAYER_ID,
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
  });

  const handleSelectChair = () => {
    if (selectedChair === null) return;
    toast.open(
      <span>
        <span style={{ color: "red", fontWeight: "bold", fontSize: "1.2rem" }}>
          {selectedChair}
        </span>
        番の椅子を選択しました。
      </span>
    );
    selectChair();
  };

  return (
    <RoomContainer>
      <GameStatusContainer>
        <RoundStatus round={gameRoom.round} userId={PLAYER_ID} />
        <PlayerStatusContainer>
          <PlayerStatus
            userId={PLAYER_ID}
            status={gameRoom.players.find((player) => player.id === PLAYER_ID)}
          />
          <PlayerStatus
            userId={PLAYER_ID}
            status={gameRoom.players.find((player) => player.id !== PLAYER_ID)}
            opponentLabel={opponentLabel}
          />
        </PlayerStatusContainer>
      </GameStatusContainer>
      <div>
        <ChairContainer>
          {gameRoom.remainingChairs.map((chair) => (
            <Chair
              key={chair}
              chair={chair}
              setSelectedChair={setSelectedChair}
              wait={playerOperation.wait}
              selected={selectedChair === chair}
            />
          ))}
          <InstructionContainer>
            <InstructionMessage
              playerOperation={playerOperation}
              round={gameRoom.round}
              userId={PLAYER_ID}
              opponentLabel={opponentLabel}
            />
          </InstructionContainer>
        </ChairContainer>
        {!playerOperation.wait &&
          !playerOperation.activate &&
          selectedChair && (
            <div className="sticky bottom-3">
              <Button
                type="button"
                onClick={handleSelectChair}
                styles="border-2 border-red-700"
              >
                確定
              </Button>
            </div>
          )}
      </div>
      <NoticeDialog
        dialogRef={NoticeDialogRef}
        title={noticeDialogState.title}
        message={noticeDialogState.message}
        button={noticeDialogState.button}
      />
      <StartTurnDialog
        dialogRef={startTurnDialogRef}
        round={gameRoom.round}
        userId={PLAYER_ID}
      />
      <TurnResultDialog
        ref={turnResultDialogRef}
        roomData={gameRoom}
        previousRoomData={previousRoomDataRef.current}
        userId={PLAYER_ID}
        close={handleChangeTurn}
        opponentLabel={opponentLabel}
      />
      <GameResultDialog
        ref={gameResultDialogRef}
        roomData={gameRoom}
        userId={PLAYER_ID}
        close={toTop}
        onRetry={onRetry}
        opponentLabel={opponentLabel}
      />
      <ActivateEffect result={showShock} />
    </RoomContainer>
  );
}
