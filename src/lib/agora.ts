import { RtcRole, RtcTokenBuilder } from "agora-token";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { numericUid } from "@/lib/agora-uid";
import { getCollection } from "@/lib/db";

/**
 * Agora RTC token minting (server-only). `AGORA_APP_CERTIFICATE` must never
 * reach the browser — that's why this is a `createServerFn`, called fresh
 * whenever `room-view.tsx` joins voice or the caller's seat/role changes.
 */

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const TOKEN_TTL_SECONDS = 3600; // 1 hour — the client re-requests a fresh one on rejoin/promotion

type RoomMemberDoc = { _id: string; role: "host" | "speaker" | "listener" };

export const getAgoraToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ context, data }) => {
    if (!APP_ID || !APP_CERTIFICATE) {
      throw new Error("Agora is not configured — set AGORA_APP_ID and AGORA_APP_CERTIFICATE (Render → Environment).");
    }

    const members = await getCollection<RoomMemberDoc>("roomMembers");
    const membership = await members.findOne({ _id: `${data.roomId}:${context.userId}` });
    // Hosts/speakers can publish audio; listeners get a subscribe-only token
    // even if their client tried to lie about its role.
    const canPublish = membership ? membership.role !== "listener" : false;

    const uid = numericUid(context.userId);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const privilegeExpireAt = nowSeconds + TOKEN_TTL_SECONDS;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      data.roomId,
      uid,
      canPublish ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      privilegeExpireAt,
      privilegeExpireAt,
    );

    return { appId: APP_ID, channel: data.roomId, uid, token, canPublish };
  });
