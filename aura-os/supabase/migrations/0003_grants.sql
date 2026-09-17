-- ═══════════════════════════════════════════════════════════════════════════
-- Droits de table
--
-- Supabase accorde par défaut des droits larges aux rôles `anon` et
-- `authenticated`, et compte sur RLS pour filtrer. On ne s'appuie pas sur ce
-- défaut : il est implicite, il peut changer, et il ne serait pas reproduit
-- par la base locale de test. Les droits sont donc écrits ici, explicitement,
-- et sont les mêmes partout.
--
-- Deux couches distinctes, à ne pas confondre :
--   GRANT  = as-tu le droit de toucher à cette table ?
--   RLS    = quelles LIGNES de cette table ?
-- Retirer un GRANT est ce qui empêche une table d'être atteinte du tout.
-- ═══════════════════════════════════════════════════════════════════════════

-- Le visiteur anonyme : il lit la page publique, dépose une demande, et
-- déclenche un événement de mesure. Rien d'autre.
grant select on business, business_profile, menu_category, menu_item, qr_code to anon;
grant insert on lead, analytics_event to anon;

-- L'utilisateur connecté : mêmes droits, plus la gestion de son commerce.
-- Ce que RLS décide ensuite, c'est de QUELLES lignes il s'agit.
grant select on business, business_profile, menu_category, menu_item, qr_code,
                business_member, lead, analytics_event, subscription to authenticated;
grant insert, update, delete on business_profile, menu_category, menu_item to authenticated;
grant insert, update on lead to authenticated;
grant insert, update, delete on qr_code to authenticated;
grant update on business to authenticated;
grant insert on analytics_event to authenticated;
grant usage on all sequences in schema public to anon, authenticated;

-- Aucun droit d'écriture sur `subscription` : seul le webhook Stripe, qui
-- passe par la clé de service, la modifie. Un utilisateur qui pourrait écrire
-- son propre plan s'offrirait l'abonnement Business.
-- Aucun droit d'INSERT sur `business` : la création passe par creer_commerce().
