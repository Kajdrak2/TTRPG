// js/views/admin_resources.js — Build ARS4 (scopes + linkage; safe DOM ops)
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

function uid(){ return 'res_'+Math.random().toString(36).slice(2,9); }
function ensure(S){ S.resources = Array.isArray(S.resources)? S.resources : []; return S.resources; }
var SCOPES = ['globale','races','tribus','classes'];

function scopeLabel(s){ 
  if(s==='globale') return 'Globale';
  if(s==='races') return 'Races';
  if(s==='tribus') return 'Tribus';
  if(s==='classes') return 'Classes';
  return s||'Globale';
}

function rowRes(S, res, onRefresh){
  const r = el('div','panel');
  const head = el('div','list-item'); head.style.cursor='pointer';
  // header
  const hleft = el('div'); const hname=document.createElement('b'); hname.textContent = res.name||'Ressource'; hleft.appendChild(hname);
  const hscope = el('span','muted small'); hscope.style.marginLeft='8px'; hscope.textContent = '— ' + scopeLabel(res.scope); hleft.appendChild(hscope);
  const hright = el('div'); const del=el('button','btn small danger'); del.textContent='Supprimer'; hright.appendChild(del);
  head.appendChild(hleft); head.appendChild(hright);
  r.appendChild(head);

  const body = el('div','list'); body.style.display='none'; r.appendChild(body);
  head.onclick = function(){ body.style.display = (body.style.display==='none') ? 'block' : 'none'; };

  // Nom
  (function(){
    const line = el('div','list-item small');
    const left = el('div'); left.textContent='Nom'; line.appendChild(left);
    const right = el('div');
    const nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.value = res.name||'';
    right.appendChild(nameI); line.appendChild(right); body.appendChild(line);
    nameI.oninput = function(){ res.name = nameI.value||''; save(S); hname.textContent=res.name||'Ressource'; };
  })();

  // Portee
  (function(){
    const line = el('div','list-item small');
    const left = el('div'); left.textContent='Portee'; line.appendChild(left);
    const right = el('div');
    const sel=document.createElement('select'); sel.className='select';
    SCOPES.forEach(function(s){ const o=document.createElement('option'); o.value=s; o.textContent=scopeLabel(s); if((res.scope||'globale')===s) o.selected=true; sel.appendChild(o); });
    right.appendChild(sel); line.appendChild(right); body.appendChild(line);
    sel.onchange = function(){ res.scope = sel.value; save(S); hscope.textContent='— '+scopeLabel(res.scope); onRefresh(); };
  })();

  // Liens
  (function(){
    const sc = res.scope || 'globale';
    if(sc==='globale') return;
    const list = el('div','list-item small');
    const left = el('div'); left.textContent='Lie a'; list.appendChild(left);
    const right = el('div');
    const names = (sc==='races' ? (S.races||[]) : sc==='tribus' ? (S.tribes||[]) : (S.classes||[])).map(function(x){ return x && x.name; }).filter(Boolean);
    const set = new Set(Array.isArray(res.linked)? res.linked : []);
    names.forEach(function(n){
      const label=document.createElement('label'); label.style.marginRight='8px';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.value=n; cb.checked = set.has(n);
      cb.onchange = function(){ if(cb.checked) set.add(n); else set.delete(n); res.linked = Array.from(set); save(S); };
      label.appendChild(cb); label.appendChild(document.createTextNode(' '+n)); right.appendChild(label);
    });
    list.appendChild(right); body.appendChild(list);
  })();

  del.onclick = function(){ const arr=ensure(S); const i=arr.indexOf(res); if(i>=0){ arr.splice(i,1); save(S); onRefresh(); } };

  return r;
}

export function renderAdminResources(){
  const S = get(); ensure(S);
  const root = el('div');
  const panel = el('div','panel'); 
  const head = el('div','list-item'); const hdLeft=el('div'); hdLeft.innerHTML='<b>Ressources</b>'; head.appendChild(hdLeft); panel.appendChild(head);
  const list = el('div','list'); panel.appendChild(list);
  root.appendChild(panel);

  function refresh(){
    list.innerHTML='';
    ensure(get()).forEach(function(res){ list.appendChild(rowRes(get(), res, refresh)); });

    const add = el('div','list-item small');
    const left = el('div'); left.textContent='Ajouter ressource'; add.appendChild(left);
    const right = el('div');
    const nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom';
    const scopeS=document.createElement('select'); scopeS.className='select'; SCOPES.forEach(function(s){ const o=document.createElement('option'); o.value=s; o.textContent=scopeLabel(s); scopeS.appendChild(o); });
    const addB=document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick=function(){
      const nm=(nameI.value||'').trim(); if(!nm) return;
      const obj={ id:uid(), name:nm, scope:scopeS.value||'globale' };
      ensure(S).push(obj); save(S); refresh();
    };
    right.appendChild(nameI); right.appendChild(scopeS); right.appendChild(addB);
    add.appendChild(right);
    list.appendChild(add);
  }
  refresh();

  return root;
}
export default renderAdminResources;
