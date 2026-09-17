/* ═══════════════════════════════════════════════════════════════════════════
   Facturation — contrat, et rien d'autre

   Le reste de l'application ne connaît que cette interface. Elle existe pour
   deux raisons concrètes :

   1. Aucun sandbox Stripe n'est disponible aujourd'hui, et le compte connecté
      est en MODE RÉEL — donc hors limites. On construit donc contre un
      contrat, avec une implémentation factice testable, et on branche le SDK
      officiel le jour où un sandbox existe.

   2. Un test de parcours d'abonnement ne doit jamais appeler Stripe. Sans
      cette couche, la recette dépendrait du réseau et d'un tiers.

   Ce que cette couche ne fait PAS : réimplémenter Stripe. La vérification de
   signature, l'idempotence et les relances restent au SDK officiel — c'est la
   décision validée, et c'est la bonne : une vérification maison est un endroit
   de plus où se tromper sur quelque chose qui touche à l'argent.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Plan = 'free' | 'starter' | 'pro' | 'business';
export type StatutAbonnement = 'actif' | 'en_retard' | 'annule' | 'essai';

export interface SessionCheckout {
  url: string;
  id: string;
}

export interface EvenementAbonnement {
  /* Identifiant de l'événement chez le fournisseur. Il sert de clé
     d'idempotence : le même événement relivré ne doit pas compter deux fois. */
  id: string;
  type: 'abonnement.actif' | 'abonnement.annule' | 'paiement.echoue' | 'ignore';
  businessId: string | null;
  plan: Plan | null;
  statut: StatutAbonnement | null;
  clientId: string | null;
  abonnementId: string | null;
  periodeFin: Date | null;
}

export interface FournisseurFacturation {
  /* Ouvre un paiement. `businessId` voyage en métadonnée : c'est lui qu'on
     relira dans le webhook pour savoir QUI vient de payer. Se fier à autre
     chose — une session en cours, un cookie — casse dès que le client paie
     depuis un autre appareil. */
  creerCheckout(o: {
    businessId: string; plan: Plan; email: string;
    retourSucces: string; retourAnnule: string;
  }): Promise<SessionCheckout>;

  /* Portail client : changement de plan, moyen de paiement, annulation,
     factures. Tout cela est fourni par Stripe et ne sera pas réécrit. */
  creerPortail(o: { clientId: string; retour: string }): Promise<{ url: string }>;

  /* Vérifie la signature ET traduit l'événement du fournisseur en événement du
     domaine. Le reste de l'application ne voit jamais un objet Stripe. */
  lireEvenement(corpsBrut: string, signature: string): Promise<EvenementAbonnement>;
}

/* ── Implémentation factice, pour les tests et le développement ─────────────
   Elle ne prétend pas être Stripe : elle refuse une signature invalide, elle
   produit des événements du domaine, et c'est tout. Aucun test ne doit
   dépendre d'elle pour affirmer que « le paiement fonctionne ». */
export class FacturationFactice implements FournisseurFacturation {
  public sessions: Array<{ id: string; businessId: string; plan: Plan }> = [];
  constructor(private secret = 'secret-de-test') {}

  async creerCheckout(o: { businessId: string; plan: Plan; email: string;
                           retourSucces: string; retourAnnule: string }) {
    const id = 'cs_test_' + Math.random().toString(36).slice(2, 12);
    this.sessions.push({ id, businessId: o.businessId, plan: o.plan });
    return { id, url: `${o.retourSucces}?session=${id}` };
  }

  async creerPortail(o: { clientId: string; retour: string }) {
    return { url: `${o.retour}?portail=${o.clientId}` };
  }

  async lireEvenement(corpsBrut: string, signature: string): Promise<EvenementAbonnement> {
    if (signature !== this.signer(corpsBrut)) {
      throw new Error('signature invalide');
    }
    const e = JSON.parse(corpsBrut);
    return {
      id: e.id, type: e.type, businessId: e.businessId ?? null,
      plan: e.plan ?? null, statut: e.statut ?? null,
      clientId: e.clientId ?? null, abonnementId: e.abonnementId ?? null,
      periodeFin: e.periodeFin ? new Date(e.periodeFin) : null
    };
  }

  signer(corpsBrut: string): string {
    let h = 0;
    for (let i = 0; i < corpsBrut.length; i++) h = (h * 31 + corpsBrut.charCodeAt(i)) >>> 0;
    return 'factice_' + this.secret.length + '_' + h.toString(16);
  }
}

/* Plans. Les montants sont en centimes et restent des HYPOTHÈSES tant qu'ils
   ne sont pas validés : ils vivent ici, en un seul endroit, pour qu'en
   changer soit une ligne. Aucun prix n'est écrit en dur dans une page. */
export const PLANS: Record<Plan, { nom: string; cents: number }> = {
  free:     { nom: 'Découverte', cents: 0 },
  starter:  { nom: 'Starter',    cents: 1900 },
  pro:      { nom: 'Pro',        cents: 4900 },
  business: { nom: 'Business',   cents: 9900 }
};
