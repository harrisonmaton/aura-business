'use client';
import { useState } from 'react';
import { clientNavigateur, supabaseConfigure } from '@/data/supabase';

export default function Inscription() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    /* Le minimum sérieux, vérifié aussi côté Supabase. Compter les caractères
       est faible ; c'est la longueur qui protège le plus, pas les symboles. */
    if (motDePasse.length < 10) {
      setErreur('Choisissez un mot de passe d’au moins 10 caractères.');
      return;
    }
    if (!supabaseConfigure()) {
      setErreur("Aura OS n'est pas encore relié à sa base. Voir LISEZ-MOI.md.");
      return;
    }
    setEnvoi(true);
    try {
      const { error } = await clientNavigateur().auth
        .signUp({ email, password: motDePasse });
      if (error) { setErreur("Inscription impossible. Vérifiez votre adresse."); return; }
      setFait(true);
    } catch {
      setErreur('Inscription impossible pour le moment.');
    } finally { setEnvoi(false); }
  }

  if (fait) {
    return (
      <main className="enveloppe" style={{ paddingBlock: '3rem', maxWidth: '26rem' }}>
        <h1 style={{ fontSize: '1.6rem' }}>Vérifiez vos e-mails</h1>
        <p style={{ color: 'var(--estompe)' }}>
          Nous vous avons envoyé un lien de confirmation. Ouvrez-le pour activer
          votre compte, puis revenez créer votre commerce.
        </p>
      </main>
    );
  }

  return (
    <main className="enveloppe" style={{ paddingBlock: '3rem', maxWidth: '26rem' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Créer mon compte</h1>
      <form onSubmit={soumettre} noValidate>
        <div className="champ">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required
                 value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="champ">
          <label htmlFor="mdp">Mot de passe</label>
          <input id="mdp" type="password" autoComplete="new-password" required
                 minLength={10} value={motDePasse}
                 onChange={e => setMotDePasse(e.target.value)} />
          <span style={{ fontSize: '.78rem', color: 'var(--estompe)' }}>10 caractères minimum.</span>
        </div>
        {erreur && <p className="champ erreur" role="alert">{erreur}</p>}
        <button className="bouton" type="submit" disabled={envoi} style={{ width: '100%' }}>
          {envoi ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </main>
  );
}
