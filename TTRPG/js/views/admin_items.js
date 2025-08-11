// js/views/admin_items.js — 6.2.2: UX consommables + listes déroulantes (caracs/catégories/ressources) + fix des Retirer
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

/* Helpers to fetch existing names */
function statNames(S){
  const out=new Set();
  const cats = S.settings?.categories||[];
  cats.forEach(c=>{
    const arr = c.stats||c.caracs||[];
    arr.forEach(st=>{
      if(typeof st==='string') out.add(st);
      else if(st && typeof st==='object'){
        if(st.key) out.add(st.key);
        if(st.name) out.add(st.name);
      }
    });
  });
  return Array.from(out);
}
function catNames(S){
  return (S.settings?.categories||[]).map(c=> c.name || c.key || '').filter(Boolean);
}
function resNames(S){
  return (S.resources||[]).map(r=> r.name||r.key||'').filter(Boolean);
}

function toSeconds(d,h,m,s){
  d = Math.max(0, Math.floor(+d||0));
  h = Math.max(0, Math.floor(+h||0));
  m = Math.max(0, Math.floor(+m||0));
  s = Math.max(0, Math.floor(+s||0));
  return d*86400 + h*3600 + m*60 + s;
}
function secsInputs(defSecs, onChange){
  defSecs = Math.max(0, Math.floor(+defSecs||0));
  const wrap = document.createElement('div');
  wrap.style.display='grid';
  wrap.style.gridTemplateColumns='auto 70px auto 70px auto 70px auto 70px';
  wrap.style.alignItems='center';
  wrap.style.gap='6px';

  const labJ = document.createElement('span'); labJ.className='muted small'; labJ.textContent='Jours';
  const labH = document.createElement('span'); labH.className='muted small'; labH.textContent='Heures';
  const labM = document.createElement('span'); labM.className='muted small'; labM.textContent='Minutes';
  const labS = document.createElement('span'); labS.className='muted small'; labS.textContent='Secondes';

  const d = document.createElement('input'); d.type='number'; d.placeholder='0'; d.className='input'; d.style.width='70px';
  const h = document.createElement('input'); h.type='number'; h.placeholder='0'; h.className='input'; h.style.width='70px';
  const m = document.createElement('input'); m.type='number'; m.placeholder='0'; m.className='input'; m.style.width='70px';
  const s = document.createElement('input'); s.type='number'; s.placeholder='0'; s.className='input'; s.style.width='70px';

  function setFrom(secs){
    secs = Math.max(0, Math.floor(+secs||0));
    const dd = Math.floor(secs/86400); secs%=86400;
    const hh = Math.floor(secs/3600); secs%=3600;
    const mm = Math.floor(secs/60); const ss = secs%60;
    d.value=String(dd); h.value=String(hh); m.value=String(mm); s.value=String(ss);
  }
  setFrom(defSecs);

  function fire(){ onChange && onChange(toSeconds(d.value,h.value,m.value,s.value)); }
  d.oninput = h.oninput = m.oninput = s.oninput = fire;

  wrap.append(labJ,d, labH,h, labM,m, labS,s);
  return {wrap, setFrom};
}

