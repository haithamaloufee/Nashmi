const routes = ['/', '/parties', '/iec', '/posts', '/polls', '/laws', '/login', '/signup', '/admin', '/admin/users', '/admin/parties', '/admin/moderation', '/admin/logs', '/party-dashboard', '/party-dashboard/profile', '/iec-dashboard', '/iec-dashboard/laws'];
(async () => {
  for (const route of routes) {
    try {
      const res = await fetch('http://localhost:3000' + route, { method: 'GET', redirect: 'manual' });
      console.log(route, res.status, res.headers.get('location') || '');
    } catch (err) {
      console.log(route, 'ERROR', err.message);
    }
  }
})();
