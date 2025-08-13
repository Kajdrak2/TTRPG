// js/views/adminclasses.js — Build A14 (Classes) — Nom + Catégories + Stats + Ressources avec bonus/malus (accordéon)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function N(v){ return (isFinite(+v)? Math.trunc(+v) : 0); }
function arr(a){ return Array.isArray(a)? a : []; }
function ensureCol(S){ S.classes = arr(S.classes); return S.classes; }
function ensureMods(o){ o.mods = o.mods && typeof o.mods==='object' ? o.mods : {}; o.mods.stats = o.mods.stats && typeof o.mods.stats==='object' ? o.mods.stats : {}; o.mods.resources = o.mods.resources && typeof o.mods.resources==='object' ? o.mods.resources : {}; return o.mods; }
function ensureCatMods(o){ o.catMods = o.catMods && typeof o.catMods==='object' ? o.catMods : {}; return o.catMods; }

function listStats(S){
  if(S.settings && Array.isArray(S.settings.stats) && S.settings.stats.length) return S.settings.stats.slice();
  if(Array.isArray(S.characteristics) && S.characteristics.length) return S.characteristics.slice();
  return [];
}
function listCats(S){
  const cats = (S.settings && Array.isArray(S.settings.categories))? S.settings.categories : [];
  return cats.map(c=>c && (c.name||c));
}
function listAllowedResources(S, entName){
  const out = [];
  (S.resources||[]).forEach(r=>{
    if(!r) return;
    const nm = r.name || r.id; if(!nm) return;
    const scope = r.scope || 'globale';
    if(scope==='globale'){ out.push(nm); return; }
    const linked = Array.isArray(r.linked) ? r.linked : [];
    if(scope==='classes' && entName && linked.indexOf(entName)>=0) out.push(nm);
  });
  return out;
}

