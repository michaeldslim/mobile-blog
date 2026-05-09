// Supabase Edge Function: send-post-notification
// Triggered by the client after a new published post is created.
// Reads all push tokens except the author's and fans out Expo push notifications.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo Push API batch limit

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── Auth: verify the caller is a signed-in user ──────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Verify JWT with an anon-key client (RLS honoured)
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await callerClient.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let postId: string, postTitle: string, authorName: string | null, authorId: string | null;
  try {
    ({ postId, postTitle, authorName, authorId } = await req.json());
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (!postId || !postTitle) {
    return new Response('Bad Request: postId and postTitle are required', { status: 400 });
  }

  // ── Fetch tokens (service role bypasses RLS) ──────────────────────────────
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let query = adminClient.from('mobile_push_tokens').select('token');
  if (authorId) {
    query = query.neq('user_id', authorId);
  }
  const { data: rows, error: dbError } = await query;

  if (dbError) {
    console.error('DB error fetching tokens:', dbError.message);
    return new Response('Internal Server Error', { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Deduplicate tokens
  const tokens: string[] = [...new Set(rows.map((r: { token: string }) => r.token))];

  const messages = tokens.map((token) => ({
    to: token,
    title: '📝 New Post',
    body: `${authorName ?? 'Someone'} just published "${postTitle}"`,
    data: { postId },
    sound: 'default',
    priority: 'high',
  }));

  // ── Fan out in chunks of 100 ──────────────────────────────────────────────
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      console.error(`Expo push batch ${i / CHUNK_SIZE} failed:`, await res.text());
    }
  }

  return new Response(JSON.stringify({ sent: tokens.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
