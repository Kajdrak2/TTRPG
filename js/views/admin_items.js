// js/views/admin_items.js — Build AI4 (fix append/textContent; advanced editor)
// Gestion des objets : type, slot, mods (stats/cats/resources), durée & cooldown
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

function uid(){ return 'it_'+Math.random().toString(36).slice(2,9); }
const N = v => (Number.isFinite(+v)? +v : 0);

function options(sel, arr, cur=''){
  sel.innerHTML='';
  const empty=document.createElement('option'); empty.value=''; empty.textContent='—'; sel.appendChild(empty);
  (arr||[]).forEach(s=>{ const o=document.createElement('option'); o.value=String(s); o.textContent=String(s); if(String(s)===String(cur)) o.selected=true; sel.appendChild(o); });
  return sel;
}
function listAllStats(S){
  const direct = Array.isArray(S.settings?.stats) ? S.settings.stats.slice() : [];
  if(direct.length) return direct;
  const viaCats = (S.settings?.categories||[]).flatMap(c => c.stats||[]);
  if(viaCats.length) return Array.from(new Set(viaCats));
  const fromChars = Array.isArray(S.characteristics) ? S.characteristics.slice() : [];
  return fromChars;
}
function listAllCats(S){ return (S.settings?.categories||[]).map(c=> c.name); }
function listAllRes(S){ return (S.resources||[]).map(r=> r.name || r.id).filter(Boolean); }

function modsEditor(S, it, path='mods'){
  it[path] = it[path] && typeof it[path]==='object' ? it[path] : {};
  const mods = it[path];
  mods.stats = mods.stats && typeof mods.stats==='object' ? mods.stats : {};
  mods.cats  = mods.cats  && typeof mods.cats ==='object' ? mods.cats  : {};
  mods.resources = mods.resources && typeof mods.resources==='object' ? mods.resources : {};

  const panel = el('div','panel');
  const head = el('div','list-item'); head.innerHTML = `<div><b>Modificateurs</b></div>`; panel.appendChild(head);
  const list = el('div','list'); panel.appendChild(list);

  // STATS
  {
    const rS = el('div','list-item small');
    const left = el('div'); left.textContent='Stats'; rS.appendChild(left);
    const rightS = el('div');
    const sSel = document.createElement('select'); sSel.className='select'; options(sSel, listAllStats(S));
    const sVal = document.createElement('input'); sVal.className='input'; sVal.type='number'; sVal.placeholder='+/-';
    const sAdd = el('button','btn small'); sAdd.textContent='Ajouter';
    sAdd.onclick = ()=>{ const k=sSel.value; const v=N(sVal.value); if(!k) return; mods.stats[k]=(mods.stats[k]||0)+v; save(get()); render(); };
    rightS.append(sSel, sVal, sAdd); rS.appendChild(rightS); list.appendChild(rS);
  }
  Object.entries(mods.stats).forEach(([k,v])=>{
    const row=el('div','list-item small'); const left=el('div'); left.textContent=k; row.appendChild(left);
    const rr=el('div'); const i=document.createElement('input'); i.className='input'; i.type='number'; i.value=+v; const rm=el('button','btn small danger'); rm.textContent='Supprimer';
    i.oninput=()=>{ mods.stats[k]=N(i.value); save(get()); }; rm.onclick=()=>{ delete mods.stats[k]; save(get()); render(); };
    rr.append(i,rm); row.appendChild(rr); list.appendChild(row);
  });

  // CATS
  {
    const rC = el('div','list-item small');
    const left = el('div'); left.textContent='Catégories'; rC.appendChild(left);
    const rightC = el('div'); const cSel=document.createElement('select'); cSel.className='select'; options(cSel, listAllCats(S));
    const cVal=document.createElement('input'); cVal.className='input'; cVal.type='number'; cVal.placeholder='+/-';
    const cAdd=el('button','btn small'); cAdd.textContent='Ajouter';
    cAdd.onclick=()=>{ const k=cSel.value; const v=N(cVal.value); if(!k) return; mods.cats[k]=(mods.cats[k]||0)+v; save(get()); render(); };
    rightC.append(cSel,cVal,cAdd); rC.appendChild(rightC); list.appendChild(rC);
  }
  Object.entries(mods.cats).forEach(([k,v])=>{
    const row=el('div','list-item small'); const left=el('div'); left.textContent=k; row.appendChild(left);
    const rr=el('div'); const i=document.createElement('input'); i.className='input'; i.type='number'; i.value=+v; const rm=el('button','btn small danger'); rm.textContent='Supprimer';
    i.oninput=()=>{ mods.cats[k]=N(i.value); save(get()); }; rm.onclick=()=>{ delete mods.cats[k]; save(get()); render(); };
    rr.append(i,rm); row.appendChild(rr); list.appendChild(row);
  });

  // RESOURCES
  {
    const rR = el('div','list-item small');
    const left = el('div'); left.textContent='Ressources (max / start)'; rR.appendChild(left);
    const rightR = el('div'); const rSel=document.createElement('select'); rSel.className='select'; options(rSel, listAllRes(S));
    const rMax=document.createElement('input'); rMax.className='input'; rMax.type='number'; rMax.placeholder='max';
    const rStart=document.createElement('input'); rStart.className='input'; rStart.type='number'; rStart.placeholder='start';
    const rAdd=el('button','btn small'); rAdd.textContent='Ajouter';
    rAdd.onclick=()=>{
      const k=rSel.value; if(!k) return;
      const o = mods.resources[k] = mods.resources[k] || {max:0,start:0};
      o.max += N(rMax.value); o.start += N(rStart.value);
      save(get()); render();
    };
    rightR.append(rSel,rMax,rStart,rAdd); rR.appendChild(rightR); list.appendChild(rR);
  }
  Object.entries(mods.resources).forEach(([k,o])=>{
    const row=el('div','list-item small'); const left=el('div'); left.textContent=k; row.appendChild(left);
    const rr=el('div');
    const i1=document.createElement('input'); i1.className='input'; i1.type='number'; i1.value=+o.max||0;
    const i2=document.createElement('input'); i2.className='input'; i2.type='number'; i2.value=+o.start||0;
    const rm=el('button','btn small danger'); rm.textContent='Supprimer';
    i1.oninput=()=>{ (mods.resources[k]=mods.resources[k]||{}).max=N(i1.value); save(get()); };
    i2.oninput=()=>{ (mods.resources[k]=mods.resources[k]||{}).start=N(i2.value); save(get()); };
    rm.onclick=()=>{ delete mods.resources[k]; save(get()); render(); };
    rr.append(i1,i2,rm); row.appendChild(rr); list.appendChild(row);
  });

  return panel;

  function render(){
    const parent=panel.parentElement; if(!parent) return;
    const idx=[...parent.children].indexOf(panel);
    parent.removeChild(panel);
    parent.insertBefore(modsEditor(S,it,path), parent.children[idx]);
  }
}

