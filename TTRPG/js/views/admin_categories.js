// js/views/admin_categories.js
import { el } from '../core/ui.js';
import { save } from '../core/state.js';

/** Déplace/assigne une caractéristique dans UNE seule catégorie */
function moveStatToCategory(S, stat, targetName){
  if(!stat || !targetName) return;
  S.settings.categories = S.settings.categories||[];
  // remove from all categories
  S.settings.categories.forEach(c=> c.stats = (c.stats||[]).filter(s=> s!==stat));
  // add to target
  let tgt = S.settings.categories.find(c=> c.name===targetName);
  if(!tgt){ tgt = {name:targetName, stats:[]}; S.settings.categories.push(tgt); }
  (tgt.stats = tgt.stats||[]).push(stat);
  // ensure in global list
  S.settings.stats = S.settings.stats||[];
  if(!S.settings.stats.includes(stat)) S.settings.stats.push(stat);
  save(S);
}

/** Retourne les stats présentes en global mais absentes de toute catégorie */
function unassignedStats(S){
  const global = new Set(S.settings?.stats||[]);
  const inCats = new Set();
  (S.settings?.categories||[]).forEach(c=> (c.stats||[]).forEach(s=> inCats.add(s)));
  return [...global].filter(s=> !inCats.has(s));
}

