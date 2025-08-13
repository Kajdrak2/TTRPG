// js/views/admin.js — Build A12 (tabs incl. Stats & Catégories)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function tabButton(def, active){
  var b = el('button','btn secondary tab' + (active ? ' active' : ''));
  b.textContent = def.label;
  b.dataset.id = def.id;
  return b;
}
function mountLoader(panel, loader){
  panel.innerHTML = '<div class="muted small">Chargement...</div>';
  Promise.resolve().then(function(){ return loader(); }).then(function(node){
    panel.innerHTML='';
    if(node && node.nodeType===1) panel.appendChild(node);
    else panel.textContent='(contenu vide)';
  }).catch(function(err){
    console.error('[Admin loader error]', err);
    var msg = '[Admin loader error] ' + (err && err.message ? err.message : String(err));
    panel.innerHTML = '<div class="error">'+ msg +'</div>';
  });
}

export function renderAdmin(){
  var S = State.get();
  var root = el('div');
  var tabs = el('div','row'); tabs.style.gap='8px';
  var panel = el('div'); panel.style.marginTop='12px';

  var defs = [
    { id:'sys',   label:'Systeme',    loader:function(){ return import('./admin_systems.js').then(function(m){ return (m.renderAdminSystems||m.default)(S); }); } },
    { id:'players', label:'Joueurs',      loader:()=> import('./admin_players.js').then(m=> (m.renderAdminPlayers||m.default)(S)) },
    { id:'stats', label:'Stats',      loader:function(){ return import('./admin_stats.js').then(function(m){ return (m.renderAdminStats||m.default)(S); }); } },
    { id:'races', label:'Races',      loader:function(){ return import('./admin_races.js').then(function(m){ return (m.renderAdminRaces||m.default)(S); }); } },
    { id:'trib',  label:'Tribus',     loader:function(){ return import('./admin_tribes.js').then(function(m){ return (m.renderAdminTribes||m.default)(S); }); } },
    { id:'class', label:'Classes',    loader:function(){ return import('./admin_classes.js').then(function(m){ return (m.renderAdminClasses||m.default)(S); }); } },
    { id:'res',   label:'Ressources', loader:function(){ return import('./admin_resources.js').then(function(m){ return (m.renderAdminResources||m.default)(S); }); } },
    { id:'best',  label:'Bestiaire',  loader:function(){ return import('./admin_bestiaire.js').then(function(m){ return (m.renderAdminBestiaire||m.default)(S); }); } },
    { id:'tim',   label:'Timers',     loader:function(){ return import('./admin_timers.js').then(function(m){ return (m.renderAdminTimers||m.default)(S); }); } },
    { id:'lore',  label:'Lore',       loader:function(){ return import('./admin_lore.js').then(function(m){ return (m.renderAdminLore||m.default)(S); }); } },
    { id:'items', label:'Objets',     loader:function(){ return import('./admin_items.js').then(function(m){ return (m.renderAdminItems||m.default)(S); }); } },
    { id:'mj',    label:'Messagerie', loader:function(){ return import('./admin_mj.js').then(function(m){ return (m.renderAdminMJ||m.default)(S); }); } },
    { id:'comb',  label:'Combat',     loader:function(){ return import('./admin_combat.js').then(function(m){ return (m.renderAdminCombat||m.default)(S); }); } }
  ];

  for(var i=0;i<defs.length;i++){
    (function(d, isFirst){
      var b = tabButton(d, isFirst);
      b.onclick = function(){
        var t = tabs.querySelectorAll('.tab');
        for(var j=0;j<t.length;j++){ t[j].classList.remove('active'); }
        b.classList.add('active');
        mountLoader(panel, d.loader);
      };
      tabs.appendChild(b);
    })(defs[i], i===0);
  }

  root.appendChild(tabs);
  root.appendChild(panel);
  mountLoader(panel, defs[0].loader);
  return root;
}
export default renderAdmin;
if(typeof window!=='undefined') window.renderAdmin = renderAdmin;
export function renderAdminApp(){ return renderAdmin(); }
