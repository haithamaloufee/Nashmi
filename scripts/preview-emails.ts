import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { accountInvitationEmail, passwordChangedEmail, passwordResetEmail, verificationEmail, welcomeEmail } from "../src/lib/emailTemplates";

const outputDir = path.join(process.cwd(), ".email-preview");
const safeUrl = "https://nashmi.haitham.website/preview-link-without-a-real-token";

const previews = {
  "verify-ar.html": verificationEmail("ar", safeUrl),
  "verify-en.html": verificationEmail("en", safeUrl),
  "welcome-ar.html": welcomeEmail("ar", "https://nashmi.haitham.website/login"),
  "reset-ar.html": passwordResetEmail("ar", safeUrl),
  "reset-en.html": passwordResetEmail("en", safeUrl),
  "password-changed-ar.html": passwordChangedEmail("ar"),
  "invitation-ar.html": accountInvitationEmail("ar", safeUrl)
};

async function main() {
  await mkdir(outputDir, { recursive: true });
  await Promise.all(Object.entries(previews).map(([file, template]) => writeFile(path.join(outputDir, file), template.html, "utf8")));
  console.log(`Generated ${Object.keys(previews).length} safe previews in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
