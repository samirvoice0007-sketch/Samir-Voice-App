import { RtcRole, RtcTokenBuilder } from "agora-token";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { numericUid } from "@/lib/agora-uid";
import { authMiddleware } from "@/lib/auth/middleware";
import { getCollection } from "@/lib/db";

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const TOKEN_TTL_SECONDS = 3600;

type RoomMemberDoc = { _id: string; role: "host" | "speaker" | "listener" };

export const getAgoraToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ roomId: z.string() }))
  .handler(async ({ context, data }) => {
    if (!APP_ID || !APP_CERTIFICATE) {
      throw new Error("Agora is not configured — set AGORA_APP_ID and AGORA_APP_CERTIFICATE.");
    }

    const members = await getCollection<RoomMemberDoc>("roomMembers");
    const membership = await members.findOne({ _id: `${data.roomId}:${context.userId}` });
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