function durationEditor(it){
  const wrap=el('div','list-item small');
  const left=el('div'); left.textContent='Durée (consommable)'; wrap.appendChild(left);
  const right=el('div');
  const d=document.createElement('input'); d.className='input'; d.type='number'; d.placeholder='jours'; d.style.width='90px';
  const h=document.createElement('input'); h.className='input'; h.type='number'; h.placeholder='heures'; h.style.width='90px';
  const m=document.createElement('input'); m.className='input'; m.type='number'; m.placeholder='minutes'; m.style.width='90px';
  const s=document.createElement('input'); s.className='input'; s.type='number'; s.placeholder='secondes'; s.style.width='110px';
  function setFromItem(){
    let sec = Math.max(0, Math.floor(+it.durationSec||0));
    const J=Math.floor(sec/86400); sec -= J*86400;
    const H=Math.floor(sec/3600);  sec -= H*3600;
    const M=Math.floor(sec/60);    sec -= M*60;
    d.value=J; h.value=H; m.value=M; s.value=sec;
  }
  function store(){ it.durationSec = Math.max(0,(+d.value||0)*86400 + (+h.value||0)*3600 + (+m.value||0)*60 + (+s.value||0)); save(get()); }
  [d,h,m,s].forEach(x=> x.oninput=store);
  setFromItem();
  right.append(d,h,m,s); wrap.appendChild(right);
  return wrap;
}
function cooldownEditor(it){
  const wrap=el('div','list-item small');
  const left=el('div'); left.textContent='Cooldown (tous types)'; wrap.appendChild(left);
  const right=el('div');
  const m=document.createElement('input'); m.className='input'; m.type='number'; m.placeholder='minutes'; m.style.width='110px';
  const s=document.createElement('input'); s.className='input'; s.type='number'; s.placeholder='secondes'; s.style.width='110px';
  function setFromItem(){ let sec = Math.max(0, Math.floor(+it.cooldownSec||0)); const M=Math.floor(sec/60); sec-=M*60; m.value=M; s.value=sec; }
  function store(){ it.cooldownSec = Math.max(0,(+m.value||0)*60 + (+s.value||0)); save(get()); }
  [m,s].forEach(x=> x.oninput=store);
  setFromItem();
  right.append(m,s); wrap.appendChild(right);
  return wrap;
}

