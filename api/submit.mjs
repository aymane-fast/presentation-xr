import {json, normalizeSubmission, supabaseConfig} from '../lib/sus.mjs';

export async function POST(request) {
  const config = supabaseConfig();
  if (!config) return json({error:'Configuration serveur manquante. Consultez le guide de déploiement.'}, 503);
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return json({error:'Format JSON requis.'}, 415);
  const raw = await request.text();
  if (raw.length > 16000) return json({error:'Formulaire trop volumineux.'}, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({error:'JSON invalide.'}, 400); }
  const entry = normalizeSubmission(body);
  if (!entry) return json({error:'Veuillez répondre aux 10 questions (1 à 5).'}, 400);
  try {
    const response = await fetch(`${config.url}?select=id,created_at,score`, {
      method:'POST',
      headers:{...config.headers, 'Prefer':'return=representation'},
      body:JSON.stringify(entry),
      signal:AbortSignal.timeout(9000)
    });
    if (!response.ok) {
      console.error('Supabase submission failed', response.status); // Jamais de clé, corps ou données personnelles.
      return json({error:'Enregistrement indisponible. Réessayez.'}, 502);
    }
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows[0]?.id) return json({error:'Réponse inattendue du serveur.'}, 502);
    return json({ok:true, id:rows[0].id, created_at:rows[0].created_at}, 201);
  } catch {
    return json({error:'Connexion à la base indisponible. Réessayez.'}, 502);
  }
}

export function GET() { return json({error:'Méthode non autorisée.'}, 405, {Allow:'POST'}); }
