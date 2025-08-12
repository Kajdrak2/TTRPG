// js/views/admin.js — Build A7 (tabs: Système, Bestiaire, Timers, MJ, Combat)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function tabButton(def, active=false){
  const b = el('button','btn secondary tab'+(active?' active':''));
  b.textContent = def.label;
  b.dataset.id = def.id;
  return b;
}
function mountLoader(panel, loader){
  panel.innerHTML = '<div class="muted small">Chargement…</div>';
  Promise.resolve()
    .then(loader)
    .then(node => {
      panel.innerHTML='';
      if(node instanceof HTMLElement) panel.appendChild(node);
      else if(node && node.nodeType===1) panel.appendChild(node);
      else panel.textContent='(contenu vide)';
    })
    .catch(err => {
      console.error('[Admin loader error]', err);
      panel.innerHTML = `<div class="error">[Admin loader error] ${(err && err.message) || err}</div>`;
    });
}

export function renderAdmin(){
  const S = State.get();
  const root = el('div');
  const tabs = el('div','row'); tabs.style.gap='8px';
  const panel = el('div'); panel.style.marginTop='12px';

  const defs = [
    { id:'sys',  label:'Système',   loader:()=>import('./admin_systems.js').then(m=> (m.renderAdminSystems||m.default)(S)) },
    { id:'best', label:'Bestiaire', loader:()=>import('./admin_bestiaire.js').then(m=> (m.renderAdminBestiaire||m.default)(S)) },
    { id:'tim',  label:'Timers',    loader:()=>import('./admin_timers.js').then(m=> (m.renderAdminTimers||m.default)(S)) },
    { id:'lore', label:'Lore',       loader:()=>import('./admin_lore.js').then(m=> (m.renderAdminLore||m.default)(S)) },
    { id:'items',label:'Objets',     loader:()=>import('./admin_items.js').then(m=> (m.renderAdminItems||m.default)(S)) },
    { id:'mj',   label:'Messagerie',        loader:()=>import('./admin_mj.js').then(m=> (m.renderAdminMJ||m.default)(S)) },
    { id:'comb', label:'Combat',    loader:()=>import('./admin_combat.js').then(m=> (m.renderAdminCombat||m.default)(S)) },
  ];

  defs.forEach((d,i)=>{
    const b = tabButton(d, i===0);
    b.onclick = ()=>{
      tabs.querySelectorAll('.tab').forEach(x=> x.classList.remove('active'));
      b.classList.add('active');
      mountLoader(panel, d.loader);
    };
    tabs.appendChild(b);
  });

  root.appendChild(tabs);
  root.appendChild(panel);
  // load first by default
  mountLoader(panel, defs[0].loader);

  return root;
}
export default renderAdmin;
if(typeof window!=='undefined') window.renderAdmin = renderAdmin;


// Back-compat: some shells import { renderAdminApp }
export function renderAdminApp(){ return renderAdmin(); }
