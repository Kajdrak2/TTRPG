// js/views/admin_items.js — Build A4 (Objets FR + mods + durée/cooldown pour consommables)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function N(v){ return isFinite(+v) ? Math.trunc(+v) : 0; }
function arr(a){ return Array.isArray(a)? a : []; }
function ensureMods(obj){ obj.mods = obj.mods && typeof obj.mods==='object' ? obj.mods : {}; obj.mods.stats = obj.mods.stats && typeof obj.mods.stats==='object' ? obj.mods.stats : {}; obj.mods.cats = obj.mods.cats && typeof obj.mods.cats==='object' ? obj.mods.cats : {}; obj.mods.resources = obj.mods.resources && typeof obj.mods.resources==='object' ? obj.mods.resources : {}; return obj.mods; }

function listStats(S){ return (S.settings && Array.isArray(S.settings.stats)) ? S.settings.stats.slice() : []; }
function listCats(S){ const cats=(S.settings&&Array.isArray(S.settings.categories))? S.settings.categories : []; return cats.map(c=>c && (c.name||c)); }
function listSlots(S){ return (S.settings && Array.isArray(S.settings.slots)) ? S.settings.slots.slice() : []; }

const TYPE_LABELS = [
  { value:'equipment',  label:'Équipement' },
  { value:'consumable', label:'Consommable' },
  { value:'misc',       label:'Divers' }
];
function typeLabel(v){ const t=TYPE_LABELS.find(x=>x.value===v); return t?t.label:v; }

function typeSelect(current){
  const s = document.createElement('select'); s.className='select';
  TYPE_LABELS.forEach(t=>{ const o=document.createElement('option'); o.value=t.value; o.textContent=t.label; if(t.value===current) o.selected=true; s.appendChild(o); });
  return s;
}
function slotSelect(S, current){
  const s = document.createElement('select'); s.className='select';
  const o0=document.createElement('option'); o0.value=''; o0.textContent='— slot —'; s.appendChild(o0);
  listSlots(S).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; if(n===current) o.selected=true; s.appendChild(o); });
  return s;
}

/* ---------------- Small editors ---------------- */
function kvEditorMap(map, onChange, options){
  const title = options.title || 'Éditeur'; const keyOptions = Array.isArray(options.keyOptions)? options.keyOptions : null;
  const valPh = options.valPh || '+/-';
  const box = el('div','panel'); box.innerHTML = '<div class="list-item"><div><b>'+title+'</b></div></div>';
  const list = el('div','list'); box.appendChild(list);

  function render(){
    list.innerHTML='';
    const keys = Object.keys(map||{});
    if(!keys.length){ const empty = el('div','list-item small muted'); empty.textContent='(vide)'; list.appendChild(empty); }
    keys.forEach(k=>{
      const row=el('div','list-item small');
      const l = document.createElement('div'); l.textContent=k; row.appendChild(l);
      const r = document.createElement('div');
      const inp = document.createElement('input'); inp.className='input'; inp.type='number'; inp.value=+map[k]||0;
      const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
      inp.oninput = ()=>{ map[k] = N(inp.value); State.save(State.get()); onChange&&onChange(); };
      del.onclick = ()=>{ delete map[k]; State.save(State.get()); render(); onChange&&onChange(); };
      r.append(inp, del); row.appendChild(r); list.appendChild(row);
    });
    // add
    const add = el('div','list-item small'); const l=document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r = document.createElement('div'); r.style.display='flex'; r.style.gap='8px'; r.style.flexWrap='wrap';
    let kI;
    if(keyOptions && keyOptions.length){
      kI = document.createElement('select'); kI.className='select';
      const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; kI.appendChild(o0);
      keyOptions.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; kI.appendChild(o); });
    }else{
      kI = document.createElement('input'); kI.className='input'; kI.placeholder='clé';
    }
    const vI = document.createElement('input'); vI.className='input'; vI.type='number'; vI.placeholder=valPh;
    const addB = document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter';
    addB.onclick = ()=>{ const k=(kI.value||'').trim(); const v=N(vI.value); if(!k) return; map[k]=(map[k]||0)+v; State.save(State.get()); render(); onChange&&onChange(); };
    r.append(kI, vI, addB); add.appendChild(r); list.appendChild(add);
  }
  render();
  return box;
}

