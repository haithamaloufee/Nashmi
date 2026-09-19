import bcrypt from "bcryptjs";
import { closeSync, existsSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";

loadEnv();

import { createAccountSetup, buildAccountSetupUrl } from "../src/lib/accountSetupCore";
import { connectToDatabase, mongoose } from "../src/lib/db";
import User from "../src/models/User";

type CandidateUser = {
  _id: { toString(): string };
  email: string;
  passwordHash: string | null;
  role: string;
  status: string;
  sessionVersion?: number | null;
};

function readCandidates() {
  const raw = process.env.LEGACY_CREDENTIAL_CANDIDATES_JSON;
  if (!raw) throw new Error("LEGACY_CREDENTIAL_CANDIDATES_JSON must be a JSON array supplied at runtime");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("LEGACY_CREDENTIAL_CANDIDATES_JSON must be a JSON array");
  const values = [...new Set(parsed.filter((value): value is string => typeof value === "string" && value.length >= 8))];
  if (values.length === 0) throw new Error("No valid legacy credential candidates were supplied");
  return values;
}

function redactId(id: string) {
  return id.length <= 10 ? `${id.slice(0, 3)}…` : `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function groupBy(users: CandidateUser[], field: "role" | "status") {
  return users.reduce<Record<string, number>>((summary, user) => {
    const key = user[field] || "unknown";
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {});
}

async function matchesKnownCredential(user: CandidateUser, candidates: string[]) {
  if (!user.passwordHash) return false;
  for (const candidate of candidates) {
    if (await bcrypt.compare(candidate, user.passwordHash)) return true;
  }
  return false;
}

function remediationOptions() {
  const confirm = process.argv.includes("--confirm-remediation");
  const deliveryReady = process.argv.includes("--delivery-ready");
  const bundleArg = process.argv.find((argument) => argument.startsWith("--recovery-bundle="));
  return { confirm, deliveryReady, bundlePath: bundleArg?.slice("--recovery-bundle=".length) || null };
}

function assertSafeBundlePath(bundlePath: string) {
  if (!path.isAbsolute(bundlePath)) throw new Error("Recovery bundle path must be absolute");
  const workspace = path.resolve(process.cwd());
  const resolved = path.resolve(bundlePath);
  const relative = path.relative(workspace, resolved);
  if (!relative.startsWith("..") || relative === "") throw new Error("Recovery bundle must be outside the repository");
  if (existsSync(resolved)) throw new Error("Recovery bundle already exists; refusing to overwrite it");
  return resolved;
}

async function remediate(matches: CandidateUser[], bundlePath: string) {
  const prepared = matches.map((user) => {
    const setup = createAccountSetup();
    return {
      user,
      tokenHash: setup.tokenHash,
      expiresAt: setup.expiresAt,
      delivery: {
        userId: user._id.toString(),
        email: user.email,
        setupUrl: buildAccountSetupUrl(setup.token),
        expiresAt: setup.expiresAt.toISOString()
      }
    };
  });

  const fileDescriptor = openSync(bundlePath, "wx", 0o600);
  try {
    writeFileSync(
      fileDescriptor,
      JSON.stringify(
        {
          classification: "SENSITIVE_RECOVERY_MATERIAL",
          generatedAt: new Date().toISOString(),
          instructions: "Deliver each link only to the verified owner. Delete this file after confirmed delivery.",
          accounts: prepared.map((item) => item.delivery)
        },
        null,
        2
      ),
      "utf8"
    );
  } finally {
    closeSync(fileDescriptor);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of prepared) {
        const result = await User.updateOne(
          { _id: item.user._id, passwordHash: item.user.passwordHash },
          {
            $set: {
              passwordHash: null,
              status: "pending",
              passwordSetupTokenHash: item.tokenHash,
              passwordSetupExpiresAt: item.expiresAt,
              passwordSetupTargetStatus: item.user.status,
              requiresPasswordReset: true,
              failedLoginCount: 0,
              lockedUntil: null
            },
            $inc: { sessionVersion: 1 }
          },
          { session }
        );
        if (result.modifiedCount !== 1) throw new Error(`Concurrent update detected for ${redactId(item.user._id.toString())}`);
      }
    });
  } catch (error) {
    unlinkSync(bundlePath);
    throw error;
  } finally {
    await session.endSession();
  }
}

async function main() {
  const candidates = readCandidates();
  await connectToDatabase();
  const users = (await User.find({}).select("+passwordHash email role status sessionVersion").lean()) as unknown as CandidateUser[];
  const withPassword = users.filter((user) => Boolean(user.passwordHash));
  const matches: CandidateUser[] = [];

  // Deliberately bounded: bcrypt is CPU intensive and an audit must not starve the app host.
  for (let index = 0; index < withPassword.length; index += 4) {
    const batch = withPassword.slice(index, index + 4);
    const results = await Promise.all(batch.map((user) => matchesKnownCredential(user, candidates)));
    results.forEach((matched, batchIndex) => {
      if (matched) matches.push(batch[batchIndex]);
    });
  }

  const report = {
    mode: "dry-run",
    scannedAccounts: users.length,
    accountsWithCredentialHash: withPassword.length,
    candidateCount: candidates.length,
    matchedAccounts: matches.length,
    matchedByRole: groupBy(matches, "role"),
    matchedByStatus: groupBy(matches, "status"),
    matchedIdentifiers: matches.map((user) => redactId(user._id.toString()))
  };
  console.log(JSON.stringify(report, null, 2));

  const options = remediationOptions();
  if (!options.confirm) return;
  if (!options.deliveryReady || !options.bundlePath) {
    throw new Error("Remediation requires --delivery-ready and --recovery-bundle=<absolute path outside repository>");
  }
  if (matches.length === 0) {
    console.log("No accounts require remediation; no recovery bundle was created.");
    return;
  }

  const safeBundlePath = assertSafeBundlePath(options.bundlePath);
  await remediate(matches, safeBundlePath);
  console.log(JSON.stringify({ mode: "remediation", remediatedAccounts: matches.length, recoveryBundleWritten: true }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Legacy credential audit failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
