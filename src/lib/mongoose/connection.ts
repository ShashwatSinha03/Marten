import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import config from "@/lib/config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

interface MongoClientCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

interface GlobalWithMongoose {
  mongooseCache?: MongooseCache;
  mongoClientCache?: MongoClientCache;
}

// ─── Global cache (dev hot-reload safe) ─────────────────────────────────────

const globalForMongoose = globalThis as unknown as GlobalWithMongoose;

const mongooseCache: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

const mongoClientCache: MongoClientCache =
  globalForMongoose.mongoClientCache ?? {
    client: null,
    promise: null,
  };

if (process.env.NODE_ENV !== "production") {
  globalForMongoose.mongooseCache = mongooseCache;
  globalForMongoose.mongoClientCache = mongoClientCache;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONGODB_URI = config.database.url;

function getDbNameFromUri(uri: string): string {
  try {
    const url = new URL(uri.replace("mongodb+srv://", "mongodb://"));
    return (url.pathname?.replace("/", "") || "marten").split("?")[0];
  } catch {
    return "marten";
  }
}

// ─── Connection (Mongoose) ───────────────────────────────────────────────────

/**
 * Returns the cached Mongoose connection. On first call the connection is
 * created and cached for the lifetime of the process.
 *
 * In development the cache is stored on `globalThis` so that hot-reloads
 * re-use the existing connection instead of creating new ones.
 */
export async function connectMongoose(): Promise<typeof mongoose> {
  if (mongooseCache.conn) {
    return mongooseCache.conn;
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30_000,
      dbName: getDbNameFromUri(MONGODB_URI) || undefined,
    });
  }

  try {
    mongooseCache.conn = await mongooseCache.promise;
  } catch (error) {
    mongooseCache.promise = null;
    throw error;
  }

  return mongooseCache.conn;
}

/**
 * Returns a native MongoDB driver `MongoClient` instance.
 *
 * Required by NextAuth's MongoDB adapter and for operations that need the
 * raw driver. Cached the same way as the Mongoose connection.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (mongoClientCache.client) {
    return mongoClientCache.client;
  }

  if (!mongoClientCache.promise) {
    mongoClientCache.promise = MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30_000,
    });
  }

  try {
    mongoClientCache.client = await mongoClientCache.promise;
  } catch (error) {
    mongoClientCache.promise = null;
    throw error;
  }

  return mongoClientCache.client;
}

/**
 * Disconnect both Mongoose and the native MongoClient.
 * Safe to call multiple times.
 */
export async function disconnect(): Promise<void> {
  if (mongooseCache.conn) {
    await mongoose.disconnect();
    mongooseCache.conn = null;
    mongooseCache.promise = null;
  }

  if (mongoClientCache.client) {
    await mongoClientCache.client.close();
    mongoClientCache.client = null;
    mongoClientCache.promise = null;
  }
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────

async function handleShutdown(signal: string): Promise<void> {
  console.log(`[Mongoose] Received ${signal}, closing connections...`);
  await disconnect();
  process.exit(0);
}

// Register only once (avoid duplicate listeners on hot-reload).
const signals = ["SIGTERM", "SIGINT"] as const;
for (const signal of signals) {
  // Remove any previous listener to prevent duplicates during dev hot-reload.
  process.removeListener(signal, handleShutdown as NodeJS.SignalsListener);
  process.once(signal, handleShutdown as NodeJS.SignalsListener);
}
