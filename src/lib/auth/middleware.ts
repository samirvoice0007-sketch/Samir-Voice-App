import { createMiddleware } from "@tanstack/react-start";

/**
 * Auth middleware for server functions — the standard way to get the
 * caller's verified user id. The session cookie is same-origin, so it rides
 * along with every request automatically; there is no bearer-token path
 * anymore (that only existed for the Grok sandbox's partitioned-iframe live
 * preview).
 *
 *   import { createServerFn } from "@tanstack/react-start";
 *   import { getCollection } from "@/lib/db";
 *   import { authMiddleware } from "@/lib/auth/middleware";
 *
 *   export const listRooms = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       const rooms = await getCollection("rooms");
 *       return rooms.find({ hostId: context.userId }).toArray();
 *     });
 *
 * Throws `UnauthorizedError` (see `verify.server.ts`) when the caller has no
 * valid session. Use this on every server function that touches per-user
 * data, and scope every query by `context.userId`.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { requireUserId } = await import("./verify.server");
    const userId = await requireUserId();
    return next({ context: { userId } });
  },
);
