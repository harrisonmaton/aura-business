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

  test('l’autorisation ne s’appuie jamais sur getSession()', () => {
    /* getSession() lit le cookie et le croit sur parole ; getUser() revalide
       le jeton auprès de Supabase. Pour décider d'un droit d'accès, seule la
       seconde a une valeur — la première dit qui l'utilisateur PRÉTEND être. */
    const fautifs = fichiers(path.join(RACINE, 'src'))
      .filter(f => /auth\.getSession\(\)/.test(readFileSync(f, 'utf8')))
      .map(f => path.relative(RACINE, f));
    assert.deepEqual(fautifs, [], 'utiliser getUser(), qui revalide le jeton');
  });

  test('les routes qui lisent une session ne sont jamais pré-rendues', () => {
    /* Une réponse rendue pour un utilisateur connecté et mise en cache
       partagée servirait sa session à quelqu'un d'autre. */
    const fautifs = [];
    for (const f of fichiers(path.join(RACINE, 'src/app'))) {
      const t = readFileSync(f, 'utf8');
      const litSession = /utilisateurVerifie|clientServeur|auth\.getUser/.test(t);
      if (litSession && !/export const dynamic\s*=\s*['"]force-dynamic['"]/.test(t)) {
        fautifs.push(path.relative(RACINE, f));
      }
    }
    assert.deepEqual(fautifs, [], 'ajouter export const dynamic = "force-dynamic"');
  });
});
