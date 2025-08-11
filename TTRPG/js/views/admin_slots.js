// js/views/admin_slots.js — CRUD des slots (6.1-slots+lootbox)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

export function renderSlots(S){
  const root = el('div');

  const header = el('div','row'); header.style.justifyContent='space-between'; header.style.alignItems='center';
  const tl = document.createElement('h3'); tl.textContent='Slots d’équipement';
  const tr = document.createElement('div');
  const add = document.createElement('button'); add.className='btn'; add.textContent='Ajouter un slot';
  add.onclick = ()=>{
    const name = prompt('Nom du slot (ex: weapon, head, torse...)');
    if(!name) return;
    S.settings.slots = Array.isArray(S.settings.slots)? S.settings.slots : [];
    if(!S.settings.slots.includes(name)) S.settings.slots.push(name);
    State.save(S); refresh();
  };
  tr.appendChild(add); header.append(tl,tr);
  root.appendChild(header);

  const listWrap = el('div'); root.appendChild(listWrap);

  function refresh(){
    listWrap.innerHTML='';
    const panel = el('div','panel');
    panel.innerHTML = '<div class="list-item"><div><b>Liste des slots</b></div></div>';
    const list = el('div','list'); panel.appendChild(list);

    const slots = Array.isArray(S.settings.slots)? S.settings.slots : [];
    if(slots.length===0){
      const e=el('div','muted small'); e.style.padding='8px 12px'; e.textContent='Aucun slot défini.';
      list.appendChild(e);
    }else{
      slots.forEach((name, idx)=>{
        const row = el('div','list-item small'); row.append(document.createElement('div'), document.createElement('div'));
        const nameI = document.createElement('input'); nameI.type='text'; nameI.className='input'; nameI.value=name;
        nameI.oninput = ()=>{ slots[idx] = nameI.value; State.save(S); };
        row.children[0].appendChild(nameI);
        const del = document.createElement('button'); del.className='btn danger small'; del.textContent='Supprimer';
        del.onclick = ()=>{ slots.splice(idx,1); State.save(S); refresh(); };
        row.children[1].appendChild(del);
        list.appendChild(row);
      });
    }
    listWrap.appendChild(panel);
  }
  refresh();

  return root;
}
export default renderSlots;
