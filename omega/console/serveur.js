#!/usr/bin/env node
'use strict';
/* OMEGA CONTROL PLANE — console locale, sans dépendance.

     npm run omega:console        → http://127.0.0.1:4747

   Écoute uniquement sur 127.0.0.1. Chaque action (POST) exige le jeton
   affiché au démarrage : une autre page ouverte dans le navigateur ne peut
   pas approuver un message à ta place. Les boutons appellent les mêmes
   commandes que le terminal (omega/commandes.js). */

const http = require('http');
const crypto = require('crypto');
const C = require('../commandes.js');

const PORT = Number(process.env.OMEGA_PORT || 4747);
const JETON = process.env.OMEGA_JETON || crypto.randomBytes(16).toString('hex');

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Omega Control</title><style>
:root{--f:#18181b;--p:#fafafa;--c:#fff;--b:#e4e4e7;--m:#71717a;--a:#2563eb;--ok:#15803d;--ko:#b91c1c}
@media (prefers-color-scheme:dark){:root{--f:#f4f4f5;--p:#0b0b0d;--c:#16161a;--b:#27272a;--m:#a1a1aa;--a:#60a5fa;--ok:#4ade80;--ko:#f87171}}
*{box-sizing:border-box}body{margin:0;background:var(--p);color:var(--f);font:15px/1.5 system-ui,sans-serif}
header{padding:16px;border-bottom:1px solid var(--b);display:flex;gap:12px;flex-wrap:wrap;align-items:center}
nav a{color:var(--m);margin-right:12px;text-decoration:none}main{max-width:1000px;margin:0 auto;padding:16px}
section{background:var(--c);border:1px solid var(--b);border-radius:10px;padding:16px;margin:0 0 16px}h2{font-size:13px;letter-spacing:.06em;color:var(--m);margin:0 0 10px}
.kpi{display:flex;flex-wrap:wrap;gap:8px}.kpi div{border:1px solid var(--b);border-radius:8px;padding:8px 10px;min-width:92px}.kpi b{display:block;font-size:20px}
.kpi span{font-size:11px;color:var(--m)}pre{white-space:pre-wrap;background:var(--p);padding:10px;border-radius:8px;font:13px/1.45 ui-monospace,monospace}
button{font:inherit;border:1px solid var(--b);background:var(--c);color:var(--f);border-radius:8px;padding:6px 12px;cursor:pointer;margin-right:6px}
button.p{background:var(--a);border-color:var(--a);color:#fff}.m{color:var(--m);font-size:13px}.msg{border-top:1px solid var(--b);padding-top:12px;margin-top:12px}
textarea{width:100%;min-height:160px;font:13px/1.45 ui-monospace,monospace;background:var(--p);color:var(--f);border:1px solid var(--b);border-radius:8px;padding:8px}
input{font:inherit;padding:6px;border:1px solid var(--b);border-radius:8px;background:var(--p);color:var(--f);width:280px;max-width:100%}
</style></head><body><header><strong>JARVIS Ω</strong><input id="jeton" placeholder="jeton affiché dans le terminal">
<button class="p" onclick="act('executer',{})">Exécuter les actions AUTO</button><span id="info" class="m"></span></header>
<main><nav><a href="#now">NOW</a><a href="#fc">FIRST CUSTOMER</a><a href="#opp">OPPORTUNITIES</a><a href="#leads">LEADS</a><a href="#exp">EXPERIMENTS</a><a href="#workers">WORKERS</a><a href="#money">MONEY</a><a href="#appr">APPROVALS</a></nav>
<section id="now"><h2>NOW</h2><div id="now-c"></div></section>
<section id="fc"><h2>FIRST CUSTOMER</h2><div id="fc-c" class="kpi"></div><div id="arbre"></div></section>
<section id="appr"><h2>APPROVALS</h2><div id="appr-c"></div></section>
<section id="opp"><h2>OPPORTUNITIES</h2><div id="opp-c"></div></section>
<section id="leads"><h2>LEADS</h2><div id="leads-c"></div></section>
<section id="exp"><h2>EXPERIMENTS</h2><div id="exp-c"></div></section>
<section id="workers"><h2>WORKERS</h2><div id="w-c"></div></section>
<section id="money"><h2>MONEY</h2><div id="money-c"></div></section>
</main><script>
const $=id=>document.getElementById(id);const esc=s=>String(s==null?'UNKNOWN':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
try{$('jeton').value=sessionStorage.getItem('omega-jeton')||''}catch(e){}
$('jeton').onchange=()=>{try{sessionStorage.setItem('omega-jeton',$('jeton').value)}catch(e){}};
async function get(c){const r=await fetch('/api/'+c);return r.json()}
async function act(c,a){$('info').textContent='…';const r=await fetch('/api/'+c,{method:'POST',headers:{'content-type':'application/json','x-omega-jeton':$('jeton').value},body:JSON.stringify(a)});const j=await r.json();$('info').textContent=j.erreur?('✗ '+j.erreur):'✓ '+c;if(j.resultat&&j.resultat.lien)window.open(j.resultat.lien,'_blank');charger()}
const kpi=(l,v)=>'<div><b>'+esc(v)+'</b><span>'+l+'</span></div>';
async function charger(){
 const e=await get('etat');const f=e.entonnoir;
 $('now-c').innerHTML='<p><b>Prochaine action AUTO :</b> '+esc(e.prochaineAuto?e.prochaineAuto.titre:'aucune')+'<br><b>Prochain point humain :</b> '+esc(e.prochainHumain?e.prochainHumain.titre:'—')+'<br><span class="m">Distance au premier client : '+e.distance.etapesRestantes+'/'+e.distance.sur+' — '+esc(e.distance.prochaine)+'</span></p>';
 $('fc-c').innerHTML=[['TARGET',f.cible],['FOUND',f.prospectsTrouves],['QUALIFIED',f.qualifies],['CONTACTED',f.contactes],['REPLIES',f.reponses],['INTERESTED',f.interesses],['PROPOSALS',f.propositions],['WON',f.gagnes],['P(first)',e.probabilite.valeur==null?'UNKNOWN':Math.round(e.probabilite.valeur*100)+' %'],['AUTONOMY',Math.round(e.autonomie.ratio*100)+' %']].map(x=>kpi(x[0],x[1])).join('');
 $('arbre').innerHTML='<pre>'+e.arbre.map(n=>(n.statut==='FAIT'?'✓':n.statut==='BLOQUE'?'■':'·')+' ['+n.mode+'] '+esc(n.titre)+(n.bloque?'\\n   BLOQUÉ : '+esc(n.bloque):'')).join('\\n')+'</pre>';
 $('opp-c').innerHTML='<pre>'+(Array.isArray(e.recommandation)?e.recommandation.map(r=>esc(r.id)+'  seuil '+Math.round(r.seuilHoraire)+' €/h  p '+Math.round(r.p*100)+' %  test '+esc(r.etatTest.statut)).join('\\n'):'')+'\\n\\nÉcartées :\\n'+e.ecartees.map(x=>esc(x.id)+' — '+esc(x.refus[0])).join('\\n')+'</pre>';
 const q=await get('file');
 $('appr-c').innerHTML=q.length?q.map(m=>'<div class="msg"><b>'+esc(m.company)+'</b> <span class="m">'+esc(m.statut)+' · '+esc(m.canal)+' → '+esc(m.destinataire)+' · score '+m.score+' · '+esc(m.templateVersion)+'</span><p class="m">Pourquoi : '+esc(m.pourquoi)+'<br>Valeur attendue : '+esc(m.valeurAttendue.euros==null?m.valeurAttendue.base:m.valeurAttendue.euros+' €')+'</p><textarea id="t-'+m.id+'">'+esc(m.texte)+'</textarea><p>'+
  (m.statut==='AWAITING_HUMAN_SEND'?'<button class="p" onclick="window.open(\\''+esc(m.lien)+'\\')">Ouvrir Instagram</button><button onclick="act(\\'confirmer\\',{id:\\''+m.id+'\\'})">C\\'est envoyé</button>':
  '<button class="p" onclick="envoi(\\''+m.id+'\\')">SEND</button><button onclick="act(\\'approuver\\',{id:\\''+m.id+'\\',texte:$(\\'t-'+m.id+'\\').value})">EDIT + APPROVE</button><button onclick="act(\\'ignorer\\',{id:\\''+m.id+'\\'})">SKIP</button>')+'</p></div>').join(''):'<p class="m">Rien à approuver.</p>';
 const ex=await get('apprentissage');$('exp-c').innerHTML='<pre>'+esc(e.experience)+'\\n'+Object.entries(ex).map(([k,g])=>k+' : '+g.contactes+' contactés, '+g.reponses+' réponses, '+g.ventes+' ventes — '+g.echantillon).join('\\n')+'</pre>';
 const t=await get('taches');$('w-c').innerHTML='<pre>'+t.slice(-15).reverse().map(x=>esc(x.status.padEnd(15))+esc(x.type)+(x.lastError?'  — '+esc(x.lastError):'')).join('\\n')+'</pre>';
 const a=await get('argent');$('money-c').innerHTML='<div class="kpi">'+kpi('REVENU ENREGISTRÉ',a.revenuEnregistre+' €')+kpi('PAIEMENTS',a.paiements)+kpi('COÛT IA/API',a.coutsIAetAPI+' €')+kpi('PROFIT/H HUMAINE',a.profitNetParHeureHumaine)+'</div><p class="m">'+esc(a.rappel)+'</p>';
 const leads=await get('leads');$('leads-c').innerHTML='<pre>'+leads.map(l=>String(l.score).padStart(3)+'  '+esc(l.status.padEnd(11))+esc(l.company)+'  '+esc(l.location.ville)+'  @'+esc(l.publicContactData.instagram)+'  ['+esc(l.source.id)+']').join('\\n')+'</pre>';
}
async function envoi(id){await act('approuver',{id,texte:$('t-'+id).value});await act('envoyer',{id})}
charger();
</script></body></html>`;

const LECTURE = {etat: 'etat', file: 'file', taches: 'taches', argent: 'argent', apprentissage: 'apprentissage', brief: 'brief', agents: 'agents', comptes: 'comptes'};
const ECRITURE = ['executer', 'approuver', 'ignorer', 'envoyer', 'confirmer', 'reponse', 'avancer', 'tache-approuver', 'activer', 'genesis'];

function repondre(res, code, obj){ res.writeHead(code, {'content-type': 'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); }

const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if(req.method === 'GET' && url.pathname === '/'){ res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); return res.end(PAGE); }
    const m = url.pathname.match(/^\/api\/([a-z-]+)$/);
    if(!m) return repondre(res, 404, {erreur: 'introuvable'});
    if(req.method === 'GET'){
      if(m[1] === 'leads') return repondre(res, 200, Object.values(require('../hunter/hunter.js').lireLeads()).sort((a, b) => b.score - a.score));
      if(!LECTURE[m[1]]) return repondre(res, 404, {erreur: 'lecture inconnue'});
      return repondre(res, 200, await C.executer(LECTURE[m[1]], {}));
    }
    if(req.method === 'POST'){
      if(!ECRITURE.includes(m[1])) return repondre(res, 404, {erreur: 'action inconnue'});
      const jeton = req.headers['x-omega-jeton'] || '';
      if(jeton.length !== JETON.length || !crypto.timingSafeEqual(Buffer.from(jeton), Buffer.from(JETON))) return repondre(res, 403, {erreur: 'jeton absent ou faux'});
      let corps = '';
      for await (const c of req){ corps += c; if(corps.length > 100000) return repondre(res, 413, {erreur: 'trop gros'}); }
      const args = corps ? JSON.parse(corps) : {};
      return repondre(res, 200, {resultat: await C.executer(m[1], args)});
    }
    repondre(res, 405, {erreur: 'méthode'});
  } catch(e){ repondre(res, 400, {erreur: e.message}); }
});

if(require.main === module){
  serveur.listen(PORT, '127.0.0.1', () => {
    console.log('Omega Control Plane : http://127.0.0.1:' + PORT);
    console.log('Jeton (à coller dans la page) : ' + JETON);
  });
}

module.exports = {serveur, JETON};
