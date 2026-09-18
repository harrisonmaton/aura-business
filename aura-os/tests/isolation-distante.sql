-- ═══════════════════════════════════════════════════════════════════════════
-- Isolation — rejouée sur le VRAI projet Supabase (aura-os-dev)
--
-- Les 19 contrôles locaux prouvaient les politiques contre un PostgreSQL de
-- test, avec un schéma `auth` reconstitué. Ce fichier rejoue la même chose sur
-- la base réelle : vrai schéma auth, vraie fonction auth.uid(), vrais rôles
-- anon / authenticated tels que Supabase les a créés.
--
-- Ce qu'il prouve   : les POLITIQUES et les DROITS de table, sur la vraie base.
-- Ce qu'il ne prouve PAS : le TRANSPORT — vérification du jeton, cookies de
--                    session, rafraîchissement. Cela exige un client HTTP
--                    parlant à https://<ref>.supabase.co, et ne se simule pas
--                    en SQL.
--
-- Les utilisateurs sont insérés directement dans auth.users : l'inscription
-- réelle passe par l'API Auth, qui est un contrôle distinct.
--
-- Les résultats sont accumulés en mémoire et n'atteignent la table qu'après
-- `reset role` : sous le rôle `anon`, écrire le résultat serait refusé — et ce
-- refus est précisément ce que le banc d'essai est censé mesurer ailleurs.
-- ═══════════════════════════════════════════════════════════════════════════

drop table if exists public._verif;
create table public._verif (n int, nom text, attendu text, obtenu text, ok boolean);

do $banc$
declare
  uA   uuid := '11111111-1111-1111-1111-111111111111';
  uB   uuid := '22222222-2222-2222-2222-222222222222';
  bA   uuid;
  bB   uuid;
  v    text;
  k    int;
  res  text[] := '{}';
  ligne text;
  bout  text[];
