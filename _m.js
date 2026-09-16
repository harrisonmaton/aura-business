const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1440,height:900},locale:'fr-FR'});
 await p.goto('file://'+process.cwd()+'/preview/vitrine.html'); await p.waitForTimeout(1800);
 console.log(JSON.stringify(await p.evaluate(()=>{
  const r=e=>{const b=e.getBoundingClientRect();return Math.round(b.left)+','+Math.round(b.top)+' '+Math.round(b.width)+'x'+Math.round(b.height);};
  return {post:r(document.querySelector('.p-post')), story:r(document.querySelector('.p-story')),
   cartel:r(document.querySelector('.pack-legende')), prix:Math.round(document.getElementById('pack-prix').getBoundingClientRect().bottom),
   fold:innerHeight, roles:[...document.querySelectorAll('.role')].map(e=>e.textContent.trim())};
 }),null,1));
 await p.screenshot({path:'/tmp/claude-0/shots/apres-tells.png'}); await b.close();})();
