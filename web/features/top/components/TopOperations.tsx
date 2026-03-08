import Link from "next/link";
import { Button } from "@/components/buttons/Button";

type TopOperationsProps = {
  formAction: () => void;
  joinAction: () => void;
};

export function TopOperations({ formAction, joinAction }: TopOperationsProps) {
  return (
    <div className="flex flex-col gap-6 p-6 pt-0">
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">ひとりで遊ぶ</span>
          <div className="flex-1 border-t border-gray-600" />
        </div>
        <Link href="/cpu">
          <Button type="button">CPU対戦</Button>
        </Link>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">オンライン対戦</span>
          <div className="flex-1 border-t border-gray-600" />
        </div>
        <form action={formAction} className="flex flex-col gap-3">
          <Button>ルームを作成</Button>
          <Button
            type="button"
            onClick={() => joinAction()}
            bgColor="bg-gray-600"
          >
            ルームに入室
          </Button>
        </form>
      </section>
    </div>
  );
}
