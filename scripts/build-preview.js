/* Enveloppe les sources dans le squelette HTML exact ajouté à la publication
   (charset, viewport, reset). Sans cette étape, le navigateur compose le mobile
   à ~980px et toute capture ou mesure mobile est fausse. */
const fs = require('fs'), path = require('path');
const SK = '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#faf9f7}'
  + 'img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
fs.mkdirSync(path.join(__dirname,'..','preview'), {recursive:true});
for (const [src,out] of [['vitrine.html','vitrine.html'],['back-office.html','back-office.html']]) {
  const body = fs.readFileSync(path.join(__dirname,'..','src',src),'utf8');
  fs.writeFileSync(path.join(__dirname,'..','preview',out), SK + body + '</body></html>');
}
fs.cpSync(path.join(__dirname,'..','src','fonts'), path.join(__dirname,'..','preview','fonts'), {recursive:true});
/* Les photographies sont référencées par les SVG en ligne via un chemin
   relatif au document : elles doivent exister à côté de la page. */
/* Le moteur 3D et le showroom sont copiés tels quels : chargés en différé par
   la page, ils ne doivent jamais retarder l'affichage du contenu commercial. */
const moteur = path.join(__dirname,'..','src','moteur');
if (fs.existsSync(moteur)) fs.cpSync(moteur, path.join(__dirname,'..','preview','moteur'), {recursive:true});
fs.copyFileSync(path.join(__dirname,'..','src','showroom.js'),
                path.join(__dirname,'..','preview','showroom.js'));

/* Les photographies utilisées par le showroom sont inlinées en data URI à la
   CONSTRUCTION, dans un fichier chargé avec le moteur. À l'exécution, un SVG
   transformé en blob perd sa base d'URL, et `fetch` sur file:// est refusé par
   la politique d'origine : le panneau principal sortait noir. Une intégration
   au build fonctionne dans les deux cas, hors ligne compris, et ne coûte rien
   au parcours commercial puisqu'elle n'est chargée qu'avec la scène. */
{
  const dossier = path.join(__dirname,'..','src','creations','photos');
  const carte = {};
  if (fs.existsSync(dossier)) {
    for (const f of fs.readdirSync(dossier)) {
      if (!/\.(webp|png|jpe?g)$/i.test(f)) continue;
      const type = /\.webp$/i.test(f) ? 'image/webp'
                 : /\.png$/i.test(f)  ? 'image/png' : 'image/jpeg';
      carte['creations/photos/' + f] =
        'data:' + type + ';base64,' + fs.readFileSync(path.join(dossier,f)).toString('base64');
    }
  }
  fs.writeFileSync(path.join(__dirname,'..','preview','photos-showroom.js'),
    'var PHOTOS_SHOWROOM = ' + JSON.stringify(carte) + ';\n');
  const n = Object.keys(carte).length;
  const ko = (fs.statSync(path.join(__dirname,'..','preview','photos-showroom.js')).size/1024).toFixed(0);
  console.log('  photos du showroom inlinées : ' + n + ' fichier(s), ' + ko + ' Ko');
}

const photos = path.join(__dirname,'..','src','creations','photos');
if (fs.existsSync(photos)) fs.cpSync(photos, path.join(__dirname,'..','preview','creations','photos'), {recursive:true});

/* Les scènes sont copiées comme fichiers, pas inlinées : la page ne porte que
   leur catalogue (chemin, dimensions), et le navigateur les met en cache. */
const scenes = path.join(__dirname,'..','src','scenes');
if (fs.existsSync(scenes)) {
  fs.cpSync(scenes, path.join(__dirname,'..','preview','scenes'), {recursive:true});
  const n = fs.readdirSync(scenes).filter(f => f.endsWith('.svg')).length;
  console.log('  scènes copiées : ' + n + ' fichier(s)');
}
console.log("preview/ régénéré depuis src/ (polices incluses ; l'image d'accueil est une composition en ligne)");
