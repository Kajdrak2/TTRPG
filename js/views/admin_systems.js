// js/views/admin_systems.js — Build SYS-A2 (toggles + points + méthodes + Attitudes min/max)
import { el } from '../core/ui.js';
import { save } from '../core/state.js';

export function renderAdminSystems(S){
  S.settings = S.settings && typeof S.settings==='object' ? S.settings : {};
  S.dice = S.dice && typeof S.dice==='object' ? S.dice : {};
  S.dice.methods = Array.isArray(S.dice.methods) ? S.dice.methods : [];
  S.settings.attitudes = Array.isArray(S.settings.attitudes) ? S.settings.attitudes : [];

  const box = el('div');

  // ---------- Header ----------
  const title = document.createElement('h3'); title.textContent = 'Système'; box.appendChild(title);

  // ---------- Toggles ----------
  const togg = el('div','grid3');
  function mkToggle(label, key){
    const lab = document.createElement('label'); lab.className='list-item small';
    const l = document.createElement('div'); l.textContent = label; lab.appendChild(l);
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!S.settings[key];
    cb.onchange = ()=>{ S.settings[key] = cb.checked; save(S); };
    lab.appendChild(cb);
    return lab;
  }
  togg.appendChild(mkToggle('Activer Races',   'useRaces'));
  togg.appendChild(mkToggle('Activer Tribus',  'useTribes'));
  togg.appendChild(mkToggle('Activer Classes', 'useClasses'));
  box.appendChild(togg);

  // category points toggle
  const catWrap = el('div','list mt8');
  const labCat = document.createElement('label'); labCat.className='list-item small';
  const lcat = document.createElement('div'); lcat.textContent='Points de Catégorie (activer)'; labCat.appendChild(lcat);
  const cbcat = document.createElement('input'); cbcat.type='checkbox'; cbcat.checked=!!S.settings.useCategoryPoints;
  cbcat.onchange=()=>{ S.settings.useCategoryPoints = cbcat.checked; save(S); };
  labCat.appendChild(cbcat);
  catWrap.appendChild(labCat);
  box.appendChild(catWrap);

  // points per level
  const pplPanel = el('div','panel');
  const pplHead  = el('div','list-item'); pplHead.innerHTML='<div><b>Points / Niveau</b></div>'; pplPanel.appendChild(pplHead);
  const pplBody  = el('div','list'); pplPanel.appendChild(pplBody);
  const pplRow   = el('div','list-item small');
  const pplL     = document.createElement('div'); pplL.textContent='Points gagnés par niveau';
  const pplR     = document.createElement('div');
  const pplI     = document.createElement('input'); pplI.className='input'; pplI.type='number'; pplI.value = +(S.settings.pointsPerLevel||0);
  pplI.oninput = ()=>{ S.settings.pointsPerLevel = +pplI.value||0; save(S); };
  pplR.appendChild(pplI); pplRow.appendChild(pplL); pplRow.appendChild(pplR); pplBody.appendChild(pplRow);
  box.appendChild(pplPanel);

  // ---------- Attitudes (Disposition -> Attitude) ----------
  const attPanel = el('div','panel mt16');
  const attHead  = el('div','list-item'); attHead.innerHTML = '<div><b>Disposition & Attitudes</b></div>'; attPanel.appendChild(attHead);
  const attList  = el('div','list'); attPanel.appendChild(attList);
  const attAdd   = el('div','list-item small');
  const attL     = document.createElement('div'); attL.textContent='Ajouter une attitude'; attAdd.appendChild(attL);
  const attR     = document.createElement('div'); attR.className='row'; attR.style.gap='8px';
  const attName  = document.createElement('input'); attName.className='input'; attName.placeholder='Nom (ex. Hostile)';
  const attMin   = document.createElement('input'); attMin.className='input'; attMin.type='number'; attMin.placeholder='Min (vide = -∞)';
  const attMax   = document.createElement('input'); attMax.className='input'; attMax.type='number'; attMax.placeholder='Max (vide = +∞)';
  const attBtn   = document.createElement('button'); attBtn.className='btn'; attBtn.textContent='Ajouter';
  attR.append(attName, attMin, attMax, attBtn); attAdd.appendChild(attR);
  const attHelp  = document.createElement('div'); attHelp.className='muted small mt4';
  attHelp.textContent = 'Règle : on prend l’attitude dont le seuil min est le plus élevé ≤ Disposition, et ≤ max si défini. Min vide = -∞, Max vide = +∞.';
  attAdd.appendChild(attHelp);
  attPanel.appendChild(attAdd);
  box.appendChild(attPanel);

  function sortAtts(){ S.settings.attitudes.sort((a,b)=> ((a && (a.min===''||a.min==null)?-Infinity:+a.min) - ((b && (b.min===''||b.min==null)?-Infinity:+b.min)) )); }

  function renderAtts(){
    sortAtts();
    attList.innerHTML='';
    if(!S.settings.attitudes.length){
      const empty = el('div','list-item small muted'); empty.textContent='Aucune attitude'; attList.appendChild(empty);
      return;
    }
    S.settings.attitudes.forEach((att, idx)=>{
      const row = el('div','list-item small');
      const left = document.createElement('div');
      const nmI  = document.createElement('input'); nmI.className='input'; nmI.placeholder='Nom'; nmI.value=att.name||'';
      nmI.oninput=()=>{ att.name = nmI.value||''; save(S); };
      left.appendChild(nmI);
      const right = document.createElement('div'); right.className='row'; right.style.gap='8px';
      const minI = document.createElement('input'); minI.className='input'; minI.type='number'; minI.placeholder='Min (vide = -∞)';
      minI.value = (att.min===''||att.min==null) ? '' : String(att.min);
      minI.oninput=()=>{ att.min = (minI.value===''? null : +minI.value); save(S); };
      const maxI = document.createElement('input'); maxI.className='input'; maxI.type='number'; maxI.placeholder='Max (vide = +∞)';
      maxI.value = (att.max===''||att.max==null) ? '' : String(att.max);
      maxI.oninput=()=>{ att.max = (maxI.value===''? null : +maxI.value); save(S); };
      const up   = document.createElement('button'); up.className='btn small secondary'; up.textContent='↑';
      const down = document.createElement('button'); down.className='btn small secondary'; down.textContent='↓';
      const del  = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
      up.onclick = ()=>{ if(idx>0){ const a=S.settings.attitudes[idx-1]; S.settings.attitudes[idx-1]=S.settings.attitudes[idx]; S.settings.attitudes[idx]=a; save(S); renderAtts(); } };
      down.onclick = ()=>{ if(idx<S.settings.attitudes.length-1){ const a=S.settings.attitudes[idx+1]; S.settings.attitudes[idx+1]=S.settings.attitudes[idx]; S.settings.attitudes[idx]=a; save(S); renderAtts(); } };
      del.onclick = ()=>{ S.settings.attitudes.splice(idx,1); save(S); renderAtts(); };
      right.append(minI, maxI, up, down, del);
      row.append(left, right);
      attList.appendChild(row);
    });
  }
  renderAtts();
  attBtn.onclick = ()=>{
    const nm=(attName.value||'').trim(); if(!nm) return;
    const mn=attMin.value===''? null : +attMin.value;
    const mx=attMax.value===''? null : +attMax.value;
    S.settings.attitudes.push({name:nm, min:mn, max:mx});
    save(S); attName.value=''; attMin.value=''; attMax.value=''; renderAtts();
  };

  // ---------- Méthodes de dés ----------
  const methPanel = el('div','panel mt16');
  const methHead  = el('div','list-item'); methHead.innerHTML = '<div><b>Méthodes de jets</b></div>'; methPanel.appendChild(methHead);
  const methList  = el('div','list'); methPanel.appendChild(methList);
  const methAdd   = el('div','list-item small');
  const mL = document.createElement('input'); mL.className='input'; mL.placeholder='Nom de la méthode (ex. Test FOR)';
  const mF = document.createElement('input'); mF.className='input'; mF.placeholder='Formule (ex. 1d20 + {FOR} + {Combat})';
  const mB = document.createElement('button'); mB.className='btn'; mB.textContent='Ajouter';
  methAdd.appendChild(mL); methAdd.appendChild(mF); methAdd.appendChild(mB);
  methPanel.appendChild(methAdd);
  const mHelp = document.createElement('div'); mHelp.className='muted small mt8';
  mHelp.textContent = 'Variables possibles : toutes les {STAT} de S.settings.stats, les catégories, et {level}.';
  methPanel.appendChild(mHelp);
  box.appendChild(methPanel);

  function renderMethods(){
    methList.innerHTML='';
    (S.dice.methods||[]).forEach((m,idx)=>{
      const row = el('div','list-item small');
      const l1  = document.createElement('input'); l1.className='input'; l1.value = m.label||''; l1.oninput=()=>{ m.label=l1.value; save(S); };
      const l2  = document.createElement('input'); l2.className='input'; l2.value = m.formula||''; l2.oninput=()=>{ m.formula=l2.value; save(S); };
      const up  = document.createElement('button'); up.className='btn small secondary'; up.textContent='↑';
      const down= document.createElement('button'); down.className='btn small secondary'; down.textContent='↓';
      const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
      up.onclick   = ()=>{ if(idx>0){ const t=S.dice.methods[idx-1]; S.dice.methods[idx-1]=S.dice.methods[idx]; S.dice.methods[idx]=t; save(S); renderMethods(); } };
      down.onclick = ()=>{ if(idx<S.dice.methods.length-1){ const t=S.dice.methods[idx+1]; S.dice.methods[idx+1]=S.dice.methods[idx]; S.dice.methods[idx]=t; save(S); renderMethods(); } };
      del.onclick  = ()=>{ S.dice.methods.splice(idx,1); save(S); renderMethods(); };
      row.append(l1,l2,up,down,del);
      methList.appendChild(row);
    });
  }
  renderMethods();
  mB.onclick = ()=>{
    const l=(mL.value||'').trim(), f=(mF.value||'').trim(); if(!l||!f) return;
    S.dice.methods.push({label:l, formula:f}); save(S); mL.value=''; mF.value=''; renderMethods();
  };

  return box;
}
export default renderAdminSystems;
