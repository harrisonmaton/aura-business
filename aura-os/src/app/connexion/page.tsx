'use client';
import { useState } from 'react';
import { clientNavigateur, supabaseConfigure } from '@/data/supabase';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!supabaseConfigure()) {
      setErreur("Aura OS n'est pas encore relié à sa base. Voir LISEZ-MOI.md.");
      return;
    }
    setEnvoi(true);
    try {
      const { error } = await clientNavigateur().auth
        .signInWithPassword({ email, password: motDePasse });
      /* Message volontairement identique pour « e-mail inconnu » et « mot de
         passe faux » : distinguer les deux permet de savoir quelles adresses
         ont un compte chez nous. */
      if (error) { setErreur('E-mail ou mot de passe incorrect.'); return; }
      window.location.href = '/tableau-de-bord';
    } catch {
      setErreur('Connexion impossible pour le moment. Réessayez dans un instant.');
    } finally { setEnvoi(false); }
  }

  return (
    <main className="enveloppe" style={{ paddingBlock: '3rem', maxWidth: '26rem' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Connexion</h1>
      <form onSubmit={soumettre} noValidate>
        <div className="champ">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required
                 value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="champ">
          <label htmlFor="mdp">Mot de passe</label>
          <input id="mdp" type="password" autoComplete="current-password" required
                 value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
        </div>
        {erreur && <p className="champ erreur" role="alert">{erreur}</p>}
        <button className="bouton" type="submit" disabled={envoi} style={{ width: '100%' }}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
