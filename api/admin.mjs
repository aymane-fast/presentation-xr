import {createHash, timingSafeEqual} from 'node:crypto';
import {json, supabaseConfig} from '../lib/sus.mjs';

const pageSize = 50;
const validId = id => Number.isSafeInteger(id) && id > 0;
const hash = value => createHash('sha256').update(value).digest();

function authorize(request) {
  const password = process.env.SUS_ADMIN_PASSWORD;
  if (!password) return json({error:'Administration non configurée.'}, 503);
  const supplied = request.headers.get('authorization') || '';
  if (!timingSafeEqual(hash(supplied), hash(`Bearer ${password}`))) {
    return json({error:'Mot de passe incorrect.'}, 401);
  }
}

async function query(params, method = 'GET') {
  const config = supabaseConfig();
  if (!config) return json({error:'Base de données non configurée.'}, 503);
  try {
    const headers = method === 'DELETE'
      ? {...config.headers, Prefer:'return=minimal,count=exact'}
      : config.headers;
    const response = await fetch(`${config.url}?${params}`, {
      method, headers, signal:AbortSignal.timeout(9000)
    });
    if (!response.ok) {
      console.error('Supabase admin request failed', method, response.status);
      return json({error:'Opération refusée par la base de données.'}, 502);
    }
    if (method === 'DELETE') {
      const count = response.headers.get('content-range')?.match(/\/(\d+)$/);
      return json({deleted:count ? Number(count[1]) : null});
    }
    const rows = await response.json();
    const responses = rows.slice(0, pageSize);
    return json({responses, nextBefore:rows.length > pageSize ? responses.at(-1).id : null});
  } catch {
    return json({error:'Connexion à la base indisponible. Actualisez avant de réessayer.'}, 502);
  }
}

export async function GET(request) {
  const denied = authorize(request);
  if (denied) return denied;
  const before = new URL(request.url).searchParams.get('before');
  const params = new URLSearchParams({
    select:'id,created_at,visit_name,device,score', order:'id.desc', limit:String(pageSize + 1)
  });
  if (before !== null) {
    if (!/^\d+$/.test(before) || !validId(Number(before))) return json({error:'Page invalide.'}, 400);
    params.set('id', `lt.${before}`);
  }
  return query(params);
}

export async function DELETE(request) {
  const denied = authorize(request);
  if (denied) return denied;
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return json({error:'Format JSON requis.'}, 415);
  }
  let body;
  try { body = await request.json(); } catch { return json({error:'JSON invalide.'}, 400); }
  if (body?.confirmation === 'SUPPRIMER TOUT' && Object.keys(body).length === 1) {
    return query(new URLSearchParams({id:'not.is.null'}), 'DELETE');
  }
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > pageSize || !ids.every(validId)) {
    return json({error:'Sélection invalide.'}, 400);
  }
  return query(new URLSearchParams({id:`in.(${[...new Set(ids)].join(',')})`}), 'DELETE');
}
