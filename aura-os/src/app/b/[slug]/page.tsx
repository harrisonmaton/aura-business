import { notFound } from 'next/navigation';
import { pagePublique, noterEvenement } from '@/data/depot';
import { lienWhatsApp, messageParDefaut } from '@/core/qr';

export const dynamic = 'force-dynamic';

/* Page publique d'un commerce — celle que scanne le client devant le camion.
   Rendue côté serveur : elle s'affiche avant que le moindre JavaScript ne
   soit exécuté, ce qui compte quand on la lit debout, en 4G, sur un trottoir.

   Aucune donnée fictive : tout vient de la base. Si le commerce n'existe pas
   ou n'est pas publié, RLS renvoie zéro ligne et on affiche 404 — on ne
   fabrique pas une page d'exemple. */

function prix(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default async function PagePublique({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,64}$/.test(slug)) notFound();

  const page = await pagePublique(slug).catch(() => null);
  if (!page) notFound();

  const { commerce, profil, articles } = page;
  /* La visite est comptée sans bloquer l'affichage ni identifier personne. */
  noterEvenement(commerce.id, 'page_vue').catch(() => {});

  const wa = profil?.whatsapp ? lienWhatsApp(profil.whatsapp, messageParDefaut(commerce.nom)) : null;
  const accent = profil?.couleur || 'var(--rose)';

  return (
    <main className="enveloppe" style={{ paddingBlock: '2rem' }}>
      <header>
        <h1 style={{ fontSize: 'clamp(1.8rem,7vw,2.6rem)' }}>{commerce.nom}</h1>
        {profil?.description && (
          <p style={{ color: 'var(--estompe)', marginTop: '.5rem' }}>{profil.description}</p>
        )}
        {profil?.ville && (
          <p style={{ color: 'var(--estompe)', fontSize: '.88rem' }}>{profil.ville}</p>
        )}
      </header>

      {/* Les actions d'abord : quelqu'un debout devant un camion veut agir,
          pas lire. */}
      <nav aria-label="Actions" style={{ display: 'grid', gap: '.6rem', marginBlock: '1.6rem' }}>
        <a className="bouton" href="#demande" style={{ background: accent }}>
          Réserver le camion
        </a>
        {articles.length > 0 && (
          <a className="bouton bouton--fantome" href="#carte">Voir la carte</a>
        )}
        {wa && <a className="bouton bouton--fantome" href={wa}>Écrire sur WhatsApp</a>}
        {profil?.avis_url && (
          <a className="bouton bouton--fantome" href={profil.avis_url}>Laisser un avis</a>
        )}
      </nav>

      {articles.length > 0 && (
        <section id="carte" style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '.8rem' }}>La carte</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.5rem' }}>
            {articles.map(a => (
              <li key={a.id} className="carte"
                  style={{ display: 'flex', justifyContent: 'space-between',
                           gap: '1rem', padding: '.85rem 1rem' }}>
                <span>
                  <strong>{a.nom}</strong>
                  {a.description && (
                    <span style={{ display: 'block', color: 'var(--estompe)', fontSize: '.84rem' }}>
                      {a.description}
                    </span>
                  )}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{prix(a.prix_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="demande" style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '.8rem' }}>Réserver pour un événement</h2>
        <form method="post" action={`/b/${slug}/demande`} className="carte">
          <div className="champ">
            <label htmlFor="nom">Votre nom</label>
            <input id="nom" name="nom" required maxLength={120} autoComplete="name" />
          </div>
          <div className="champ">
            <label htmlFor="telephone">Téléphone</label>
            <input id="telephone" name="telephone" type="tel" autoComplete="tel" />
          </div>
          <div className="champ">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="champ">
            <label htmlFor="date_evt">Date de l’événement</label>
            <input id="date_evt" name="date_evt" type="date" required />
          </div>
          <div className="champ">
            <label htmlFor="personnes">Nombre de personnes</label>
            <input id="personnes" name="personnes" type="number" min={1} inputMode="numeric" />
          </div>
          <div className="champ">
            <label htmlFor="lieu">Lieu</label>
            <input id="lieu" name="lieu" maxLength={160} />
          </div>
          <div className="champ">
            <label htmlFor="message">Votre message</label>
            <textarea id="message" name="message" maxLength={2000} />
          </div>
          <input type="hidden" name="type" value="event" />
          <button className="bouton" type="submit" style={{ width: '100%', background: accent }}>
            Envoyer ma demande
          </button>
        </form>
        <p style={{ fontSize: '.78rem', color: 'var(--estompe)', marginTop: '.8rem' }}>
          Vos coordonnées ne servent qu’à vous répondre. Elles ne sont ni
          revendues ni utilisées à d’autres fins.
        </p>
      </section>
    </main>
  );
}
