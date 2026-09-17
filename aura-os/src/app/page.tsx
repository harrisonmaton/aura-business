import Link from 'next/link';
import { supabaseConfigure } from '@/data/supabase';

/* Page d'entrée d'Aura OS. Elle n'est PAS la vitrine commerciale : celle-ci
   reste le site existant. Ici on connecte ou on inscrit, rien d'autre. */
export default function Accueil() {
  const relie = supabaseConfigure();
  return (
    <main className="enveloppe" style={{ paddingBlock: '4rem' }}>
      <p style={{ color: 'var(--estompe)', letterSpacing: '.18em',
                  textTransform: 'uppercase', fontSize: '.74rem' }}>Aura OS</p>
      <h1 style={{ fontSize: 'clamp(2rem,6vw,3.2rem)', marginBlock: '1rem' }}>
        Le système commercial<br />de votre commerce.
      </h1>
      <p style={{ color: 'var(--estompe)', maxWidth: '44ch' }}>
        Votre page, votre carte, vos QR codes et vos demandes clients.
        Créé en quelques minutes, géré depuis votre téléphone.
      </p>

      <div style={{ display: 'flex', gap: '.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <Link className="bouton" href="/inscription">Créer mon commerce</Link>
        <Link className="bouton bouton--fantome" href="/connexion">J’ai déjà un compte</Link>
      </div>

      {!relie && (
        /* Dire ce qui manque plutôt que de faire semblant : sans Supabase,
           l'inscription ne peut pas fonctionner, et le cacher ferait perdre
           du temps à celui qui essaie. */
        <p className="carte" style={{ marginTop: '2.5rem', fontSize: '.85rem' }}>
          <strong>Environnement non relié.</strong><br />
          Supabase n’est pas configuré : l’inscription et la connexion ne
          fonctionneront pas encore. Voir <code>aura-os/LISEZ-MOI.md</code>.
        </p>
      )}
    </main>
  );
}
