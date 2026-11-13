-- Google Arts & Culture / étude SUS — stockage anonyme
-- À exécuter UNE fois dans Supabase > SQL Editor.
create table if not exists public.sus_responses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visit_name text not null default '',
  device text not null default 'Non précisé',
  answers jsonb not null check (
    jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 10
  ),
  odd_sum smallint not null,
  even_sum smallint not null,
  score numeric(5,1) not null check (score >= 0 and score <= 100),
  discomfort text not null default 'Non renseigné',
  difficulties text not null default '',
  comment text not null default ''
);

-- Même si l'URL du projet est connue, aucun accès direct anonyme.
-- Les requêtes passent par le backend Vercel, jamais depuis le navigateur.
alter table public.sus_responses enable row level security;
revoke all on table public.sus_responses from anon, authenticated;
grant select, insert on table public.sus_responses to service_role;
create index if not exists sus_responses_created_idx on public.sus_responses (created_at desc);