function modsEditor(S, obj){
  obj.mods = obj.mods || {stats:{}, cats:{}, resources:{}};
  const panel = el('div','panel');
  panel.innerHTML = '<div class="list-item"><div><b>Bonus/malus</b><div class="muted small">Sélectionne des valeurs existantes. Elles s’additionnent avec l’équipement et les effets.</div></div></div>';
  const list = el('div','list'); panel.appendChild(list);

  // -- Lists current mods
  function renderStatsList(container){
    container.innerHTML='';
    const entries = Object.entries(obj.mods.stats||{});
    if(entries.length===0){ const e=el('div','muted small'); e.textContent='Aucune caractéristique ajoutée.'; container.appendChild(e); return; }
    entries.forEach(([k,v])=>{
      const row = el('div','row'); row.style.gap='8px'; row.style.alignItems='center';
      const name = document.createElement('span'); name.innerHTML = `<b>${k}</b>`;
      const val  = document.createElement('span'); val.className='muted small'; val.textContent = (v>=0?'+':'')+v;
      const del  = document.createElement('button'); del.className='btn danger small'; del.textContent='Retirer';
      del.onclick = ()=>{ if(obj.mods.stats){ delete obj.mods.stats[k]; } State.save(S); renderStatsList(container); };
      row.append(name,val,del); container.appendChild(row);
    });
  }
  function renderCatsList(container){
    container.innerHTML='';
    const entries = Object.entries(obj.mods.cats||{});
    if(entries.length===0){ const e=el('div','muted small'); e.textContent='Aucune catégorie ajoutée.'; container.appendChild(e); return; }
    entries.forEach(([k,v])=>{
      const row = el('div','row'); row.style.gap='8px'; row.style.alignItems='center';
      const name = document.createElement('span'); name.innerHTML = `<b>${k}</b>`;
      const val  = document.createElement('span'); val.className='muted small'; val.textContent = (v>=0?'+':'')+v;
      const del  = document.createElement('button'); del.className='btn danger small'; del.textContent='Retirer';
      del.onclick = ()=>{ if(obj.mods.cats){ delete obj.mods.cats[k]; } State.save(S); renderCatsList(container); };
      row.append(name,val,del); container.appendChild(row);
    });
  }
  function renderResList(container){
    container.innerHTML='';
    const entries = Object.entries(obj.mods.resources||{});
    if(entries.length===0){ const e=el('div','muted small'); e.textContent='Aucune ressource modifiée.'; container.appendChild(e); return; }
    entries.forEach(([k,v])=>{
      const row = el('div','row'); row.style.gap='8px'; row.style.alignItems='center';
      const name = document.createElement('span'); name.innerHTML = `<b>${k}</b>`;
      const val  = document.createElement('span'); val.className='muted small'; val.textContent = `max ${(v.max>=0?'+':'')+(+v.max||0)} · start ${(v.start>=0?'+':'')+(+v.start||0)}`;
      const del  = document.createElement('button'); del.className='btn danger small'; del.textContent='Retirer';
      del.onclick = ()=>{ if(obj.mods.resources){ delete obj.mods.resources[k]; } State.save(S); renderResList(container); };
      row.append(name,val,del); container.appendChild(row);
    });
  }

  // -- Editors with dropdowns
  const namesStats = statNames(S);
  const namesCats  = catNames(S);
  const namesRes   = resNames(S);

  // Stats
  const rowS = el('div','list-item small'); rowS.append(document.createElement('div'), document.createElement('div'));
  rowS.children[0].innerHTML = '<b>Caractéristiques</b>';
  const statWrap = el('div'); rowS.children[1].appendChild(statWrap);
  const addS = el('div','row'); addS.style.gap='6px';
  const statSel = document.createElement('select'); statSel.className='input';
  namesStats.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; statSel.appendChild(o); });
  const valI  = document.createElement('input'); valI.type='number'; valI.className='input'; valI.placeholder='+/-';
  const addSB = document.createElement('button'); addSB.className='btn small'; addSB.textContent='Ajouter';
  addSB.onclick = ()=>{ const k=statSel.value; const v=+valI.value||0; if(!k) return; obj.mods.stats[k]=(obj.mods.stats[k]||0)+v; State.save(S); valI.value=''; renderStatsList(statWrap); };
  addS.append(statSel,valI,addSB); rowS.children[1].appendChild(addS); list.appendChild(rowS);

  // Cats
  const rowC = el('div','list-item small'); rowC.append(document.createElement('div'), document.createElement('div'));
  rowC.children[0].innerHTML = '<b>Catégories</b>';
  const catWrap = el('div'); rowC.children[1].appendChild(catWrap);
  const addC = el('div','row'); addC.style.gap='6px';
  const catSel = document.createElement('select'); catSel.className='input';
  namesCats.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; catSel.appendChild(o); });
  const catV = document.createElement('input'); catV.type='number'; catV.className='input'; catV.placeholder='+/-';
  const addCB = document.createElement('button'); addCB.className='btn small'; addCB.textContent='Ajouter';
  addCB.onclick = ()=>{ const k=catSel.value; const v=+catV.value||0; if(!k) return; obj.mods.cats[k]=(obj.mods.cats[k]||0)+v; State.save(S); catV.value=''; renderCatsList(catWrap); };
  addC.append(catSel,catV,addCB); rowC.children[1].appendChild(addC); list.appendChild(rowC);

  // Resources
  const rowR = el('div','list-item small'); rowR.append(document.createElement('div'), document.createElement('div'));
  rowR.children[0].innerHTML = '<b>Ressources</b>';
  const resWrap = el('div'); rowR.children[1].appendChild(resWrap);
  const addR = el('div','row'); addR.style.gap='6px';
  const rSel = document.createElement('select'); rSel.className='input';
  namesRes.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; rSel.appendChild(o); });
  const rMax = document.createElement('input'); rMax.type='number'; rMax.className='input'; rMax.placeholder='max';
  const rStart = document.createElement('input'); rStart.type='number'; rStart.className='input'; rStart.placeholder='start';
  const addRB = document.createElement('button'); addRB.className='btn small'; addRB.textContent='Ajouter';
  addRB.onclick = ()=>{ const k=rSel.value; const v={max:+rMax.value||0, start:+rStart.value||0}; if(!k) return; obj.mods.resources[k]=v; State.save(S); rMax.value=''; rStart.value=''; renderResList(resWrap); };
  addR.append(rSel,rMax,rStart,addRB); rowR.children[1].appendChild(addR); list.appendChild(rowR);

  // initial lists
  renderStatsList(statWrap);
  renderCatsList(catWrap);
  renderResList(resWrap);

  return panel;
}

