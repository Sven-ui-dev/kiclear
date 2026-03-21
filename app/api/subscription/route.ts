// GET  /api/subscription         – Abo-Status abrufen
// POST /api/subscription/checkout – Checkout-Session erstellen
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { E, requireAuth, parseBody } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { createCheckoutSession, createPortalSession } from '@/lib/stripe';
import type { SubscriptionTier } from '@/types';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return Response.json({ subscription: sub ?? null });
}