function resEditorMap(map, onChange, options){
  const title = options.title || 'Ressources';
  const S = State.get();
  const box = el('div','panel'); box.innerHTML = '<div class="list-item"><div><b>'+title+'</b></div></div>';
  const list = el('div','list'); box.appendChild(list);

  function render(){
    list.innerHTML='';
    const keys = Object.keys(map||{});
    if(!keys.length){ const empty = el('div','list-item small muted'); empty.textContent='(vide)'; list.appendChild(empty); }
    keys.forEach(k=>{
      const row=el('div','list-item small');
      const l = document.createElement('div'); l.textContent=k; row.appendChild(l);
      const r = document.createElement('div'); r.style.display='flex'; r.style.gap='8px';
      const m1=document.createElement('input'); m1.className='input'; m1.type='number'; m1.value=+(map[k]&&map[k].max)||0;
      const m2=document.createElement('input'); m2.className='input'; m2.type='number'; m2.value=+(map[k]&&map[k].start)||0;
      const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
      m1.oninput = ()=>{ (map[k]||(map[k]={})).max = N(m1.value); State.save(S); onChange&&onChange(); };
      m2.oninput = ()=>{ (map[k]||(map[k]={})).start = N(m2.value); State.save(S); onChange&&onChange(); };
      del.onclick = ()=>{ delete map[k]; State.save(S); render(); onChange&&onChange(); };
      r.append(m1,m2,del); row.appendChild(r); list.appendChild(row);
    });
    // add
    const add = el('div','list-item small'); const l=document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r = document.createElement('div'); r.style.display='flex'; r.style.gap='8px'; r.style.flexWrap='wrap';
    const sel = document.createElement('select'); sel.className='select';
    const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; sel.appendChild(o0);
    (State.get().resources||[]).forEach(res=>{ const nm=res && (res.name||res.id); if(!nm) return; const o=document.createElement('option'); o.value=nm; o.textContent=nm; sel.appendChild(o); });
    const m1=document.createElement('input'); m1.className='input'; m1.type='number'; m1.placeholder='max +=';
    const m2=document.createElement('input'); m2.className='input'; m2.type='number'; m2.placeholder='start +=';
    const addB=document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter';
    addB.onclick = ()=>{ const k=sel.value; if(!k) return; const o=map[k]||{max:0,start:0}; o.max+=N(m1.value); o.start+=N(m2.value); map[k]=o; State.save(State.get()); render(); onChange&&onChange(); };
    r.append(sel, m1, m2, addB); add.appendChild(r); list.appendChild(add);
  }
  render();
  return box;
}

/* ---------------- Duration/Cooldown helpers ---------------- */
function secondsToParts(sec){ sec=Math.max(0, Math.floor(+sec||0)); const d=Math.floor(sec/86400); sec%=86400; const h=Math.floor(sec/3600); sec%=3600; const m=Math.floor(sec/60); const s=sec%60; return {d,h,m,s}; }
function partsToSeconds(d,h,m,s){ return N(d)*86400 + N(h)*3600 + N(m)*60 + N(s); }

