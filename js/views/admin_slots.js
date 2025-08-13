// js/views/admin_slots.js — Build A1 (Gestion des slots d'équipement)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

export function renderAdminSlots(S){
  S.settings = S.settings && typeof S.settings==='object' ? S.settings : {};
  S.settings.slots = Array.isArray(S.settings.slots) ? S.settings.slots : [];

  const root = el('div');
  const pnl = el('div','panel'); pnl.innerHTML = "<div class=\"list-item\"><div><b>Slots d'équipement</b></div></div>";
  const list = el('div','list'); pnl.appendChild(list); root.appendChild(pnl);

  function refresh(){
    list.innerHTML='';
    if(!S.settings.slots.length){
      const empty = el('div','list-item small muted'); empty.textContent='Aucun slot'; list.appendChild(empty);
    } else {
      S.settings.slots.forEach((name, idx)=>{
        const row = el('div','list-item small');
        const left = document.createElement('div');
        const inp = document.createElement('input'); inp.className='input'; inp.value=name; inp.oninput=()=>{ S.settings.slots[idx]=inp.value||''; State.save(S); };
        left.appendChild(inp);
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='6px';
        const up = document.createElement('button'); up.className='btn small secondary'; up.textContent='↑';
        const down = document.createElement('button'); down.className='btn small secondary'; down.textContent='↓';
        const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
        up.onclick = ()=>{ if(idx>0){ const t=S.settings.slots[idx-1]; S.settings.slots[idx-1]=S.settings.slots[idx]; S.settings.slots[idx]=t; State.save(S); refresh(); } };
        down.onclick = ()=>{ if(idx<S.settings.slots.length-1){ const t=S.settings.slots[idx+1]; S.settings.slots[idx+1]=S.settings.slots[idx]; S.settings.slots[idx]=t; State.save(S); refresh(); } };
        del.onclick = ()=>{ S.settings.slots.splice(idx,1); State.save(S); refresh(); };
        right.append(up,down,del);
        row.append(left,right);
        list.appendChild(row);
      });
    }
    const add = el('div','list-item small');
    const l = document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r = document.createElement('div');
    const inp = document.createElement('input'); inp.className='input'; inp.placeholder='Nom du slot (ex. Tête)';
    const addB = document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick = ()=>{ const nm=(inp.value||'').trim(); if(!nm) return; S.settings.slots.push(nm); State.save(S); inp.value=''; refresh(); };
    r.appendChild(inp); r.appendChild(addB); add.appendChild(r); list.appendChild(add);
  }
  refresh();
  return root;
}
export default renderAdminSlots;
