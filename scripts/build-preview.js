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
console.log('preview/ régénéré depuis src/');