begin
  -- ── Nettoyage puis amorce ────────────────────────────────────────────────
  delete from public.business where slug in ('chez-mario','le-glacier','fantome','sans-identite');
  delete from auth.users where id in (uA, uB);
  insert into auth.users (id, email) values (uA, 'a@aura.test'), (uB, 'b@aura.test');

  -- ── Le parcours de A, en tant que A ──────────────────────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', uA)::text, true);

  bA := public.creer_commerce('Chez Mario', 'Chez Mario', 'food');
  res := res || format('1|creer_commerce rend un identifiant|oui|%s',
                       case when bA is null then 'non' else 'oui' end);

  select count(*)::text into v from public.business_member
    where business_id = bA and user_id = uA and role = 'proprietaire';
  res := res || format('2|le createur devient proprietaire|1|%s', v);

  select count(*)::text into v from public.business_profile where business_id = bA;
  res := res || format('3|le profil nait avec le commerce|1|%s', v);

  select plan into v from public.subscription where business_id = bA;
  res := res || format('4|abonnement initial|free|%s', v);

  select slug into v from public.business where id = bA;
  res := res || format('5|le slug est normalise par la base|chez-mario|%s', v);

  update public.business set statut = 'publie' where id = bA;
  insert into public.menu_category (business_id, nom) values (bA, 'Glaces');
  insert into public.menu_item (business_id, nom, prix_cents) values (bA, 'Pistache', 350);
  insert into public.qr_code (business_id, type) values (bA, 'page');

  -- ── Le parcours de B, en tant que B ──────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', uB)::text, true);
  bB := public.creer_commerce('Le Glacier', 'Le Glacier', 'food');   -- reste brouillon

  select count(*)::text into v from public.business where id = bA;
  res := res || format('6|B voit le commerce publie de A|1|%s', v);

  select count(*)::text into v from public.business_member where business_id = bA;
  res := res || format('7|B ne voit pas l appartenance de A|0|%s', v);

  select count(*)::text into v from public.subscription where business_id = bA;
  res := res || format('8|B ne voit pas l abonnement de A|0|%s', v);

  update public.business set nom = 'Detourne' where id = bA;
  get diagnostics k = row_count;
  res := res || format('9|B ne modifie pas le commerce de A|0|%s', k::text);

  begin
    insert into public.menu_item (business_id, nom) values (bA, 'Intrus');
    res := res || '10|B n ajoute rien au menu de A|refus|accepte'::text;
  exception when insufficient_privilege or check_violation then
    res := res || '10|B n ajoute rien au menu de A|refus|refus'::text;
  end;

  begin
    update public.subscription set plan = 'growth' where business_id = bB;
    res := res || '11|B ne s offre pas un plan payant|refus|accepte'::text;
  exception when insufficient_privilege then
    res := res || '11|B ne s offre pas un plan payant|refus|refus'::text;
  end;

  -- ── Le visiteur anonyme ──────────────────────────────────────────────────
  set local role anon;
  perform set_config('request.jwt.claims', '', true);

  select count(*)::text into v from public.business where id = bA;
  res := res || format('12|anon lit le commerce publie|1|%s', v);

  select count(*)::text into v from public.business where id = bB;
  res := res || format('13|anon ne lit pas un brouillon|0|%s', v);

  select count(*)::text into v from public.menu_item where business_id = bA;
  res := res || format('14|anon lit le menu publie|1|%s', v);

  begin
    insert into public.lead (business_id, nom, message) values (bA, 'Passant', 'Bonjour');
    res := res || '15|anon depose une demande sur un commerce publie|ok|ok'::text;
  exception when others then
    res := res || '15|anon depose une demande sur un commerce publie|ok|refuse'::text;
  end;

  begin
    insert into public.lead (business_id, nom) values (bB, 'Passant');
    res := res || '16|anon ne depose rien sur un brouillon|refus|accepte'::text;
  exception when check_violation or insufficient_privilege then
    res := res || '16|anon ne depose rien sur un brouillon|refus|refus'::text;
  end;

  begin
    select count(*)::text into v from public.lead;
    res := res || format('17|anon ne lit aucune demande|refus|a lu %s', v);
  exception when insufficient_privilege then
    res := res || '17|anon ne lit aucune demande|refus|refus'::text;
  end;

  begin
    select count(*)::text into v from public.business_member;
    res := res || format('18|anon ne lit pas les appartenances|refus|a lu %s', v);
  exception when insufficient_privilege then
    res := res || '18|anon ne lit pas les appartenances|refus|refus'::text;
  end;

  begin
    select count(*)::text into v from public.subscription;
    res := res || format('19|anon ne lit pas les abonnements|refus|a lu %s', v);
  exception when insufficient_privilege then
    res := res || '19|anon ne lit pas les abonnements|refus|refus'::text;
  end;

  -- TRUNCATE n'est PAS filtre par RLS. C'est la raison d'etre du revoke.
  begin
    truncate public.lead;
    res := res || '20|anon ne vide pas la table des demandes|refus|A VIDE LA TABLE'::text;
  exception when insufficient_privilege then
    res := res || '20|anon ne vide pas la table des demandes|refus|refus'::text;
  end;

  begin
    delete from public.lead;
    res := res || '21|anon ne supprime aucune demande|refus|accepte'::text;
  exception when insufficient_privilege then
    res := res || '21|anon ne supprime aucune demande|refus|refus'::text;
  end;

  begin
    perform public.creer_commerce('Fantome', 'fantome', 'food');
    res := res || '22|anon ne cree pas de commerce|refus|accepte'::text;
  exception when insufficient_privilege then
    res := res || '22|anon ne cree pas de commerce|refus|refus'::text;
  end;

  -- ── Retour chez A : il doit voir ce qui le concerne ──────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', uA)::text, true);

  select count(*)::text into v from public.lead where business_id = bA;
  res := res || format('23|A lit la demande deposee chez lui|1|%s', v);

  select count(*)::text into v from public.subscription where business_id = bA;
  res := res || format('24|A lit son abonnement|1|%s', v);

  select nom into v from public.business where id = bA;
  res := res || format('25|le nom de A n a pas ete detourne|Chez Mario|%s', v);

  -- Identite absente : la fonction doit refuser, pas creer un orphelin.
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.creer_commerce('Sans identite', 'sans-identite', 'food');
    res := res || '26|pas d identite, pas de commerce|refus|accepte'::text;
  exception when others then
    res := res || '26|pas d identite, pas de commerce|refus|refus'::text;
  end;

  reset role;

  -- Les rouages de politique ne doivent plus etre publies par PostgREST.
  select count(*)::text into v from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('est_membre','est_publie');
  res := res || format('27|les fonctions internes ont quitte le schema expose|0|%s', v);

  foreach ligne in array res loop
    bout := string_to_array(ligne, '|');
    insert into public._verif (n, nom, attendu, obtenu, ok)
      values (bout[1]::int, bout[2], bout[3], bout[4], bout[3] = bout[4]);
  end loop;
end
$banc$;
