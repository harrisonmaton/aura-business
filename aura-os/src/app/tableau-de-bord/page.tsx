import Link from 'next/link';

/* Squelette du tableau de bord. Il montre la STRUCTURE validée — aujourd'hui,
   demain, demandes récentes — avec des états vides honnêtes.
   Aucune donnée n'est inventée : tant que la base n'est pas reliée, les
   compteurs affichent « — » et non un zéro qui ressemblerait à une mesure. */

const METRIQUES = [
  { cle: 'page_vue',      libelle: 'Visites' },
  { cle: 'qr_scan',       libelle: 'Scans QR' },
  { cle: 'menu_ouvert',   libelle: 'Carte ouverte' },
  { cle: 'whatsapp_clic', libelle: 'WhatsApp' },
  { cle: 'lead_cree',     libelle: 'Demandes' },
  { cle: 'avis_clic',     libelle: 'Avis' }
];

export default function TableauDeBord() {
  const relie = false; /* Lot 2 : lira la session et les agrégats réels. */

  return (
    <main className="enveloppe" style={{ paddingBlock: '2rem' }}>
      <p style={{ color: 'var(--estompe)', fontSize: '.8rem' }}>Aujourd’hui</p>
      <h1 style={{ fontSize: '1.7rem', marginBottom: '1.5rem' }}>Votre commerce</h1>

      <section aria-label="Chiffres du mois"
        style={{ display: 'grid', gap: '.75rem',
                 gridTemplateColumns: 'repeat(auto-fit,minmax(9rem,1fr))' }}>
        {METRIQUES.map(m => (
          <div key={m.cle} className="carte" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              {relie ? 0 : '—'}
            </div>
            <div style={{ color: 'var(--estompe)', fontSize: '.8rem' }}>{m.libelle}</div>
          </div>
        ))}
      </section>

      <section aria-label="Demandes récentes" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '.75rem' }}>Demandes récentes</h2>
        <div className="carte vide">
          <h3>Aucune demande pour l’instant</h3>
          <p>Imprimez votre QR de réservation et posez-le sur le véhicule :
             c’est par là qu’arrivera la première.</p>
          <Link className="bouton" href="/tableau-de-bord/qr"
                style={{ marginTop: '1rem' }}>Créer mes QR codes</Link>
        </div>
      </section>

      {!relie && (
        <p className="carte" style={{ marginTop: '2rem', fontSize: '.85rem' }}>
          <strong>Lot 1 — squelette.</strong><br />
          La structure et les états vides sont en place. Les chiffres affichent
          « — » et non 0 : tant que la base n’est pas reliée, un zéro serait
          une mesure inventée. Branchement au lot 2.
        </p>
      )}
    </main>
  );
}
