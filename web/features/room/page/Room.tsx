"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TooltipRefProps } from "react-tooltip";
import useSound from "use-sound";

import { useToast } from "@/utils/toast/useToast";

import { Chair } from "@/features/room/components/Chair";
import { PlayerStatus } from "@/features/room/components/PlayerStatus";
import { RoundStatus } from "@/features/room/components/RoundStatus";
import { CreaterWaitingStartDialog } from "@/features/room/components/dialogs/CreaterWaitingStartDialog";
import { StartTurnDialog } from "@/features/room/components/dialogs/StartTurnDialog";
import { GameResultDialog } from "@/features/room/components/dialogs/GameResultDialog";
import { TurnResultDialog } from "@/features/room/components/dialogs/TurnResultDialog";

import type { GameRoom } from "@/types/room";
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
import { useRoomWatcher } from "@/features/room/hooks/useRoomWatcher";
import { useRoomEffect } from "@/features/room/hooks/useRoomEffect";
import { useRoomActions } from "@/features/room/hooks/useRoomActions";

export default function Room({
  initialData,
}: {
  initialData: {
    room: GameRoom | null;
    userId: string | null;
    roomId: string | null;
  };
}) {
  const [playShockEffect] = useSound("/sounds/shock.mp3");
  const [playSafeEffect] = useSound("/sounds/safe.mp3");
  const router = useRouter();
  const toast = useToast();
  const [roomData, setRoomData] = useState<GameRoom | null>(initialData.room);
  const userId = initialData.userId;
  const roomId = initialData.roomId;
  const [showShock, setShowShock] = useState<"" | "shock" | "safe">("");
  const tooltipRef = useRef<TooltipRefProps | null>(null);
  const previousRoomDataRef = useRef<GameRoom | null>(null);
  const {
    NoticeDialogRef,
    noticeDialogState,
    showNoticeModal,
    closeNoticeModal,
    waitingCreaterStartDialogRef,
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

  const playerOperation = usePlayerOperation(roomData, userId!);

  useRoomWatcher({
    roomId: roomId,
    setRoomData: setRoomData,
    previousRoomDataRef: previousRoomDataRef,
  });

  const {
    selectedChair,
    setSelectedChair,
    selectState,
    selectChair,
    copyRoomId,
    submitActivate,
    changeTurn,
  } = useRoomActions({
    roomId,
    userId,
    tooltipRef,
    roomData,
    playerOperation,
  });

  const submittedChairRef = useRef<number | null>(null);

  useEffect(() => {
    const chair = submittedChairRef.current;
    if (!chair || selectState.status === 0) return;
    submittedChairRef.current = null;
    const message =
      selectState.status === 200
        ? "番の椅子を選択しました。"
        : "椅子の選択に失敗しました。";
    toast.open(
      <span>
        <span style={{ color: "red", fontWeight: "bold", fontSize: "1.2rem" }}>
          {chair}
        </span>
        {message}
      </span>
    );
  }, [selectState, toast]);

  const handleSubmitActivate = () => {
    submitActivate(closeNoticeModal);
  };

  const handleChangeTurn = async () => {
    changeTurn(() => {
      closeTurnResultModal();
      setSelectedChair(null);
    });
  };

  const isAllReady = () => {
    if (!roomData) return false;
    return (
      roomData.players.length == 2 &&
      roomData.players.every((player) => player.ready)
    );
  };

  const toToP = () => {
    router.push("/");
  };

  useRoomEffect({
    roomData,
    userId: userId!,
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
  });

  return (
    <RoomContainer>
      <GameStatusContainer>
        <RoundStatus round={roomData?.round} userId={userId} />
        <PlayerStatusContainer>
          <PlayerStatus
            userId={userId}
            status={roomData?.players.find((player) => player.id === userId)}
          />
          <PlayerStatus
            userId={userId}
            status={roomData?.players.find((player) => player.id !== userId)}
          />
        </PlayerStatusContainer>
      </GameStatusContainer>
      <form
        action={selectChair}
        onSubmit={() => {
          submittedChairRef.current = selectedChair;
        }}
      >
        <ChairContainer>
          {roomData?.remainingChairs.map((chair) => (
            <Chair
              key={chair}
              chair={chair}
              setSelectedChair={setSelectedChair}
              wait={playerOperation.wait}
              selected={selectedChair === chair}
            />
          ))}
          {isAllReady() && (
            <InstructionContainer>
              <InstructionMessage
                playerOperation={playerOperation}
                round={roomData?.round}
                userId={userId}
              />
            </InstructionContainer>
          )}
        </ChairContainer>
        {!playerOperation.wait &&
          !playerOperation.activate &&
          selectedChair && (
            <div className="sticky bottom-3">
              <Button styles="border-2 border-red-700">確定</Button>
            </div>
          )}
      </form>
      <NoticeDialog
        dialogRef={NoticeDialogRef}
        title={noticeDialogState.title}
        message={noticeDialogState.message}
        button={noticeDialogState.button}
      />
      <CreaterWaitingStartDialog
        roomId={roomId!}
        dialogRef={waitingCreaterStartDialogRef}
        tooltipRef={tooltipRef}
        copyId={copyRoomId}
      />
      <StartTurnDialog
        dialogRef={startTurnDialogRef}
        round={roomData!.round}
        userId={userId!}
      />
      <TurnResultDialog
        ref={turnResultDialogRef}
        roomData={roomData!}
        previousRoomData={previousRoomDataRef.current!}
        userId={userId!}
        close={handleChangeTurn}
      />
      <GameResultDialog
        ref={gameResultDialogRef}
        roomData={roomData!}
        userId={userId!}
        close={toToP}
      />
      <ActivateEffect result={showShock} />
    </RoomContainer>
  );
}
