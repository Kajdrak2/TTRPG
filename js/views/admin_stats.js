// js/views/admin_stats.js — Build AST2 (Stats & Catégories unifiés)
// Un seul onglet "Stats" pour gérer à la fois les catégories et les stats attachées.
// - Catégories avec ordre, renommage, suppression (les stats vont dans "(Sans catégorie)")
// - Stats listées par catégorie; on peut en ajouter, supprimer, réordonner, et déplacer vers une autre catégorie
// - "Sans catégorie" regroupe les stats orphelines
// - S.settings.stats est tenu à jour comme l'union de toutes les stats

import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

function ensureSettings(S){
  S.settings = S.settings && typeof S.settings==='object' ? S.settings : {};
  if(!Array.isArray(S.settings.categories)) S.settings.categories = [];
  if(!Array.isArray(S.settings.stats)) S.settings.stats = [];
  return S.settings;
}
function uniqStats(arr){
  var seen = {}, out = [];
  for(var i=0;i<arr.length;i++){ var k = String(arr[i]||'').trim(); if(k && !seen[k]){ seen[k]=1; out.push(k); } }
  return out;
}
function allStatsFromCats(S){
  var cats = ensureSettings(S).categories;
  var pool = [].concat(ensureSettings(S).stats||[]);
  for(var i=0;i<cats.length;i++){
    var st = cats[i] && Array.isArray(cats[i].stats) ? cats[i].stats : [];
    pool = pool.concat(st);
  }
  return uniqStats(pool);
}
function syncGlobalStats(S){
  ensureSettings(S).stats = allStatsFromCats(S);
  save(S);
}
function getOrCreateSansCat(S){
  var cats = ensureSettings(S).categories;
  for(var i=0;i<cats.length;i++){ if(cats[i] && cats[i].name === '(Sans catégorie)') return cats[i]; }
  var sc = { name:'(Sans catégorie)', stats:[] };
  cats.unshift(sc);
  return sc;
}
function findCat(S, name){
  var cats = ensureSettings(S).categories;
  for(var i=0;i<cats.length;i++){ if(cats[i] && cats[i].name === name) return cats[i]; }
  return null;
}
function statExistsInAny(S, stat){
  var cats = ensureSettings(S).categories;
  for(var i=0;i<cats.length;i++){
    var c = cats[i];
    if(c && Array.isArray(c.stats) && c.stats.indexOf(stat)>=0) return true;
  }
  return false;
}
function removeStatFromAll(S, stat){
  var cats = ensureSettings(S).categories;
  for(var i=0;i<cats.length;i++){
    var c = cats[i]; if(!c || !Array.isArray(c.stats)) continue;
    var idx = c.stats.indexOf(stat); if(idx>=0) c.stats.splice(idx,1);
  }
}

function moveStat(S, fromCat, toCat, stat){
  if(!toCat || !stat) return;
  if(fromCat && fromCat.stats){ var i = fromCat.stats.indexOf(stat); if(i>=0) fromCat.stats.splice(i,1); }
  if(!Array.isArray(toCat.stats)) toCat.stats = [];
  if(toCat.stats.indexOf(stat)===-1) toCat.stats.push(stat);
  syncGlobalStats(S);
}
function reorder(arr, from, delta){
  var to = from + delta;
  if(to<0 || to>=arr.length) return;
  var t = arr[from]; arr[from] = arr[to]; arr[to] = t;
}

