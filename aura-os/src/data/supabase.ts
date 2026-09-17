/* ═══════════════════════════════════════════════════════════════════════════
   Accès Supabase — le chemin NORMAL de toute requête utilisateur

   Corrigé après la revue de sécurité. Voir SECURITE.md pour le détail ; en
   résumé, ce qui a changé et pourquoi :

   L'application ne DÉCLARE plus qui est l'utilisateur. Elle porte un jeton que
   Supabase vérifie cryptographiquement avant d'exécuter la moindre requête.
   Dans la version précédente, le code affirmait une identité et RLS faisait
   confiance à cette affirmation — un seul identifiant non vérifié quelque part
   et l'usurpation devenait totale. Ce n'est pas un contournement de politique,
   c'est un mensonge auquel elle croit.

   Clés : `sb_publishable_…` remplace l'ancienne `anon`, dépréciée fin 2026.
   Elle est conçue pour être exposée au navigateur : elle n'ouvre rien par
   elle-même, ce sont les politiques RLS qui décident de tout.

   Aucune clé secrète ici. Aucune n'est nécessaire au lot 2.
   ═══════════════════════════════════════════════════════════════════════════ */
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/* On accepte l'ancien nom en repli : un projet déjà créé avec une clé `anon`
   continue de fonctionner le temps de la migration. Le nom moderne gagne. */
const CLE_PUBLIABLE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function supabaseConfigure(): boolean {
  return Boolean(URL_SUPABASE && CLE_PUBLIABLE);
}

function exiger(): { url: string; cle: string } {
  if (!URL_SUPABASE || !CLE_PUBLIABLE) {
    throw new Error(
      "Aura OS n'est pas relié à Supabase. Deux variables suffisent : " +
      'NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Voir aura-os/SECURITE.md.');
  }
  return { url: URL_SUPABASE, cle: CLE_PUBLIABLE };
}

/* ── Navigateur ────────────────────────────────────────────────────────── */
export function clientNavigateur(): SupabaseClient {
  const { url, cle } = exiger();
  return createBrowserClient(url, cle);
}

/* ── Serveur ───────────────────────────────────────────────────────────────
   La session vit dans des cookies que ce client lit ET rafraîchit. D'où le
   passage de l'objet `cookies` de Next : sans l'écriture, un jeton expiré ne
   serait jamais renouvelé et l'utilisateur serait déconnecté sans raison.

   `setAll` est enveloppé : dans un composant serveur, écrire un cookie lève
   une erreur. Ce n'est pas grave — c'est le middleware qui rafraîchit. */
export function clientServeur(magasin: {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => void;
}): SupabaseClient {
  const { url, cle } = exiger();
  return createServerClient(url, cle, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: (c: Array<{ name: string; value: string; options?: unknown }>) => {
        try { magasin.setAll(c); } catch { /* composant serveur : c'est le middleware qui rafraîchit */ }
      }
    }
  });
}

/* ── L'identité, vérifiée ──────────────────────────────────────────────────
   `getUser()` et non `getSession()` : getSession lit le cookie et le croit sur
   parole, getUser revalide le jeton auprès de Supabase. Pour décider d'un
   droit d'accès, seule la seconde a une valeur — la première dit qui
   l'utilisateur PRÉTEND être. */
export async function utilisateurVerifie(sb: SupabaseClient) {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
