# Comment moderation

Nashmi moderation does not classify or suppress political viewpoints. Strong criticism of a party, government, institution, decision, or official, disagreement, negative sentiment, and harmless satire remain allowed. This is a community safety rule, not a legal judgment.

## Flow

Both post and poll comment routes authenticate a citizen, validate a 4 KB maximum request and 1,000-character comment, then call one shared creation service. Existing limits allow 10 submissions per 10 minutes; the service also limits bursts to four per minute. It rejects extreme repeated-character floods and repeated normalized text within two minutes. The comparison key is a keyed hash scoped to the user; it contains no viewpoint signal. Arabic comparison removes diacritics, tatweel, Unicode formatting marks, and punctuation. Published text retains the existing HTML-stripping behavior.

The remaining text is sent once to Gemini as comment text only. No user name, email, ID, IP address, avatar, session, post title, conversation history, or document context is sent. The model returns structured JSON validated by Zod. Only clear harassment, identity-based hate, credible threats, incitement, or severe directed abuse with confidence at least 0.90 is rejected. Ambiguous and low-confidence classifications are allowed. A malformed response, timeout, missing key, quota issue, or provider failure allows publication after local checks. The service logs event, category and duration only, never comment text, prompt, provider error, or personal identifiers.

Accepted comments and their target counter update in one MongoDB transaction. A client request UUID and unique index make completed retries idempotent. Rejected comments create no Comment document; no rejected text or moderation profile is retained. Published comments remain subject to existing reports and administrator moderation. No administrator notifications are sent.

## Configuration and operations

`GEMINI_API_KEY` is the existing server-only credential. `GEMINI_MODERATION_MODEL` optionally selects a separate fast model; it falls back to `GEMINI_MODEL`, then `gemini-3.5-flash-lite`. One request has a 3.5-second abort deadline and a 160-token output cap. Run `npm run test:moderation`, `npm run test:moderation:ui`, `npm run typecheck`, `npm run lint`, and the existing security suite. The UI smoke starts an isolated MongoDB replica set, logs in a test citizen, and runs a local Next server with an invalid test Gemini key. Production disables Mongoose auto-indexing, so the comment service ensures the unique idempotency index before its first comment write; an index creation failure blocks comment writes and is retried on the next request. `npm run indexes:hardening` remains available for an explicit migration. A MongoDB deployment supporting transactions is required for accepted comments.

If rejection appears too broad, inspect only aggregate `moderation.rejected` categories and test representative wording with the mock suite. If `moderation.ai_failure` rises, check Gemini availability and credentials without collecting comment bodies. If publication fails despite healthy Gemini, check MongoDB transaction support and database health. Manual reports remain the fallback for harmful comments that pass the first layer.