function rowItem(S, it, onChange){
  const r = el('div','panel');
  const head = el('div','list-item'); head.style.cursor='pointer'; head.innerHTML = `<div><b>${it.name||'Objet'}</b></div><div class="muted small">(ouvrir/fermer)</div>`; r.appendChild(head);
  const list = el('div','list'); list.style.display='none'; r.appendChild(list);
  head.onclick = ()=>{ list.style.display = (list.style.display==='none')?'block':'none'; };

  const line = el('div','list-item small');
  const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.style.minWidth='180px'; nameI.value = it.name||'';
  const descI = document.createElement('input'); descI.className='input'; descI.placeholder='Description'; descI.value = it.desc||'';
  const typeS = document.createElement('select'); typeS.className='select'; options(typeS, ['equipment','consumable','misc'], it.type||'misc');
  const slotS = document.createElement('select'); slotS.className='select'; options(slotS, (S.settings?.slots)||[], it.slot||'');
  const delB = el('button','btn small danger'); delB.textContent='Supprimer';
  line.append(nameI, descI, typeS, slotS, delB);
  list.appendChild(line);

  function refreshEditors(){
    while(list.children.length>1) list.removeChild(list.lastChild);
    list.appendChild(modsEditor(S,it,'mods'));
    if(typeS.value==='consumable') list.appendChild(durationEditor(it));
    list.appendChild(cooldownEditor(it));
  }
  refreshEditors();

  nameI.oninput = ()=>{ it.name = nameI.value; onChange(); head.querySelector('b').textContent=it.name||'Objet'; };
  descI.oninput = ()=>{ it.desc = descI.value; onChange(); };
  typeS.onchange = ()=>{ it.type = typeS.value; if(it.type!=='equipment') it.slot=''; refreshEditors(); onChange(); };
  slotS.onchange = ()=>{ it.slot = slotS.value||''; onChange(); };
  delB.onclick   = ()=>{ onChange(true); };

  return r;
}

export function renderAdminItems(){
  const S = get();
  S.items = Array.isArray(S.items)? S.items : [];
  const box = el('div');

  const panel = el('div','panel');
  panel.innerHTML = `<div class="list-item"><div><b>Objets</b></div></div>`;
  const list = el('div','list'); panel.appendChild(list);
  box.appendChild(panel);

  function refresh(){
    list.innerHTML='';
    (S.items||[]).forEach(it=> list.appendChild(rowItem(S,it, (del)=>{
      if(del){ const i=S.items.indexOf(it); if(i>=0) S.items.splice(i,1); }
      save(S); refresh();
    })));

    const addPanel = el('div','panel mt8');
    addPanel.innerHTML = `<div class="list-item"><div><b>Ajouter un objet</b></div></div>`;
    const add = el('div','list');
    const r = el('div','list-item small');
    const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom';
    const descI = document.createElement('input'); descI.className='input'; descI.placeholder='Description';
    const typeS = document.createElement('select'); typeS.className='select'; options(typeS, ['equipment','consumable','misc'], 'misc');
    const slotS = document.createElement('select'); slotS.className='select'; options(slotS, (S.settings?.slots)||[], '');
    const addB = document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick = ()=>{
      const nm=(nameI.value||'').trim(); if(!nm) return;
      const it = { id:uid(), name:nm, desc:descI.value||'', type:typeS.value||'misc', slot: (typeS.value==='equipment'? slotS.value||'' : ''), mods:{ stats:{}, cats:{}, resources:{} }, durationSec:0, cooldownSec:0 };
      S.items.push(it); save(S); refresh();
    };
    r.append(nameI, descI, typeS, slotS, addB); add.appendChild(r); addPanel.appendChild(add); list.appendChild(addPanel);
  }
  refresh();

  return box;
}
export default renderAdminItems;
