/* AURA WATCHES — conversation privée sur Instagram.
   Chaque [data-demande] est un vrai lien vers le profil : si le script ne
   tourne pas, le lien s'ouvre quand même. Le script ajoute seulement la copie
   d'un message prêt à coller. Il n'envoie rien : Instagram ne le permet pas. */
(function () {
  'use strict';
  var IG = 'https://www.instagram.com/polakpl_f44/';

  function message(modele) {
    return modele
      ? 'Salut 👋 Je voudrais recevoir les détails en privé de l’' + modele + ' (prix et disponibilité).'
      : 'Salut 👋 Je voudrais découvrir la sélection AURA et connaître les disponibilités.';
  }

  /* La copie doit partir pendant le geste de l'utilisateur, avant que le
     navigateur ne change d'onglet : execCommand d'abord (synchrone, fiable dans
     les navigateurs intégrés), l'API Clipboard ensuite. */
  function copier(texte) {
    var ok = false;
    try {
      var zone = document.createElement('textarea');
      zone.value = texte;
      zone.setAttribute('readonly', '');
      zone.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(zone);
      zone.select();
      zone.setSelectionRange(0, texte.length);
      ok = document.execCommand('copy');
      document.body.removeChild(zone);
    } catch (e) { ok = false; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).catch(function () {});
      ok = true;
    }
    return ok;
  }

  var toast, minuterie;
  function annoncer(texte) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = texte;
    toast.classList.add('visible');
    clearTimeout(minuterie);
    minuterie = setTimeout(function () { toast.classList.remove('visible'); }, 4200);
  }

  document.addEventListener('click', function (e) {
    var lien = e.target.closest && e.target.closest('[data-demande]');
    if (!lien) return;
    lien.href = IG; // garde-fou : une seule destination, toujours
    var copie = copier(message(lien.getAttribute('data-demande')));
    annoncer(copie
      ? 'Message copié — envoyez-le-nous sur Instagram.'
      : 'Ouverture d’Instagram — écrivez-nous en message privé.');
    // Pas de preventDefault : le lien natif ouvre le profil (app Instagram sur iPhone et Android).
  });

  /* En-tête : fond seulement une fois sorti du hero. */
  var entete = document.querySelector('.entete');
  function surDefilement() { if (entete) entete.classList.toggle('plein', window.scrollY > 40); }
  window.addEventListener('scroll', surDefilement, { passive: true });
  surDefilement();

  /* Barre fixe : sur la fiche, partout où le CTA principal n'est pas visible ;
     sur l'accueil, seulement après le hero. Masquée au-dessus de l'appel final pour ne rien couvrir. */
  var barre = document.querySelector('.barre');
  if (barre && 'IntersectionObserver' in window) {
    document.body.classList.add('a-barre');
    var declencheur = document.querySelector('[data-barre-apres]');
    var fin = document.querySelector('[data-barre-fin]');
    var apres = false, auFinal = false;
    var maj = function () { barre.classList.toggle('visible', apres && !auFinal); };
    // Fiche : la barre est là dès l'arrivée, sauf quand le CTA principal est déjà à l'écran.
    var toujours = barre.hasAttribute('data-toujours');
    apres = toujours;
    if (declencheur) new IntersectionObserver(function (en) {
      apres = toujours ? !en[0].isIntersecting : (!en[0].isIntersecting && en[0].boundingClientRect.top < 0);
      maj();
    }).observe(declencheur);
    maj();
    if (fin) new IntersectionObserver(function (en) { auFinal = en[0].isIntersecting; maj(); }, { rootMargin: '0px 0px -20% 0px' }).observe(fin);
  }

  /* Révélations douces. */
  /* Seuls les blocs sous la ligne de flottaison au chargement attendent :
     le premier écran est toujours visible tel quel. */
  var aReveler = [].filter.call(document.querySelectorAll('.revele'), function (el) {
    return el.getBoundingClientRect().top > window.innerHeight;
  });
  aReveler.forEach(function (el) { el.classList.add('attend'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.remove('attend'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    aReveler.forEach(function (el) { io.observe(el); });
  } else {
    aReveler.forEach(function (el) { el.classList.remove('attend'); });
  }
})();
