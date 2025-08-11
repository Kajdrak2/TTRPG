// js/views/player.js — 6.2.13
// Badge “Objets” mis à jour PARTOUT, sans ouvrir l’onglet :
// -> poll direct de State.get().lootbox + écoute storage/stateSaved
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

// Emettre un event après chaque save (sélectif si déjà patché)
(function patchSaveOnce(){
  try{
    if(!State.___savePatched && typeof State.save==='function'){
      const orig = State.save;
      State.save = function(S){
        const r = orig.apply(State, arguments);
        try{ window.dispatchEvent(new CustomEvent('jdr:stateSaved')); }catch(_e){}
        return r;
      };
      State.___savePatched = true;
    }
  }catch(_e){}
})();

function loadPanel(panelEl, loader){
  panelEl.innerHTML = '<div class="panel"><div class="list-item"><div class="muted">Chargement...</div></div></div>';
  Promise.resolve().then(loader).then(node=>{
    panelEl.innerHTML = '';
    if(node instanceof HTMLElement) panelEl.appendChild(node);
    else if(node && node.nodeType) panelEl.appendChild(node);
    else if(typeof node === 'string'){ const d=document.createElement('div'); d.innerHTML=node; panelEl.appendChild(d); }
    else panelEl.innerHTML = '<div class="muted panel">[vide]</div>';
  }).catch(err=>{
    console.error('[Player loader error]', err);
    panelEl.innerHTML = '<div class="panel"><div class="list-item"><div class="muted">Panneau bientôt disponible</div></div></div>';
  });
}

function makeTab(label){
  const b = el('button','btn secondary tab');
  b.textContent = label;
  b.style.position = 'relative';
  const ind = document.createElement('span');
  ind.className = 'tab-ind';
  ind.textContent = '!';
  Object.assign(ind.style, {
    position:'absolute', top:'-6px', right:'-6px', width:'16px', height:'16px',
    borderRadius:'999px', display:'none', alignItems:'center', justifyContent:'center',
    fontSize:'11px', fontWeight:'700', background:'#f59e0b', color:'#0b1220',
    boxShadow:'0 0 0 2px rgba(255,255,255,0.08)', lineHeight:'16px'
  });
  b.appendChild(ind);
  return b;
}

function setBadge(elBtn, show){
  if(!elBtn) return;
  const ind = elBtn.querySelector('.tab-ind');
  if(!ind) return;
  ind.style.display = show ? 'flex' : 'none';
  ind.dataset.visible = show ? '1' : '0';
}

function sumObj(obj){ let n=0; if(!obj) return 0; for(const k in obj){ if(Object.prototype.hasOwnProperty.call(obj,k)) n += (+obj[k]||0);} return n; }
function lootboxTotalQty(S){
  const lb = Array.isArray(S?.lootbox) ? S.lootbox : [];
  return lb.reduce((a,st)=> a + (parseInt(st?.qty,10)||0), 0);
}

export function renderPlayerApp(S){
  const root = el('div');
  const tabs = el('div','row'); tabs.style.gap='10px'; tabs.style.flexWrap='wrap';

  const defs = [
    {id:'p-sheet', label:'Personnage', loader:()=>import('./player_sheet.js').then(m=>(m.renderPlayerSheet||m.default)(State.get?State.get():S))},
    {id:'p-dice',  label:'Dés',        loader:()=>import('./player_dice.js').then(m=>(m.renderPlayerDice||m.default)(State.get?State.get():S))},
    {id:'p-inv',   label:'Objets',     loader:()=>import('./player_inventory.js').then(m=>(m.renderPlayerInventory||m.default)(State.get?State.get():S))}
  ];

  const buttons = [];
  let btnInv = null; // référence directe au bouton Objets
  let btnSheet = null;

  defs.forEach((t,i)=>{
    const b = makeTab(t.label);
    if(i===0) b.classList.add('active');
    b.dataset.id = t.id;
    if(t.id==='p-inv'){ b.id = 'tab-objets'; btnInv = b; }
    if(t.id==='p-sheet'){ btnSheet = b; }
    tabs.appendChild(b);
    buttons.push(b);
  });
  root.appendChild(tabs);

  const panels = {};
  defs.forEach((d,i)=>{ panels[d.id]=el('div'); panels[d.id].className='mt8'; if(i!==0) panels[d.id].style.display='none'; root.appendChild(panels[d.id]); });

  function activate(id){
    Object.values(panels).forEach(p=> p.style.display='none');
    buttons.forEach(b=> b.classList.remove('active'));
    panels[id].style.display='block';
    const btn = buttons.find(b=> b.dataset.id===id);
    if(btn) btn.classList.add('active');
  }
  buttons.forEach((b, idx)=>{
    b.addEventListener('click', ()=>{
      const def = defs[idx];
      activate(def.id);
      loadPanel(panels[def.id], def.loader);
    });
  });

  loadPanel(panels[defs[0].id], defs[0].loader);

  // --------- Badges (poll + events) ---------
  const last = { loot: NaN, points: NaN };
  function refreshBadges(){
    try{
      const Sf = State.get ? State.get() : S;

      // Points (sur Personnage)
      const p = (Sf.players||[])[0];
      let pointsAvail = 0;
      if(p){
        const spentDraft = sumObj(p.tempSpent);
        pointsAvail = Math.max(0, (+p.bonusPoints||0) - spentDraft);
      }
      if(pointsAvail !== last.points){
        setBadge(btnSheet, pointsAvail>0);
        last.points = pointsAvail;
      }

      // Lootbox (sur Objets) — lecture directe du state global
      const loot = lootboxTotalQty(Sf);
      if(loot !== last.loot){
        setBadge(btnInv, loot>0);
        last.loot = loot;
      }
    }catch(_e){ /* noop */ }
  }

  // 1er calcul tout de suite
  refreshBadges();

  // Polling global indépendant de l’onglet courant
  if(typeof window!=='undefined'){
    if(window.__JDR_PLAYER_BADGES_TICK__) clearInterval(window.__JDR_PLAYER_BADGES_TICK__);
    window.__JDR_PLAYER_BADGES_TICK__ = setInterval(refreshBadges, 700);

    // Quand le state change (save) ou si un autre onglet modifie le localStorage
    window.addEventListener('jdr:stateSaved', refreshBadges);
    window.addEventListener('storage', e=>{ if(e && e.key==='JDR_STUDIO_STATE_V1') refreshBadges(); });
    // Si la vue Objets émet un total exact, on l’applique et on recalcule
    window.addEventListener('jdr:lootboxChanged', e=>{
      const tot = e?.detail?.total;
      if(typeof tot==='number') setBadge(btnInv, tot>0);
      refreshBadges();
    });
  }

  return root;
}
export default renderPlayerApp;
