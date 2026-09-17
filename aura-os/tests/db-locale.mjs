/* ═══════════════════════════════════════════════════════════════════════════
   Base locale de test

   Monte un vrai PostgreSQL, y applique le shim `auth` puis les migrations
   TELLES QUELLES. C'est ce qui permet de prouver les politiques d'isolation au
   lieu de se contenter de les avoir écrites.

   Le cluster tourne sous un utilisateur non privilégié : initdb refuse de
   s'exécuter en root, et un superutilisateur contournerait RLS — le test
   passerait toujours et ne prouverait rien.
   ═══════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, '..');
const BIN = '/usr/lib/postgresql/16/bin';
const DONNEES = '/tmp/pgaura';
const PORT = 55432;
const SOCKET = '/tmp';
const UTILISATEUR = 'pgaura';

export const CONNEXION = {
  host: SOCKET, port: PORT, database: 'aura_test', user: 'postgres'
};

function enTantQue(commande) {
  return execFileSync('su', [UTILISATEUR, '-c', `PATH=${BIN}:$PATH ${commande}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function tourne() {
  try {
    execFileSync(`${BIN}/pg_isready`, ['-h', SOCKET, '-p', String(PORT)], { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

export function demarrer() {
  if (tourne()) return;
  if (!existsSync(DONNEES)) {
    enTantQue(`initdb -D ${DONNEES} -U postgres -A trust`);
  }
  enTantQue(`pg_ctl -D ${DONNEES} -o '-p ${PORT} -k ${SOCKET}' -l /tmp/pg.log start`);
  for (let i = 0; i < 40 && !tourne(); i++) execFileSync('sleep', ['0.25']);
  if (!tourne()) throw new Error('PostgreSQL local non démarré — voir /tmp/pg.log');
}

export function arreter() {
  if (tourne()) enTantQue(`pg_ctl -D ${DONNEES} -m fast stop`);
}

function psql(base, sql) {
  return execFileSync(`${BIN}/psql`,
    ['-h', SOCKET, '-p', String(PORT), '-U', 'postgres', '-d', base,
     '-v', 'ON_ERROR_STOP=1', '-q', '-c', sql],
    { encoding: 'utf8' });
}

function psqlFichier(base, fichier) {
  return execFileSync(`${BIN}/psql`,
    ['-h', SOCKET, '-p', String(PORT), '-U', 'postgres', '-d', base,
     '-v', 'ON_ERROR_STOP=1', '-q', '-f', fichier],
    { encoding: 'utf8' });
}

/* Base neuve à chaque exécution : un test qui dépend de l'état laissé par le
   précédent finit par passer pour de mauvaises raisons. */
export function reconstruire() {
  demarrer();
  psql('postgres', `drop database if exists ${CONNEXION.database} with (force);`);
  psql('postgres', `create database ${CONNEXION.database};`);
  psql(CONNEXION.database, 'create extension if not exists pgcrypto;');
  psqlFichier(CONNEXION.database, path.join(ICI, 'auth-shim.sql'));
  const dossier = path.join(RACINE, 'supabase', 'migrations');
  for (const f of readdirSync(dossier).filter(f => f.endsWith('.sql')).sort()) {
    psqlFichier(CONNEXION.database, path.join(dossier, f));
  }
  return readdirSync(dossier).filter(f => f.endsWith('.sql')).sort();
}

if (process.argv[2] === 'start') { console.log(reconstruire().join(', ')); }
if (process.argv[2] === 'stop') { arreter(); console.log('arrêté'); }
