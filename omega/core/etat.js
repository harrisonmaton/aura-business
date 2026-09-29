'use strict';
/* État d'exécution de JARVIS : prospects, messages, conversations, revenus,
   file de tâches, journal d'événements.

   Emplacement : $OMEGA_ETAT, sinon omega/etat/. Ce dossier est IGNORÉ par git :
   le dépôt est public, et un prospect n'a pas à retrouver son nom et le message
   qu'on lui destine dans un dépôt de vente consultable par tous. La durabilité
   vient de la machine qui fait tourner le worker (Mac ou serveur), pas de git.

   Écritures atomiques (fichier temporaire + rename) : un worker tué en pleine
   écriture laisse l'ancien fichier intact, jamais un JSON à moitié écrit. */

const fs = require('fs');
const path = require('path');

function dossier(){
  const d = process.env.OMEGA_ETAT || path.join(__dirname, '..', 'etat');
  fs.mkdirSync(d, {recursive: true});
  return d;
}

function chemin(nom){ return path.join(dossier(), nom); }

function lire(nom, defaut){
  const f = chemin(nom);
  if(!fs.existsSync(f)) return typeof defaut === 'function' ? defaut() : JSON.parse(JSON.stringify(defaut));
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function ecrire(nom, valeur){
  const f = chemin(nom);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  const tmp = f + '.' + process.pid + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(valeur, null, 1));
  fs.renameSync(tmp, f);
  return valeur;
}

/* Modification sous verrou : deux processus (worker + console) ne peuvent pas
   s'écraser mutuellement. Le verrou est un dossier (mkdir est atomique) ;
   un verrou plus vieux que 30 s est considéré abandonné par un processus mort. */
function modifier(nom, defaut, fn){
  const verrou = chemin(nom) + '.verrou';
  const debut = Date.now();
  for(;;){
    try { fs.mkdirSync(verrou); break; }
    catch(e){
      if(e.code !== 'EEXIST') throw e;
      try { if(Date.now() - fs.statSync(verrou).mtimeMs > 30000){ fs.rmdirSync(verrou); continue; } } catch(_){ continue; }
      if(Date.now() - debut > 10000) throw new Error('verrou non obtenu : ' + nom);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    const v = lire(nom, defaut);
    const r = fn(v);
    ecrire(nom, v);
    return r;
  } finally { fs.rmdirSync(verrou); }
}

function ajouterLigne(nom, objet){
  const f = chemin(nom);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.appendFileSync(f, JSON.stringify(objet) + '\n');
}

function lireLignes(nom){
  const f = chemin(nom);
  if(!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

let compteur = 0;
function identifiant(prefixe){
  return prefixe + '_' + Date.now().toString(36) + (compteur++).toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = {dossier, chemin, lire, ecrire, modifier, ajouterLigne, lireLignes, identifiant};
