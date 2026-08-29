import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";
import { RoomView } from "@/components/room-view";

export const Route = createFileRoute("/room/$id")({ component: RoomPage });

function RoomPage() {
  const { id } = Route.useParams();
  return (
    <AuthGate>
      <RoomView roomId={id} />
    </AuthGate>
  );
}
