import { Schema, model, models } from "mongoose";

const NewsSourceCacheSchema = new Schema({
  _id: { type: String, required: true },
  etag: String,
  lastModified: String,
  materials: { type: [Schema.Types.Mixed], default: [] },
  checkedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true }
});
NewsSourceCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default models.NewsSourceCache || model("NewsSourceCache", NewsSourceCacheSchema);
