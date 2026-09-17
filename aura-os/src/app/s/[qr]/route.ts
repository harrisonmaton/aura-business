import { NextResponse } from 'next/server';
import { resoudreQR, noterEvenement } from '@/data/depot';
import { destination } from '@/core/qr';
import type { TypeQR } from '@/verticals/types';

export const dynamic = 'force-dynamic';

/* Redirection d'un QR scanné.

   Le QR imprimé porte l'identifiant du QR, jamais sa destination : il est
   collé sur un véhicule pour des mois, et le commerce peut changer de numéro
   WhatsApp ou de lien d'avis entre-temps. Cette route résout la destination au
   moment du scan.

   Elle compte le scan AVANT de rediriger, mais n'attend jamais l'écriture :
   un client devant un camion ne doit pas patienter parce qu'on mesure. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ qr: string }> }
) {
  const { qr } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(qr)) {
    return NextResponse.json({ erreur: 'QR inconnu' }, { status: 404 });
  }

  const r = await resoudreQR(qr).catch(() => null);
  if (!r) return NextResponse.json({ erreur: 'QR inconnu' }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const cible = destination(r.type as TypeQR, {
    slug: r.slug, base, whatsapp: r.whatsapp,
    avisUrl: r.avis_url, nomCommerce: r.nom
  });

  noterEvenement(r.business_id, 'qr_scan', r.type).catch(() => {});

  /* Sans destination — numéro WhatsApp retiré depuis l'impression, par
     exemple — on renvoie vers la page du commerce plutôt que vers une erreur.
     Le QR est physique : il doit toujours mener quelque part d'utile. */
  return NextResponse.redirect(cible ?? `${base}/b/${r.slug}`, 302);
}
