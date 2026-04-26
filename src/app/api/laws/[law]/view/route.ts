import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import Law from "@/models/Law";

type Context = { params: Promise<{ law: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { law } = await context.params;
    await connectToDatabase();
    await Law.updateOne({ _id: law, status: "published" }, { $inc: { viewsCount: 1 } });
    return ok({ viewed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
