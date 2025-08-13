// js/views/admin_tribes.js — Build A12 (Tribus)
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

function ensureArray(a){ return Array.isArray(a)?a:[]; }
function ensureCol(S){ S.tribes = ensureArray(S.tribes); return S.tribes; }
function N(v){ return (isFinite(+v)? +v : 0); }

function listAllStats(S){
  var out = [];
  if(S.settings && Array.isArray(S.settings.stats) && S.settings.stats.length) out = S.settings.stats.slice();
  if(out.length===0 && S.settings && Array.isArray(S.settings.categories)) {
    var seen={};
    for(var i=0;i<S.settings.categories.length;i++){ var st=ensureArray(S.settings.categories[i].stats); for(var j=0;j<st.length;j++) if(!seen[st[j]]){ seen[st[j]]=1; out.push(st[j]); } }
  }
  if(out.length===0 && Array.isArray(S.characteristics)) out = S.characteristics.slice();
  return out;
}
function listAllCats(S){
  var out=[]; if(S.settings && Array.isArray(S.settings.categories)){ for(var i=0;i<S.settings.categories.length;i++) out.push(S.settings.categories[i].name); }
  return out;
}
function listResFor(S, entName){
  var out=[]; var R=ensureArray(S.resources);
  for(var i=0;i<R.length;i++){ var r=R[i]; var name=r.name||r.id; if(!name) continue;
    var scope=r.scope||'globale';
    if(scope==='globale') out.push(name);
    else if(scope==='races' && 'tribes'==='races'){ if(Array.isArray(r.linked) && r.linked.indexOf(entName)>=0) out.push(name); }
    else if(scope==='tribus' && 'tribes'==='tribes'){ if(Array.isArray(r.linked) && r.linked.indexOf(entName)>=0) out.push(name); }
    else if(scope==='classes' && 'tribes'==='classes'){ if(Array.isArray(r.linked) && r.linked.indexOf(entName)>=0) out.push(name); }
  }
  return out;
}

function opts(sel, arr, cur){
  sel.innerHTML=''; var o=document.createElement('option'); o.value=''; o.textContent='—'; sel.appendChild(o);
  for(var i=0;i<arr.length;i++){ var it=arr[i]; var opt=document.createElement('option'); opt.value=String(it); opt.textContent=String(it); if(String(it)===String(cur)) opt.selected=true; sel.appendChild(opt); }
  return sel;
}

function ensureMods(o){ o.mods = o.mods && typeof o.mods==='object'? o.mods : {}; o.mods.stats=o.mods.stats&&typeof o.mods.stats==='object'? o.mods.stats:{}; o.mods.cats=o.mods.cats&&typeof o.mods.cats==='object'? o.mods.cats:{}; o.mods.resources=o.mods.resources&&typeof o.mods.resources==='object'? o.mods.resources:{}; return o.mods; }