export function renderCategories(S){
  const box = el('div');
  box.innerHTML = `<h3>Caractéristiques (par catégories)</h3>
  <div class="panel" id="orph-panel" style="display:none">
    <div class="list-item"><div><b>Non classées</b> <span class="muted">(anciennes caractéristiques à ranger)</span></div></div>
    <div id="orph-list" class="list"></div>
  </div>
  <div id="cat-list" class="list"></div>
  <div class="grid3 mt8">
    <input class="input" id="new-cat" placeholder="Nom de catégorie">
    <button class="btn" id="add-cat">Ajouter une catégorie</button>
  </div>`;

  // catégorie ouverte courante
  let openCatName = (S.settings.categories&&S.settings.categories[0]&&S.settings.categories[0].name) || null;

  setTimeout(()=>{
    S.settings.categories = S.settings.categories||[];
    S.settings.stats = S.settings.stats||[];

    // -- Panneau "Non classées" ------------------------------------------------
    const orphWrap = box.querySelector('#orph-panel');
    const orphList = box.querySelector('#orph-list');
    function renderOrphans(){
      const orph = unassignedStats(S);
      if(!orph.length){ orphWrap.style.display='none'; orphList.innerHTML=''; return; }
      orphWrap.style.display='block'; orphList.innerHTML='';
      orph.forEach(st=>{
        const row = el('div','list-item small');
        const left = el('div'); left.textContent = st;
        const right = el('div');
        // choisir une catégorie de destination
        const sel = document.createElement('select'); sel.className='select';
        (S.settings.categories||[]).forEach(cc=>{
          const op=document.createElement('option'); op.value=cc.name; op.textContent=cc.name; sel.appendChild(op);
        });
        const btn = el('button','btn small'); btn.textContent='Ranger';
        btn.onclick=()=>{ const dest = sel.value; moveStatToCategory(S, st, dest); openCatName=dest; renderAll(); };
        right.append('Déplacer vers ', sel, btn);
        row.append(left, right);
        orphList.appendChild(row);
      });
    }

    // -- Catégories et caractéristiques ----------------------------------------
    const catList = box.querySelector('#cat-list');

    function renderCats(){
      const prevOpen = openCatName;
      catList.innerHTML='';
      (S.settings.categories||[]).forEach((c, idx)=>{
        const p = el('div','panel');
        p.innerHTML = `<div class="list-item head" style="cursor:pointer;">
            <div><b>${c.name}</b></div>
            <div class="row" style="gap:6px;align-items:center;">
              <button class="btn danger small" data-act="del">Supprimer</button>
            </div>
          </div>`;
        const inner = el('div','inner');
        const isOpen = (prevOpen ? (c.name===prevOpen) : (idx===0));
        inner.style.display = isOpen?'block':'none'; p.setAttribute('data-open', isOpen?'1':'0');

        // Ajouter une stat dans cette catégorie
        const addRow = el('div','grid3');
        addRow.innerHTML = `<input class="input" placeholder="Nouvelle caractéristique (ex. FOR)"><button class="btn">Ajouter</button>`;
        const addInp = addRow.querySelector('input'); const addBtn = addRow.querySelector('button');
        addBtn.onclick = ()=>{
          const name=(addInp.value||'').trim(); if(!name) return;
          moveStatToCategory(S, name, c.name); addInp.value=''; openCatName=c.name; renderAll();
        };
        inner.appendChild(addRow);

        // Liste des stats de la catégorie
        const list = el('div','list'); inner.appendChild(list);
        (c.stats||[]).forEach((st)=>{
          const row = el('div','list-item small');
          const left = el('div'); left.textContent = st;
          const right = el('div');
          // déplacer vers...
          const sel = document.createElement('select'); sel.className='select';
          (S.settings.categories||[]).forEach(cc=>{
            const op=document.createElement('option'); op.value=cc.name; op.textContent=cc.name; if(cc.name===c.name) op.selected=true; sel.appendChild(op);
          });
          sel.onchange=()=>{ moveStatToCategory(S, st, sel.value); openCatName = sel.value; renderAll(); };
          const del = el('button','btn danger small'); del.textContent='Supprimer';
          del.onclick=()=>{
            if(!confirm('Supprimer cette caractéristique ?')) return;
            // supprime du global et de toutes les catégories + nettoie mods/attrs
            S.settings.stats = (S.settings.stats||[]).filter(x=>x!==st);
            (S.settings.categories||[]).forEach(cc=> cc.stats = (cc.stats||[]).filter(x=>x!==st));
            (S.races||[]).forEach(e=> e.mods && delete e.mods[st]);
            (S.tribes||[]).forEach(e=> e.mods && delete e.mods[st]);
            (S.classes||[]).forEach(e=> e.mods && delete e.mods[st]);
            (S.players||[]).forEach(p=>{ if(p.attrs) delete p.attrs[st]; if(p.spent) delete p.spent[st]; if(p.tempSpent) delete p.tempSpent[st]; });
            save(S); renderAll();
          };
          right.append('Déplacer vers ', sel, del);
          row.append(left,right);
          list.appendChild(row);
        });

        p.appendChild(inner);

        // accordion
        p.querySelector('.head').addEventListener('click', (e)=>{
          if(e.target.closest('button')) return;
          const isOpen = p.getAttribute('data-open')==='1';
          Array.from(catList.children).forEach(pp=>{ pp.setAttribute('data-open','0'); const inr=pp.querySelector('.inner'); if(inr) inr.style.display='none'; });
          if(!isOpen){ p.setAttribute('data-open','1'); inner.style.display='block'; openCatName=c.name; }
        });

        // delete category → déplace les stats dans "Autres"
        p.querySelector('[data-act="del"]').onclick=()=>{
          if(!confirm('Supprimer cette catégorie ?\nLes caractéristiques seront déplacées dans "Autres".')) return;
          let other = (S.settings.categories||[]).find(x=>x.name==='Autres');
          if(!other){ other = {name:'Autres', stats:[]}; S.settings.categories.push(other); }
          (c.stats||[]).forEach(st=> moveStatToCategory(S, st, 'Autres'));
          S.settings.categories = (S.settings.categories||[]).filter(x=>x!==c);
          save(S); openCatName='Autres'; renderAll();
        };

        catList.appendChild(p);
      });
    }

    function renderAll(){
      renderOrphans();
      renderCats();
    }

    renderAll();

    // Ajouter une catégorie
    box.querySelector('#add-cat').onclick = ()=>{
      const name=(box.querySelector('#new-cat').value||'').trim(); if(!name) return;
      if((S.settings.categories||[]).some(x=>x.name===name)) return alert('Existe déjà');
      (S.settings.categories=S.settings.categories||[]).push({name, stats:[]}); save(S); openCatName=name; renderAll(); box.querySelector('#new-cat').value='';
    };
  });

  return box;
}
export default renderCategories;
