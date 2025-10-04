// netlify/functions/restock-add.js
import { createClient } from '@supabase/supabase-js';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
});

export async function handler(event) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(origin), body: 'ok' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors(origin), body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors(origin), body: 'Invalid JSON' }; }

  const product = (body.product || '').trim();
  const qty = Number(body.qty || 0);
  const notes = (body.notes || '').toString().slice(0, 500);

  if (!product || !qty || qty <= 0) {
    return { statusCode: 400, headers: cors(origin), body: 'Missing/invalid product/qty' };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

  // Ensure product exists
  const { data: prod, error: prodErr } = await supabase
    .from('products').select('product').eq('product', product).single();
  if (prodErr || !prod) return { statusCode: 404, headers: cors(origin), body: 'Unknown product' };

  const { error } = await supabase.from('stock_ledger').insert({
    product, delta: qty, source: 'restock', meta: { notes }
  });
  if (error) return { statusCode: 500, headers: cors(origin), body: error.message };

  return { statusCode: 200, headers: cors(origin), body: JSON.stringify({ ok: true }) };
}
