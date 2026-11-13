// Module partagé côté SERVEUR uniquement — aucun package externe.
const validDevices = new Set(['Android', 'iPhone', 'Autre', 'Non précisé']);
const validDiscomfort = new Set(['Aucun', 'Léger', 'Important', 'Non renseigné']);

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...extraHeaders}
  });
}

export function calculateSus(answers) {
  if (!Array.isArray(answers) || answers.length !== 10 || !answers.every(v => Number.isInteger(v) && v >= 1 && v <= 5)) {
    return null;
  }
  const odd_sum = answers.filter((_, index) => index % 2 === 0).reduce((a,b) => a+b, 0);
  const even_sum = answers.filter((_, index) => index % 2 === 1).reduce((a,b) => a+b, 0);
  return { odd_sum, even_sum, score: (odd_sum - even_sum + 20) * 2.5 };
}

export function normalizeSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const result = calculateSus(input.answers);
  if (!result) return null;
  if (input.website) return null; // Champ honeypot anti-bot.
  function bounded(value, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
  const device = validDevices.has(input.device) ? input.device : 'Non précisé';
  const discomfort = validDiscomfort.has(input.discomfort) ? input.discomfort : 'Non renseigné';
  return {
    visit_name: bounded(input.visit_name, 120),
    device,
    answers: input.answers,
    ...result,
    discomfort,
    difficulties: bounded(input.difficulties, 750),
    comment: bounded(input.comment, 750)
  };
}

export function supabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!rawUrl || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(rawUrl)) return null;
  return {
    url: `${rawUrl.replace(/\/$/, '')}/rest/v1/sus_responses`,
    headers: {apikey:key, 'Content-Type':'application/json', 'Accept':'application/json'}
  };
}
