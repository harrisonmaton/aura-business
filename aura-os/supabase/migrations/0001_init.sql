-- ═══════════════════════════════════════════════════════════════════════════
-- Aura OS — schéma initial
--
-- Ce fichier est appliqué tel quel sur Supabase ET sur la base locale de test.
-- Il ne contient AUCUN aménagement pour les tests : le shim qui recrée le
-- schéma `auth` en local vit dans tests/auth-shim.sql. Si les politiques
-- testées n'étaient pas exactement celles déployées, le test ne prouverait
-- rien.
--
-- Principe d'isolation : un utilisateur n'accède à un commerce que s'il en est
-- membre (table business_member). Aucune politique ne fait confiance à une
-- valeur envoyée par le client.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Commerce ───────────────────────────────────────────────────────────────
create table business (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  nom         text not null,
  vertical    text not null default 'food',
  statut      text not null default 'brouillon'
              check (statut in ('brouillon','publie','suspendu')),
  cree_le     timestamptz not null default now()
);
create index business_vertical_idx on business (vertical);

-- Le lien utilisateur ↔ commerce. C'est la seule source de droit d'accès.
-- Une table de liaison plutôt qu'une colonne `user_id` sur business : le mode
-- agence, plus tard, n'aura rien à migrer — il ajoutera des lignes.
create table business_member (
  business_id uuid not null references business(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'proprietaire'
              check (role in ('proprietaire','membre')),
  cree_le     timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_member_user_idx on business_member (user_id);

-- ── Profil public ──────────────────────────────────────────────────────────
create table business_profile (
  business_id uuid primary key references business(id) on delete cascade,
  description text,
  logo_url    text,
  couleur     text,
  style       text,
  telephone   text,
  whatsapp    text,
  instagram   text,
  adresse     text,
  ville       text,
  horaires    jsonb not null default '[]'::jsonb,
  zone_km     integer,
  avis_url    text,
  maj_le      timestamptz not null default now()
);

-- ── Menu ───────────────────────────────────────────────────────────────────
create table menu_category (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete cascade,
  nom         text not null,
  ordre       integer not null default 0
);
create index menu_category_business_idx on menu_category (business_id);

create table menu_item (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business(id) on delete cascade,
  category_id  uuid references menu_category(id) on delete set null,
  nom          text not null,
  description  text,
  -- Les prix sont en centimes : un prix en flottant finit par afficher 3,99
  -- au lieu de 4,00 après un calcul.
  prix_cents   integer check (prix_cents is null or prix_cents >= 0),
  photo_url    text,
  disponible   boolean not null default true,
  ordre        integer not null default 0
);
create index menu_item_business_idx on menu_item (business_id);

-- ── Demandes entrantes ─────────────────────────────────────────────────────
-- Une seule table pour les trois formes de demande. Décision validée : un
-- « booking » est un lead typé, pas une seconde architecture.
create table lead (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business(id) on delete cascade,
  type         text not null default 'contact'
               check (type in ('contact','booking','event')),
  nom          text not null,
  telephone    text,
  email        text,
  source       text,
  date_evt     date,
  personnes    integer check (personnes is null or personnes > 0),
  lieu         text,
  message      text,
  statut       text not null default 'nouveau'
               check (statut in ('nouveau','contacte','qualifie','reserve','perdu')),
  cree_le      timestamptz not null default now()
);
create index lead_business_cree_idx on lead (business_id, cree_le desc);

-- ── QR ─────────────────────────────────────────────────────────────────────
create table qr_code (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business(id) on delete cascade,
  type         text not null
               check (type in ('page','menu','booking','avis','whatsapp')),
  libelle      text,
  cree_le      timestamptz not null default now(),
  unique (business_id, type)
);
create index qr_code_business_idx on qr_code (business_id);

-- ── Analytics ──────────────────────────────────────────────────────────────
-- Volontairement une seule table d'événements : les sept métriques de la V1
-- sont des agrégats de celle-ci. Aucune donnée personnelle n'y entre.
create table analytics_event (
  id           bigserial primary key,
  business_id  uuid not null references business(id) on delete cascade,
  type         text not null
               check (type in ('page_vue','qr_scan','menu_ouvert','whatsapp_clic',
                               'lead_cree','avis_clic')),
  qr_type      text,
  cree_le      timestamptz not null default now()
);
create index analytics_business_cree_idx on analytics_event (business_id, cree_le desc);

-- ── Abonnement ─────────────────────────────────────────────────────────────
create table subscription (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null unique references business(id) on delete cascade,
  plan                   text not null default 'free',
  statut                 text not null default 'actif'
                         check (statut in ('actif','en_retard','annule','essai')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  periode_fin            timestamptz,
  maj_le                 timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SÉCURITÉ AU NIVEAU DES LIGNES
--
-- Tout est refusé par défaut. Chaque autorisation est écrite explicitement.
-- Le frontend ne protège rien : il est en face de l'utilisateur.
-- ═══════════════════════════════════════════════════════════════════════════

alter table business          enable row level security;
alter table business_member   enable row level security;
alter table business_profile  enable row level security;
alter table menu_category     enable row level security;
alter table menu_item         enable row level security;
alter table lead              enable row level security;
alter table qr_code           enable row level security;
alter table analytics_event   enable row level security;
alter table subscription      enable row level security;

-- Appartenance. `security definer` pour que la fonction puisse lire
-- business_member sans être elle-même soumise aux politiques — sinon la
-- politique s'appelle elle-même et ne renvoie jamais vrai.
create or replace function est_membre(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from business_member m
    where m.business_id = cible and m.user_id = auth.uid()
  );
$$;

create or replace function est_publie(cible uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from business b where b.id = cible and b.statut = 'publie'
  );
$$;

-- ── business ───────────────────────────────────────────────────────────────
-- Lecture publique uniquement si publié : c'est la page vitrine du commerce.
create policy business_lecture_publique on business
  for select using (statut = 'publie');
create policy business_lecture_membre on business
  for select using (est_membre(id));
create policy business_ecriture_membre on business
  for update using (est_membre(id)) with check (est_membre(id));
-- La création passe par une fonction dédiée (voir 0002) : un utilisateur ne
-- peut pas s'insérer un commerce sans devenir simultanément son membre.

-- ── business_member ────────────────────────────────────────────────────────
-- On ne voit que ses propres appartenances. Voir celles des autres
-- révélerait qui travaille où.
create policy member_lecture_soi on business_member
  for select using (user_id = auth.uid());

-- ── profil, menu : lecture publique si le commerce est publié ──────────────
create policy profil_lecture on business_profile
  for select using (est_publie(business_id) or est_membre(business_id));
create policy profil_ecriture on business_profile
  for all using (est_membre(business_id)) with check (est_membre(business_id));

create policy categorie_lecture on menu_category
  for select using (est_publie(business_id) or est_membre(business_id));
create policy categorie_ecriture on menu_category
  for all using (est_membre(business_id)) with check (est_membre(business_id));

create policy item_lecture on menu_item
  for select using (est_publie(business_id) or est_membre(business_id));
create policy item_ecriture on menu_item
  for all using (est_membre(business_id)) with check (est_membre(business_id));

-- ── lead ───────────────────────────────────────────────────────────────────
-- Le point le plus sensible du schéma. N'importe qui doit pouvoir DÉPOSER une
-- demande depuis la page publique ; personne d'autre que le commerce ne doit
-- pouvoir les LIRE. Insertion ouverte, lecture fermée.
create policy lead_depot_public on lead
  for insert with check (est_publie(business_id));
create policy lead_lecture_membre on lead
  for select using (est_membre(business_id));
create policy lead_maj_membre on lead
  for update using (est_membre(business_id)) with check (est_membre(business_id));

-- ── qr_code ────────────────────────────────────────────────────────────────
create policy qr_lecture on qr_code
  for select using (est_publie(business_id) or est_membre(business_id));
create policy qr_ecriture on qr_code
  for all using (est_membre(business_id)) with check (est_membre(business_id));

-- ── analytics ──────────────────────────────────────────────────────────────
-- Même logique que les leads : le visiteur déclenche, le commerce consulte.
create policy analytics_depot_public on analytics_event
  for insert with check (est_publie(business_id));
create policy analytics_lecture_membre on analytics_event
  for select using (est_membre(business_id));

-- ── subscription ───────────────────────────────────────────────────────────
-- Aucune écriture par l'utilisateur : seul le webhook Stripe, qui passe par la
-- clé de service et contourne RLS, fait foi. Un client qui pourrait écrire son
-- propre plan se donnerait le plan Business gratuitement.
create policy abonnement_lecture_membre on subscription
  for select using (est_membre(business_id));
