/* ═══════════════════════════════════════════════════════════════════════════
   Dépôt — tout l'accès aux données, en SQL

   DÉCISION D'ARCHITECTURE, prise au lot 2 et à consigner.

   L'accès aux données passe par SQL sur la connexion PostgreSQL, et non par le
   client REST de Supabase. Trois raisons :

   1. Supabase EST PostgreSQL. La même requête, les mêmes politiques RLS
      s'exécutent chez eux et sur la base locale de test. Le chemin de code
      testé est donc le chemin de production, pas une imitation.
   2. Aucun démon Docker n'est disponible ici, donc pas de pile Supabase
      locale. Sans ce choix, rien de ce lot ne pourrait être prouvé.
   3. On peut changer d'hébergeur PostgreSQL sans réécrire l'application.

   Ce qui reste à Supabase : l'AUTHENTIFICATION. Les comptes, les sessions et
   les jetons sont son métier, et ce n'est pas le genre de chose qu'on
   réimplémente.

   Règle absolue : chaque requête d'un utilisateur s'exécute sous le rôle
   `authenticated` avec sa revendication d'identité. RLS filtre. Le code
   n'ajoute jamais « and business_id = ... » en espérant que ça suffise — si
   la politique est bonne, la base refuse d'elle-même.
   ═══════════════════════════════════════════════════════════════════════════ */

import pg from 'pg';

let piscine: pg.Pool | null = null;

export function piscinePg(): pg.Pool {
  if (!piscine) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL manquante — voir aura-os/LISEZ-MOI.md');
    piscine = new pg.Pool({ connectionString: url, max: 8 });
  }
  return piscine;
}

export function utiliserPiscine(p: pg.Pool) { piscine = p; }

export type Identite = { userId: string } | { anonyme: true };

/* Ouvre une transaction dans la peau de l'appelant.

   `set local` et `set_config(..., true)` : les deux sont locaux à la
   transaction. Ce n'est pas un détail de style — la première version du banc
   d'essai du lot 1 posait la revendication pour toute la SESSION, et le pool
   la recyclait : un visiteur anonyme héritait de l'identité du dernier
   utilisateur connecté. Tout ce fichier dépend de cette rigueur. */
