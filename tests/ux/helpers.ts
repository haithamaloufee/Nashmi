import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import mongoose from "mongoose";
import type { BrowserContext } from "@playwright/test";

export const baseURL = "http://127.0.0.1:3020";
export const fixtures = () => JSON.parse(readFileSync("test-results/qa-fixtures.json", "utf8"));
export async function authenticate(context: BrowserContext, role: string) {
  const runtime = JSON.parse(readFileSync("test-results/qa-runtime.json", "utf8"));
  if (!runtime.MONGODB_URI.startsWith("mongodb://127.0.0.1:") || !runtime.MONGODB_URI.includes("nashmi_ux_qa")) throw new Error("Only local QA database allowed");
  const db = await mongoose.createConnection(runtime.MONGODB_URI).asPromise();
  let actor = await db.collection("users").findOne({ emailNormalized: `${role}@nashmi.test` });
  if (!actor && role === "admin") {
    const template = await db.collection("users").findOne({ emailNormalized: "citizen@nashmi.test" });
    if (template) {
      const fields = Object.fromEntries(Object.entries(template).filter(([key]) => key !== "_id"));
      const inserted = await db.collection("users").insertOne({ ...fields, name: "اختبار admin", email: "admin@nashmi.test", emailNormalized: "admin@nashmi.test", role });
      actor = await db.collection("users").findOne({ _id: inserted.insertedId });
    }
  }
  await db.close();
  if (!actor) throw new Error("Missing synthetic actor");
  const token = await new SignJWT({ role: actor.role, sv: actor.sessionVersion || 0 }).setProtectedHeader({ alg: "HS256" }).setSubject(String(actor._id)).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(runtime.JWT_SECRET));
  await context.addCookies([{ name: "sharek_session", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
}

export const publicRoutes = ["/", "/updates", "/parties", "/parties/qa-civic", "/iec", "/laws", "/laws/qa-law", "/surveys", "/surveys/qa-survey", "/hashtags/مشاركة", "/about-nashmi", "/chat", "/login", "/signup", "/register", "/forgot-password", "/reset-password", "/set-password", "/verify-email"];
export const protectedRoutes: Record<string, string[]> = {
  citizen: ["/account"],
  party: ["/party-dashboard", "/party-dashboard/profile", "/party-dashboard/posts", "/party-dashboard/polls", "/party-dashboard/surveys"],
  iec: ["/iec-dashboard", "/iec-dashboard/profile", "/iec-dashboard/posts", "/iec-dashboard/polls", "/iec-dashboard/surveys", "/iec-dashboard/laws"],
  super_admin: ["/admin", "/admin/users", "/admin/parties", "/admin/laws", "/admin/surveys", "/admin/reports", "/admin/moderation", "/admin/logs", "/admin/audit-logs", "/admin/news", "/admin/about-nashmi"]
};
