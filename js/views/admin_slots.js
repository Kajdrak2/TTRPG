// js/views/admin_slots.js — Build B2 (Gestion complète des slots d'équipement)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function normalizeSlots(S){
  S.settings = S.settings && typeof S.settings==='object' ? S.settings : {};
  if(!Array.isArray(S.settings.slots)) S.settings.slots = [];
  // remove falsy/trim
  S.settings.slots = S.settings.slots.map(s=>(s||'').trim()).filter(Boolean);
}

function move(arr, from, to){
  if(from<0 || to<0 || from>=arr.length || to>=arr.length) return;
  const [x] = arr.splice(from,1);
  arr.splice(to,0,x);
}

export function renderAdminSlots(Sin){
  const S = Sin || State.get();
  normalizeSlots(S);

  const root = el('div');
  const pnl = el('div','panel');
  pnl.innerHTML = '<div class="list-item"><div><b>Slots d\\'équipement</b></div><div class="muted small">Ordre = priorité d\\'équipement</div></div>';
  const list = el('div','list');
  pnl.appendChild(list);
  root.appendChild(pnl);

  function refresh(){
    normalizeSlots(S);
    list.innerHTML = '';

    if(!S.settings.slots.length){
      const empty = el('div','list-item small muted');
      empty.textContent = 'Aucun slot';
      list.appendChild(empty);
    }else{
      S.settings.slots.forEach((name, idx)=>{
        const row = el('div','list-item small');
        const left = document.createElement('div');
        left.innerHTML = '<b>'+name+'</b>';
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px'; right.style.alignItems='center';

        // rename
        const nameI = document.createElement('input');
        nameI.className = 'input';
        nameI.placeholder = 'Renommer';
        nameI.value = name;
        const saveB = document.createElement('button');
        saveB.className = 'btn small';
        saveB.textContent = 'Renommer';

        saveB.onclick = ()=>{
          const nv = (nameI.value||'').trim();
          if(!nv) return;
          if(nv===name) return;
          if(S.settings.slots.includes(nv)) return;
          // Propager aux items existants
          (S.items||[]).forEach(it=>{
            if(it && it.type==='equipment' && (it.slot||'')===name) it.slot = nv;
          });
          S.settings.slots[idx] = nv;
          State.save(S);
          refresh();
        };

        // move up/down
        const upB = document.createElement('button'); upB.className='btn small secondary'; upB.textContent='↑';
        const dnB = document.createElement('button'); dnB.className='btn small secondary'; dnB.textContent='↓';
        upB.disabled = idx===0;
        dnB.disabled = idx===S.settings.slots.length-1;
        upB.onclick = ()=>{ move(S.settings.slots, idx, idx-1); State.save(S); refresh(); };
        dnB.onclick = ()=>{ move(S.settings.slots, idx, idx+1); State.save(S); refresh(); };

        // delete
        const delB = document.createElement('button'); delB.className='btn small danger'; delB.textContent='Supprimer';
        delB.onclick = ()=>{
          // Option: ne pas supprimer si des items y sont rattachés ? On les laisse inchangés.
          S.settings.slots.splice(idx,1);
          State.save(S);
          refresh();
        };

        right.append(nameI, saveB, upB, dnB, delB);
        row.append(left, right);
        list.appendChild(row);
      });
    }

    // Ajouter
    const add = el('div','list-item small');
    const l = document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r = document.createElement('div'); r.style.display='flex'; r.style.gap='8px';
    const inp = document.createElement('input'); inp.className='input'; inp.placeholder='Nom du slot (ex. Tête)';
    const addB = document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick = ()=>{
      const nm = (inp.value||'').trim();
      if(!nm) return;
      if(S.settings.slots.includes(nm)) return;
      S.settings.slots.push(nm);
      State.save(S);
      inp.value='';
      refresh();
    };
    r.append(inp, addB);
    add.appendChild(r);
    list.appendChild(add);
  }

  refresh();
  return root;
}
export default renderAdminSlots;
