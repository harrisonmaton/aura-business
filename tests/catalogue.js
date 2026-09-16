/* Le catalogue est écrit dans deux fichiers distincts (vitrine et back-office).
   Ce test rend la divergence impossible sans faire rougir la recette. */
const fs=require('fs');
const cat=JSON.parse(fs.readFileSync(__dirname+'/../src/catalog.json','utf8'));
const src={vitrine:fs.readFileSync(__dirname+'/../src/vitrine.html','utf8'),
           office:fs.readFileSync(__dirname+'/../src/back-office.html','utf8')};
const err=[];
for(const p of cat.brief){
  for(const [f,t] of Object.entries(src)){
    const re=new RegExp(`id:${p.id},[^}]*price:${p.price}\\b`);
    if(!re.test(t)) err.push(`${f} : pack sur brief n°${p.id} ${p.name} à ${p.price}€ introuvable`);
  }
  const rx=new RegExp(`name:"${p.name}",\\s*price:(\\d+)`);
  for(const [f,t] of Object.entries(src)){
    const m=t.match(rx);
    if(m&&Number(m[1])!==p.price) err.push(`${f} : ${p.name} à ${m[1]}€ au lieu de ${p.price}€`);
  }
}
for(const r of cat.ready){
  const m=src.office.match(new RegExp(`name:"${r.name}",\\s*price:(\\d+)`));
  if(!m) err.push(`back-office : collection ${r.name} absente du registre`);
  else if(Number(m[1])!==r.price) err.push(`back-office : ${r.name} à ${m[1]}€ au lieu de ${r.price}€`);
  const v=src.vitrine.match(new RegExp(`id:${r.id},\\s*price:(\\d+),\\s*name:"${r.name}"`));
  if(v&&Number(v[1])!==r.price) err.push(`vitrine : ${r.name} à ${v[1]}€ au lieu de ${r.price}€`);

  /* Le nombre de fichiers livrables pilote la mise en vente. Une divergence
     entre le catalogue et une page remettrait en vente une collection vide. */
  if(typeof r.assets!=='number'){ err.push(`catalog.json : collection ${r.name} sans champ assets`); continue; }
  const vo=src.vitrine.match(new RegExp(`id:${r.id},\\s*price:${r.price},[^}]*assets:(\\d+)`));
  if(!vo) err.push(`vitrine : collection n°${r.id} ${r.name} sans champ assets`);
  else if(Number(vo[1])!==r.assets) err.push(`vitrine : ${r.name} annonce ${vo[1]} fichier(s) au lieu de ${r.assets}`);
  const oo=src.office.match(new RegExp(`name:"${r.name}",\\s*price:${r.price},\\s*assets:(\\d+)`));
  if(!oo) err.push(`back-office : collection ${r.name} sans champ assets`);
  else if(Number(oo[1])!==r.assets) err.push(`back-office : ${r.name} annonce ${oo[1]} fichier(s) au lieu de ${r.assets}`);
}
if(err.length){ console.log('ÉCHEC — divergence de catalogue :'); err.forEach(e=>console.log('  '+e)); process.exit(1); }
/* Les délais annoncés vivent dans catalog.json. Recopiés dans une page ou dans
   un visuel de couverture, ils finissent par promettre un délai périmé. */
for(const p of cat.brief){
  if(!p.delay){ err.push(`catalog.json : pack ${p.name} sans délai`); continue; }
  const v=src.vitrine.match(new RegExp(`id:${p.id},[^}]*delay:"([^"]+)"`));
  if(!v) err.push(`vitrine : pack ${p.name} sans délai`);
  else if(v[1]!==p.delay) err.push(`vitrine : ${p.name} annonce « ${v[1]} » au lieu de « ${p.delay} »`);
}
/* Les couvertures sont générées depuis le catalogue : si l'une d'elles affiche
   un prix ou un délai qui n'en vient pas, c'est qu'elle a été recopiée. */
const fs2=require('fs'), dirC=__dirname+'/../src/creations';
for(const c of cat.brief.concat(cat.ready)){
  const f=`${dirC}/c-${c.name.toLowerCase()}.svg`;
  if(!fs2.existsSync(f)){ err.push(`couverture manquante pour ${c.name}`); continue; }
  const svg=fs2.readFileSync(f,'utf8');
  if(!svg.includes(`${c.price} €`)) err.push(`couverture ${c.name} : prix ${c.price} € absent du visuel`);
  if(c.delay && !svg.includes(c.delay.toUpperCase())) err.push(`couverture ${c.name} : délai « ${c.delay} » absent du visuel`);
  if(c.assets === 0 && !/EN PRÉPARATION/.test(svg)) err.push(`couverture ${c.name} : sans fichier mais non marquée en préparation`);
}
if(err.length){ console.log('ÉCHEC — divergence de catalogue :'); err.forEach(e=>console.log('  '+e)); process.exit(1); }

const vendables=cat.ready.filter(r=>r.assets>0).length;
console.log(`PASS  — catalogue cohérent : ${cat.brief.length} packs sur brief + ${cat.ready.length} collections, prix et fichiers identiques dans les deux pages`);
console.log(`PASS  — collections livrables : ${vendables}/${cat.ready.length} (les autres sont en assets_missing)`);
process.exit(0);
