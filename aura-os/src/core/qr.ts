/* ═══════════════════════════════════════════════════════════════════════════
   QR et messages préremplis

   Un QR ne pointe jamais directement sur sa destination finale : il passe par
   /s/<id>, qui enregistre le scan puis redirige. Sans ce détour, un QR imprimé
   sur un véhicule ne se compte pas — et le mandat demande justement que chaque
   scan produise un événement.

   Corollaire à ne pas oublier : le QR est imprimé, donc figé pour toujours. Le
   lien doit rester valable même si le commerce change de nom ou de numéro.
   C'est pourquoi il porte l'identifiant du QR, jamais la destination.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { TypeQR } from '../verticals/types';

export const LIBELLES: Record<TypeQR, string> = {
  page:     'Page du commerce',
  menu:     'La carte',
  booking:  'Demande de réservation',
  avis:     'Laisser un avis',
  whatsapp: 'Écrire sur WhatsApp'
};

export interface ContexteQR {
  slug: string;
  base: string;             /* ex. https://app.aura-business.com */
  whatsapp?: string | null;
  avisUrl?: string | null;
  nomCommerce?: string;
}

/* Destination finale d'un scan. Renvoie null quand le commerce n'a pas fourni
   l'information : mieux vaut ne pas proposer un QR que d'en imprimer un qui
   mène à une page vide. */
export function destination(type: TypeQR, ctx: ContexteQR): string | null {
  const page = `${ctx.base.replace(/\/+$/, '')}/${ctx.slug}`;
  switch (type) {
    case 'page':    return page;
    case 'menu':    return `${page}#carte`;
    case 'booking': return `${page}#demande`;
    case 'avis':    return ctx.avisUrl || null;
    case 'whatsapp':
      return ctx.whatsapp ? lienWhatsApp(ctx.whatsapp, messageParDefaut(ctx.nomCommerce)) : null;
    default:        return null;
  }
}

export function urlScan(base: string, qrId: string): string {
  return `${base.replace(/\/+$/, '')}/s/${qrId}`;
}

/* Un numéro WhatsApp se transmet en chiffres uniquement, sans « + », sans
   espace, sans point. Les commerçants les saisissent de toutes les façons
   imaginables, et wa.me n'en accepte qu'une.

   « 00 » en tête est l'indicatif international, strictement équivalent à
   « + » : on le retire. Sans cette règle, « +32470… » et « 0032470… » — le
   même numéro, écrit par deux personnes — donnaient deux liens différents,
   dont un invalide.

   Ce qu'on ne devine PAS : un « 0 » national isolé (« 0470… »). Il faudrait
   connaître le pays, et se tromper produirait un lien qui appelle quelqu'un
   d'autre. Le numéro est renvoyé tel quel, et `estInternational()` permet à
   l'interface de demander l'indicatif. */
export function normaliserNumero(brut: string): string | null {
  let chiffres = String(brut).replace(/[^\d+]/g, '');
  if (chiffres.startsWith('+')) chiffres = chiffres.slice(1);
  chiffres = chiffres.replace(/[^\d]/g, '');
  if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);
  if (chiffres.length < 8 || chiffres.length > 15) return null;
  return chiffres;
}

/* Un numéro utilisable par wa.me porte son indicatif pays. Un numéro qui
   commence par 0 est en format national : l'interface doit demander mieux. */
export function estInternational(brut: string): boolean {
  const s = String(brut).trim();
  if (s.startsWith('+') || s.replace(/[^\d]/g, '').startsWith('00')) return true;
  return !s.replace(/[^\d]/g, '').startsWith('0');
}

export function lienWhatsApp(numero: string, message?: string): string | null {
  const n = normaliserNumero(numero);
  if (!n) return null;
  const base = `https://wa.me/${n}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function messageParDefaut(nomCommerce?: string): string {
  return nomCommerce
    ? `Bonjour ${nomCommerce}, j'aimerais avoir des informations.`
    : `Bonjour, j'aimerais avoir des informations.`;
}

/* Message prérempli d'une demande d'événement. Il est construit à partir de ce
   que le visiteur a saisi : il n'a plus qu'à envoyer. */
export function messageEvenement(o: {
  nomCommerce?: string; type?: string; date?: string | null;
  personnes?: number | null; lieu?: string | null;
}): string {
  const bouts: string[] = [];
  bouts.push(o.nomCommerce ? `Bonjour ${o.nomCommerce},` : 'Bonjour,');
  let phrase = `je souhaiterais vous réserver`;
  if (o.type) phrase += ` pour ${o.type.toLowerCase()}`;
  if (o.date) {
    const d = new Date(o.date + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) {
      phrase += ` le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
  }
  if (o.lieu) phrase += ` à ${o.lieu}`;
  if (o.personnes) phrase += ` pour environ ${o.personnes} personnes`;
  bouts.push(phrase + '.');
  return bouts.join(' ');
}
