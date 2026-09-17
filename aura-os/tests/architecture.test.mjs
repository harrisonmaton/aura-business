/* ═══════════════════════════════════════════════════════════════════════════
   Règles d'architecture — celles qui pourrissent sans garde-fou

   Une règle écrite dans un commentaire tient jusqu'au jour où quelqu'un est
   pressé. Celles-ci portent sur la sécurité : elles sont donc vérifiées.
   ═══════════════════════════════════════════════════════════════════════════ */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function fichiers(dossier, ext = ['.ts', '.tsx']) {
  const out = [];
  const marcher = d => {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e);
      if (statSync(p).isDirectory()) marcher(p);
      else if (ext.some(x => p.endsWith(x))) out.push(p);
    }
  };
  marcher(dossier);
  return out;
}

describe('règles d’architecture', () => {

  test('aucune page n’emprunte le chemin SQL direct', () => {
    /* data/depot.ts ouvre une connexion avec un rôle privilégié et se rabaisse
       à chaque transaction. Si `set local role` manque quelque part, RLS est
       intégralement contourné. Ce module est réservé aux tests et aux
       migrations ; le produit passe par Supabase, où le jeton est vérifié. */
    const fautifs = fichiers(path.join(RACINE, 'src/app'))
      .filter(f => /from ['"][^'"]*data\/depot['"]/.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f));
    assert.deepEqual(fautifs, [], 'ces routes doivent passer par data/supabase ou data/lecture');
  });

  test('aucune clé secrète derrière un préfixe public', () => {
    /* NEXT_PUBLIC_* est exactement ce qui met une valeur dans le paquet envoyé
       au navigateur. Y placer un secret le publie. */
    const fautifs = [];
    for (const f of fichiers(path.join(RACINE, 'src'))) {
      const t = readFileSync(f, 'utf8');
      const m = t.match(/NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE|PRIVATE)[A-Z_]*/g);
      if (m) fautifs.push(path.relative(RACINE, f) + ' : ' + m.join(', '));
    }
    assert.deepEqual(fautifs, []);
  });

  test('aucun secret en dur dans les sources', () => {
    /* Les clés Supabase modernes sont préfixées : sb_secret_ ne doit jamais
       apparaître ailleurs que dans une variable d'environnement. */
    const fautifs = [];
    for (const f of fichiers(path.join(RACINE, 'src'))) {
      const t = readFileSync(f, 'utf8');
      if (/sb_secret_[A-Za-z0-9]/.test(t) || /eyJ[A-Za-z0-9_-]{30,}/.test(t)) {
        fautifs.push(path.relative(RACINE, f));
      }
    }
    assert.deepEqual(fautifs, []);
  });

  test('les routes n’utilisent pas getSession() pour décider d’un accès', () => {
    /* Trois méthodes, trois usages — les confondre coûte cher :
         getClaims()  protéger une page ; vérifie le jeton LOCALEMENT via
                      WebCrypto et un JWKS en cache, donc sans réseau ;
         getUser()    seulement si la fiche à jour est nécessaire — un
                      aller-retour réseau qu'on ne paie que si on s'en sert ;
         getSession() jetons bruts uniquement. Elle lit le stockage local sans
                      revalider : elle dit qui l'utilisateur PRÉTEND être.
       Dans une route, les seules raisons de lire l'authentification sont la
       protection ou la fiche. Le jeton brut relève d'un module de service. */
    const fautifs = fichiers(path.join(RACINE, 'src/app'))
      .filter(f => /auth\.getSession\(\)/.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f));
    assert.deepEqual(fautifs, [],
      'utiliser getClaims() pour protéger, getUser() pour la fiche à jour');
  });

  test('les routes qui lisent une session ne sont jamais pré-rendues', () => {
    /* Une réponse rendue pour un utilisateur connecté et mise en cache
       partagée servirait sa session à quelqu'un d'autre. */
    const fautifs = [];
    for (const f of fichiers(path.join(RACINE, 'src/app'))) {
      const t = readFileSync(f, 'utf8');
      /* Les noms suivis sont ceux qui lisent une identité. Renommer une
         fonction sans mettre ce motif à jour désarmerait le garde-fou en
         silence — c'est déjà arrivé une fois. */
      const litSession =
        /identiteVerifiee|ficheUtilisateur|clientServeur|auth\.get(User|Claims|Session)/.test(t);
      if (litSession && !/export const dynamic\s*=\s*['"]force-dynamic['"]/.test(t)) {
        fautifs.push(path.relative(RACINE, f));
      }
    }
    assert.deepEqual(fautifs, [], 'ajouter export const dynamic = "force-dynamic"');
  });
});