export async function dans<T>(qui: Identite, travail: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await piscinePg().connect();
  try {
    await c.query('begin');
    if ('userId' in qui) {
      await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [qui.userId]);
      await c.query('set local role authenticated');
    } else {
      await c.query(`select set_config('request.jwt.claim.sub', '', true)`);
      await c.query('set local role anon');
    }
    const r = await travail(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface Commerce {
  id: string; slug: string; nom: string; vertical: string; statut: string;
}
export interface Profil {
  description: string | null; logo_url: string | null; couleur: string | null;
  style: string | null; telephone: string | null; whatsapp: string | null;
  instagram: string | null; adresse: string | null; ville: string | null;
  horaires: unknown; zone_km: number | null; avis_url: string | null;
}
export interface Article {
  id: string; nom: string; description: string | null;
  prix_cents: number | null; disponible: boolean; ordre: number;
  category_id: string | null;
}
export interface Demande {
  id: string; type: string; nom: string; telephone: string | null;
  email: string | null; date_evt: string | null; personnes: number | null;
  lieu: string | null; message: string | null; statut: string; cree_le: string;
}

/* ── Lectures du propriétaire ──────────────────────────────────────────── */

export async function mesCommerces(userId: string): Promise<Commerce[]> {
  return dans({ userId }, async c => {
    /* La jointure sur l'appartenance est INDISPENSABLE, et sa première version
       ne l'avait pas — elle se reposait sur RLS. Or `business` porte deux
       politiques de lecture qui s'additionnent : « je suis membre » OU « le
       commerce est publié ». Sans jointure, cette fonction renvoyait donc tous
       les commerces publiés de la plateforme à n'importe quel utilisateur.

       La leçon vaut d'être écrite : RLS est un PLANCHER, pas un substitut à la
       requête qu'on voulait écrire. Il empêche de lire ce à quoi on n'a pas
       droit ; il ne devine pas ce qu'on cherchait. */
    const r = await c.query<Commerce>(
      `select b.id, b.slug, b.nom, b.vertical, b.statut
         from business b
         join business_member m on m.business_id = b.id
        where m.user_id = auth.uid()
        order by b.cree_le`);
    return r.rows;
  });
}

export async function creerCommerce(userId: string, nom: string, slug: string, vertical = 'food') {
  return dans({ userId }, async c => {
    const r = await c.query<{ id: string }>(
      `select creer_commerce($1, $2, $3) as id`, [nom, slug, vertical]);
    return r.rows[0].id;
  });
}

export async function majProfil(userId: string, businessId: string, champs: Partial<Profil>) {
  const cles = Object.keys(champs).filter(k => AUTORISES.has(k));
  if (!cles.length) return 0;
  /* Liste blanche de colonnes. Les clés viennent d'un formulaire : les
     interpoler sans filtrer serait une injection par nom de colonne. Les
     VALEURS restent paramétrées. */
  const set = cles.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = cles.map(k => (champs as Record<string, unknown>)[k]);
  return dans({ userId }, async c => {
    const r = await c.query(
      `update business_profile set ${set}, maj_le = now() where business_id = $1`,
      [businessId, ...vals]);
    return r.rowCount ?? 0;
  });
}

const AUTORISES = new Set([
  'description', 'logo_url', 'couleur', 'style', 'telephone', 'whatsapp',
  'instagram', 'adresse', 'ville', 'horaires', 'zone_km', 'avis_url'
]);

export async function mesDemandes(userId: string, businessId: string): Promise<Demande[]> {
  return dans({ userId }, async c => {
    const r = await c.query<Demande>(
      `select id, type, nom, telephone, email, date_evt, personnes, lieu,
              message, statut, cree_le
         from lead where business_id = $1 order by cree_le desc limit 100`,
      [businessId]);
    return r.rows;
  });
}

export async function changerStatutDemande(userId: string, demandeId: string, statut: string) {
  return dans({ userId }, async c => {
    const r = await c.query(
      `update lead set statut = $2 where id = $1`, [demandeId, statut]);
    return r.rowCount ?? 0;
  });
}

export async function chiffres(userId: string, businessId: string, depuis: Date) {
  return dans({ userId }, async c => {
    const r = await c.query<{ type: string; n: string }>(
      `select type, count(*)::text as n from analytics_event
        where business_id = $1 and cree_le >= $2 group by type`,
      [businessId, depuis]);
    const out: Record<string, number> = {};
    for (const l of r.rows) out[l.type] = Number(l.n);
    return out;
  });
}

/* ── Lectures publiques ────────────────────────────────────────────────── */

export async function pagePublique(slug: string) {
  return dans({ anonyme: true }, async c => {
    const b = await c.query<Commerce>(
      `select id, slug, nom, vertical, statut from business where slug = $1`, [slug]);
    if (!b.rowCount) return null;           /* brouillon ou inexistant : RLS a filtré */
    const id = b.rows[0].id;
    const [p, items, qr] = await Promise.all([
      c.query<Profil>(`select description, logo_url, couleur, style, telephone,
                              whatsapp, instagram, adresse, ville, horaires,
                              zone_km, avis_url
                         from business_profile where business_id = $1`, [id]),
      c.query<Article>(`select id, nom, description, prix_cents, disponible,
                               ordre, category_id
                          from menu_item where business_id = $1 and disponible
                         order by ordre, nom`, [id]),
      c.query<{ id: string; type: string }>(
        `select id, type from qr_code where business_id = $1`, [id])
    ]);
    return { commerce: b.rows[0], profil: p.rows[0] ?? null,
             articles: items.rows, qr: qr.rows };
  });
}

/* Dépôt d'une demande par un visiteur. Aucun `returning` : `anon` n'a pas le
   droit de lire la table, et n'a aucune raison de relire ce qu'il dépose. */
export async function deposerDemande(businessId: string, d: {
  type: string; nom: string; telephone: string | null; email: string | null;
  date_evt: string | null; personnes: number | null; lieu: string | null;
  message: string | null; source: string | null;
}) {
  return dans({ anonyme: true }, async c => {
    const r = await c.query(
      `insert into lead (business_id, type, nom, telephone, email, date_evt,
                         personnes, lieu, message, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [businessId, d.type, d.nom, d.telephone, d.email, d.date_evt,
       d.personnes, d.lieu, d.message, d.source]);
    return r.rowCount ?? 0;
  });
}

export async function noterEvenement(businessId: string, type: string, qrType?: string) {
  return dans({ anonyme: true }, async c => {
    const r = await c.query(
      `insert into analytics_event (business_id, type, qr_type) values ($1,$2,$3)`,
      [businessId, type, qrType ?? null]);
    return r.rowCount ?? 0;
  });
}

/* Résolution d'un QR scanné : on a besoin du commerce ET du type. */
export async function resoudreQR(qrId: string) {
  return dans({ anonyme: true }, async c => {
    const r = await c.query<{ business_id: string; type: string; slug: string;
                              whatsapp: string | null; avis_url: string | null; nom: string }>(
      `select q.business_id, q.type, b.slug, b.nom, p.whatsapp, p.avis_url
         from qr_code q
         join business b on b.id = q.business_id
         left join business_profile p on p.business_id = q.business_id
        where q.id = $1`, [qrId]);
    return r.rows[0] ?? null;
  });
}

/* ── Génération ────────────────────────────────────────────────────────────
   Exécute le plan décidé par core/generation.ts. Tout se fait dans UNE
   transaction : si la création des QR échoue, le commerce ne doit pas se
   retrouver publié sans eux. */
export async function genererCommerce(userId: string, businessId: string, qr: string[]) {
  return dans({ userId }, async c => {
    for (const type of qr) {
      /* `on conflict` : régénérer ne doit jamais casser les QR DÉJÀ IMPRIMÉS.
         Leur identifiant est collé sur un véhicule — il est définitif. */
      await c.query(
        `insert into qr_code (business_id, type, libelle) values ($1, $2, $3)
         on conflict (business_id, type) do nothing`,
        [businessId, type, type]);
    }
    await c.query(`update business set statut = 'publie' where id = $1`, [businessId]);
    const r = await c.query<{ id: string; type: string }>(
      `select id, type from qr_code where business_id = $1 order by type`, [businessId]);
    return r.rows;
  });
}

export async function etatPourGeneration(userId: string, businessId: string) {
  return dans({ userId }, async c => {
    const r = await c.query<{ slug: string; nom: string; whatsapp: string | null;
                              avis_url: string | null; n: string }>(
      `select b.slug, b.nom, p.whatsapp, p.avis_url,
              (select count(*) from menu_item m where m.business_id = b.id)::text as n
         from business b
         left join business_profile p on p.business_id = b.id
        where b.id = $1`, [businessId]);
    if (!r.rowCount) return null;
    const l = r.rows[0];
    return { slug: l.slug, nom: l.nom, whatsapp: l.whatsapp,
             avisUrl: l.avis_url, nombreArticles: Number(l.n) };
  });
}

export async function ajouterArticle(userId: string, businessId: string,
    a: { nom: string; description?: string | null; prix_cents?: number | null; ordre?: number }) {
  return dans({ userId }, async c => {
    const r = await c.query<{ id: string }>(
      `insert into menu_item (business_id, nom, description, prix_cents, ordre)
       values ($1,$2,$3,$4,$5) returning id`,
      [businessId, a.nom, a.description ?? null, a.prix_cents ?? null, a.ordre ?? 0]);
    return r.rows[0].id;
  });
}

export async function commerceParId(userId: string, businessId: string) {
  return dans({ userId }, async c => {
    const r = await c.query<Commerce>(
      `select id, slug, nom, vertical, statut from business where id = $1`, [businessId]);
    return r.rows[0] ?? null;
  });
}