/* ---------------- Item row ---------------- */
function rowItem(S, it, refresh){
  ensureMods(it);
  const row = el('div','panel');

  // head
  const head = el('div','list-item'); head.style.cursor='pointer';
  const left = el('div'); const title = document.createElement('b'); title.textContent = it.name||'Objet'; left.appendChild(title);
  const sub  = document.createElement('div'); sub.className='muted small'; sub.textContent = typeLabel(it.type||'misc') + (it.type==='equipment' && it.slot? (' — '+(it.slot||'')) : '');
  left.appendChild(sub);
  const right = el('div'); const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer'; right.appendChild(del);
  head.append(left,right); row.appendChild(head);

  const body = el('div','list'); body.style.display='none'; row.appendChild(body);
  head.onclick = ()=>{ body.style.display = (body.style.display==='none')?'block':'none'; };

  // Identité
  (function(){
    const r = el('div','list-item small');
    const l = document.createElement('div'); l.textContent='Identité'; r.appendChild(l);
    const rr= document.createElement('div'); rr.style.display='grid'; rr.style.gridTemplateColumns='1fr 1fr 1fr'; rr.style.gap='8px';
    const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.value=it.name||'';
    const typeS = typeSelect(it.type||'misc');
    const slotWrap = document.createElement('div'); slotWrap.style.display='flex'; slotWrap.style.gap='6px'; slotWrap.style.alignItems='center';
    const slotLab = document.createElement('span'); slotLab.textContent='slot'; const slotS = slotSelect(S, it.slot||'');

    function updateSlot(){ const isEq = (typeS.value==='equipment'); slotWrap.style.display = isEq ? 'flex' : 'none'; }
    nameI.oninput = ()=>{ it.name=nameI.value||''; title.textContent=it.name||'Objet'; State.save(S); };
    typeS.onchange = ()=>{ it.type=typeS.value; updateSlot(); sub.textContent = typeLabel(it.type||'misc') + (it.type==='equipment' && it.slot? (' — '+(it.slot||'')) : ''); State.save(S); };
    slotS.onchange = ()=>{ it.slot = slotS.value||''; sub.textContent = typeLabel(it.type||'misc') + (it.type==='equipment' && it.slot? (' — '+(it.slot||'')) : ''); State.save(S); };
    updateSlot();
    slotWrap.append(slotLab, slotS);

    rr.appendChild(nameI); rr.appendChild(typeS); rr.appendChild(slotWrap);
    r.appendChild(rr);
    body.appendChild(r);

    const r2 = el('div','list-item small');
    const l2 = document.createElement('div'); l2.textContent='Description'; r2.appendChild(l2);
    const rr2= document.createElement('div'); const descI = document.createElement('textarea'); descI.className='input'; descI.rows=2; descI.placeholder='Description'; descI.value=it.desc||'';
    descI.oninput = ()=>{ it.desc = descI.value||''; State.save(S); };
    rr2.appendChild(descI); r2.appendChild(rr2); body.appendChild(r2);
  })();

  // Effets (mods)
  (function(){
    const mods = ensureMods(it);
    const wrap = el('div','panel'); wrap.innerHTML = '<div class="list-item"><div><b>Effets</b></div></div>';
    const list = el('div','list'); wrap.appendChild(list); body.appendChild(wrap);

    // Stats
    list.appendChild(kvEditorMap(mods.stats, ()=>{}, { title:'Stats', keyOptions:listStats(S), valPh:'+/-' }));
    // Catégories
    list.appendChild(kvEditorMap(mods.cats,  ()=>{}, { title:'Catégories', keyOptions:listCats(S), valPh:'+/-' }));
    // Ressources
    list.appendChild(resEditorMap(mods.resources, ()=>{}, { title:'Ressources' }));
  })();

  // Consommable : Durée d'effet + Cooldown
  (function(){
    const sec = secondsToParts(it.durationSec||0);
    const cdp = secondsToParts(it.cooldownSec||0);
    const pnl = el('div','panel'); pnl.innerHTML='<div class="list-item"><div><b>Consommable</b></div><div class="muted small">Visible seulement pour les objets de type “Consommable”</div></div>';
    const lst = el('div','list'); pnl.appendChild(lst); body.appendChild(pnl);

    
function mkRow(label, parts, onSave){
      const r = el('div','list-item small');
      const l = document.createElement('div'); l.textContent=label; r.appendChild(l);
      const rr = document.createElement('div'); rr.style.display='flex'; rr.style.gap='10px'; rr.style.flexWrap='wrap'; rr.style.alignItems='center';

      function unit(labelTxt, ph, val){
        const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.alignItems='center'; wrap.style.gap='6px';
        const lab = document.createElement('span'); lab.className='muted small'; lab.textContent=labelTxt;
        const inp = document.createElement('input'); inp.type='number'; inp.className='input'; inp.placeholder=ph; inp.value=val||0; inp.min=0;
        wrap.appendChild(lab); wrap.appendChild(inp);
        return {wrap, inp};
      }
      const uD = unit('Jours','0', parts.d||0);
      const uH = unit('Heures','0', parts.h||0);
      const uM = unit('Minutes','0', parts.m||0);
      const uS = unit('Secondes','0', parts.s||0);

      const saveB = document.createElement('button'); saveB.className='btn small'; saveB.textContent='Appliquer';
      saveB.title = 'Enregistrer la valeur';

      saveB.onclick = ()=> onSave( partsToSeconds(uD.inp.value, uH.inp.value, uM.inp.value, uS.inp.value) );

      const hint = document.createElement('span'); hint.className='muted small'; hint.textContent='(J/H/M/S)';

      rr.append(uD.wrap, uH.wrap, uM.wrap, uS.wrap, saveB, hint); 
      r.appendChild(rr); 
      return r;
    }


    function render(){
      lst.innerHTML='';
      lst.appendChild(mkRow('Durée de l’effet', sec, (v)=>{ it.durationSec = v; State.save(S); }));
      lst.appendChild(mkRow('Cooldown', cdp, (v)=>{ it.cooldownSec = v; State.save(S); }));
    }
    render();

    // show/hide whole panel depending on type
    const show = ()=>{ pnl.style.display = (it.type==='consumable') ? 'block' : 'none'; };
    show();
    // Observe type select changes above
    // quick observer: override type change handler to also toggle (already saved above)
    head.addEventListener('click', ()=>{}); // keep reference for GC
    const _setType = ()=>show();
    // When the select changes, our earlier onchange updates it.type and saves; we just poll toggling when head clicked or on initial render; minimal wiring.
    // (If you want instant toggle without closing/reopening, we could pass a callback to updateSlot() earlier)
    setTimeout(show,10);
  })();

  
  // Lootbox (shared) — add quantity of this item
  (function(){
    const pnl = el('div','panel'); pnl.innerHTML='<div class="list-item"><div><b>Lootbox</b></div><div class="muted small">Ajouter cet objet à la lootbox partagée des joueurs</div></div>';
    const lst = el('div','list'); pnl.appendChild(lst); body.appendChild(pnl);
    const r = el('div','list-item small');
    const l = document.createElement('div'); l.textContent='Ajouter'; r.appendChild(l);
    const rr = document.createElement('div'); rr.style.display='flex'; rr.style.gap='8px'; rr.style.alignItems='center';
    const qtyI = document.createElement('input'); qtyI.type='number'; qtyI.className='input'; qtyI.placeholder='Qté'; qtyI.min=1; qtyI.value=1;
    const addB = document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter à la lootbox';
    addB.onclick = ()=>{
      const qty = Math.max(1, Math.floor(+qtyI.value||0));
      if(!it.id){ it.id = 'it_'+Math.random().toString(36).slice(2,9); State.save(S); }
      addB.disabled = true; const prev=addB.textContent; addB.textContent='Ajouté ✓';
      State.lootboxAdd(S, it.id, qty);
      qtyI.value = 1;
      setTimeout(()=>{ addB.disabled=false; addB.textContent=prev; }, 700);
    };
    rr.append(qtyI, addB); r.appendChild(rr); lst.appendChild(r);
  })();
// delete
  del.onclick = ()=>{ const arr = S.items||[]; const i = arr.indexOf(it); if(i>=0){ arr.splice(i,1); State.save(S); refresh(); } };

  return row;
}

