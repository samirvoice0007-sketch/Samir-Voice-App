import { MongoClient, ServerApiVersion, type Collection, type Db, type Document } from "mongodb";

/**
 * MongoDB access. Production (Render) uses `MONGO_URI`.
 * When the URI is missing (local/preview), an in-memory store with the same
 * collection API is used so the app still boots.
 */

type Filter = Record<string, unknown>;

export type DataCollection<T extends Document = Document> = {
  findOne(filter: Filter): Promise<T | null>;
  find(filter?: Filter): {
    sort(spec: Record<string, 1 | -1>): {
      limit(n: number): { toArray(): Promise<T[]> };
      toArray(): Promise<T[]>;
    };
    limit(n: number): { toArray(): Promise<T[]> };
    toArray(): Promise<T[]>;
  };
  insertOne(doc: T): Promise<{ insertedId: unknown }>;
  updateOne(
    filter: Filter,
    update: unknown,
    options?: { upsert?: boolean },
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
  deleteOne(filter: Filter): Promise<{ deletedCount: number }>;
};

const rawMongoUri = typeof process !== "undefined" ? process.env.MONGO_URI : undefined;
const mongoUri = rawMongoUri && rawMongoUri.trim() ? rawMongoUri.trim() : undefined;

const globalRef = globalThis as typeof globalThis & {
  __mongoClientPromise__?: Promise<MongoClient>;
  __memoryStore__?: MemoryStore;
};

function createClient(): Promise<MongoClient> {
  if (!mongoUri) {
    return Promise.reject(new Error("MONGO_URI is not set"));
  }
  globalRef.__mongoClientPromise__ ??= (async () => {
    const client = new MongoClient(mongoUri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });
    await client.connect();
    await client.db().command({ ping: 1 });
    return client;
  })().catch((err) => {
    globalRef.__mongoClientPromise__ = undefined;
    throw err;
  });
  return globalRef.__mongoClientPromise__;
}

export function getClient(): Promise<MongoClient> {
  if (typeof window !== "undefined") {
    throw new Error("@/lib/db is server-only");
  }
  return createClient();
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

function wrapNative<T extends Document>(col: Collection<T>): DataCollection<T> {
  return {
    findOne: (filter) => col.findOne(filter as never) as Promise<T | null>,
    find: (filter = {}) => {
      const cursor = col.find(filter as never);
      return {
        sort(spec) {
          const sorted = cursor.sort(spec as never);
          return {
            limit(n) {
              return { toArray: () => sorted.limit(n).toArray() as Promise<T[]> };
            },
            toArray: () => sorted.toArray() as Promise<T[]>,
          };
        },
        limit(n) {
          return { toArray: () => cursor.limit(n).toArray() as Promise<T[]> };
        },
        toArray: () => cursor.toArray() as Promise<T[]>,
      };
    },
    insertOne: async (doc) => {
      const res = await col.insertOne(doc as never);
      return { insertedId: res.insertedId };
    },
    updateOne: async (filter, update, options) => {
      const res = await col.updateOne(filter as never, update as never, options);
      return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
    },
    deleteOne: async (filter) => {
      const res = await col.deleteOne(filter as never);
      return { deletedCount: res.deletedCount };
    },
  };
}

export async function getCollection<T extends Document = Document>(name: string): Promise<DataCollection<T>> {
  if (typeof window !== "undefined") {
    throw new Error("@/lib/db is server-only");
  }
  if (!mongoUri) {
    return memoryStore().collection<T>(name);
  }
  const db = await getDb();
  return wrapNative(db.collection<T>(name));
}

async function ensureIndexes(): Promise<void> {
  if (!mongoUri) return;
  const db = await getDb();
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ phone: 1 }, { unique: true, sparse: true }),
    db.collection("profiles").createIndex({ phone: 1 }, { unique: true, sparse: true }),
    db.collection("rooms").createIndex({ isLive: 1, updatedAt: -1 }),
    db.collection("roomMembers").createIndex({ roomId: 1, userId: 1 }, { unique: true }),
    db.collection("messages").createIndex({ roomId: 1, createdAt: 1 }),
    db.collection("giftSends").createIndex({ fromId: 1, createdAt: -1 }),
    db.collection("giftSends").createIndex({ toId: 1, createdAt: -1 }),
    db.collection("follows").createIndex({ followerId: 1, followingId: 1 }, { unique: true }),
  ]);
}

