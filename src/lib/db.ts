import { MongoClient, ServerApiVersion } from "mongodb";
import type { Db, Collection, Document } from "mongodb";

/**
 * MongoDB connection layer (replaces the old Postgres/Neon/PGLite setup).
 *
 * `MONGO_URI` is a **required** server-only env var (set on Render — never
 * committed, never a `.env` file). The database name is taken from the URI
 * itself (e.g. `.../voicechatapp?...` -> db "voicechatapp"), so there is
 * nothing else to configure here.
 *
 * There is no local/offline fallback (no more PGLite): dev and production
 * both talk to the same Atlas cluster via `MONGO_URI`. If you want a
 * throwaway dev database, point `MONGO_URI` at a separate Atlas database
 * (or a local `mongodb://127.0.0.1:27017/...`) — the code doesn't care.
 */

const rawMongoUri = typeof process !== "undefined" ? process.env.MONGO_URI : undefined;
const mongoUri = rawMongoUri && rawMongoUri.trim() ? rawMongoUri.trim() : undefined;

/**
 * Client + connect state live on `globalThis`: dev HMR re-evaluates this
 * module on every save, and two module instances racing to open their own
 * `MongoClient` would leak connections (and, worse, momentarily point half
 * the app at a client that's about to be discarded). Memoizing on
 * `globalThis` means every HMR reload reuses the same underlying connection
 * pool. A failed connect clears the slot so the next call retries instead of
 * permanently caching a broken promise.
 */
const globalRef = globalThis as typeof globalThis & {
  __mongoClientPromise__?: Promise<MongoClient>;
};

function createClient(): Promise<MongoClient> {
  if (!mongoUri) {
    return Promise.reject(
      new Error(
        "MONGO_URI is not set. Add it as a server-side environment variable " +
          "(Render → Environment) — it must never be hard-coded or committed.",
      ),
    );
  }
  globalRef.__mongoClientPromise__ ??= (async () => {
    const client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    // Fail fast on a bad URI/credentials/network rule instead of only
    // discovering it on the first real query somewhere deep in a request.
    await client.db().command({ ping: 1 });
    return client;
  })().catch((err) => {
    globalRef.__mongoClientPromise__ = undefined;
    throw err;
  });
  return globalRef.__mongoClientPromise__;
}

/**
 * Get the shared MongoClient. Memoized — safe to call per request; the
 * underlying connection pool is created once per process (per HMR instance
 * in dev).
 */
export function getClient(): Promise<MongoClient> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getDb()/getCollection() from a " +
        "createServerFn handler or a server route loader, never from client code.",
    );
  }
  return createClient();
}

/**
 * Get the app's database (the one named in `MONGO_URI`'s path segment).
 * Prefer `getCollection()` below for normal query code — this is here for
 * the rare case you need cross-collection operations (transactions,
 * `listCollections`, etc).
 */
export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

/**
 * Get a typed collection handle. This is the main entry point the rest of
 * the app should use:
 *
 *   const rooms = await getCollection<RoomDoc>("rooms");
 *   const doc = await rooms.findOne({ _id: roomId });
 *
 * No schema migration step is needed — MongoDB creates a collection on its
 * first write. If you need indexes (uniqueness, TTL, etc.), create them
 * explicitly once via `ensureIndexes()` below rather than relying on
 * implicit collection creation.
 */
export async function getCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/**
 * Idempotent index setup — call once at server boot (see bottom of file).
 * Add new indexes here as new collections/query patterns are introduced;
 * `createIndex` is a no-op when an identical index already exists.
 */
async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("rooms").createIndex({ createdAt: -1 }),
    db.collection("roomMembers").createIndex({ roomId: 1, userId: 1 }, { unique: true }),
    db.collection("roomMessages").createIndex({ roomId: 1, createdAt: 1 }),
    db.collection("giftSends").createIndex({ fromUser: 1, createdAt: -1 }),
    db.collection("giftSends").createIndex({ toUser: 1, createdAt: -1 }),
    db.collection("follows").createIndex({ followerId: 1, followingId: 1 }, { unique: true }),
  ]);
}

/**
 * Finish DB bootstrap before the server handles traffic: opens the
 * connection, pings it, and makes sure indexes exist. Idempotent —
 * concurrent callers share one promise via `getClient()`'s memoization.
 */
let readyPromise: Promise<void> | null = null;
export function ensureDbReady(): Promise<void> {
  readyPromise ??= (async () => {
    await getClient();
    await ensureIndexes();
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });
  return readyPromise;
}

// Server-only eager start: kick the connection off as soon as this module
// loads in Node, so the first request doesn't pay the connect+ping latency.
// Client bundles never hit this path (getClient() throws in the browser).
const globalBoot = globalThis as typeof globalThis & {
  __mongoBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined") {
  globalBoot.__mongoBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__mongoBootstrapPromise__ = undefined;
    console.error("[db] MongoDB bootstrap failed:", err);
    throw err;
  });
}
