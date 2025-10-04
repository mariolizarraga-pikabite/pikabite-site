// netlify/functions/sales-list.js
import { createClient } from '@supabase/supabase-js';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
});

export async function handler(event) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(origin), body: 'ok' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors(origin), body: 'Method Not Allowed' };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

  // Basic query params: ?limit=100&seller=Mario%20Lizarraga&product=Gushers
  const url = new URL(event.rawUrl);
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500); // cap at 500
  const seller = url.searchParams.get('seller');
  const product = url.searchParams.get('product');
  const paid = url.searchParams.get('paid');           // "Yes" | "No"
  const deposited = url.searchParams.get('deposited'); // "Yes" | "No"

  let query = supabase
    .from('sales')
    .select('id, created_at, product, qty, price, total, paid, deposited, person, seller, payment_method, notes')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (seller)   query = query.eq('seller', seller);
  if (product)  query = query.eq('product', product);
  if (paid === 'Yes')      query = query.eq('paid', true);
  if (paid === 'No')       query = query.eq('paid', false);
  if (deposited === 'Yes') query = query.eq('deposited', true);
  if (deposited === 'No')  query = query.eq('deposited', false);

  const { data, error } = await query;

  if (error) {
    return { statusCode: 500, headers: cors(origin), body: error.message };
  }
  return { statusCode: 200, headers: cors(origin), body: JSON.stringify({ items: data || [] }) };
}
