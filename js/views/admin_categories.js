// js/views/admin_categories.js — Build ACAT1 (Catégories + association de stats)
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

function ensureSettings(S){
  S.settings = S.settings && typeof S.settings==='object' ? S.settings : {};
  S.settings.stats = Array.isArray(S.settings.stats) ? S.settings.stats : [];
  S.settings.categories = Array.isArray(S.settings.categories) ? S.settings.categories : [];
  return S.settings;
}
function opts(sel, arr, cur){
  sel.innerHTML='';
  (arr||[]).forEach(s=>{ const o=document.createElement('option'); o.value=String(s); o.textContent=String(s); if(String(s)===String(cur)) o.selected=true; sel.appendChild(o); });
  return sel;
}

function rowCat(S, cat, refresh){
  const r = el('div','panel');
  const head = el('div','list-item'); head.style.cursor='pointer';
  const hl = el('div'); const b=document.createElement('b'); b.textContent = cat.name||'Catégorie'; hl.appendChild(b);
  const hr = el('div'); const del=el('button','btn small danger'); del.textContent='Supprimer'; hr.appendChild(del);
  head.appendChild(hl); head.appendChild(hr); r.appendChild(head);
  const body = el('div','list'); body.style.display='none'; r.appendChild(body);
  head.onclick = ()=>{ body.style.display = (body.style.display==='none') ? 'block' : 'none'; };

  // Nom
  (function(){
    const line=el('div','list-item small');
    const left=el('div'); left.textContent='Nom'; line.appendChild(left);
    const right=el('div');
    const nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.value=cat.name||'';
    nameI.oninput=()=>{ cat.name=nameI.value||''; save(S); b.textContent=cat.name||'Catégorie'; };
    right.appendChild(nameI); line.appendChild(right); body.appendChild(line);
  })();

  // Stats associées (checkboxes)
  (function(){
    const stats = ensureSettings(S).stats.slice();
    const set = new Set(Array.isArray(cat.stats)? cat.stats : []);

    const line = el('div','list-item small');
    const left = el('div'); left.textContent='Stats de cette catégorie'; line.appendChild(left);
    const right = el('div');

    stats.forEach(n=>{
      const lab=document.createElement('label'); lab.style.marginRight='8px';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.value=n; cb.checked=set.has(n);
      cb.onchange=()=>{ if(cb.checked) set.add(n); else set.delete(n); cat.stats = Array.from(set); save(S); };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' '+n));
      right.appendChild(lab);
    });

    line.appendChild(right); body.appendChild(line);
  })();

  del.onclick = ()=>{
    const arr = ensureSettings(S).categories;
    const i = arr.indexOf(cat); if(i>=0){ arr.splice(i,1); save(S); refresh(); }
  };

  return r;
}

export function renderAdminCategories(){
  const S = get(); ensureSettings(S);
  const root = el('div');
  const panel = el('div','panel');
  const head = el('div','list-item'); const hd=document.createElement('div'); hd.innerHTML='<b>Catégories</b>'; head.appendChild(hd);
  panel.appendChild(head);
  const list = el('div','list'); panel.appendChild(list);
  root.appendChild(panel);

  function refresh(){
    list.innerHTML='';
    ensureSettings(get()).categories.forEach(cat=> list.appendChild(rowCat(get(),cat,refresh)));

    const add = el('div','list-item small');
    const left = el('div'); left.textContent='Ajouter'; add.appendChild(left);
    const right = el('div');
    const nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom de catégorie';
    const addB=document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick=()=>{
      const nm=(nameI.value||'').trim(); if(!nm) return;
      ensureSettings(S).categories.push({ name:nm, stats:[] });
      save(S); refresh();
    };
    right.appendChild(nameI); right.appendChild(addB);
    add.appendChild(right);
    list.appendChild(add);
  }
  refresh();
  return root;
}
export default renderAdminCategories;
