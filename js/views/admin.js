// js/views/admin.js — Tous les onglets + loader robuste
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function tabButton(def, active){
  const b = el('button','btn secondary tab' + (active ? ' active' : ''));
  b.textContent = def.label;
  b.dataset.id = def.id;
  return b;
}
function mountLoader(panel, loader){
  panel.innerHTML = '<div class="muted small">Chargement...</div>';
  Promise.resolve().then(()=> loader()).then(node=>{
    panel.innerHTML = '';
    if(node && node.nodeType===1) panel.appendChild(node);
    else panel.textContent='(contenu vide)';
  }).catch(err=>{
    console.error('[Admin loader error]', err);
    const msg = '[Admin loader error] ' + (err && err.message ? err.message : String(err));
    panel.innerHTML = '<div class="error">'+ msg +'</div>';
  });
}

export function renderAdmin(){
  const S = State.get();
  const root = el('div');
  const tabs = el('div','row'); tabs.style.gap='8px'; tabs.style.flexWrap='wrap';
  const panel = el('div'); panel.style.marginTop='12px';

  const defs = [
    { id:'sys',     label:'Système',    loader:()=> import('./admin_systems.js').then(m=> (m.renderAdminSystems||m.default)(S)) },
    { id:'races',   label:'Races',      loader:()=> import('./admin_races.js').then(m=> (m.renderAdminRaces||m.default)(S)) },
    { id:'tribes',  label:'Tribus',     loader:()=> import('./admin_tribes.js').then(m=> (m.renderAdminTribes||m.default)(S)) },
    { id:'classes', label:'Classes',    loader:()=> import('./admin_classes.js').then(m=> (m.renderAdminClasses||m.default)(S)) },
    { id:'stats',   label:'Stats',      loader:()=> import('./admin_stats.js').then(m=> (m.renderAdminStats||m.default)(S)) },
    { id:'res',     label:'Ressources', loader:()=> import('./admin_resources.js').then(m=> (m.renderAdminResources||m.default)(S)) },
    { id:'items',   label:'Objets',     loader:()=> import('./admin_items.js').then(m=> (m.renderAdminItems||m.default)(S)) },
    { id:'best',    label:'Bestiaire',  loader:()=> import('./admin_bestiaire.js').then(m=> (m.renderAdminBestiaire||m.default)(S)) },
    { id:'timers',  label:'Timers',     loader:()=> import('./admin_timers.js').then(m=> (m.renderAdminTimers||m.default)(S)) },
    { id:'players', label:'Joueurs',    loader:()=> import('./admin_players.js').then(m=> (m.renderAdminPlayers||m.default)(S)) },
    { id:'lore',    label:'Lore',       loader:()=> import('./admin_lore.js').then(m=> (m.renderAdminLore||m.default)(S)) },
    { id:'slots',   label:'Slots',      loader:()=> import('./admin_slots.js').then(m=> (m.renderAdminSlots||m.default)(S)) },
  ];

  defs.forEach((d,i)=>{
    const b = tabButton(d, i===0);
    b.onclick = ()=>{
      [...tabs.children].forEach(x=> x.classList.remove('active'));
      b.classList.add('active');
      mountLoader(panel, d.loader);
    };
    tabs.appendChild(b);
  });

  root.appendChild(tabs);
  root.appendChild(panel);
  mountLoader(panel, defs[0].loader);
  return root;
}
export default renderAdmin;
export function renderAdminApp(){ return renderAdmin(); }
