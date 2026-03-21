// GET /api/transfer/:token – Transfer-Token aus kicheck.ai konsumieren
// Called by kicheck.ai after user clicks "Upgrade" button
import { NextRequest } from 'next/server';
import { E } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Validate shared secret
  const secret = req.headers.get('x-transfer-secret');
  if (secret !== process.env.KICHECK_TRANSFER_SECRET) {
    return E.forbidden();
  }

  try {
    const { data: token } = await supabaseAdmin
      .from('transfer_tokens')
      .select('*')
      .eq('token', params.token)
      .single();

    if (!token) return E.gone('Transfer-Token nicht gefunden.');
    if (token.used) return E.gone('Transfer-Token wurde bereits verwendet.');
    if (new Date(token.expires_at) < new Date()) return E.gone('Transfer-Token abgelaufen.');

    // Mark as used
    await supabaseAdmin
      .from('transfer_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', params.token);

    return Response.json({
      valid:        true,
      answers_json: token.answers_json,
      score:        token.score,
      risk_class:   token.risk_class,
      email:        token.email,
      target_tier:  token.target_tier,
    });
  } catch (e) {
    console.error('[/api/transfer/:token]', e);
    return E.internal();
  }
}