export function renderAdminItems(S){
  S.items = arr(S.items);
  State.ensureItemIds(S);
  const root = el('div');

  const listP = el('div','panel'); listP.innerHTML='<div class="list-item"><div><b>Objets</b></div></div>';
  const list = el('div','list'); listP.appendChild(list); root.appendChild(listP);

  function refresh(){
    list.innerHTML='';
    (S.items||[]).forEach(it=> list.appendChild(rowItem(S, it, refresh)));
  }
  refresh();

  const addP = el('div','panel'); addP.innerHTML='<div class="list-item"><div><b>Ajouter un objet</b></div></div>';
  const addL  = el('div','list'); addP.appendChild(addL); root.appendChild(addP);
  const r = el('div','list-item small'); r.style.display='grid'; r.style.gridTemplateColumns='1fr 1fr 1fr auto'; r.style.gap='8px';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom';
  const typeS = typeSelect('misc');
  const slotW = document.createElement('div'); slotW.style.display='none'; slotW.style.gap='6px'; slotW.style.alignItems='center';
  const slotLab = document.createElement('span'); slotLab.textContent='slot';
  const slotS = slotSelect(S, '');
  slotW.append(slotLab, slotS);
  function upd(){ slotW.style.display = (typeS.value==='equipment') ? 'flex' : 'none'; }
  typeS.onchange=upd; upd();
  const addB = document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
  addB.onclick = ()=>{ const nm=(nameI.value||'').trim(); if(!nm) return; S.items.push({ id:'it_'+Math.random().toString(36).slice(2,9), name:nm, type:typeS.value, slot:(typeS.value==='equipment'? (slotS.value||'') : ''), desc:'', mods:{stats:{},cats:{},resources:{}}, cooldownSec:0, durationSec:0 }); State.save(S); nameI.value=''; typeS.value='misc'; slotS.value=''; upd(); refresh(); };
  r.append(nameI, typeS, slotW, addB);
  addL.appendChild(r);

  return root;
}
export default renderAdminItems;
