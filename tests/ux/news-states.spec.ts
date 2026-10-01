// Reuse the project's existing ticker regression cases in the isolated UX harness.
import "../news-ticker.spec";
import { test } from "@playwright/test";
test.use({ reducedMotion: "no-preference" });
