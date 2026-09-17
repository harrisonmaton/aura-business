-- ═══════════════════════════════════════════════════════════════════════════
-- Shim `auth` — UNIQUEMENT pour la base locale de test
--
-- Supabase fournit nativement le schéma `auth`, la table `auth.users` et la
-- fonction `auth.uid()`. Postgres nu ne les a pas. Ce fichier les recrée à
-- l'identique de leur contrat public, pour que les migrations puissent être
-- appliquées SANS MODIFICATION sur les deux environnements.
--
-- C'est la condition pour que le test prouve quelque chose : si les politiques
-- testées ici différaient de celles déployées, on ne testerait qu'une copie.
--
-- Ce fichier n'est jamais appliqué sur Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Chez Supabase, auth.uid() lit l'identifiant dans les revendications du JWT
-- transmis par PostgREST. On reproduit le même mécanisme : une variable de
-- session, positionnée par le client, lue par la fonction.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Les rôles que Supabase crée d'office.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
grant select on auth.users   to authenticated, service_role;