function row(S, ent, onRefresh){
  var r = el('div','panel');
  var head = el('div','list-item'); head.style.cursor='pointer';
  var hl = el('div'); var b=document.createElement('b'); b.textContent = ent.name||'Tribu'; hl.appendChild(b);
  var hr = el('div'); var del=el('button','btn small danger'); del.textContent='Supprimer'; hr.appendChild(del);
  head.appendChild(hl); head.appendChild(hr); r.appendChild(head);
  var body = el('div','list'); body.style.display='none'; r.appendChild(body);
  head.onclick=function(){ body.style.display = (body.style.display==='none')?'block':'none'; };

  // Nom
  (function(){
    var li=el('div','list-item small');
    var left=el('div'); left.textContent='Nom'; li.appendChild(left);
    var right=el('div'); var inp=document.createElement('input'); inp.className='input'; inp.placeholder='Nom'; inp.value=ent.name||'';
    inp.oninput=function(){ ent.name=inp.value||''; save(S); b.textContent=ent.name||'Tribu'; };
    right.appendChild(inp); li.appendChild(right); body.appendChild(li);
  })();

  // Delta par categorie
  (function(){
    var li=el('div','list-item small');
    var left=el('div'); left.textContent='Delta par categorie'; li.appendChild(left);
    var right=el('div'); var n=document.createElement('input'); n.className='input'; n.type='number'; n.value=(+ent.catDelta||0);
    n.oninput=function(){ ent.catDelta = N(n.value); save(S); };
    right.appendChild(n); li.appendChild(right); body.appendChild(li);
  })();

  // Mods Stats
  (function(){
    var mods=ensureMods(ent);
    var li=el('div','list-item small');
    var left=el('div'); left.textContent='Stats'; li.appendChild(left);
    var right=el('div');
    var sel=document.createElement('select'); sel.className='select'; opts(sel, listAllStats(S), '');
    var val=document.createElement('input'); val.className='input'; val.type='number'; val.placeholder='+/-';
    var add=el('button','btn small'); add.textContent='Ajouter';
    add.onclick=function(){ var k=sel.value; var v=N(val.value); if(!k) return; mods.stats[k]=(mods.stats[k]||0)+v; save(S); onRefresh(); };
    right.appendChild(sel); right.appendChild(val); right.appendChild(add); li.appendChild(right); body.appendChild(li);

    var keys=Object.keys(mods.stats);
    for(var i=0;i<keys.length;i++){ (function(k){ var row=el('div','list-item small'); var l=el('div'); l.textContent=k; row.appendChild(l);
      var rr=el('div'); var inp=document.createElement('input'); inp.className='input'; inp.type='number'; inp.value=+mods.stats[k]||0;
      var rm=el('button','btn small danger'); rm.textContent='Supprimer';
      inp.oninput=function(){ mods.stats[k]=N(inp.value); save(S); };
      rm.onclick=function(){ delete mods.stats[k]; save(S); onRefresh(); };
      rr.appendChild(inp); rr.appendChild(rm); row.appendChild(rr); body.appendChild(row); })(keys[i]); }
  })();

  // Mods Categories
  (function(){
    var mods=ensureMods(ent);
    var li=el('div','list-item small');
    var left=el('div'); left.textContent='Categories'; li.appendChild(left);
    var right=el('div'); var sel=document.createElement('select'); sel.className='select'; opts(sel, listAllCats(S), '');
    var val=document.createElement('input'); val.className='input'; val.type='number'; val.placeholder='+/-';
    var add=el('button','btn small'); add.textContent='Ajouter';
    add.onclick=function(){ var k=sel.value; var v=N(val.value); if(!k) return; mods.cats[k]=(mods.cats[k]||0)+v; save(S); onRefresh(); };
    right.appendChild(sel); right.appendChild(val); right.appendChild(add); li.appendChild(right); body.appendChild(li);
    var keys=Object.keys(mods.cats);
    for(var i=0;i<keys.length;i++){ (function(k){ var row=el('div','list-item small'); var l=el('div'); l.textContent=k; row.appendChild(l);
      var rr=el('div'); var inp=document.createElement('input'); inp.className='input'; inp.type='number'; inp.value=+mods.cats[k]||0;
      var rm=el('button','btn small danger'); rm.textContent='Supprimer';
      inp.oninput=function(){ mods.cats[k]=N(inp.value); save(S); };
      rm.onclick=function(){ delete mods.cats[k]; save(S); onRefresh(); };
      rr.appendChild(inp); rr.appendChild(rm); row.appendChild(rr); body.appendChild(row); })(keys[i]); }
  })();

  // Ressources (liens et mods)
  (function(){
    var mods=ensureMods(ent);
    var li=el('div','list-item small');
    var left=el('div'); left.textContent='Ressources'; li.appendChild(left);
    var right=el('div');
    var allowed=listResFor(S, ent.name||'');
    var sel=document.createElement('select'); sel.className='select'; opts(sel, allowed, '');
    var maxI=document.createElement('input'); maxI.className='input'; maxI.type='number'; maxI.placeholder='max +=';
    var startI=document.createElement('input'); startI.className='input'; startI.type='number'; startI.placeholder='start +=';
    var add=el('button','btn small'); add.textContent='Ajouter';
    add.onclick=function(){ var k=sel.value; if(!k) return; var o=mods.resources[k]||{max:0,start:0}; o.max += N(maxI.value); o.start += N(startI.value); mods.resources[k]=o; save(S); onRefresh(); };
    right.appendChild(sel); right.appendChild(maxI); right.appendChild(startI); right.appendChild(add); li.appendChild(right); body.appendChild(li);
    var keys=Object.keys(mods.resources);
    for(var i=0;i<keys.length;i++){ (function(k){ var row=el('div','list-item small'); var l=el('div'); l.textContent=k; row.appendChild(l);
      var rr=el('div');
      var m1=document.createElement('input'); m1.className='input'; m1.type='number'; m1.value=+(mods.resources[k]&&mods.resources[k].max)||0;
      var m2=document.createElement('input'); m2.className='input'; m2.type='number'; m2.value=+(mods.resources[k]&&mods.resources[k].start)||0;
      var rm=el('button','btn small danger'); rm.textContent='Supprimer';
      m1.oninput=function(){ (mods.resources[k]||(mods.resources[k]={})).max = N(m1.value); save(S); };
      m2.oninput=function(){ (mods.resources[k]||(mods.resources[k]={})).start = N(m2.value); save(S); };
      rm.onclick=function(){ delete mods.resources[k]; save(S); onRefresh(); };
      rr.appendChild(m1); rr.appendChild(m2); rr.appendChild(rm); row.appendChild(rr); body.appendChild(row); })(keys[i]); }
  })();

  del.onclick=function(){ var arr=ensureCol(S); var i=arr.indexOf(ent); if(i>=0){ arr.splice(i,1); save(S); onRefresh(); } };

  return r;
}

export function renderAdminTribes(S0){
  var S = get();
  ensureCol(S);
  var root = el('div');
  var panel = el('div','panel'); var head=el('div','list-item'); var hdL=el('div'); hdL.innerHTML='<b>Tribus</b>'; head.appendChild(hdL); panel.appendChild(head);
  var list = el('div','list'); panel.appendChild(list); root.appendChild(panel);

  function refresh(){
    list.innerHTML='';
    var arr = ensureCol(get());
    for(var i=0;i<arr.length;i++) list.appendChild(row(get(), arr[i], refresh));

    var add = el('div','list-item small');
    var left = el('div'); left.textContent='Ajouter tribu'; add.appendChild(left);
    var right = el('div');
    var nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom';
    var addB=document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick=function(){ var nm=(nameI.value||'').trim(); if(!nm) return; ensureCol(S).push({ id:'trib_'+Math.random().toString(36).slice(2,9), name:nm, catDelta:0, mods:{ stats:{}, cats:{}, resources:{} } }); save(S); refresh(); };
    right.appendChild(nameI); right.appendChild(addB); add.appendChild(right); list.appendChild(add);
  }
  refresh();

  return root;
}
export default renderAdminTribes;
