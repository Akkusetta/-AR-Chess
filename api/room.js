const { Redis } = require('@upstash/redis');

let redis;
try {
  redis = Redis.fromEnv();
} catch (e) {
  console.error('Redis init failed – check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars:', e.message);
}

const CODE_RE = /^[A-Z0-9]{4}$/;
const TTL_SECONDS = 60 * 60 * 6;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!redis) {
    console.error('Redis client not initialised');
    return res.status(500).json({ error: 'server not configured – missing Redis env vars' });
  }

  try {
    if (req.method === 'GET') {
      const code = String((req.query && req.query.code) || '').toUpperCase();
      if (!CODE_RE.test(code)) {
        return res.status(400).json({ error: 'invalid code' });
      }
      const room = await redis.get(`room:${code}`);
      if (!room) {
        console.log('GET room not found:', code);
        return res.status(404).json({ error: 'not found' });
      }
      return res.status(200).json(room);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (!body) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString();
        try { body = JSON.parse(raw); } catch (e) { body = null; }
      }
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      const code = String((body && body.code) || '').toUpperCase();
      const state = body && body.state;
      if (!CODE_RE.test(code) || !state) {
        return res.status(400).json({ error: 'missing or invalid fields' });
      }
      const room = { state, updatedAt: Date.now() };
      await redis.set(`room:${code}`, room, { ex: TTL_SECONDS });
      console.log('POST room saved:', code);
      return res.status(200).json(room);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
};