function categoryPanel(S, cat, idx, refresh){
  var panel = el('div','panel');
  var head  = el('div','list-item'); head.style.cursor='pointer';
  var left  = el('div'); var title = document.createElement('b'); title.textContent = cat.name||'Catégorie'; left.appendChild(title);
  var right = el('div');
  var up   = el('button','btn small secondary'); up.textContent='↑';
  var down = el('button','btn small secondary'); down.textContent='↓';
  var del  = el('button','btn small danger');    del.textContent='Supprimer';
  right.appendChild(up); right.appendChild(down); if(cat.name!=='(Sans catégorie)') right.appendChild(del);
  head.appendChild(left); head.appendChild(right); panel.appendChild(head);

  var body = el('div','list'); body.style.display='none'; panel.appendChild(body);
  head.onclick = function(){ body.style.display = (body.style.display==='none') ? 'block' : 'none'; };

  // Renommer (sauf Sans catégorie)
  if(cat.name!=='(Sans catégorie)'){
    (function(){
      var row = el('div','list-item small');
      var l = el('div'); l.textContent='Nom'; row.appendChild(l);
      var r = el('div'); var nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.value=cat.name||'';
      nameI.oninput = function(){ cat.name = nameI.value||''; save(S); title.textContent=cat.name||'Catégorie'; };
      r.appendChild(nameI); row.appendChild(r); body.appendChild(row);
    })();
  }

  // Liste des stats de la catégorie
  (function(){
    var stats = Array.isArray(cat.stats) ? cat.stats : (cat.stats = []);
    if(stats.length===0){
      var empty = el('div','list-item small muted'); empty.textContent='Aucune stat'; body.appendChild(empty);
    }
    for(var i=0;i<stats.length;i++){
      (function(statName, pos){
        var row = el('div','list-item small');
        var l = el('div'); l.textContent = statName; row.appendChild(l);
        var r = el('div');
        var upS   = el('button','btn small secondary'); upS.textContent='↑';
        var downS = el('button','btn small secondary'); downS.textContent='↓';
        var mvSel = document.createElement('select'); mvSel.className='select';
        // build category options
        var cats = ensureSettings(S).categories.slice();
        for(var k=0;k<cats.length;k++){ 
          var o=document.createElement('option'); 
          o.value=cats[k].name; o.textContent=cats[k].name; 
          if(cats[k]===cat) o.selected=true; 
          mvSel.appendChild(o); 
        }
        var mvBtn = el('button','btn small'); mvBtn.textContent='Déplacer';
        var delS  = el('button','btn small danger'); delS.textContent='Supprimer';

        upS.onclick = function(){ reorder(stats, pos, -1); save(S); refresh(); };
        downS.onclick = function(){ reorder(stats, pos, +1); save(S); refresh(); };
        mvBtn.onclick = function(){
          var dest = findCat(S, mvSel.value);
          if(dest && dest!==cat){ moveStat(S, cat, dest, statName); refresh(); }
        };
        delS.onclick = function(){ 
          // supprime seulement de cette catégorie; si n'appartient à aucune autre, reste dans Sans catégorie
          var i = cat.stats.indexOf(statName); if(i>=0) cat.stats.splice(i,1);
          if(!statExistsInAny(S, statName)) getOrCreateSansCat(S).stats.push(statName);
          syncGlobalStats(S); refresh();
        };

        r.appendChild(upS); r.appendChild(downS); r.appendChild(mvSel); r.appendChild(mvBtn); r.appendChild(delS);
        row.appendChild(r);
        body.appendChild(row);
      })(stats[i], i);
    }
  })();

  // Ajouter une stat dans cette catégorie
  (function(){
    var row = el('div','list-item small');
    var l = el('div'); l.textContent='Ajouter une stat'; row.appendChild(l);
    var r = el('div');
    var nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom de stat (ex. FOR)';
    var addB=document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick = function(){
      var nm = (nameI.value||'').trim(); if(!nm) return;
      // enlever d'ailleurs
      removeStatFromAll(S, nm);
      if(cat.stats.indexOf(nm)===-1) cat.stats.push(nm);
      syncGlobalStats(S); nameI.value=''; refresh();
    };
    r.appendChild(nameI); r.appendChild(addB);
    row.appendChild(r); body.appendChild(row);
  })();

  // Actions de catégorie
  up.onclick   = function(){ var cats=ensureSettings(S).categories; reorder(cats, idx, -1); save(S); refresh(); };
  down.onclick = function(){ var cats=ensureSettings(S).categories; reorder(cats, idx, +1); save(S); refresh(); };
  del.onclick  = function(){
    if(cat.name==='/Sans catégorie/') return;
    var cats=ensureSettings(S).categories;
    var sc = getOrCreateSansCat(S);
    // déplacer toutes les stats restantes dans Sans catégorie
    var st = Array.isArray(cat.stats)? cat.stats.slice():[];
    for(var i=0;i<st.length;i++){ if(sc.stats.indexOf(st[i])===-1) sc.stats.push(st[i]); }
    var ix = cats.indexOf(cat); if(ix>=0) cats.splice(ix,1);
    syncGlobalStats(S); refresh();
  };

  return panel;
}

export function renderAdminStats(){
  var S = get(); ensureSettings(S);
  // garantir "(Sans catégorie)" présent et récupérer les stats orphelines
  var sc = getOrCreateSansCat(S);
  // stats orphelines: tout ce qui est dans S.settings.stats mais pas dans une catégorie
  var all = ensureSettings(S).stats.slice();
  for(var i=0;i<all.length;i++){
    if(!statExistsInAny(S, all[i]) && sc.stats.indexOf(all[i])===-1) sc.stats.push(all[i]);
  }
  syncGlobalStats(S);

  var root = el('div');
  var panel = el('div','panel'); 
  var head  = el('div','list-item'); var hdL=el('div'); hdL.innerHTML = '<b>Stats & Catégories</b>'; head.appendChild(hdL); panel.appendChild(head);
  var list  = el('div','list'); panel.appendChild(list);
  root.appendChild(panel);

  function refresh(){
    list.innerHTML='';
    var cats = ensureSettings(get()).categories;
    for(var i=0;i<cats.length;i++){
      list.appendChild(categoryPanel(get(), cats[i], i, refresh));
    }

    // Ajouter une catégorie
    var add = el('div','list-item small');
    var l = el('div'); l.textContent='Ajouter une catégorie'; add.appendChild(l);
    var r = el('div'); 
    var nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom de catégorie';
    var addB=document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick = function(){
      var nm = (nameI.value||'').trim(); if(!nm || nm === '(Sans catégorie)') return;
      ensureSettings(S).categories.push({ name:nm, stats:[] });
      save(S); refresh();
    };
    r.appendChild(nameI); r.appendChild(addB);
    add.appendChild(r);
    list.appendChild(add);
  }
  refresh();
  return root;
}
export default renderAdminStats;
