import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { lawDisclaimer, serialize } from "@/lib/routeUtils";
import Law from "@/models/Law";

type Context = { params: Promise<{ law: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { law: key } = await context.params;
    await connectToDatabase();
    const query = isValidObjectId(key) ? { _id: key, status: "published" } : { slug: key, status: "published" };
    const law = await Law.findOne(query).lean();
    if (!law) throw new Error("NOT_FOUND");
    return ok({ law: serialize(law), disclaimer: lawDisclaimer() });
  } catch (error) {
    return handleApiError(error);
  }
}
