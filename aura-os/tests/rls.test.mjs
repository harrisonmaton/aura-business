/* ═══════════════════════════════════════════════════════════════════════════
   Isolation entre commerces — la propriété la plus importante d'Aura OS

   Un défaut ici ne se voit pas à l'écran : il se découvre le jour où un
   commerçant lit les demandes d'un concurrent. Ces contrôles tentent donc
   EXPLICITEMENT les accès interdits et exigent qu'ils échouent.

   Ils tournent contre un vrai PostgreSQL, sur les migrations telles qu'elles
   partiront chez Supabase, et sous les rôles `anon` / `authenticated` — jamais
   en superutilisateur, qui contourne RLS et ferait tout passer.
   ═══════════════════════════════════════════════════════════════════════════ */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { reconstruire, CONNEXION } from './db-locale.mjs';

let pool;
const U = {};            /* identifiants des deux utilisateurs */
const B = {};            /* identifiants des deux commerces   */

/* Exécute une requête dans la peau d'un utilisateur connecté : rôle
   `authenticated` et revendication JWT, exactement ce que PostgREST installe
   chez Supabase. Le tout dans une transaction annulée, pour qu'un test ne
   laisse rien derrière lui. */
async function commeUtilisateur(userId, sql, params = []) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await c.query('set local role authenticated');
    return await c.query(sql, params);
  } finally {
    await c.query('rollback').catch(() => {});
    c.release();
  }
}

async function commeAnonyme(sql, params = []) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    /* On efface explicitement toute revendication restée sur la connexion.
       Ce n'est pas de la superstition : la première version de ce banc
       d'essai posait la revendication en `set_config(..., false)`, donc pour
       toute la session. Le pool recyclait la connexion, et l'« anonyme »
       héritait de l'identité du dernier utilisateur connecté — il lisait
       alors un commerce en brouillon qui ne lui appartenait pas. Le schéma
       était bon ; c'est le test qui mentait.
       C'est aussi la classe de faille qui rend RLS dangereux derrière un pool
       de connexions : chez Supabase chaque requête porte son propre jeton,
       ici c'est à nous de le garantir. */
    await c.query(`select set_config('request.jwt.claim.sub', '', true)`);
    await c.query('set local role anon');
    return await c.query(sql, params);
  } finally {
    await c.query('rollback').catch(() => {});
    c.release();
  }
}

/* Les écritures qui doivent persister passent par le propriétaire de la base,
   comme le ferait la clé de service côté serveur. */
async function commeService(sql, params = []) {
  return pool.query(sql, params);
}

before(async () => {
  reconstruire();
  pool = new pg.Pool({ ...CONNEXION, max: 4 });

  const a = await commeService(
    `insert into auth.users (email) values ('alice@test.local') returning id`);
  const b = await commeService(
    `insert into auth.users (email) values ('bob@test.local') returning id`);
  U.alice = a.rows[0].id;
  U.bob = b.rows[0].id;

  /* Chaque commerce est créé par son propriétaire, via la fonction — donc en
     passant par le chemin réel, pas par une insertion de service. */
  const ca = await commeUtilisateurPersistant(U.alice,
    `select creer_commerce('Glaces Alice', 'glaces-alice') as id`);
  const cb = await commeUtilisateurPersistant(U.bob,
    `select creer_commerce('Camion Bob', 'camion-bob') as id`);
  B.alice = ca.rows[0].id;
  B.bob = cb.rows[0].id;

  /* Alice publie, Bob reste en brouillon : on teste les deux états. */
  await commeService(`update business set statut = 'publie' where id = $1`, [B.alice]);

  /* Une demande déposée chez chacun, pour tester la lecture croisée. */
  await commeService(
    `insert into lead (business_id, nom, message, type) values ($1,$2,$3,'event')`,
    [B.alice, 'Client Alice', 'Anniversaire le 18 juillet']);
  await commeService(
    `insert into lead (business_id, nom, message, type) values ($1,$2,$3,'event')`,
    [B.bob, 'Client Bob', 'Mariage en août']);
});

