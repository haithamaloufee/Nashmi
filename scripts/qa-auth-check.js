const fetch = globalThis.fetch || require('node-fetch');
const creds = [
  { email: process.env.QA_ADMIN_EMAIL, password: process.env.QA_ADMIN_PASSWORD, name: 'admin' },
  { email: process.env.QA_IEC_EMAIL, password: process.env.QA_IEC_PASSWORD, name: 'iec' },
  { email: process.env.QA_CITIZEN_EMAIL, password: process.env.QA_CITIZEN_PASSWORD, name: 'citizen' },
  { email: process.env.QA_PARTY_EMAIL, password: process.env.QA_PARTY_PASSWORD, name: 'party' }
].filter((credential) => credential.email && credential.password);

if (!creds.length) throw new Error('Set QA_*_EMAIL and QA_*_PASSWORD variables before running this check');

(async () => {
  for (const cred of creds) {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, password: cred.password }),
        redirect: 'manual'
      });
      const text = await res.text();
      console.log(`${cred.name} (${cred.email}) -> ${res.status} ${res.statusText}`);
      if (res.status !== 200) console.log(`  body: ${text.slice(0,200)}`);
    } catch (err) {
      console.log(`${cred.name} (${cred.email}) -> ERROR ${err.message}`);
    }
  }
})();
