const fetch = globalThis.fetch || require('node-fetch');
const creds = [
  { email: 'admin@sharek.demo', password: 'AdminDemo!2026', name: 'admin' },
  { email: 'iec@sharek.demo', password: 'IecDemo!2026', name: 'iec' },
  { email: 'citizen@sharek.demo', password: 'CitizenDemo!2026', name: 'citizen' },
  { email: 'party.national-constituency@sharek.demo', password: 'PartyDemo!2026', name: 'party' },
  { email: 'admin@sharek.demo', password: 'WrongPass!2024', name: 'wrong' }
];

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
