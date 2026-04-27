// QA Smoke Test - Auth Routes and Public Pages
(async () => {
  const base = 'http://127.0.0.1:3001';
  const tests: Array<{ test: string; status?: number; ok?: boolean; error?: string }> = [];

  // Test 1: GET /login page
  try {
    const res = await fetch(`${base}/login`);
    tests.push({ test: 'GET /login', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /login', error: String(e) }); }

  // Test 2: GET /signup page
  try {
    const res = await fetch(`${base}/signup`);
    tests.push({ test: 'GET /signup', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /signup', error: String(e) }); }

  // Test 3: GET /laws page
  try {
    const res = await fetch(`${base}/laws`);
    tests.push({ test: 'GET /laws', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /laws', error: String(e) }); }

  // Test 4: GET /laws/[slug] - valid slug
  try {
    const res = await fetch(`${base}/laws/equality-before-law-and-equal-opportunity`);
    tests.push({ test: 'GET /laws/[slug]', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /laws/[slug]', error: String(e) }); }

  // Test 5: POST /api/auth/login - missing credentials (should fail)
  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    tests.push({ test: 'POST /api/auth/login (empty)', status: res.status, ok: res.status >= 400 });
  } catch(e) { tests.push({ test: 'POST /api/auth/login (empty)', error: String(e) }); }

  // Test 6: POST /api/auth/signup - missing credentials (should fail)
  try {
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    tests.push({ test: 'POST /api/auth/signup (empty)', status: res.status, ok: res.status >= 400 });
  } catch(e) { tests.push({ test: 'POST /api/auth/signup (empty)', error: String(e) }); }

  // Test 7: GET /api/auth/me - without token (should fail with 401)
  try {
    const res = await fetch(`${base}/api/auth/me`);
    tests.push({ test: 'GET /api/auth/me (no token)', status: res.status, ok: res.status === 401 });
  } catch(e) { tests.push({ test: 'GET /api/auth/me (no token)', error: String(e) }); }

  // Test 8: GET /api/laws - public endpoint (should return 200)
  try {
    const res = await fetch(`${base}/api/laws`);
    tests.push({ test: 'GET /api/laws', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /api/laws', error: String(e) }); }

  // Test 9: GET /posts - public page
  try {
    const res = await fetch(`${base}/posts`);
    tests.push({ test: 'GET /posts', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /posts', error: String(e) }); }

  // Test 10: GET /polls - public page
  try {
    const res = await fetch(`${base}/polls`);
    tests.push({ test: 'GET /polls', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /polls', error: String(e) }); }

  // Test 11: GET /updates - public page
  try {
    const res = await fetch(`${base}/updates`);
    tests.push({ test: 'GET /updates', status: res.status, ok: res.status === 200 });
  } catch(e) { tests.push({ test: 'GET /updates', error: String(e) }); }

  // Test 12: GET /chat - may require auth or be public
  try {
    const res = await fetch(`${base}/chat`);
    tests.push({ test: 'GET /chat', status: res.status, ok: res.status === 200 || res.status === 401 || res.status === 307 });
  } catch(e) { tests.push({ test: 'GET /chat', error: String(e) }); }

  // Test 13: Invalid law slug (should return 404)
  try {
    const res = await fetch(`${base}/laws/invalid-nonexistent-law`);
    tests.push({ test: 'GET /laws/[invalid-slug]', status: res.status, ok: res.status === 404 });
  } catch(e) { tests.push({ test: 'GET /laws/[invalid-slug]', error: String(e) }); }

  console.log(JSON.stringify(tests, null, 2));
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
