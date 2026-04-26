import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { adminUserCreateSchema } from "@/lib/validators";
import { normalizeEmail } from "@/lib/security";
import { readJson, isDuplicateKeyError, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const filter = search
      ? { $or: [{ name: new RegExp(search, "i") }, { emailNormalized: new RegExp(search.toLowerCase(), "i") }] }
      : {};
    const users = await User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).limit(100).lean();
    return ok({ users: serialize(users) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const input = await readJson(request, adminUserCreateSchema);
    if ((input.role === "admin" || input.role === "super_admin") && actor.role !== "super_admin") {
      return fail("FORBIDDEN", "تغيير أو إنشاء أدوار الإدارة العليا يتطلب super_admin", 403);
    }
    await connectToDatabase();
    const generatedPassword = input.password || "Password123!";
    const user = await User.create({
      name: input.name,
      email: input.email.trim(),
      emailNormalized: normalizeEmail(input.email),
      emailVerified: true,
      passwordHash: await bcrypt.hash(generatedPassword, 12),
      role: input.role || "citizen",
      provider: "credentials",
      status: input.status || "active",
      language: "ar"
    });
    await writeAuditLog({ actorUserId: actor.id, actorRole: actor.role, action: "admin.user_create", targetType: "user", targetId: user._id, metadata: { role: input.role || "citizen" }, request });
    const safe = user.toObject() as Record<string, unknown>;
    delete safe.passwordHash;
    return ok({ user: serialize(safe), generatedPassword }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) return fail("CONFLICT", "البريد الإلكتروني مستخدم بالفعل", 409);
    return handleApiError(error);
  }
}
