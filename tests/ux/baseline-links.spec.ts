import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { authenticate, fixtures } from "./helpers";

test("baseline every distinct internal link inventoried for its role resolves", async ({ context }, info) => {
  test.setTimeout(300_000);
  const { inventory } = JSON.parse(readFileSync("test-results/baseline/inventory.json", "utf8"));
  const results: any[] = [];
  for (const role of ["guest", "citizen", "party", "iec", "super_admin"]) {
    await context.clearCookies();
    if (role !== "guest") await authenticate(context, role);
    const links = new Set<string>(inventory.filter((row: any) => row.role === role).flatMap((row: any) => row.controls.filter((control: any) => control.tag === "A" && control.href?.startsWith("/")).map((control: any) => control.href)));
    for (let href of links) {
      if (/^\/users\/[a-f0-9]{24}$/.test(href)) href = `/users/${fixtures().citizenId}`;
      const response = await context.request.get(href, { timeout: 60_000 });
      results.push({ role, href, status: response.status() });
      expect(response.status(), `${role} ${href}`).toBeLessThan(400);
    }
  }
  await info.attach("internal-links", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
});
