export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // For security, we only show whether keys are configured, not the actual keys
  const hasKeys = !!(process.env.API_KEYS || process.env.API_KEY);
  const demoMode = !hasKeys;

  return res.status(200).json({
    success: true,
    message: demoMode
      ? 'No API_KEYS set. Currently accepting "demo-key-change-me". Set API_KEYS env var in Vercel for production.'
      : 'API Keys are configured via Environment Variables.',
    demoMode,
    howToSet:
      'Go to Vercel Project → Settings → Environment Variables → Add API_KEYS = key1,key2,key3',
  });
}
