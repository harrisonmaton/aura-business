/* ═══════════════════════════════════════════════════════════════════════════
   Accès Supabase

   Deux clients, deux niveaux de droit, et il ne faut jamais les confondre :

   — `clientNavigateur` / `clientServeur` portent la clé ANONYME et la session
     de l'utilisateur. Toutes leurs requêtes sont soumises aux politiques RLS.
     C'est ce qu'on utilise partout, par défaut.

   — `clientService` porte la clé de SERVICE, qui CONTOURNE RLS. Elle ne doit
     jamais atteindre le navigateur, et ne sert que là où le serveur agit sans
     utilisateur : le webhook de facturation, les tâches planifiées. Chaque
     appel à cette fonction mérite d'être justifié.

   Rien ne casse à la construction si les variables manquent : le projet doit
   pouvoir se construire et se tester avant qu'un Supabase existe. C'est à
   l'exécution, au premier appel, que l'absence est signalée clairement.
   ═══════════════════════════════════════════════════════════════════════════ */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const CLE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function supabaseConfigure(): boolean {
  return Boolean(URL_SUPABASE && CLE_ANON);
}

function exiger(nom: string, valeur: string): string {
  if (!valeur) {
    throw new Error(
      `${nom} manquante. Aura OS n'est pas encore relié à Supabase — ` +
      `voir aura-os/LISEZ-MOI.md, section « Ce qu'il reste à brancher ».`);
  }
  return valeur;
}

export function clientNavigateur(): SupabaseClient {
  return createClient(exiger('NEXT_PUBLIC_SUPABASE_URL', URL_SUPABASE),
                      exiger('NEXT_PUBLIC_SUPABASE_ANON_KEY', CLE_ANON));
}

/* Contourne RLS. À n'appeler que côté serveur, et seulement quand aucun
   utilisateur n'est en cause. */
export function clientService(): SupabaseClient {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (typeof window !== 'undefined') {
    throw new Error('la clé de service ne doit jamais être utilisée dans le navigateur');
  }
  return createClient(exiger('NEXT_PUBLIC_SUPABASE_URL', URL_SUPABASE),
                      exiger('SUPABASE_SERVICE_ROLE_KEY', cle),
                      { auth: { persistSession: false } });
}
