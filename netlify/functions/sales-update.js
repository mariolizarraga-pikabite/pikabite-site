// netlify/functions/sales-update.js
import { createClient } from '@supabase/supabase-js';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS'
});

export async function handler(event) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(origin), body: 'ok' };
  }
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers: cors(origin), body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors(origin), body: 'Invalid JSON' }; }

  const id = (body.id || '').trim();
  if (!id) {
    return { statusCode: 400, headers: cors(origin), body: 'Missing id' };
  }

  // Whitelist fields
  const patch = {};
  if (body.paid !== undefined)      patch.paid = !!body.paid;
  if (body.deposited !== undefined) patch.deposited = !!body.deposited;
  if (body.payment_method !== undefined) patch.payment_method = String(body.payment_method).slice(0, 120);
  if (body.notes !== undefined)          patch.notes = String(body.notes).slice(0, 500);
  if (body.person !== undefined)         patch.person = String(body.person).slice(0, 120);
  if (body.seller !== undefined)         patch.seller = String(body.seller).slice(0, 120);

  if (Object.keys(patch).length === 0) {
    return { statusCode: 400, headers: cors(origin), body: 'No allowed fields to update' };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

  const { data, error } = await supabase
    .from('sales')
    .update(patch)
    .eq('id', id)
    .select('id, created_at, product, qty, price, total, paid, deposited, person, seller, payment_method, notes')
    .single();

  if (error) {
    return { statusCode: 500, headers: cors(origin), body: error.message };
  }

  return { statusCode: 200, headers: cors(origin), body: JSON.stringify({ item: data }) };
}
