// netlify/functions/sales-add.js
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
  const qty = Number(body.qty || 0);              // sold quantity
  const priceInput = body.price !== undefined && body.price !== null ? Number(body.price) : null;
  const paid = String(body.paid || '').toLowerCase() === 'yes' || body.paid === true;
  const deposited = String(body.deposited || '').toLowerCase() === 'yes' || body.deposited === true;
  const person = (body.person || '').trim();
  const seller = (body.seller || '').trim();
  const payment_method = (body.paymentMethod || '').trim();
  const notes = (body.notes || '').toString().slice(0, 500);

  if (!product || !qty || qty <= 0) {
    return { statusCode: 400, headers: cors(origin), body: 'Missing/invalid product/qty' };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

  // Get canonical price from products if not provided
  const { data: prod, error: prodErr } = await supabase
    .from('products')
    .select('price')
    .eq('product', product)
    .single();
  if (prodErr || !prod) return { statusCode: 404, headers: cors(origin), body: 'Unknown product' };

  const unitPrice = (priceInput !== null && !isNaN(priceInput)) ? priceInput : Number(prod.price || 0);
  const total = Number((qty * unitPrice).toFixed(2));

  // 1) Insert detailed sale
  const { error: saleErr } = await supabase.from('sales').insert({
    product, qty, price: unitPrice, total, paid, deposited, person, seller, payment_method, notes
  });
  if (saleErr) return { statusCode: 500, headers: cors(origin), body: saleErr.message };

  // 2) Insert ledger delta (negative qty)
  const { error: ledErr } = await supabase.from('stock_ledger').insert({
    product, delta: -qty, source: 'sale',
    meta: { unitPrice, total, paid, deposited, person, seller, payment_method, notes }
  });
  if (ledErr) return { statusCode: 500, headers: cors(origin), body: ledErr.message };

  return { statusCode: 200, headers: cors(origin), body: JSON.stringify({ ok: true, total }) };
}
