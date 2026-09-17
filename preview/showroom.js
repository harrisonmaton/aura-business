/* ══════════════════════════════════════════════════════════════════════════
   AURA — LE STUDIO QUI PREND VIE
   Showroom 3D. Géométrie, caméra, lumières, matériaux, interactions.

   Trois règles tenues par ce fichier :

   1. LA SCÈNE EST UN SUPPLÉMENT, JAMAIS UNE DÉPENDANCE.
      La galerie HTML, les prix et la commande fonctionnent sans elle. Si
      WebGL manque, si le contexte est perdu, si l'appareil est économe ou si
      le visiteur a demandé moins de mouvement, on ne démarre pas et la
      composition HTML existante reste en place. Aucun texte essentiel ne vit
      uniquement dans le canvas.

   2. LES TEXTURES SONT LES VRAIS FICHIERS.
      Chaque support affiche une création réellement livrée, peinte depuis le
      SVG du manifeste. Pas de placeholder, pas de capture d'écran.

   3. LA CAMÉRA EST CONTENUE.
      On ne pilote pas un jeu vidéo pour lire un prix : rotation bornée,
      pas de zoom libre, pas de défilement confisqué.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (typeof THREE === "undefined") return;

  var API = {};
  window.AuraShowroom = API;

  /* ── Conditions de démarrage ───────────────────────────────────────────── */
  function webglDisponible() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  function econome() {
    var n = navigator;
    if (n.connection && n.connection.saveData) return true;
    if (n.deviceMemory && n.deviceMemory < 3) return true;
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 2) return true;
    return false;
  }
  var moinsDeMouvement = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  API.peutDemarrer = function () {
    return webglDisponible() && !econome() && !moinsDeMouvement;
  };
  API.raisonRefus = function () {
    if (!webglDisponible()) return "webgl_absent";
    if (econome()) return "appareil_econome";
    if (moinsDeMouvement) return "mouvement_reduit";
    return null;
  };

  /* ── Une création SVG devient une texture ────────────────────────────────
     Piège mesuré : un SVG transformé en blob perd sa base d'URL, donc toute
     photographie référencée en chemin relatif ne se charge pas — le panneau
     principal sortait entièrement noir. On intègre donc les images en data URI
     AVANT de créer le blob. */
  function inlinerImages(svg) {
    var carte = (typeof PHOTOS_SHOWROOM !== "undefined") ? PHOTOS_SHOWROOM : null;
    if (!carte) return Promise.resolve(svg);
    Object.keys(carte).forEach(function (chemin) {
      if (svg.indexOf('href="' + chemin + '"') >= 0) {
        svg = svg.split('href="' + chemin + '"').join('href="' + carte[chemin] + '"');
      }
    });
    return Promise.resolve(svg);
  }

  function textureDepuisSvg(svgBrut, largeur, hauteur) {
    return inlinerImages(svgBrut).then(function (svg) {
    return new Promise(function (resoudre, rejeter) {
      var source = svg;
      if (!/^<svg[^>]*\swidth=/.test(source)) {
        source = source.replace("<svg", '<svg width="' + largeur + '" height="' + hauteur + '"');
      }
      var blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = largeur; c.height = hauteur;
        var g = c.getContext("2d");
        g.fillStyle = "#10131D"; g.fillRect(0, 0, largeur, hauteur);
        g.drawImage(img, 0, 0, largeur, hauteur);
        URL.revokeObjectURL(url);
        var t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        resoudre(t);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rejeter(new Error("svg illisible")); };
      img.src = url;
    });
    });
  }

  /* ── Le plateau ────────────────────────────────────────────────────────── */
  function cyclorama() {
    /* Un fond courbe clair : le plateau d'un studio photo, pas une pièce noire.
       La courbure est obtenue par un plan très subdivisé dont on relève le
       bord arrière — un vrai raccord sol/mur, comme un cyclo. */
    var g = new THREE.PlaneGeometry(26, 20, 1, 60);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      var t = (y + 10) / 20;                 /* 0 devant, 1 au fond */
      if (t > 0.55) {
        var k = (t - 0.55) / 0.45;
        pos.setZ(i, k * k * 7.5);            /* le fond se relève */
      }
    }
    g.computeVertexNormals();
    var m = new THREE.MeshStandardMaterial({
      color: 0x8d93a8, roughness: 0.96, metalness: 0.0, side: THREE.FrontSide
    });
    var mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -2.6;
    mesh.receiveShadow = true;
    return mesh;
  }

  /* Ombre de contact : un disque sombre sous chaque objet. Sans elle, les
     objets flottent — c'est le défaut le plus visible d'une scène bâclée. */
  function ombreContact(largeur, profondeur) {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(0,0,0,.62)");
    grad.addColorStop(.55, "rgba(0,0,0,.24)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(largeur, profondeur),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  /* ── Les supports ──────────────────────────────────────────────────────── */

  /* Cadre d'exposition : une publication carrée montée sur un panneau épais. */
  function panneau(texture, largeur, hauteur, epaisseur) {
    var groupe = new THREE.Group();
    var bord = new THREE.Mesh(
      new THREE.BoxGeometry(largeur + .16, hauteur + .16, epaisseur),
      new THREE.MeshStandardMaterial({ color: 0xf3ead9, roughness: .62, metalness: .04 })
    );
    bord.castShadow = true; bord.receiveShadow = true;
    groupe.add(bord);
    var face = new THREE.Mesh(
      new THREE.PlaneGeometry(largeur, hauteur),
      new THREE.MeshStandardMaterial({ map: texture, roughness: .52, metalness: 0 })
    );
    face.position.z = epaisseur / 2 + .002;
    groupe.add(face);
    return groupe;
  }

  /* Téléphone : un corps arrondi, un écran encastré, une story dessus. */
  function telephone(texture) {
    var groupe = new THREE.Group();
    var forme = new THREE.Shape();
    var l = 1.5, h = 3.1, r = .22;
    forme.moveTo(-l / 2 + r, -h / 2);
    forme.lineTo(l / 2 - r, -h / 2);
    forme.quadraticCurveTo(l / 2, -h / 2, l / 2, -h / 2 + r);
    forme.lineTo(l / 2, h / 2 - r);
    forme.quadraticCurveTo(l / 2, h / 2, l / 2 - r, h / 2);
    forme.lineTo(-l / 2 + r, h / 2);
    forme.quadraticCurveTo(-l / 2, h / 2, -l / 2, h / 2 - r);
    forme.lineTo(-l / 2, -h / 2 + r);
    forme.quadraticCurveTo(-l / 2, -h / 2, -l / 2 + r, -h / 2);
    var corps = new THREE.Mesh(
      new THREE.ExtrudeGeometry(forme, { depth: .2, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3, curveSegments: 12 }),
      new THREE.MeshStandardMaterial({ color: 0x1b2030, roughness: .34, metalness: .55 })
    );
    corps.castShadow = true; corps.receiveShadow = true;
    groupe.add(corps);
    var ecran = new THREE.Mesh(
      new THREE.PlaneGeometry(l - .16, h - .18),
      new THREE.MeshStandardMaterial({ map: texture, roughness: .28, metalness: 0 })
    );
    ecran.position.z = .268;
    groupe.add(ecran);
    return groupe;
  }

  /* Présentoir de menu : un chevalet incliné avec son épaisseur. */
  function presentoir(texture) {
    var groupe = new THREE.Group();
    var socle = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, .12, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xe8dcc6, roughness: .74, metalness: .05 })
    );
    socle.position.y = -1.12; socle.castShadow = true; socle.receiveShadow = true;
    groupe.add(socle);
    var carte = panneau(texture, 2.0, 2.0, .07);
    carte.position.y = -.05;
    carte.rotation.x = -.19;
    groupe.add(carte);
    var appui = new THREE.Mesh(
      new THREE.BoxGeometry(.1, 1.5, .1),
      new THREE.MeshStandardMaterial({ color: 0xc8b48c, roughness: .4, metalness: .6 })
    );
    appui.position.set(0, -.6, -.42); appui.rotation.x = .3; appui.castShadow = true;
    groupe.add(appui);
    return groupe;
  }

  /* L'enseigne AURA, en volume, céramique satinée. Elle identifie le studio
     et reste en retrait : elle ne prend pas la place des créations. */
  function enseigne() {
    var groupe = new THREE.Group();
    var socle = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, .18, .5),
      new THREE.MeshStandardMaterial({ color: 0xece2d2, roughness: .58, metalness: .06 })
    );
    socle.castShadow = true; socle.receiveShadow = true;
    groupe.add(socle);
    var filet = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, .02, .52),
      new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: .28, metalness: .82 })
    );
    filet.position.y = .1;
    groupe.add(filet);
    /* Le mot lui-même, peint sur une plaque fine : lisible, et sans
       dépendance à une police 3D externe. */
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 256;
    var g = c.getContext("2d");
    g.clearRect(0, 0, 1024, 256);
    g.fillStyle = "#ECE2D2";
    g.font = "700 150px Archivo, Helvetica, Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.letterSpacing = "-6px";
    g.fillText("AURA", 512, 132);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    var mot = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.05),
      new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .5, metalness: .1 })
    );
    mot.position.set(0, .66, .12);
    groupe.add(mot);
    return groupe;
  }

  /* ── La scène ──────────────────────────────────────────────────────────── */
  API.creer = function (conteneur, pieces, options) {
    if (!API.peutDemarrer()) return null;
    options = options || {};

    var largeur = conteneur.clientWidth || 800;
    var hauteur = conteneur.clientHeight || 520;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(largeur, hauteur);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    conteneur.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, largeur / hauteur, .1, 100);
    camera.position.set(0, .55, 9.3);
    camera.lookAt(0, .1, 0);

    scene.add(cyclorama());

    /* Lumière : une dominante douce, un contre-jour turquoise et une touche
       corail. Contrôlée, pas une accumulation de néons. */
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5168, 1.15));
    var cle = new THREE.DirectionalLight(0xfff5e8, 2.6);
    cle.position.set(4.2, 6.4, 6.2);
    cle.castShadow = true;
    cle.shadow.mapSize.set(1024, 1024);
    cle.shadow.camera.near = 1; cle.shadow.camera.far = 30;
    cle.shadow.camera.left = -9; cle.shadow.camera.right = 9;
    cle.shadow.camera.top = 9; cle.shadow.camera.bottom = -9;
    cle.shadow.bias = -0.0009;
    scene.add(cle);
    var contre = new THREE.DirectionalLight(0x36d6d0, .9);
    contre.position.set(-6.2, 2.6, -4.4);
    scene.add(contre);
    var touche = new THREE.PointLight(0xff746c, 9, 16, 2);
    touche.position.set(3.6, -.9, 2.4);
    scene.add(touche);

    var supports = new THREE.Group();
    scene.add(supports);

    var objets = [];          /* { groupe, base, avance, nom, index } */
    var choisi = -1;
    var vivant = true, visible = true, horloge = new THREE.Clock();
    var pointeur = { x: 0, y: 0, cible: { x: 0, y: 0 } };
    var rayon = new THREE.Raycaster(), souris = new THREE.Vector2();

    /* Disposition : la publication au centre, le téléphone à droite, le
       présentoir à gauche, l'enseigne en retrait au fond. */
    var PLAN = [
      { role: "post",  pos: [0, .25, 0],      rot: [0, 0, 0],       avance: 1.5 },
      { role: "story", pos: [3.15, .1, -.5],  rot: [0, -.42, 0],    avance: 1.6 },
      { role: "menu",  pos: [-3.3, .35, -.7], rot: [0, .40, 0],     avance: 1.6 },
      { role: "extra", pos: [-1.35, -1.25, 2.0], rot: [-.52, .26, .05], avance: 1.1 }
    ];

    function poser(groupe, plan, nom, index) {
      groupe.position.set(plan.pos[0], plan.pos[1], plan.pos[2]);
      groupe.rotation.set(plan.rot[0], plan.rot[1], plan.rot[2]);
      supports.add(groupe);
      var ombre = ombreContact(2.8, 2.0);
      ombre.position.set(plan.pos[0], -2.55, plan.pos[2] + .2);
      scene.add(ombre);
      objets.push({
        groupe: groupe, nom: nom, index: index,
        base: groupe.position.clone(),
        baseRot: groupe.rotation.clone(),
        avance: plan.avance
      });
    }

    var sign = enseigne();
    sign.position.set(0, 2.55, -4.6);
    scene.add(sign);

    /* ── Chargement des créations ───────────────────────────────────────── */
    /* Chaque pièce va sur le support qui lui correspond, décidé par son format
       et son rôle réel — pas par sa position dans le tableau. Une story dans un
       cadre carré et un menu sur un téléphone seraient tous deux faux. */
    function planPour(p, i) {
      if (p.format === "9:16") return { plan: PLAN[1], support: "telephone" };
      if (/carte|menu/i.test(p.nom)) return { plan: PLAN[2], support: "presentoir" };
      if (i === 0) return { plan: PLAN[0], support: "panneau" };
      return { plan: PLAN[3], support: "panneau" };
    }

    var pret = Promise.all(pieces.slice(0, 4).map(function (p, i) {
      var vertical = p.format === "9:16";
      return textureDepuisSvg(p.svg, vertical ? 512 : 768, vertical ? 910 : 768)
        .then(function (t) { return { t: t, p: p, i: i, vertical: vertical }; })
        .catch(function () { return null; });
    })).then(function (charges) {
      charges.filter(Boolean).forEach(function (x) {
        var choix = planPour(x.p, x.i);
        var groupe;
        if (choix.support === "telephone")       groupe = telephone(x.t);
        else if (choix.support === "presentoir") groupe = presentoir(x.t);
        else groupe = panneau(x.t, x.i === 0 ? 3.2 : 2.6, x.i === 0 ? 3.2 : 2.6, .12);
        poser(groupe, choix.plan, x.p.nom, x.i);
      });
      return objets.length;
    });

    /* ── Boucle ─────────────────────────────────────────────────────────── */
    function image() {
      if (!vivant) return;
      requestAnimationFrame(image);
      if (!visible) return;
      var dt = Math.min(horloge.getDelta(), .05);

      pointeur.x += (pointeur.cible.x - pointeur.x) * Math.min(1, dt * 4.5);
      pointeur.y += (pointeur.cible.y - pointeur.y) * Math.min(1, dt * 4.5);
      /* Caméra contenue : quelques degrés, jamais une orbite libre. */
      camera.position.x = pointeur.x * 1.25;
      camera.position.y = .7 + pointeur.y * .55;
      camera.lookAt(0, .1, 0);

      objets.forEach(function (o, i) {
        var actif = (i === choisi);
        var zCible = o.base.z + (actif ? o.avance : (choisi >= 0 ? -.55 : 0));
        var yCible = o.base.y + (actif ? .22 : 0);
        var k = Math.min(1, dt * 5.2);
        o.groupe.position.z += (zCible - o.groupe.position.z) * k;
        o.groupe.position.y += (yCible - o.groupe.position.y) * k;
        var rCible = actif ? 0 : o.baseRot.y;
        o.groupe.rotation.y += (rCible - o.groupe.rotation.y) * k;
        var flotte = Math.sin(horloge.elapsedTime * .85 + i * 1.7) * .022;
        o.groupe.position.y += flotte * dt * 8;
      });

      renderer.render(scene, camera);
    }

    /* ── Entrées ────────────────────────────────────────────────────────── */
    function surPointeur(e) {
      var r = conteneur.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      pointeur.cible.x = (px - .5) * 2;
      pointeur.cible.y = -(py - .5) * 2;
      souris.x = px * 2 - 1; souris.y = -(py * 2 - 1);
    }
    function surClic() {
      rayon.setFromCamera(souris, camera);
      var touches = rayon.intersectObjects(supports.children, true);
      if (!touches.length) { API.choisir(-1); return; }
      var cible = touches[0].object;
      while (cible.parent && cible.parent !== supports) cible = cible.parent;
      var i = objets.findIndex(function (o) { return o.groupe === cible; });
      if (i >= 0) {
        API.choisir(i);
        if (typeof options.surChoix === "function") options.surChoix(objets[i].index, objets[i].nom);
      }
    }
    conteneur.addEventListener("pointermove", surPointeur, { passive: true });
    conteneur.addEventListener("click", surClic);
    conteneur.addEventListener("pointerleave", function () {
      pointeur.cible.x = 0; pointeur.cible.y = 0;
    }, { passive: true });

    /* Le rendu s'arrête hors écran et quand l'onglet est masqué : une scène
       qui tourne dans le vide vide la batterie sans rien montrer. */
    var oeil = ("IntersectionObserver" in window)
      ? new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) horloge.getDelta(); })
      : null;
    if (oeil) oeil.observe(conteneur);
    function surVisibilite() { visible = !document.hidden && (!oeil || visible); if (visible) horloge.getDelta(); }
    document.addEventListener("visibilitychange", surVisibilite);

    function surTaille() {
      var l = conteneur.clientWidth, h = conteneur.clientHeight;
      if (!l || !h) return;
      camera.aspect = l / h; camera.updateProjectionMatrix();
      renderer.setSize(l, h);
    }
    window.addEventListener("resize", surTaille);

    /* Perte de contexte : on rend la main au repli HTML plutôt que de laisser
       un canvas noir. */
    renderer.domElement.addEventListener("webglcontextlost", function (e) {
      e.preventDefault(); vivant = false;
      if (typeof options.surPerte === "function") options.surPerte();
    });

    API.choisir = function (i) {
      choisi = i;
      return choisi;
    };
    API.choix = function () { return choisi; };
    API.nombreObjets = function () { return objets.length; };
    API.detruire = function () {
      vivant = false;
      if (oeil) oeil.disconnect();
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("resize", surTaille);
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          [].concat(o.material).forEach(function (m) {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };

    pret.then(function (n) {
      if (!n) { API.detruire(); if (typeof options.surPerte === "function") options.surPerte(); return; }
      image();
      conteneur.setAttribute("data-showroom", "actif");
      if (typeof options.surPret === "function") options.surPret(n);
    });

    return API;
  };
})();
