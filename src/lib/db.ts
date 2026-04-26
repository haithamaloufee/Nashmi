import mongoose from "mongoose";
import { getMongoUri, getServerSelectionTimeoutMs } from "./env";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

export async function connectToDatabase() {
  const uri = getMongoUri();

  // Clear cache if URI has changed
  if (global.mongooseCache && global.mongooseCache.uri !== uri) {
    if (global.mongooseCache.conn) {
      await global.mongooseCache.conn.disconnect();
    }
    global.mongooseCache = { conn: null, promise: null, uri };
  }

  if (!global.mongooseCache) {
    global.mongooseCache = { conn: null, promise: null, uri };
  }

  if (global.mongooseCache?.conn) return global.mongooseCache.conn;

  if (!global.mongooseCache?.promise) {
    global.mongooseCache!.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        autoIndex: process.env.NODE_ENV !== "production",
        serverSelectionTimeoutMS: getServerSelectionTimeoutMs()
      })
      .catch((error) => {
        global.mongooseCache!.promise = null;
        throw error;
      });
  }

  global.mongooseCache!.conn = await global.mongooseCache!.promise;
  return global.mongooseCache!.conn;
}

export function toObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export { mongoose };
