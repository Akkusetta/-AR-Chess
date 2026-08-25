const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

const CODE_RE = /^[A-Z0-9]{4}$/;
const TTL_SECONDS = 60 * 60 * 6; // rooms auto-expire after 6 hours of inactivity

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const code = String(req.query.code || '').toUpperCase();
    if (!CODE_RE.test(code)) {
      return res.status(400).json({ error: 'invalid code' });
    }
    const room = await redis.get(`room:${code}`);
    if (!room) {
      return res.status(404).json({ error: 'not found' });
    }
    return res.status(200).json(room);
  }

  if (req.method === 'POST') {
    let body = req.body;
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
    return res.status(200).json(room);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'method not allowed' });
};