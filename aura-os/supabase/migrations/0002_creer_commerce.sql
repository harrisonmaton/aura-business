-- ═══════════════════════════════════════════════════════════════════════════
-- Création d'un commerce — opération atomique
--
-- Il n'existe volontairement AUCUNE politique `insert` sur `business`. Sans
-- cela, un utilisateur pourrait insérer un commerce sans s'y rattacher, et
-- créer un objet orphelin que personne ne peut plus ni lire ni supprimer.
--
-- Le commerce et son appartenance naissent donc ensemble, dans une fonction
-- qui décide elle-même du propriétaire : `auth.uid()`, jamais un identifiant
-- envoyé par le client.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function creer_commerce(p_nom text, p_slug text, p_vertical text default 'food')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  if p_nom is null or length(btrim(p_nom)) = 0 then
    raise exception 'nom requis' using errcode = '22023';
  end if;

  -- Le slug est normalisé côté base : c'est lui qui sert d'adresse publique,
  -- il ne peut pas dépendre de ce que le navigateur a bien voulu envoyer.
  p_slug := lower(regexp_replace(coalesce(nullif(btrim(p_slug), ''), p_nom), '[^a-zA-Z0-9]+', '-', 'g'));
  p_slug := btrim(p_slug, '-');
  if length(p_slug) < 2 then
    raise exception 'slug trop court' using errcode = '22023';
  end if;

  insert into business (nom, slug, vertical)
  values (btrim(p_nom), p_slug, coalesce(p_vertical, 'food'))
  returning id into v_id;

  insert into business_member (business_id, user_id, role)
  values (v_id, v_user, 'proprietaire');

  insert into business_profile (business_id) values (v_id);
  insert into subscription (business_id, plan) values (v_id, 'free');

  return v_id;
end;
$$;

revoke all on function creer_commerce(text, text, text) from public;
grant execute on function creer_commerce(text, text, text) to authenticated;
