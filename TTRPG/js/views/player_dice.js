// js/views/player_dice.js — Reset from user base + fixes + mods in vars
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function rollNdM(expr){
  const m = String(expr).trim().match(/^([0-9]+)d([0-9]+)$/i);
  if(!m) return null;
  const n = +m[1], faces = +m[2];
  const rolls = [];
  let sum = 0;
  for(let i=0;i<n;i++){ const r = 1 + Math.floor(Math.random()*faces); rolls.push(r); sum += r; }
  return { total: sum, parts: rolls, text: `${n}d${faces} = (${rolls.join(' + ')})` };
}

function getEquipMods(S,p){
  try{
    if(typeof State.getEquipAndEffectMods==='function') return State.getEquipAndEffectMods(S,p);
  }catch(_e){/*noop*/}
  return {stats:{}, cats:{}};
}

function evaluateFormula(formula, vars){
  const validVar = /\{[A-Za-z][A-Za-z0-9 _-]*\}/g;
  const used = [];
  // Replace only valid {Var} tokens
  let replaced = String(formula||'0').replace(validVar, (m)=>{
    const name = m.slice(1,-1).trim();
    const val = +(vars[name] ?? 0);
    used.push([name, val]);
    return String(val);
  });
  // If leftover braces remain, the formula has invalid/malformed variables
  if(/[{}]/.test(replaced)){
    throw new Error('Variables mal formées. Utilise {NOM} avec des lettres/chiffres/espaces/_-.');
  }
  // Replace NdM occurrences after variable substitution
  const diceBreak = [];
  replaced = replaced.replace(/(\d+d\d+)/gi, (m)=>{
    const r = rollNdM(m);
    if(r){ diceBreak.push(r.text); return String(r.total); }
    return m;
  });
  if(!/^[0-9+\-*/()\s.]+$/.test(replaced)) throw new Error('Formule invalide');
  // eslint-disable-next-line no-new-func
  const fn = new Function('return ('+replaced+');');
  const total = +fn();
  const varsBreak = used.map(([k,v])=> `${k}=${v}`);
  return { total: Number.isFinite(total)? total : 0, diceBreak, varsBreak };
}

function buildAllVars(S, p){
  const vars = {};
  const mods = getEquipMods(S,p);
  // Stats
  (S.settings?.stats||[]).forEach(st=>{
    const base = +(p?.attrs?.[st] ?? 0);
    const invested = +(p?.spent?.[st] ?? 0);
    const draft = +(p?.tempSpent?.[st] ?? 0);
    const bonus = +(mods.stats?.[st] ?? 0);
    vars[st] = base + invested + draft + bonus;
  });
  // Categories
  (S.settings?.categories||[]).forEach(c=>{
    const name = c.name;
    if(S.settings?.useCategoryPoints){
      let base = 0;
      if(typeof State.categoryValueFor==='function'){
        base = +State.categoryValueFor(S,p,name) || 0;
      }
      const bonus = +(mods.cats?.[name] ?? 0);
      vars[name] = base + bonus;
    }
  });
  vars.level = p.level||1;
  return vars;
}

function groupStatsByCategory(S){
  const groups = {};
  (S.settings?.categories||[]).forEach(c=> groups[c.name] = [...(c.stats||[])]);
  // ajoute les stats orphelines si jamais
  (S.settings?.stats||[]).forEach(st=>{
    const has = Object.values(groups).some(list => list.includes(st));
    if(!has){ (groups.Autres = groups.Autres || []).push(st); }
  });
  return groups;
}

