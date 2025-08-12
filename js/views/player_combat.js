// js/views/player_combat.js — Build PC5 (MVP combat côté joueur)
// - Lit S.combat (order/round/turnIndex) + S.enemies pour afficher participants
// - Le joueur peut "Lancer mon initiative" (1d20 + meilleur stat parmi INIT/AGI/DEX/VIT/Initiative/Vitesse) ou saisir manuellement
// - Met à jour S.combat.order et tri décroissant par initiative
// - Met en évidence le tour courant; bouton "Fin de mon tour" si c'est le joueur
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function ensureCombat(S){
  if(!S.combat || typeof S.combat!=='object') S.combat = { active:false, round:1, turnIndex:0, order:[] };
  if(!Array.isArray(S.combat.order)) S.combat.order = [];
  return S.combat;
}
function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }
function rollNdM(n, m){ n=Math.max(1,Math.floor(+n||1)); m=Math.max(2,Math.floor(+m||20)); let sum=0, parts=[]; for(let i=0;i<n;i++){ const r=1+Math.floor(Math.random()*m); sum+=r; parts.push(r);} return {sum, parts}; }
function listAllStats(S){ const direct = Array.isArray(S.settings?.stats) ? S.settings.stats.slice() : []; if(direct.length) return direct; const viaCats = (S.settings?.categories||[]).flatMap(c => c.stats||[]); if(viaCats.length) return Array.from(new Set(viaCats)); const fromChars = Array.isArray(S.characteristics) ? S.characteristics.slice() : []; return fromChars; }

function buildVars(S,p){
  // minimal (pas besoin des catégories ici)
  const stats=listAllStats(S);
  const obj={};
  stats.forEach(st=>{
    const base=+(p?.attrs?.[st]||0), invested=+(p?.spent?.[st]||0), draft=+(p?.tempSpent?.[st]||0);
    obj[st]=base+invested+draft;
  });
  return obj;
}
function bestInitStat(vars){
  const prefs = ['INIT','Initiative','AGI','DEX','VIT','Vitesse'];
  let best = {key:null, val:0};
  Object.entries(vars).forEach(([k,v])=>{
    if(prefs.includes(k) || prefs.includes(k.toUpperCase())){
      if(+v>best.val){ best = {key:k, val:+v}; }
    }
  });
  return best;
}
function findPlayer(S){ return (S.players||[])[0] || null; }
function findEnemyName(e){ return e?.name || e?.id || 'ennemi'; }

function participantRow(pcur, isTurn){
  const row = el('div','list-item small');
  const left = el('div'); left.innerHTML = `<b>${escapeHtml(pcur.name||'')}</b> <span class="muted small">(${pcur.kind||'?'})</span>`;
  const right = el('div'); right.innerHTML = `<span class="pill badge">Init: ${pcur.init ?? '-'}</span>`;
  if(isTurn){ row.style.borderLeft='3px solid #22c55e'; }
  row.append(left,right);
  return row;
}

