// js/views/admin_combat.js — Build AC1 (MVP gestion combat côté Admin)
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

/* ---------- helpers ---------- */
function ensureCombat(S){
  if(!S.combat || typeof S.combat!=='object') S.combat = { active:false, round:1, turnIndex:0, order:[] };
  if(!Array.isArray(S.combat.order)) S.combat.order = [];
  return S.combat;
}
function ensureEnemies(S){
  // fallback: accept various possible keys used historically
  if(Array.isArray(S.enemies)) return S.enemies;
  if(Array.isArray(S.deployed)) return S.deployed;
  if(Array.isArray(S.deploy)) return S.deploy;
  return (S.enemies = []);
}
function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }
function rollD20(){ return 1 + Math.floor(Math.random()*20); }
function statFrom(obj, key){
  key = String(key||'').trim();
  if(!obj || typeof obj!=='object') return 0;
  const cand = [
    ['attrs', key],
    ['attributes', key],
    ['stats', key],
    ['characteristics', key],
    ['baseStats', key],
    ['mods','stats', key],          // mods.stats.key
    ['modifiers','stats', key],
  ];
  for(const path of cand){
    let cur = obj;
    for(const k of path){
      if(cur && (k in cur)){ cur = cur[k]; } else { cur = undefined; break; }
    }
    if(typeof cur === 'number') return cur|0;
    if(cur!=null && !isNaN(+cur)) return (+cur)|0;
  }
  return 0;
}
function bestInitBonus(ent){
  const prefs = ['INIT','Initiative','AGI','DEX','VIT','Vitesse'];
  let b = 0;
  for(const p of prefs){ const v = statFrom(ent,p); if(v>b) b=v; }
  return b|0;
}
function participants(S){
  const c = ensureCombat(S);
  return c.order || [];
}
function findEnemyName(e){ return e?.name || e?.id || 'Créature'; }

/* ---------- UI components ---------- */
function orderRow(S, pt, index){
  const row = el('div','list-item small');
  const left = el('div');
  const nm = document.createElement('b'); nm.textContent = pt.name||'—';
  const kind = el('span','muted small'); kind.style.marginLeft='6px'; kind.textContent = `(${pt.kind||'?'})`;
  left.append(nm, kind);

  const right = el('div');
  const initI = document.createElement('input'); initI.className='input'; initI.type='number'; initI.style.width='90px'; initI.value = pt.init ?? 0;
  const setB = el('button','btn small'); setB.textContent='OK';
  const upB  = el('button','btn small secondary'); upB.textContent='▲';
  const dnB  = el('button','btn small secondary'); dnB.textContent='▼';
  const rmB  = el('button','btn small danger'); rmB.textContent='Retirer';

  setB.onclick = ()=>{ pt.init = Math.floor(+initI.value||0); save(S); };
  upB.onclick = ()=>{ const c=ensureCombat(S); if(index>0){ c.order.splice(index-1,0,c.order.splice(index,1)[0]); save(S); render(); } };
  dnB.onclick = ()=>{ const c=ensureCombat(S); if(index < c.order.length-1){ c.order.splice(index+1,0,c.order.splice(index,1)[0]); save(S); render(); } };
  rmB.onclick = ()=>{ const c=ensureCombat(S); c.order = c.order.filter(x=> x!==pt); save(S); render(); };

  right.append(initI,setB, upB,dnB, rmB);
  row.append(left, right);
  return row;
}

function enemyPicker(S){
  const wrap = el('div','list-item small');
  const left = el('div'); left.innerHTML = '<b>Ajouter</b>';
  const right = el('div');
  const sel = document.createElement('select'); sel.className='select';
  const enemies = ensureEnemies(S);
  enemies.forEach((e,i)=>{
    const o = document.createElement('option');
    o.value = String(i); o.textContent = findEnemyName(e);
    sel.appendChild(o);
  });
  const addB = el('button','btn small'); addB.textContent='Ajouter à l\'ordre';
  addB.onclick = ()=>{
    const idx = +sel.value||0;
    const e = enemies[idx]; if(!e) return;
    const c = ensureCombat(S);
    c.order.push({ id: e.id || ('enemy_'+idx), name: findEnemyName(e), kind:'ennemi', init: 0, ref: {type:'enemy', index:idx} });
    save(S); render();
  };
  right.append(sel, addB);
  wrap.append(left,right);
  return wrap;
}

