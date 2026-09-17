/* ═══════════════════════════════════════════════════════════════════════════
   Lectures publiques — par l'API Supabase, avec la clé publiable

   C'est le chemin NORMAL : aucune identité n'est affirmée, la clé publiable
   est conçue pour être exposée, et RLS décide seule de ce qui sort. Un
   commerce en brouillon renvoie zéro ligne sans qu'aucun code n'ait à y
   penser — c'est la politique qui filtre, pas une condition qu'on aurait pu
   oublier d'écrire.
   ═══════════════════════════════════════════════════════════════════════════ */
import { createClient } from '@supabase/supabase-js';

function clientPublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
           ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !cle) throw new Error('Supabase non configuré — voir aura-os/SECURITE.md');
  /* Pas de session à conserver : ces lectures sont anonymes par nature. */
  return createClient(url, cle, { auth: { persistSession: false } });
}

export async function pagePublique(slug: string) {
  const sb = clientPublic();
  const { data: commerce } = await sb
    .from('business').select('id, slug, nom, vertical, statut')
    .eq('slug', slug).maybeSingle();
  if (!commerce) return null;            /* brouillon ou inexistant : RLS a filtré */

  const [{ data: profil }, { data: articles }, { data: qr }] = await Promise.all([
    sb.from('business_profile').select('*').eq('business_id', commerce.id).maybeSingle(),
    sb.from('menu_item')
      .select('id, nom, description, prix_cents, disponible, ordre, category_id')
      .eq('business_id', commerce.id).eq('disponible', true).order('ordre'),
    sb.from('qr_code').select('id, type').eq('business_id', commerce.id)
  ]);
  return { commerce, profil: profil ?? null, articles: articles ?? [], qr: qr ?? [] };
}

export async function resoudreQR(qrId: string) {
  const sb = clientPublic();
  /* Deux requêtes plutôt qu'une jointure imbriquée : la forme jointe rend un
     type que TypeScript ne sait pas distinguer d'une erreur, et il faudrait
     la faire taire par une assertion. Deux lectures simples sur une clé
     primaire coûtent moins qu'un mensonge au compilateur. */
  const { data: qr } = await sb.from('qr_code')
    .select('business_id, type').eq('id', qrId).maybeSingle();
  if (!qr) return null;

  const [{ data: b }, { data: p }] = await Promise.all([
    sb.from('business').select('slug, nom').eq('id', qr.business_id).maybeSingle(),
    sb.from('business_profile').select('whatsapp, avis_url')
      .eq('business_id', qr.business_id).maybeSingle()
  ]);
  if (!b) return null;                   /* commerce dépublié : RLS a filtré */

  return { business_id: qr.business_id, type: qr.type,
           slug: b.slug, nom: b.nom,
           whatsapp: p?.whatsapp ?? null, avis_url: p?.avis_url ?? null };
}

/* Le visiteur déclenche, le commerce consulte. Aucune donnée personnelle. */
export async function noterEvenement(businessId: string, type: string, qrType?: string) {
  const sb = clientPublic();
  const { error } = await sb.from('analytics_event')
    .insert({ business_id: businessId, type, qr_type: qrType ?? null });
  return error ? 0 : 1;
}

export async function deposerDemande(businessId: string, d: Record<string, unknown>) {
  const sb = clientPublic();
  const { error } = await sb.from('lead').insert({ business_id: businessId, ...d });
  return error ? 0 : 1;
}
