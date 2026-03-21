// GET /api/health – Service Health Check
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const t = Date.now();
  let dbStatus = 'healthy', dbLatency = 0;

  try {
    await supabaseAdmin.from('subscriptions').select('id').limit(1);
    dbLatency = Date.now() - t;
  } catch {
    dbStatus = 'unhealthy';
    dbLatency = Date.now() - t;
  }

  const anthropicKeySet = !!process.env.ANTHROPIC_API_KEY;
  const stripeKeySet    = !!process.env.STRIPE_SECRET_KEY;

  const overall = dbStatus === 'healthy' ? 'healthy' : 'degraded';

  return Response.json({
    status:    overall,
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database:  { status: dbStatus, latency_ms: dbLatency },
      anthropic: { status: anthropicKeySet ? 'configured' : 'missing_key' },
      stripe:    { status: stripeKeySet    ? 'configured' : 'missing_key' },
    },
  }, { status: overall === 'healthy' ? 200 : 503 });
}
