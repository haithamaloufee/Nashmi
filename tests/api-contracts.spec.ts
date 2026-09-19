import { test, expect } from "@playwright/test";

test("list endpoints stay compact while detail endpoints remain rich", async ({ request }) => {
  const listResponse = await request.get("/api/laws?limit=2");
  expect(listResponse.status()).toBe(200);
  const rawList = await listResponse.text();
  expect(Buffer.byteLength(rawList, "utf8")).toBeLessThan(20_000);
  const list = JSON.parse(rawList);
  expect(list).toMatchObject({ ok: true, data: { laws: expect.any(Array) } });
  expect(list.data.laws.length).toBeGreaterThan(0);
  for (const law of list.data.laws) {
    expect(law.originalText).toBeUndefined();
    expect(law.simplifiedExplanation).toBeUndefined();
    expect(law.searchNormalized).toBeUndefined();
  }

  const detailResponse = await request.get(`/api/laws/${list.data.laws[0].slug}`);
  expect(detailResponse.status()).toBe(200);
  const detail = await detailResponse.json();
  expect(detail).toMatchObject({ ok: true, data: { law: { slug: list.data.laws[0].slug } } });
  expect(typeof detail.data.law.originalText).toBe("string");
});

test("hidden survey results are absent for an anonymous client", async ({ request }) => {
  const listResponse = await request.get("/api/surveys?limit=30");
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  const hidden = list.data.surveys.find((survey: { resultsVisibility?: string }) => survey.resultsVisibility !== "BEFORE_SUBMIT");
  test.skip(!hidden, "No hidden-result survey is available in this environment");

  const detailResponse = await request.get(`/api/surveys/${hidden.slug}`);
  expect(detailResponse.status()).toBe(200);
  const detail = await detailResponse.json();
  expect(detail.data.survey.canViewResults).toBe(false);
  expect(detail.data.survey.resultSummary).toBeNull();
  expect(detail.data.survey.totalResponses).toBeNull();
  expect(detail.data.survey.responses).toBeUndefined();

  const resultsResponse = await request.get(`/api/surveys/${hidden._id}/results`);
  expect(resultsResponse.status()).toBe(200);
  expect(await resultsResponse.json()).toMatchObject({ ok: true, data: { canViewResults: false, resultSummary: null } });
});