let readyPromise: Promise<void> | null = null;
export function ensureDbReady(): Promise<void> {
  readyPromise ??= (async () => {
    if (mongoUri) {
      await getClient();
      await ensureIndexes();
    } else {
      memoryStore();
      console.warn("[db] MONGO_URI is not set — using in-memory Mongo fallback (preview/dev only)");
    }
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });
  return readyPromise;
}

const globalBoot = globalThis as typeof globalThis & {
  __mongoBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined") {
  globalBoot.__mongoBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__mongoBootstrapPromise__ = undefined;
    console.error("[db] MongoDB bootstrap failed:", err);
  });
}

/* -------------------------------------------------------------------------- */
/* In-memory fallback                                                         */
/* -------------------------------------------------------------------------- */

function isObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof RegExp);
}

function matchValue(docVal: unknown, filterVal: unknown): boolean {
  if (filterVal instanceof RegExp) {
    return typeof docVal === "string" && filterVal.test(docVal);
  }
  if (isObject(filterVal)) {
    if ("$in" in filterVal) {
      const list = filterVal.$in as unknown[];
      return list.some((x) => matchValue(docVal, x));
    }
    if ("$gte" in filterVal) {
      return Number(docVal) >= Number(filterVal.$gte);
    }
    if ("$gt" in filterVal) {
      return Number(docVal) > Number(filterVal.$gt);
    }
    if ("$lte" in filterVal) {
      return Number(docVal) <= Number(filterVal.$lte);
    }
    if ("$lt" in filterVal) {
      return Number(docVal) < Number(filterVal.$lt);
    }
    if ("$ne" in filterVal) {
      return !matchValue(docVal, filterVal.$ne);
    }
    if ("$not" in filterVal) {
      const inner = filterVal.$not;
      if (inner instanceof RegExp) {
        return typeof docVal !== "string" || !inner.test(docVal);
      }
      return !matchValue(docVal, inner);
    }
    if ("$regex" in filterVal) {
      const re = new RegExp(String(filterVal.$regex), String(filterVal.$options ?? ""));
      return typeof docVal === "string" && re.test(docVal);
    }
    if ("$exists" in filterVal) {
      return Boolean(filterVal.$exists) ? docVal !== undefined : docVal === undefined;
    }
  }
  if (docVal instanceof Date && typeof filterVal === "string") {
    return docVal.toISOString() === filterVal;
  }
  return docVal === filterVal;
}

function matchFilter(doc: Record<string, unknown>, filter: Filter): boolean {
  if ("$and" in filter && Array.isArray(filter.$and)) {
    return (filter.$and as Filter[]).every((f) => matchFilter(doc, f));
  }
  if ("$or" in filter && Array.isArray(filter.$or)) {
    return (filter.$or as Filter[]).some((f) => matchFilter(doc, f));
  }
  for (const [key, val] of Object.entries(filter)) {
    if (key.startsWith("$")) continue;
    if (!matchValue(doc[key], val)) return false;
  }
  return true;
}

function applyUpdate(doc: Record<string, unknown>, update: unknown): void {
  if (Array.isArray(update)) {
    for (const stage of update) {
      if (!isObject(stage)) continue;
      if (isObject(stage.$set)) {
        for (const [k, v] of Object.entries(stage.$set)) {
          doc[k] = resolveExpr(doc, v);
        }
      }
    }
    return;
  }
  if (!isObject(update)) return;
  if (isObject(update.$set)) Object.assign(doc, update.$set);
  if (isObject(update.$inc)) {
    for (const [k, v] of Object.entries(update.$inc)) {
      doc[k] = Number(doc[k] ?? 0) + Number(v);
    }
  }
}

