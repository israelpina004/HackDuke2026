import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Shared promise prevents concurrent mongoose.connect() calls (which corrupt state)
let connectPromise: Promise<typeof mongoose> | null = null;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer!));
}

async function dbConnect(): Promise<typeof mongoose> {
  console.log('[dbConnect] readyState:', mongoose.connection.readyState);

  // If supposedly connected, verify the socket is alive with a ping
  if (mongoose.connection.readyState === 1) {
    try {
      await withTimeout(mongoose.connection.db!.admin().ping(), 2000);
      return mongoose;
    } catch {
      console.log('[dbConnect] stale connection detected, reconnecting...');
      try { await withTimeout(mongoose.disconnect(), 2000); } catch {}
    }
  }

  // A connection attempt is already in flight — share it (prevents double-connect race)
  if (connectPromise) {
    console.log('[dbConnect] sharing in-flight connection promise');
    return connectPromise;
  }

  console.log('[dbConnect] connecting...');
  connectPromise = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  try {
    await connectPromise;
    console.log('[dbConnect] connected OK, readyState:', mongoose.connection.readyState);
    return mongoose;
  } catch (e) {
    console.error('[dbConnect] failed:', (e as Error).message);
    throw e;
  } finally {
    connectPromise = null;
  }
}

export default dbConnect;