function ensureItemId(S, it){
  if(it.id) return;
  State.ensureItemIds(S);
  if(!it.id){
    it.id = 'itm_'+Math.random().toString(36).slice(2,8);
    State.save(S);
  }
}

export function renderItems(S){
  State.ensureItemIds(S);
  const root = el('div');

  const head = el('div','row'); head.style.justifyContent='space-between'; head.style.alignItems='center';
  const tl = document.createElement('h3'); tl.textContent='Items';
  const add = document.createElement('button'); add.className='btn'; add.textContent='Ajouter item';
  add.onclick = ()=>{ (S.items|| (S.items=[])).push({ id:'itm_'+Math.random().toString(36).slice(2,8), name:'Nouvel item', type:'equipment', mods:{stats:{},cats:{},resources:{}} }); State.ensureItemIds(S); State.save(S); render(); };
  head.append(tl, add);
  root.appendChild(head);

  const listWrap = el('div'); root.appendChild(listWrap);

  function itemCard(S, it, onChange){
    ensureItemId(S,it);
    const card = el('div','panel');

    // Header
    const head = el('div','list-item'); 
    const left = document.createElement('div');
    const nameI = document.createElement('input'); nameI.className='input'; nameI.style.width='240px'; nameI.placeholder='Nom de l\'item'; nameI.value = it.name||'';
    nameI.oninput = ()=>{ it.name = nameI.value; State.save(S); };
    left.appendChild(nameI);
    const right = document.createElement('div'); right.className='row'; right.style.gap='8px';
    const typeSel = document.createElement('select'); typeSel.className='input';
    ['equipment','consumable'].forEach(t=>{
      const o = document.createElement('option'); o.value=t; o.textContent=(t==='equipment'?'Équipement':'Consommable'); typeSel.appendChild(o);
    });
    typeSel.value = it.type || 'equipment';
    typeSel.onchange = ()=>{ it.type = typeSel.value; State.save(S); renderBody(); };
    right.appendChild(typeSel);
    head.append(left,right); card.appendChild(head);

    // Body
    const body = el('div','list-item small'); body.append(document.createElement('div'), document.createElement('div'));
    const descI = document.createElement('textarea'); descI.className='input'; descI.placeholder='Description'; descI.value=it.desc||''; descI.rows=2; descI.style.width='100%';
    descI.oninput = ()=>{ it.desc = descI.value; State.save(S); };
    body.children[0].appendChild(descI);
    const bodyRight = body.children[1];
    card.appendChild(body);

    // Lootbox
    const loot = el('div','list-item small'); loot.append(document.createElement('div'), document.createElement('div'));
    function currentQty(){
      const stacks = S.lootbox || [];
      for(let i=0;i<stacks.length;i++){
        if(String(stacks[i].itemId)===String(it.id)) return stacks[i].qty||0;
      }
      return 0;
    }
    const leftLoot = document.createElement('div'); leftLoot.innerHTML = '<b>Lootbox</b> <span class="muted small">(actuel: <span class="curr">0</span>)</span>';
    loot.children[0].appendChild(leftLoot);
    const qtyI = document.createElement('input'); qtyI.type='number'; qtyI.className='input'; qtyI.style.width='100px'; qtyI.placeholder='Qté';
    const addB  = document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter';
    addB.onclick = ()=>{ ensureItemId(S,it); const n=Math.max(0,Math.floor(+qtyI.value||0)); if(n>0){ State.lootboxAdd(S, it.id, n); leftLoot.querySelector('.curr').textContent=String(currentQty()); qtyI.value=''; } };
    loot.children[1].append(qtyI, addB);
    card.appendChild(loot);

    function renderBody(){
      bodyRight.innerHTML='';

      if((it.type||'equipment')==='equipment'){
        const slots = S.settings?.categories && S.settings?.slots ? S.settings.slots : (S.settings?.slots||[]);
        if((S.settings?.slots||[]).length===0){
          bodyRight.innerHTML = '<div class="muted small">Aucun slot. Crée des slots dans Admin → Slots.</div>';
        }else{
          const lab = document.createElement('div'); lab.className='muted small'; lab.textContent='Slot :';
          const sel = document.createElement('select'); sel.className='input';
          (S.settings.slots||[]).forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); });
          sel.value = it.slot || (S.settings.slots[0]||'');
          sel.onchange = ()=>{ it.slot = sel.value; State.save(S); };
          bodyRight.append(lab, sel);
        }
      }else{
        const dPanel = el('div'); dPanel.style.display='grid'; dPanel.style.gridTemplateColumns='auto 1fr'; dPanel.style.gap='8px';
        const durInfo = document.createElement('div'); durInfo.className='muted small'; durInfo.innerHTML='Durée de l’effet <span class="muted">(temps pendant lequel le bonus est actif)</span> :';
        const cdInfo  = document.createElement('div'); cdInfo.className='muted small'; cdInfo.innerHTML='Cooldown <span class="muted">(délai pendant lequel l’objet ne peut pas être réutilisé après usage)</span> :';
        const durSet = secsInputs(it.durationSec||0, (secs)=>{ it.durationSec = secs; State.save(S); });
        const cdSet  = secsInputs(it.cooldownSec||0, (secs)=>{ it.cooldownSec  = secs; State.save(S); });

        dPanel.append(durInfo, durSet.wrap, cdInfo, cdSet.wrap);
        bodyRight.append(dPanel);
      }

      // Mods editor
      bodyRight.appendChild(modsEditor(S, it));
    }

    leftLoot.querySelector('.curr').textContent=String(currentQty());
    renderBody();

    // footer: delete
    const foot = el('div','list-item small');
    const del = document.createElement('button'); del.className='btn danger small'; del.textContent='Supprimer l\'item';
    del.onclick = ()=>{ const idx=(S.items||[]).indexOf(it); if(idx>=0){ S.items.splice(idx,1); State.save(S); onChange&&onChange(); } };
    foot.append(document.createElement('div'), del);
    card.appendChild(foot);

    return card;
  }

  function render(){
    listWrap.innerHTML='';
    if(!Array.isArray(S.items) || S.items.length===0){
      const empty = el('div','panel'); empty.innerHTML='<div class="list-item"><div>Aucun item.</div></div>'; listWrap.appendChild(empty); return;
    }
    S.items.forEach(it=> listWrap.appendChild(itemCard(S,it, render)));
  }
  render();
  return root;
}
export default renderItems;
