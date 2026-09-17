/* ═══════════════════════════════════════════════════════════════════════════
   « Generate my business » — déterministe

   Aucune IA. Le mandat le dit et c'est le bon choix : ce qu'on produit ici est
   une structure — des QR, une page, des sections — pas de la prose. Une
   génération déterministe est instantanée, gratuite, reproductible et
   explicable. Un faux effet d'IA sur une opération de gabarit ajouterait de
   l'attente, du coût et de l'aléa pour rien.

   Cette fonction DÉCIDE, elle n'écrit pas. Elle est pure, donc testable sans
   base : on peut vérifier le raisonnement sans monter un serveur.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Vertical, TypeQR } from '../verticals/types';
import { destination, type ContexteQR } from './qr.js';

export interface EtatCommerce {
  slug: string;
  nom: string;
  whatsapp?: string | null;
  avisUrl?: string | null;
  nombreArticles: number;
}

export interface Manquant { quoi: string; pourquoi: string; ou: string; }

export interface PlanGeneration {
  /* Les QR qu'on peut réellement produire. */
  qr: TypeQR[];
  /* Ceux qu'on ne produit PAS, et la raison — affichée au commerçant. */
  qrEcartes: Array<{ type: TypeQR; raison: string }>;
  /* Ce qui empêche la publication. Vide = publiable. */
  bloquants: Manquant[];
  /* Ce qui manque sans empêcher de publier. */
  ameliorations: Manquant[];
  publiable: boolean;
}

export function planifier(v: Vertical, etat: EtatCommerce, base: string): PlanGeneration {
  const ctx: ContexteQR = {
    slug: etat.slug, base, whatsapp: etat.whatsapp,
    avisUrl: etat.avisUrl, nomCommerce: etat.nom
  };

  const qr: TypeQR[] = [];
  const qrEcartes: PlanGeneration['qrEcartes'] = [];
  for (const type of v.qr) {
    if (destination(type, ctx)) { qr.push(type); continue; }
    /* Un QR sans destination serait imprimé sur un véhicule et ne mènerait
       nulle part pendant des mois. On préfère ne pas le proposer et dire
       pourquoi. */
    qrEcartes.push({
      type,
      raison: type === 'whatsapp'
        ? 'Ajoutez votre numéro WhatsApp pour activer ce QR.'
        : type === 'avis'
        ? 'Ajoutez le lien de votre fiche Google pour activer ce QR.'
        : 'Information manquante.'
    });
  }

  const bloquants: Manquant[] = [];
  if (!etat.nom?.trim()) {
    bloquants.push({ quoi: 'Nom du commerce', ou: 'business',
      pourquoi: 'Sans nom, la page n’a pas de titre.' });
  }
  if (!etat.slug?.trim()) {
    bloquants.push({ quoi: 'Adresse de la page', ou: 'business',
      pourquoi: 'C’est l’adresse que portera votre QR code.' });
  }

  /* Volontairement NON bloquants. Un commerçant doit pouvoir publier le jour
     même et compléter ensuite : une page en ligne incomplète vaut mieux
     qu'une page parfaite jamais publiée. */
  const ameliorations: Manquant[] = [];
  if (etat.nombreArticles === 0) {
    ameliorations.push({ quoi: 'Votre carte', ou: 'products',
      pourquoi: 'Le QR « carte » sera vide tant qu’aucun produit n’est saisi.' });
  }
  if (!etat.whatsapp) {
    ameliorations.push({ quoi: 'WhatsApp', ou: 'customers',
      pourquoi: 'C’est le moyen le plus direct d’être contacté.' });
  }
  if (!etat.avisUrl) {
    ameliorations.push({ quoi: 'Lien avis Google', ou: 'customers',
      pourquoi: 'Sans lui, impossible de collecter des avis par QR.' });
  }

  return { qr, qrEcartes, bloquants, ameliorations, publiable: bloquants.length === 0 };
}

/* Adresse publique. Elle est stable et ne doit JAMAIS changer après
   publication : elle est imprimée sur les QR collés sur le véhicule. */
export function urlPublique(base: string, slug: string): string {
  return `${base.replace(/\/+$/, '')}/b/${slug}`;
}