export function renderPlayerDice(S){
  const root = el('div');

  const p = (S.players||[])[0];
  if(!p){ const w=el('div','panel'); w.innerHTML='<div class="list-item">Aucun personnage.</div>'; root.appendChild(w); return root; }

  const tabs = el('div','row'); tabs.style.gap='10px';
  const defs=[{id:'m',label:'Méthodes MJ'},{id:'l',label:'Libre'}];
  defs.forEach((d,i)=>{ const b=el('button','btn secondary tab'+(i===0?' active':'')); b.textContent=d.label; b.dataset.id=d.id; tabs.appendChild(b); });
  root.appendChild(tabs);
  const panelM=el('div'); const panelL=el('div'); panelL.style.display='none'; root.appendChild(panelM); root.appendChild(panelL);

  // ----- Méthodes MJ (dropdown) -----
  function renderM(){
    panelM.innerHTML = '<div class="panel"><div class="list-item"><div><b>Méthodes MJ</b></div></div><div class="list"><div class="list-item small"><div>Choisir</div><div><select id="m-sel" class="select"></select></div></div><div class="list-item small"><div></div><div><button id="m-roll" class="btn">Lancer</button></div></div><div class="list-item small"><div>Formule</div><div class="muted small" id="m-form"></div></div></div><div id="m-out" class="list mt8"></div></div>';
    const sel = panelM.querySelector('#m-sel');
    const btn = panelM.querySelector('#m-roll');
    const out = panelM.querySelector('#m-out');
    const ftxt = panelM.querySelector('#m-form');
    const methods = (S.dice?.methods||[]);
    sel.innerHTML = methods.map((m,i)=>`<option value="${i}">${m.label||('Méthode '+(i+1))}</option>`).join('');
    const updateF = ()=>{ const m = methods[+sel.value||0]; ftxt.textContent = m?.formula || '—'; };
    sel.onchange = updateF; updateF();

    btn.onclick = ()=>{
      const i = +sel.value||0;
      const m = methods[i]; if(!m) return;
      const vars = buildAllVars(S,p);
      try{
        const res = evaluateFormula(m.formula||'0', vars);
        const card=el('div','panel');
        card.innerHTML = `<div class="list-item"><div><b>${m.label||('Méthode '+(i+1))}</b></div><div class="pill badge">Total: ${res.total}</div></div>`;
        const inner=el('div','inner'); inner.style.display='block';
        inner.innerHTML = `<div class="muted small">Formule: ${m.formula||''}</div>
          <div class="muted small">Dés: ${res.diceBreak.join(' · ')||'(aucun)'}</div>
          <div class="muted small">Modificateurs: ${res.varsBreak.join(' · ')||'(aucun)'}</div>`;
        card.appendChild(inner);
        out.prepend(card);
      }catch{ alert('Formule invalide'); }
    };
  }
  renderM();

  // ----- Libre : par catégories + builder de dés + champ formule --------
  function renderL(){
    const groups = groupStatsByCategory(S);
    const useCats = !!S.settings?.useCategoryPoints;

    panelL.innerHTML = '<div class="panel"><div class="list-item"><div><b>Lancer libre</b></div></div></div>';
    const pnl = panelL.querySelector('.panel');

    // Zones
    let varsWrap = null;
    let inputF = null;
    let preview = null;

    // Builder
    const diceWrap = el('div','list');
    const rowAdd = el('div','list-item small'); rowAdd.innerHTML='<div>Dés</div>';
    const right = document.createElement('div'); right.className='row'; right.style.gap='8px';
    const nb = document.createElement('input'); nb.type='number'; nb.min='1'; nb.value='1'; nb.className='input'; nb.style.width='80px';
    const faces = document.createElement('select'); faces.className='select';
    [4,6,8,10,12,20,100].forEach(f=>{ const o=document.createElement('option'); o.value=String(f); o.textContent='d'+f; faces.appendChild(o); });
    const add = document.createElement('button'); add.className='btn small'; add.textContent='Ajouter';
    const clear = document.createElement('button'); clear.className='btn secondary small'; clear.textContent='Effacer les dés';
    const listDice = document.createElement('div'); listDice.className='muted small'; listDice.style.marginTop='6px';
    right.append(nb, faces, add, clear); rowAdd.appendChild(right); diceWrap.appendChild(rowAdd);
    diceWrap.appendChild(listDice);
    pnl.appendChild(diceWrap);

    const diceTerms = [];

    // Caractéristiques / Cats
    varsWrap = el('div','list mt8');
    pnl.appendChild(varsWrap);
    const varsPreviewRow = el('div','list-item small'); varsPreviewRow.innerHTML='<div>Formule</div>'; 
    preview=document.createElement('div'); preview.className='muted small'; preview.textContent='—'; 
    varsPreviewRow.appendChild(preview);

    Object.entries(groups).forEach(([cat,stats])=>{
      const row = el('div','list-item small');
      const left = document.createElement('div'); left.innerHTML = `<b>${cat}</b>`;
      const right = document.createElement('div');
      stats.forEach(st=>{
        const lbl=document.createElement('label'); lbl.style.marginRight='12px';
        const cb=document.createElement('input'); cb.type='checkbox'; cb.dataset.stat=st; cb.dataset.cat=cat;
        lbl.append(cb, document.createTextNode(' '+st));
        right.appendChild(lbl);
        cb.addEventListener('change', ()=>{
          const catCb = varsWrap.querySelector(`input[data-cbcat="${cat}"]`);
          if(catCb){
            const any = varsWrap.querySelectorAll(`input[data-stat][data-cat="${cat}"]:checked`).length>0;
            catCb.checked = any || catCb.checked;
          }
          refreshPreview();
        });
      });
      if(useCats){
        const lbl=document.createElement('label'); lbl.style.marginLeft='12px';
        const cb=document.createElement('input'); cb.type='checkbox'; cb.dataset.cbcat=cat;
        lbl.append(cb, document.createTextNode('  (+ '+cat+')'));
        right.appendChild(lbl);
        cb.addEventListener('change', refreshPreview);
      }
      row.append(left,right);
      varsWrap.appendChild(row);
    });
    varsWrap.appendChild(varsPreviewRow);

    // Formule
    const custom = el('div','list mt8');
    const rowF = el('div','list-item small'); rowF.innerHTML='<div>Formule personnalisée</div>'; 
    inputF = document.createElement('input'); inputF.className='input'; inputF.placeholder='ex: 1d20 + {FOR} + {Combat}'; 
    rowF.appendChild(inputF); custom.appendChild(rowF);
    const rowGo = el('div','list-item small'); rowGo.innerHTML='<div></div>'; const go = document.createElement('button'); go.className='btn'; go.textContent='Lancer'; rowGo.appendChild(go); custom.appendChild(rowGo);
    const hist = el('div','list mt8');
    pnl.append(custom, hist);

    function buildFormulaFromSelections(){
      const parts = [...diceTerms];
      varsWrap.querySelectorAll('input[type="checkbox"][data-stat]:checked').forEach(cb=> parts.push(`{${cb.dataset.stat}}`));
      if(useCats){ varsWrap.querySelectorAll('input[type="checkbox"][data-cbcat]:checked').forEach(cb=> parts.push(`{${cb.dataset.cbcat}}`)); }
      return parts.join(' + ') || '0';
    }
    function currentFormula(){
      const manual = (inputF?.value||'').trim();
      return manual ? manual : buildFormulaFromSelections();
    }
    function refreshPreview(){ if(preview) preview.textContent = currentFormula(); }
    function refreshDiceList(){ 
      listDice.textContent = diceTerms.length? diceTerms.join(' + ') : '(aucun)'; 
      refreshPreview(); 
    }

    add.onclick = ()=>{ const n=Math.max(1, +nb.value||1); const f=+faces.value||6; diceTerms.push(`${n}d${f}`); refreshDiceList(); };
    clear.onclick = ()=>{ diceTerms.length=0; refreshDiceList(); };

    inputF.addEventListener('input', refreshPreview);
    refreshPreview();

    go.onclick = ()=>{
      const varsAll = buildAllVars(S,p);
      const formula = currentFormula();
      try{
        const res = evaluateFormula(formula, varsAll);
        const row=el('div','panel');
        row.innerHTML = `<div class="list-item"><div><b>${formula}</b></div><div class="pill badge">Total: ${res.total}</div></div>`;
        const inner=el('div','inner'); inner.style.display='block';
        inner.innerHTML = `<div class="muted small">Dés: ${res.diceBreak.join(' · ')||'(aucun)'}</div>
          <div class="muted small">Modificateurs: ${res.varsBreak.join(' · ')||'(aucun)'}</div>`;
        row.appendChild(inner);
        hist.prepend(row);
      }catch{ alert('Formule invalide'); }
    };

    refreshDiceList();
  }

  renderL();

  // tab switching
  tabs.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
      const id = btn.dataset.id;
      panelM.style.display = (id==='m')?'block':'none';
      panelL.style.display = (id==='l')?'block':'none';
      if(id==='m') renderM(); else renderL();
    });
  });

  return root;
}
export default renderPlayerDice;
