import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true, trim: true, lowercase: true },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },
    image: { type: String, default: null },
    role: { type: String, enum: ["citizen", "party", "iec", "admin", "super_admin"], default: "citizen", required: true },
    provider: { type: String, enum: ["credentials", "google"], default: "credentials", required: true },
    googleId: { type: String, default: null },
    status: { type: String, enum: ["active", "disabled", "pending", "locked"], default: "active", required: true },
    bio: { type: String, default: null },
    language: { type: String, enum: ["ar", "en"], default: "ar", required: true },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

UserSchema.index({ emailNormalized: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });
UserSchema.index({ role: 1, status: 1 });

export type UserDocument = InferSchemaType<typeof UserSchema>;

export default (models.User as Model<UserDocument>) || model<UserDocument>("User", UserSchema);