function controlsPanel(S){
  const box = el('div','panel');
  const head = el('div','list-item'); head.innerHTML = `<div><b>Combat</b></div><div class="muted small">${S.combat?.active?'En cours':'Hors combat'} · Round ${S.combat?.round||1}</div>`;
  box.appendChild(head);
  const bar = el('div','list-item row'); bar.style.gap='8px'; bar.style.flexWrap='wrap';
  const startB = el('button','btn small'); startB.textContent = S.combat?.active ? 'Mettre en pause' : 'Démarrer';
  const nextB  = el('button','btn small'); nextB.textContent = 'Tour suivant';
  const prevB  = el('button','btn small'); prevB.textContent = 'Tour précédent';
  const newRB  = el('button','btn small secondary'); newRB.textContent = 'Nouveau round';
  const sortB  = el('button','btn small secondary'); sortB.textContent = 'Trier par initiative';
  const massB  = el('button','btn small'); massB.textContent = 'Init auto (ennemis)';
  startB.onclick = ()=>{ const c=ensureCombat(S); c.active=!c.active; save(S); render(); };
  nextB.onclick  = ()=>{ const c=ensureCombat(S); if(c.order.length){ c.turnIndex=(c.turnIndex+1)%c.order.length; if(c.turnIndex===0) c.round=(c.round||1)+1; save(S); render(); } };
  prevB.onclick  = ()=>{ const c=ensureCombat(S); if(c.order.length){ c.turnIndex=(c.turnIndex-1+c.order.length)%c.order.length; save(S); render(); } };
  newRB.onclick  = ()=>{ const c=ensureCombat(S); c.round=(c.round||1)+1; save(S); render(); };
  sortB.onclick  = ()=>{ const c=ensureCombat(S); c.order.sort((a,b)=>(b.init||0)-(a.init||0)); save(S); render(); };
  massB.onclick  = ()=>{
    const c=ensureCombat(S);
    (c.order||[]).forEach(pt=>{
      if(pt.kind==='ennemi'){
        const enemies = ensureEnemies(S);
        const ref = enemies[pt?.ref?.index||-1];
        const bonus = bestInitBonus(ref);
        pt.init = rollD20() + bonus;
      }
    });
    save(S); render();
  };
  bar.append(startB, nextB, prevB, newRB, sortB, massB);
  box.appendChild(bar);
  return box;
}

function orderPanel(S){
  const box = el('div','panel');
  box.innerHTML = `<div class="list-item"><div><b>Ordre d'initiative</b></div></div>`;
  const list = el('div','list');
  const c = ensureCombat(S);
  (c.order||[]).forEach((pt,i)=> list.appendChild(orderRow(S, pt, i)));
  box.appendChild(list);
  // add picker
  box.appendChild(enemyPicker(S));
  return box;
}

function resourcesPanel(S){
  const enemies = ensureEnemies(S);
  const box = el('div','panel');
  box.innerHTML = `<div class="list-item"><div><b>Adversaires (déployés)</b></div></div>`;
  const list = el('div','list');
  enemies.forEach((e, i)=>{
    const row = el('div','list-item small');
    const left = el('div');
    const nm = document.createElement('b'); nm.textContent = findEnemyName(e);
    left.append(nm);
    const right = el('div');
    const res = e.resources || {};
    Object.keys(res).forEach(k=>{
      const wrapper = el('span'); wrapper.style.marginLeft='10px';
      const minus=el('button','btn small secondary'); minus.textContent='-';
      const plus =el('button','btn small secondary'); plus.textContent='+';
      const label=document.createElement('span'); label.className='pill'; label.style.marginLeft='4px';
      const upd = ()=>{ label.textContent = `${k}: ${res[k].current||0}/${res[k].max||0}`; };
      minus.onclick=()=>{ res[k].current=Math.max(0,(res[k].current||0)-1); save(S); upd(); };
      plus.onclick =()=>{ res[k].current=Math.min((res[k].max||0),(res[k].current||0)+1); save(S); upd(); };
      upd();
      wrapper.append(minus, plus, label);
      right.appendChild(wrapper);
    });
    row.append(left,right); list.appendChild(row);
  });
  box.appendChild(list);
  return box;
}

/* ---------- root ---------- */
let _root=null;
function render(){
  const S = get();
  if(!_root) return;
  _root.innerHTML='';
  _root.append(controlsPanel(S), orderPanel(S), resourcesPanel(S));
}

export function renderAdminCombat(){
  const root = el('div');
  _root = root;
  render();
  return root;
}
export default renderAdminCombat;
