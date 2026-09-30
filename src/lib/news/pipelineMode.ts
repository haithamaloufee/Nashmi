export type NewsPipelineMode = "legacy" | "shadow" | "new";

export function getNewsPipelineMode(): NewsPipelineMode {
  const value = process.env.NEWS_PIPELINE_MODE || "legacy";
  if (value !== "legacy" && value !== "shadow" && value !== "new") throw new Error("NEWS_PIPELINE_MODE_INVALID");
  return value;
}

export function mayPublishNewPipeline() {
  return getNewsPipelineMode() === "new" && process.env.NEWS_AUTO_PUBLISH === "true" && (process.env.VERCEL_ENV === "production" || (process.env.VERCEL_ENV === "preview" && process.env.NEWS_PREVIEW_TEST_PUBLISH === "true"));
}