function rowEntity(S, ent, refreshAll){
  const r = el('div','panel');
  // Header (accordion)
  const head = el('div','list-item'); head.style.cursor='pointer';
  const left = el('div'); const b = document.createElement('b'); b.textContent = ent.name || 'Classe'; left.appendChild(b);
  const right = el('div'); const del = el('button','btn small danger'); del.textContent='Supprimer'; right.appendChild(del);
  head.append(left,right); r.appendChild(head);
  const body = el('div','list'); body.style.display='none'; r.appendChild(body);
  head.onclick = ()=>{ body.style.display = (body.style.display==='none') ? 'block' : 'none'; };

  // Nom
  (function(){
    const row = el('div','list-item small');
    const l = el('div'); l.textContent='Nom'; row.appendChild(l);
    const rr = el('div');
    const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.value = ent.name||'';
    nameI.oninput = ()=>{ ent.name = nameI.value||''; State.save(S); b.textContent = ent.name || 'Classe'; };
    rr.appendChild(nameI); row.appendChild(rr); body.appendChild(row);
  })();

  // Catégories (bonus/malus)
  (function(){
    ensureCatMods(ent);
    const cats = listCats(S);
    const wrap = el('div','panel'); wrap.innerHTML = '<div class="list-item"><div><b>Catégories</b></div><div class="muted small">Bonus/Malus par catégorie</div></div>';
    const list = el('div','list'); wrap.appendChild(list); body.appendChild(wrap);

    function render(){
      list.innerHTML='';
      const keys = Object.keys(ent.catMods||{});
      if(!keys.length){
        const empty = el('div','list-item small muted'); empty.textContent='(aucune catégorie)'; list.appendChild(empty);
      } else {
        keys.forEach(k=>{
          const row = el('div','list-item small');
          const l = el('div'); l.textContent = k; row.appendChild(l);
          const rr = el('div');
          const inp = document.createElement('input'); inp.type='number'; inp.className='input'; inp.value = +ent.catMods[k]||0;
          const delB = document.createElement('button'); delB.className='btn small danger'; delB.textContent='Supprimer';
          inp.oninput = ()=>{ ent.catMods[k] = N(inp.value); State.save(S); };
          delB.onclick = ()=>{ delete ent.catMods[k]; State.save(S); render(); };
          rr.append(inp, delB); row.appendChild(rr); list.appendChild(row);
        });
      }
      // add
      const add = el('div','list-item small');
      const l = el('div'); l.textContent='Ajouter'; add.appendChild(l);
      const rr = el('div');
      const sel = document.createElement('select'); sel.className='select';
      const o0 = document.createElement('option'); o0.value=''; o0.textContent='—'; sel.appendChild(o0);
      cats.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
      const val = document.createElement('input'); val.type='number'; val.className='input'; val.placeholder='+/-';
      const addB = document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter';
      addB.onclick = ()=>{ const k=sel.value; const v=N(val.value); if(!k) return; ent.catMods[k] = (ent.catMods[k]||0)+v; State.save(S); render(); };
      rr.append(sel, val, addB); add.appendChild(rr); list.appendChild(add);
    }
    render();
  })();

  // Stats (bonus/malus)
  (function(){
    const mods = ensureMods(ent);
    const stats = listStats(S);
    const wrap = el('div','panel'); wrap.innerHTML = '<div class="list-item"><div><b>Stats</b></div><div class="muted small">Bonus/Malus sur les stats</div></div>';
    const list = el('div','list'); wrap.appendChild(list); body.appendChild(wrap);

    function render(){
      list.innerHTML='';
      const keys = Object.keys(mods.stats||{});
      if(!keys.length){
        const empty = el('div','list-item small muted'); empty.textContent='(aucune stat)'; list.appendChild(empty);
      } else {
        keys.forEach(k=>{
          const row = el('div','list-item small');
          const l = el('div'); l.textContent = k; row.appendChild(l);
          const rr = el('div');
          const inp = document.createElement('input'); inp.type='number'; inp.className='input'; inp.value = +mods.stats[k]||0;
          const delB = document.createElement('button'); delB.className='btn small danger'; delB.textContent='Supprimer';
          inp.oninput = ()=>{ mods.stats[k] = N(inp.value); State.save(S); };
          delB.onclick = ()=>{ delete mods.stats[k]; State.save(S); render(); };
          rr.append(inp, delB); row.appendChild(rr); list.appendChild(row);
        });
      }
      // add
      const add = el('div','list-item small');
      const l = el('div'); l.textContent='Ajouter'; add.appendChild(l);
      const rr = el('div');
      const sel = document.createElement('select'); sel.className='select';
      const o0 = document.createElement('option'); o0.value=''; o0.textContent='—'; sel.appendChild(o0);
      stats.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
      const val = document.createElement('input'); val.type='number'; val.className='input'; val.placeholder='+/-';
      const addB = document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter';
      addB.onclick = ()=>{ const k=sel.value; const v=N(val.value); if(!k) return; mods.stats[k] = (mods.stats[k]||0)+v; State.save(S); render(); };
      rr.append(sel, val, addB); add.appendChild(rr); list.appendChild(add);
    }
    render();
  })();

  // Ressources (max += / start +=)
  (function(){
    const mods = ensureMods(ent);
    const allowed = listAllowedResources(S, ent.name||'');
    const wrap = el('div','panel'); wrap.innerHTML = '<div class="list-item"><div><b>Ressources</b></div><div class="muted small">max += / start +=</div></div>';
    const list = el('div','list'); wrap.appendChild(list); body.appendChild(wrap);

    function render(){
      list.innerHTML='';
      const keys = Object.keys(mods.resources||{});
      if(!keys.length){
        const empty = el('div','list-item small muted'); empty.textContent='(aucune ressource)'; list.appendChild(empty);
      } else {
        keys.forEach(k=>{
          const row = el('div','list-item small');
          const l = el('div'); l.textContent = k; row.appendChild(l);
          const rr = el('div');
          const m1=document.createElement('input'); m1.type='number'; m1.className='input'; m1.value=+(mods.resources[k]&&mods.resources[k].max)||0;
          const m2=document.createElement('input'); m2.type='number'; m2.className='input'; m2.value=+(mods.resources[k]&&mods.resources[k].start)||0;
          const delB = document.createElement('button'); delB.className='btn small danger'; delB.textContent='Supprimer';
          m1.oninput = ()=>{ (mods.resources[k]||(mods.resources[k]={})).max = N(m1.value); State.save(S); };
          m2.oninput = ()=>{ (mods.resources[k]||(mods.resources[k]={})).start = N(m2.value); State.save(S); };
          delB.onclick = ()=>{ delete mods.resources[k]; State.save(S); render(); };
          rr.append(m1,m2,delB); row.appendChild(rr); list.appendChild(row);
        });
      }
      // add
      const add = el('div','list-item small');
      const l = el('div'); l.textContent='Ajouter'; add.appendChild(l);
      const rr = el('div');
      const sel = document.createElement('select'); sel.className='select';
      const o0 = document.createElement('option'); o0.value=''; o0.textContent='—'; sel.appendChild(o0);
      allowed.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
      const maxI = document.createElement('input'); maxI.type='number'; maxI.className='input'; maxI.placeholder='max +=';
      const startI = document.createElement('input'); startI.type='number'; startI.className='input'; startI.placeholder='start +=';
      const addB = document.createElement('button'); addB.className='btn small'; addB.textContent='Ajouter';
      addB.onclick = ()=>{ const k=sel.value; if(!k) return; const o = mods.resources[k]||{max:0,start:0}; o.max += N(maxI.value); o.start += N(startI.value); mods.resources[k]=o; State.save(S); render(); };
      rr.append(sel, maxI, startI, addB); add.appendChild(rr); list.appendChild(add);
    }
    render();
  })();

  // Delete entity
  del.onclick = ()=>{ const arr = ensureCol(S); const i = arr.indexOf(ent); if(i>=0){ arr.splice(i,1); State.save(S); refreshAll(); } };

  return r;
}

export function renderAdminClasses(S){
  const root = el('div');
  const pnl = el('div','panel'); const head = el('div','list-item'); head.innerHTML = '<div><b>Classes</b></div>'; pnl.appendChild(head);
  const list = el('div','list'); pnl.appendChild(list); root.appendChild(pnl);

  function refresh(){
    list.innerHTML='';
    const arr = ensureCol(S);
    arr.forEach(e=> list.appendChild(rowEntity(S,e,refresh)));

    const add = el('div','list-item small');
    const l = el('div'); l.textContent='Ajouter classe'; add.appendChild(l);
    const r = el('div');
    const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom';
    const addB  = document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick = ()=>{ const nm=(nameI.value||'').trim(); if(!nm) return; ensureCol(S).push({ id:'class_'+Math.random().toString(36).slice(2,9), name:nm, catMods:{}, mods:{ stats:{}, resources:{} } }); State.save(S); refresh(); };
    r.append(nameI, addB); add.appendChild(r); list.appendChild(add);
  }
  refresh();
  return root;
}
export default renderAdminClasses;
