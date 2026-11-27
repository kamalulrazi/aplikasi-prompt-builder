// Outfit Studio: perantara Cloudflare Workers AI supaya aplikasi bisa dipakai di browser/laptop.
// Satu Worker untuk semua API key: token & Account ID dikirim aplikasi tiap permintaan,
// jatah neuron terpakai di akun pemilik token, bukan akun tempat Worker ini dipasang.
// Hanya meneruskan ke 2 alamat (GraphQL pemakaian & AI run), jadi tidak bisa dipakai untuk hal lain.
const API = 'https://api.cloudflare.com';
const BOLEH = [
  /^\/client\/v4\/graphql$/,
  /^\/client\/v4\/accounts\/[0-9a-fA-F]{32}\/ai\/run\/@cf\/[\w.\-\/@]+$/
];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'cf-ai-neurons',
  'Access-Control-Max-Age': '86400'
};
const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/') return json({ ok: true, app: 'outfit-studio-cf-proxy' });
    if (req.method !== 'POST' || !BOLEH.some(r => r.test(u.pathname)))
      return json({ success: false, errors: [{ code: 404, message: 'Alamat tidak diizinkan' }] }, 404);
    const auth = req.headers.get('Authorization') || '';
    if (!/^Bearer\s+\S+/.test(auth)) return json({ success: false, errors: [{ code: 10000, message: 'Token kosong' }] }, 401);
    let r;
    try {
      r = await fetch(API + u.pathname, {
        method: 'POST',
        headers: { 'Authorization': auth, 'Content-Type': req.headers.get('Content-Type') || 'application/json' },
        body: await req.arrayBuffer()
      });
    } catch (e) {
      return json({ success: false, errors: [{ code: 502, message: 'Worker gagal menghubungi Cloudflare API' }] }, 502);
    }
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(CORS)) h.set(k, v);
    h.delete('set-cookie');
    return new Response(r.body, { status: r.status, headers: h });
  }
};
