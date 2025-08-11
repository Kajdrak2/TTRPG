// js/views/admin.js — Ajout onglet Bestiaire (Patch 6.1a+b)
import { el } from '../core/ui.js';

function loadPanel(panelEl, loader){
  panelEl.innerHTML = '<div class="panel"><div class="list-item"><div class="muted">Chargement...</div></div></div>';
  Promise.resolve().then(loader).then(function(node){
    panelEl.innerHTML='';
    if(node instanceof HTMLElement) panelEl.appendChild(node);
    else if(node && node.nodeType) panelEl.appendChild(node);
    else if(typeof node === 'string'){ const d=document.createElement('div'); d.innerHTML=node; panelEl.appendChild(d); }
    else panelEl.innerHTML = '<div class="muted panel">[vide]</div>';
  }).catch(function(err){
    console.error('[Admin loader error]', err);
    panelEl.innerHTML = '<div class="panel"><div class="list-item"><div class="muted">Panneau bientôt disponible</div></div></div>';
  });
}

export function renderAdminApp(S){
  const root = el('div');
  const tabs = el('div','row'); tabs.style.gap='10px'; tabs.style.flexWrap='wrap';
  const defs = [
    {id:'a-lore',    label:'Lore',             loader:function(){ return import('./admin_lore.js').then(m=> (m.renderLore||m.default)(S)); }},
    {id:'a-sys',     label:'Système',          loader:function(){ return import('./admin_systems.js').then(m=> (m.renderSystems||m.default)(S)); }},
    {id:'a-cats',    label:'Caractéristiques', loader:function(){ return import('./admin_categories.js').then(m=> (m.renderCategories||m.default)(S)); }},
    {id:'a-res',     label:'Ressources',       loader:function(){ return import('./admin_resources.js').then(m=> (m.renderResourcesAdmin||m.default)(S)); }},
    {id:'a-races',   label:'Races',            loader:function(){ return import('./admin_entities.js').then(m=> (m.renderEntities||m.default)(S,'races')); }},
    {id:'a-tribes',  label:'Tribus',           loader:function(){ return import('./admin_entities.js').then(m=> (m.renderEntities||m.default)(S,'tribes')); }},
    {id:'a-classes', label:'Classes',          loader:function(){ return import('./admin_entities.js').then(m=> (m.renderEntities||m.default)(S,'classes')); }},
    {id:'a-items',   label:'Items',            loader:function(){ return import('./admin_items.js').then(m=> (m.renderAdminItems||m.default)(S)); }},
    {id:'a-players', label:'Joueurs',          loader:function(){ return import('./admin_players.js').then(m=> (m.renderPlayers||m.default)(S)); }},
    {id:'a-timers',  label:'Timers',           loader:function(){ return import('./admin_timers.js').then(m=> (m.renderAdminTimers||m.default)(S)); }},
    // Nouveau : Bestiaire
    {id:'a-best',    label:'Bestiaire',        loader:function(){ return import('./admin_bestiaire.js').then(m=> (m.renderAdminBestiaire||m.default)(S)); }},
  ];

  defs.forEach(function(t,i){
    const b = el('button','btn secondary tab'+(i===0?' active':''));
    b.dataset.id = t.id; b.textContent = t.label; tabs.appendChild(b);
  });
  root.appendChild(tabs);

  const panels = {}; defs.forEach(d=> panels[d.id]=el('div'));
  Object.values(panels).forEach(function(p,i){ p.className='mt8'; if(i!==0) p.style.display='none'; root.appendChild(p); });

  function activate(id){
    Object.values(panels).forEach(p=> p.style.display='none');
    Array.from(tabs.children).forEach(b=> b.classList.remove('active'));
    panels[id].style.display='block';
    const btn = Array.from(tabs.children).find(b=> b.dataset.id===id); if(btn) btn.classList.add('active');
  }

  // listeners
  Array.from(tabs.children).forEach(function(b, idx){
    b.addEventListener('click', function(){
      const def = defs[idx];
      activate(def.id);
      loadPanel(panels[def.id], def.loader);
    });
  });

  // charge premier onglet
  loadPanel(panels[defs[0].id], defs[0].loader);

  return root;
}
export default renderAdminApp;
