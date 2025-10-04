// netlify/functions/sellers-list.js
import { createClient } from '@supabase/supabase-js';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
});

export async function handler(event) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(origin), body: 'ok' };
  if (event.httpMethod !== 'GET')   return { statusCode: 405, headers: cors(origin), body: 'Method Not Allowed' };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

  const { data, error } = await supabase
    .from('sellers')
    .select('name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) return { statusCode: 500, headers: cors(origin), body: error.message };

  return { statusCode: 200, headers: cors(origin), body: JSON.stringify({ items: data || [] }) };
}
