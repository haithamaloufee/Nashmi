import { ok, handleApiError } from "@/lib/apiResponse";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    return ok({ user: await getCurrentUser() });
  } catch (error) {
    return handleApiError(error);
  }
}