export function renderPlayerCombat(S){
  const box = el('div');
  const c = ensureCombat(S);

  const head = el('div','panel');
  head.innerHTML = `<div class="list-item"><div><b>Combat</b></div><div class="muted small">${c.active?'En cours':'Hors combat'} · Round ${c.round||1}</div></div>`;
  box.appendChild(head);

  const me = findPlayer(S);
  if(!me){
    const w = el('div','panel'); w.innerHTML='<div class="list-item">Aucun personnage</div>'; box.appendChild(w); return box;
  }

  // Initiative area
  const initPanel = el('div','panel');
  const ini = el('div','list-item small');
  const vars = buildVars(S, me);
  const best = bestInitStat(vars);
  const tips = el('div','muted small'); tips.textContent = best.key ? `Suggestion init: ${best.key} = ${best.val}` : `Aucun stat d'initiative détecté (INIT/AGI/DEX/VIT...)`;
  const btnRoll = el('button','btn small'); btnRoll.textContent = 'Lancer mon initiative (1d20 + suggestion)';
  const manual = document.createElement('input'); manual.className='input'; manual.type='number'; manual.placeholder='Saisir mon initiative';
  const btnSet = el('button','btn small'); btnSet.textContent='Définir/Mettre à jour';

  ini.append(tips, btnRoll, manual, btnSet);
  initPanel.appendChild(ini);
  box.appendChild(initPanel);

  const orderPanel = el('div','panel'); orderPanel.innerHTML = `<div class="list-item"><div><b>Ordre d'initiative</b></div></div>`;
  const list = el('div','list'); orderPanel.appendChild(list);
  box.appendChild(orderPanel);

  function renderOrder(){
    list.innerHTML='';
    const c = ensureCombat(S);
    const turnId = (c.order[c.turnIndex||0]||{}).id;
    (c.order||[]).forEach(pt=>{ list.appendChild(participantRow(pt, pt.id===turnId)); });
  }

  function addOrUpdateMe(initVal){
    const c = ensureCombat(S);
    const pid = me.id || 'player';
    let entry = c.order.find(x=> x.id===pid);
    if(!entry){ entry = { id:pid, kind:'joueur', name:me.name||'Héros', init:0, alive:true }; c.order.push(entry); }
    entry.name = me.name||entry.name; entry.init = Math.floor(+initVal||0);
    // sort by init desc, then stable
    c.order.sort((a,b)=> (b.init||0)-(a.init||0));
    // make combat active if at least 2 entries
    c.active = c.order.length>0;
    if(!Number.isFinite(+c.round)) c.round = 1;
    if(!Number.isFinite(+c.turnIndex)) c.turnIndex = 0;
    State.save(S);
    renderOrder();
  }

  btnRoll.onclick = ()=>{
    const base = best.val||0;
    const r = rollNdM(1,20);
    addOrUpdateMe(r.sum + base);
    alert(`Initiative : d20(${r.parts[0]}) + ${base} = ${r.sum+base}`);
  };
  btnSet.onclick = ()=> addOrUpdateMe(+manual.value||0);

  // Next turn if it's me
  const actPanel = el('div','panel');
  const actRow = el('div','list-item small');
  const endTurn = el('button','btn'); endTurn.textContent='Fin de mon tour';
  actRow.appendChild(endTurn);
  actPanel.appendChild(actRow);
  box.appendChild(actPanel);
  endTurn.onclick = ()=>{
    const c = ensureCombat(S);
    const cur = c.order[c.turnIndex||0];
    if(!cur || cur.id!==(me.id||'player')){ alert("Ce n'est pas votre tour."); return; }
    c.turnIndex = (c.turnIndex+1) % Math.max(1, c.order.length);
    if(c.turnIndex===0) c.round = (c.round||1)+1;
    State.save(S);
    renderOrder();
  };

  // Enemy list (lecture seule)
  const ePanel = el('div','panel');
  ePanel.innerHTML = `<div class="list-item"><div><b>Adversaires (déployés)</b></div></div>`;
  const eList = el('div','list');
  (S.enemies||[]).forEach(e=>{
    const row = el('div','list-item small');
    const right = el('div');
    // ressources si dispo
    let resTxt = '';
    try{
      const res = e.resources||{};
      const parts = Object.keys(res).map(k=> `${k}: ${res[k]?.current ?? 0}/${res[k]?.max ?? 0}`);
      resTxt = parts.join(' · ');
    }catch(_e){}
    const left = el('div');
    left.innerHTML = `<b>${escapeHtml(findEnemyName(e))}</b>`;
    row.append(left);
    right.innerHTML = resTxt? `<span class="muted small">${escapeHtml(resTxt)}</span>` : '';
    row.appendChild(right);
    eList.appendChild(row);
  });
  ePanel.appendChild(eList);
  box.appendChild(ePanel);

  renderOrder();
  return box;
}
export default renderPlayerCombat;
