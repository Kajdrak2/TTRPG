// js/bootstrap_route.js — enforce Accueil on first visit or when explicitly requested
(function(){
  var HOME = '#accueil';
  var hasHash = (location.hash && location.hash.length > 1);
  var explicitHome = hasHash && (location.hash === HOME);
  var hasVisited = (localStorage.getItem('ttrpg_hasVisited') === '1');

  // Decide if we must force Accueil for a short window
  var needForce = false;
  if(!hasVisited){ localStorage.setItem('ttrpg_hasVisited','1'); needForce = true; }
  if(explicitHome){ needForce = true; }

  if(needForce){
    if(location.hash !== HOME){ location.hash = HOME; }
    // Strong lock: keep Accueil for a few seconds to beat late restores
    var until = Date.now() + 8000; // 8s window
    var handler = function(){
      try{
        if(Date.now() > until){
          window.removeEventListener('hashchange', handler);
          return;
        }
        if(location.hash !== HOME){
          location.hash = HOME;
        }
      }catch(e){}
    };
    window.addEventListener('hashchange', handler);
    // Also ping a few times just in case some router writes synchronously
    var ticks = 16;
    var tick = function(){
      if(Date.now() > until) return;
      if(location.hash !== HOME) location.hash = HOME;
      setTimeout(tick, 250);
    };
    setTimeout(tick, 0);
  }
})();
