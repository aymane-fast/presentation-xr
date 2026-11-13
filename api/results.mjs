import {json, supabaseConfig} from '../lib/sus.mjs';

export async function GET() {
  const config = supabaseConfig();
  if (!config) return json({error:'Configuration serveur manquante. Consultez le guide de déploiement.'}, 503);
  try {
    const params = '?select=id,created_at,visit_name,device,answers,odd_sum,even_sum,score,discomfort,difficulties,comment&order=created_at.asc&limit=1000';
    const response = await fetch(`${config.url}${params}`, {
      method:'GET',
      headers:config.headers,
      signal:AbortSignal.timeout(9000)
    });
    if (!response.ok) {
      console.error('Supabase results failed', response.status);
      return json({error:'Impossible de charger les réponses.'}, 502);
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) return json({error:'Réponse invalide.'}, 502);
    return json({responses:rows, limit:1000});
  } catch { return json({error:'Connexion à la base indisponible.'}, 502); }
}

export function POST() { return json({error:'Méthode non autorisée.'}, 405, {Allow:'GET'}); }