function resolveExpr(doc: Record<string, unknown>, expr: unknown): unknown {
  if (!isObject(expr)) return expr;
  if ("$cond" in expr && Array.isArray(expr.$cond)) {
    const [cond, ifTrue, ifFalse] = expr.$cond as unknown[];
    return truthyCond(doc, cond) ? resolveExpr(doc, ifTrue) : resolveExpr(doc, ifFalse);
  }
  if ("$eq" in expr && Array.isArray(expr.$eq)) {
    const [a, b] = expr.$eq as unknown[];
    return resolvePath(doc, a) === resolveExpr(doc, b);
  }
  return expr;
}

function resolvePath(doc: Record<string, unknown>, path: unknown): unknown {
  if (typeof path === "string" && path.startsWith("$")) return doc[path.slice(1)];
  return path;
}

function truthyCond(doc: Record<string, unknown>, cond: unknown): boolean {
  if (isObject(cond) && "$eq" in cond && Array.isArray(cond.$eq)) {
    const [a, b] = cond.$eq as unknown[];
    return resolvePath(doc, a) === resolveExpr(doc, b);
  }
  return Boolean(resolveExpr(doc, cond));
}

class MemoryCursor<T extends Document> {
  constructor(
    private rows: T[],
    private sortSpec?: Record<string, 1 | -1>,
    private limitN?: number,
  ) {}
  sort(spec: Record<string, 1 | -1>) {
    return new MemoryCursor(this.rows, spec, this.limitN);
  }
  limit(n: number) {
    return new MemoryCursor(this.rows, this.sortSpec, n);
  }
  async toArray(): Promise<T[]> {
    let out = [...this.rows];
    if (this.sortSpec) {
      const entries = Object.entries(this.sortSpec);
      out.sort((a, b) => {
        for (const [k, dir] of entries) {
          const av = (a as Record<string, unknown>)[k];
          const bv = (b as Record<string, unknown>)[k];
          const an = av instanceof Date ? av.getTime() : (av as number | string);
          const bn = bv instanceof Date ? bv.getTime() : (bv as number | string);
          if (an === bn) continue;
          if (an == null) return 1;
          if (bn == null) return -1;
          return (an > bn ? 1 : -1) * dir;
        }
        return 0;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out.map((r) => structuredClone(r));
  }
}

class MemoryCollection<T extends Document> implements DataCollection<T> {
  constructor(private rows: T[]) {}
  async findOne(filter: Filter): Promise<T | null> {
    const found = this.rows.find((r) => matchFilter(r as Record<string, unknown>, filter));
    return found ? structuredClone(found) : null;
  }
  find(filter: Filter = {}) {
    const rows = this.rows.filter((r) => matchFilter(r as Record<string, unknown>, filter));
    return new MemoryCursor(rows);
  }
  async insertOne(doc: T) {
    this.rows.push(structuredClone(doc));
    return { insertedId: (doc as { _id?: unknown })._id };
  }
  async updateOne(filter: Filter, update: unknown, options?: { upsert?: boolean }) {
    const idx = this.rows.findIndex((r) => matchFilter(r as Record<string, unknown>, filter));
    if (idx < 0) {
      if (options?.upsert) {
        const doc: Record<string, unknown> = { ...filter };
        if (isObject(update) && isObject(update.$setOnInsert)) Object.assign(doc, update.$setOnInsert);
        if (isObject(update) && isObject(update.$set)) Object.assign(doc, update.$set);
        this.rows.push(doc as T);
        return { matchedCount: 0, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }
    applyUpdate(this.rows[idx] as Record<string, unknown>, update);
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async deleteOne(filter: Filter) {
    const idx = this.rows.findIndex((r) => matchFilter(r as Record<string, unknown>, filter));
    if (idx < 0) return { deletedCount: 0 };
    this.rows.splice(idx, 1);
    return { deletedCount: 1 };
  }
}

class MemoryStore {
  private cols = new Map<string, Document[]>();
  collection<T extends Document>(name: string): DataCollection<T> {
    if (!this.cols.has(name)) this.cols.set(name, []);
    return new MemoryCollection(this.cols.get(name)! as T[]);
  }
}

function memoryStore(): MemoryStore {
  globalRef.__memoryStore__ ??= new MemoryStore();
  return globalRef.__memoryStore__;
}