/* Variante non annulée, pour la mise en place. Connexion DÉDIÉE puis fermée :
   elle ne retourne jamais au pool, donc son état de session ne peut
   contaminer aucun test. */
async function commeUtilisateurPersistant(userId, sql, params = []) {
  const c = new pg.Client(CONNEXION);
  await c.connect();
  try {
    await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
    await c.query('set role authenticated');
    return await c.query(sql, params);
  } finally {
    await c.end();
  }
}

after(async () => { await pool?.end(); });

describe('isolation entre commerces', () => {

  test('un propriétaire lit son propre commerce', async () => {
    const r = await commeUtilisateur(U.alice,
      `select nom from business where id = $1`, [B.alice]);
    assert.equal(r.rowCount, 1);
    assert.equal(r.rows[0].nom, 'Glaces Alice');
  });

  test('INTERDIT — lire les demandes d’un autre commerce', async () => {
    const r = await commeUtilisateur(U.alice,
      `select * from lead where business_id = $1`, [B.bob]);
    assert.equal(r.rowCount, 0, 'Alice ne doit voir aucune demande de Bob');
  });

  test('INTERDIT — lister toutes les demandes sans filtre', async () => {
    /* Le piège classique : la requête n'est pas filtrée, et c'est RLS seule
       qui doit restreindre. Alice ne doit récupérer que les siennes. */
    const r = await commeUtilisateur(U.alice, `select business_id from lead`);
    assert.equal(r.rowCount, 1);
    assert.equal(r.rows[0].business_id, B.alice);
  });

  test('INTERDIT — modifier le commerce d’un autre', async () => {
    const r = await commeUtilisateur(U.alice,
      `update business set nom = 'Piraté' where id = $1`, [B.bob]);
    assert.equal(r.rowCount, 0, 'aucune ligne ne doit être modifiée');
  });

  test('INTERDIT — modifier le statut d’une demande d’un autre', async () => {
    const r = await commeUtilisateur(U.alice,
      `update lead set statut = 'perdu' where business_id = $1`, [B.bob]);
    assert.equal(r.rowCount, 0);
  });

  test('INTERDIT — voir les appartenances des autres', async () => {
    const r = await commeUtilisateur(U.alice, `select * from business_member`);
    assert.equal(r.rowCount, 1);
    assert.equal(r.rows[0].user_id, U.alice);
  });

  test('INTERDIT — écrire son propre abonnement', async () => {
    /* Sans ce refus, un client s’offrirait le plan Business gratuitement. */
    await assert.rejects(
      () => commeUtilisateur(U.alice,
        `update subscription set plan = 'business' where business_id = $1`, [B.alice]),
      /permission denied|droit/i);
  });

  test('INTERDIT — lire l’abonnement d’un autre', async () => {
    const r = await commeUtilisateur(U.alice,
      `select * from subscription where business_id = $1`, [B.bob]);
    assert.equal(r.rowCount, 0);
  });
});

