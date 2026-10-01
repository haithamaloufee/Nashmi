import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("test-results/baseline/inventory.json", "utf8"));
const rows = data.inventory.filter((row: any) => row.width === 390);
const doc = ["# Baseline route coverage", "", "Local synthetic fixtures; source revision a7b748ef21aecf79b537fe3179cc7bc8785267e7. Each listed route was opened at 390px and 1440px with controls inventoried and axe executed. This table proves page coverage; it does not alone prove every interaction.", "", "| Route | Role | Widths | Axe rule findings |", "| --- | --- | --- | --- |"]; 
for (const row of rows) {
  const findings = [...new Set(data.inventory.filter((other: any) => other.route === row.route && other.role === row.role).flatMap((other: any) => other.violations.map((v: any) => v.id)))];
  doc.push(`| ${row.route} | ${row.role} | 390, 1440 | ${findings.join(", ") || "None detected"} |`);
}
doc.push("", "Raw evidence: test-results/baseline/inventory.json. Test artifacts are ignored because they include session traces and machine-specific output. External SMTP, R2 and assistant provider persistence are outside this local coverage.", "");
writeFileSync("docs/BASELINE-ROUTE-COVERAGE.md", doc.join("\n"));
console.log(`Recorded ${rows.length} routes, ${data.inventory.length} viewport cases`);
