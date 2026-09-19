import bcrypt from "bcryptjs";
import { loadEnv } from "./env";

loadEnv();

import { connectToDatabase } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/security";
import User from "../src/models/User";

function requiredPassword(name: string) {
  const value = process.env[name];
  if (!value || value.length < 12) throw new Error(`${name} must be set to a unique strong password`);
  return value;
}

const adminPassword = requiredPassword("SEED_ADMIN_PASSWORD");
const iecPassword = requiredPassword("SEED_IEC_PASSWORD");
const citizenPassword = requiredPassword("SEED_CITIZEN_PASSWORD");

async function fixDemoAccounts() {
  try {
    await connectToDatabase();
    console.log("Fixing demo accounts...");

    // Fix admin
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const admin = await User.findOneAndUpdate(
      { emailNormalized: normalizeEmail("admin@sharek.demo") },
      { passwordHash: adminHash, emailVerified: true, status: "active" },
      { new: true }
    );
    console.log("Admin account:", admin ? "FIXED" : "NOT FOUND");

    // Fix IEC
    const iecHash = await bcrypt.hash(iecPassword, 12);
    const iec = await User.findOneAndUpdate(
      { emailNormalized: normalizeEmail("iec@sharek.demo") },
      { passwordHash: iecHash, emailVerified: true, status: "active" },
      { new: true }
    );
    console.log("IEC account:", iec ? "FIXED" : "NOT FOUND");

    // Fix citizen
    const citizenHash = await bcrypt.hash(citizenPassword, 12);
    const citizen = await User.findOneAndUpdate(
      { emailNormalized: normalizeEmail("citizen@sharek.demo") },
      { passwordHash: citizenHash, emailVerified: true, status: "active" },
      { new: true }
    );
    console.log("Citizen account:", citizen ? "FIXED" : "NOT FOUND");

    console.log("Demo accounts fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixDemoAccounts();