describe('page publique et formulaire', () => {

  test('un visiteur anonyme lit un commerce publié', async () => {
    const r = await commeAnonyme(`select nom from business where slug = 'glaces-alice'`);
    assert.equal(r.rowCount, 1);
  });

  test('INTERDIT — un visiteur anonyme lit un commerce en brouillon', async () => {
    const r = await commeAnonyme(`select nom from business where slug = 'camion-bob'`);
    assert.equal(r.rowCount, 0, 'un brouillon ne doit pas être public');
  });

  test('un visiteur anonyme DÉPOSE une demande sur un commerce publié', async () => {
    /* C'est tout l'intérêt du produit : le client devant la camionnette n'a
       pas de compte. L'insertion doit passer. */
    /* Sans `returning` : PostgreSQL exigerait alors le droit SELECT sur la
       colonne renvoyée, et `anon` ne l'a pas — volontairement. Le formulaire
       public n'a aucune raison de relire la demande qu'il dépose. */
    const r = await commeAnonyme(
      `insert into lead (business_id, nom, message, type)
       values ($1, 'Passant', 'Vous venez samedi ?', 'event')`,
      [B.alice]);
    assert.equal(r.rowCount, 1);
  });

  test('INTERDIT — un visiteur anonyme LIT les demandes', async () => {
    /* Le pendant du test précédent, et le plus dangereux : ouvrir l'insertion
       sans fermer la lecture exposerait les coordonnées de tous les clients. */
    /* Le refus est plus net qu'un résultat vide : `anon` n'a aucun droit
       SELECT sur la table, PostgreSQL rejette avant même d'évaluer RLS.
       Deux barrières au lieu d'une. */
    await assert.rejects(() => commeAnonyme(`select * from lead`),
      /permission denied/i, 'les demandes ne doivent jamais être publiques');
  });

  test('INTERDIT — déposer une demande sur un commerce non publié', async () => {
    await assert.rejects(
      () => commeAnonyme(
        `insert into lead (business_id, nom, type) values ($1, 'X', 'event')`, [B.bob]),
      /row-level security|violates/i);
  });

  test('un visiteur anonyme enregistre un scan, sans pouvoir les relire', async () => {
    const ecrit = await commeAnonyme(
      `insert into analytics_event (business_id, type, qr_type)
       values ($1, 'qr_scan', 'menu')`, [B.alice]);
    assert.equal(ecrit.rowCount, 1);
    await assert.rejects(() => commeAnonyme(`select * from analytics_event`),
      /permission denied/i);
  });

  test('INTERDIT — un visiteur anonyme modifie un menu', async () => {
    await assert.rejects(
      () => commeAnonyme(
        `insert into menu_item (business_id, nom) values ($1, 'Gratuit')`, [B.alice]),
      /permission denied|row-level security/i);
  });
});

describe('création de commerce', () => {

  test('INTERDIT — insérer un commerce directement', async () => {
    /* Aucune politique d'insertion sur `business` : sans cela on pourrait
       créer un commerce orphelin, que personne ne peut plus ni lire ni
       supprimer. */
    await assert.rejects(
      () => commeUtilisateur(U.alice,
        `insert into business (nom, slug) values ('Orphelin', 'orphelin')`),
      /permission denied|row-level security/i);
  });

  test('INTERDIT — créer un commerce sans être authentifié', async () => {
    await assert.rejects(
      () => commeAnonyme(`select creer_commerce('Anonyme', 'anonyme')`),
      /authentification requise|permission denied/i);
  });

  test('la création rattache bien le créateur, et lui seul', async () => {
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [U.alice]);
      await c.query('set local role authenticated');
      const r = await c.query(`select creer_commerce('Deuxième', 'deuxieme') as id`);
      const membres = await c.query(
        `select user_id from business_member where business_id = $1`, [r.rows[0].id]);
      assert.equal(membres.rowCount, 1);
      assert.equal(membres.rows[0].user_id, U.alice);
    } finally {
      await c.query('rollback').catch(() => {});
      c.release();
    }
  });

  test('le slug est normalisé côté base, pas côté navigateur', async () => {
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [U.alice]);
      await c.query('set local role authenticated');
      /* En deux instructions : appeler creer_commerce() dans le SELECT qui
         relit la ligne échoue, parce que est_membre() est `stable` et voit
         l'instantané pris au début de l'instruction — donc avant que
         l'appartenance n'existe. */
      const cree = await c.query(`select creer_commerce('X', '  Chez  Tonio! ') as id`);
      const r = await c.query(`select slug from business where id = $1`, [cree.rows[0].id]);
      assert.equal(r.rows[0].slug, 'chez-tonio');
    } finally {
      await c.query('rollback').catch(() => {});
      c.release();
    }
  });
});
