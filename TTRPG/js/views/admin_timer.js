// js/views/admin_timer.js — 6.1.4: Nettoyage bulk (+/− retirés), par-timer avec 1 jeu J/H/M/S
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

function fmt(s){
  s = Math.max(0, Math.floor(+s||0));
  const d = Math.floor(s/86400); s%=86400;
  const h = Math.floor(s/3600); s%=3600;
  const m = Math.floor(s/60); const sec = s%60;
  let parts=[];
  if(d) parts.push(d+'j'); 
  parts.push(h+'h', m+'m', sec+'s');
  return parts.join(' ');
}
function toSeconds(d,h,m,s){
  d = Math.max(0, Math.floor(+d||0));
  h = Math.max(0, Math.floor(+h||0));
  m = Math.max(0, Math.floor(+m||0));
  s = Math.max(0, Math.floor(+s||0));
  return d*86400 + h*3600 + m*60 + s;
}
function unitInputs(){
  const wrap = document.createElement('div'); wrap.className='row'; wrap.style.gap='6px';
  const d = document.createElement('input'); d.type='number'; d.placeholder='j'; d.className='input'; d.style.width='64px';
  const h = document.createElement('input'); h.type='number'; h.placeholder='h'; h.className='input'; h.style.width='64px';
  const m = document.createElement('input'); m.type='number'; m.placeholder='m'; m.className='input'; m.style.width='64px';
  const s = document.createElement('input'); s.type='number'; s.placeholder='s'; s.className='input'; s.style.width='64px';
  wrap.append(d,h,m,s);
  return {wrap, d, h, m, s, secs:()=>toSeconds(d.value,h.value,m.value,s.value)};
}

export function renderTimerAdmin(S){
  const root = el('div');

  // ---------- Header (Play/Pause/Stop globaux) ----------
  const header = el('div','panel');
  const hrow = el('div','list-item'); hrow.append(document.createElement('div'), document.createElement('div'));
  hrow.children[0].innerHTML = '<b>Timers</b>';
  const master = document.createElement('div'); master.className='row'; master.style.gap='8px';
  const btnMasterPlay  = document.createElement('button'); btnMasterPlay.className='btn small'; btnMasterPlay.textContent='Play global';
  const btnMasterPause = document.createElement('button'); btnMasterPause.className='btn small'; btnMasterPause.textContent='Pause globale';
  const btnMasterStop  = document.createElement('button'); btnMasterStop.className='btn danger small'; btnMasterStop.textContent='Stop global';
  btnMasterPlay.onclick  = ()=>{ State.masterResume(S); syncHeader(); };
  btnMasterPause.onclick = ()=>{ State.masterPause(S); syncHeader(); };
  btnMasterStop.onclick  = ()=>{ State.masterStopAll(S); syncHeader(); updateAll(); };
  master.append(btnMasterPlay, btnMasterPause, btnMasterStop);
  hrow.children[1].appendChild(master);
  header.appendChild(hrow);
  root.appendChild(header);

  // ---------- Création D:H:M:S ----------
  const tb = el('div','row'); tb.style.justifyContent='space-between'; tb.style.alignItems='center'; tb.style.margin='8px 0';
  const left = el('div','row'); left.style.gap='8px';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom du timer';
  const dI  = document.createElement('input'); dI.className='input'; dI.type='number'; dI.placeholder='j'; dI.style.width='70px';
  const hI  = document.createElement('input'); hI.className='input'; hI.type='number'; hI.placeholder='h'; hI.style.width='70px';
  const mI  = document.createElement('input'); mI.className='input'; mI.type='number'; mI.placeholder='m'; mI.style.width='70px';
  const sI  = document.createElement('input'); sI.className='input'; sI.type='number'; sI.placeholder='s'; sI.style.width='70px';
  const btnAdd  = document.createElement('button'); btnAdd.className='btn'; btnAdd.textContent='Ajouter timer';
  btnAdd.onclick = ()=>{
    const secs = toSeconds(dI.value, hI.value, mI.value, sI.value);
    const n = nameI.value || 'Timer';
    State.timerCreate(S, n, secs);
    nameI.value=''; dI.value=''; hI.value=''; mI.value=''; sI.value='';
    buildList();
  };
  left.append(nameI, dI, hI, mI, sI, btnAdd);
  tb.appendChild(left);
  root.appendChild(tb);

  // ---------- Bulk (SEULEMENT start/pause sur sélection) ----------
  const bulk = el('div','panel');
  const bHead = el('div','list-item'); bHead.innerHTML = '<div><b>Contrôles de sélection</b></div>';
  bulk.appendChild(bHead);
  const bRow = el('div','list-item small'); bRow.append(document.createElement('div'), document.createElement('div'));
  bRow.children[0].innerHTML = 'Démarrer / Pause sur timers cochés';
  const ctrl = el('div','row'); ctrl.style.gap='12px'; ctrl.style.flexWrap='wrap';
  const btnSelPlay = document.createElement('button'); btnSelPlay.className='btn small'; btnSelPlay.textContent='Démarrer sélection';
  const btnSelPause= document.createElement('button'); btnSelPause.className='btn small'; btnSelPause.textContent='Pause sélection';
  btnSelPlay.onclick = ()=>{ State.timersStartSelected(S, selectedIds()); State.masterPlay(S); updateAll(); };
  btnSelPause.onclick= ()=>{ State.timersPauseSelected(S, selectedIds()); updateAll(); };
  ctrl.append(btnSelPlay, btnSelPause);
  bRow.children[1].appendChild(ctrl);
  bulk.appendChild(bRow);
  root.appendChild(bulk);

  // ---------- Liste des timers ----------
  const listWrap = el('div'); root.appendChild(listWrap);
  const rowRefs = new Map();

  function selectedIds(){
    return Array.from(listWrap.querySelectorAll('input[type="checkbox"].sel:checked')).map(c=> c.dataset.id);
  }

  function makeRow(t){
    const row = el('div','panel');
    const head = el('div','list-item'); 
    const leftHead = document.createElement('div');
    const rightHead= document.createElement('div'); rightHead.style.display='flex'; rightHead.style.gap='8px'; rightHead.style.flexWrap='wrap';
    head.append(leftHead,rightHead);
    row.appendChild(head);

    const chk = document.createElement('input'); chk.type='checkbox'; chk.className='sel'; chk.dataset.id=t.id; chk.style.marginRight='8px';
    const nameI = document.createElement('input'); nameI.type='text'; nameI.className='input'; nameI.value=t.name||''; nameI.style.width='200px';
    nameI.oninput = ()=>{ State.timerRename(S,t.id,nameI.value); };
    const rem   = document.createElement('span'); rem.className='muted small';
    const status= document.createElement('span'); status.className='muted small';
    leftHead.append(chk, nameI, rem, status);

    const btnStart = document.createElement('button'); btnStart.className='btn small'; btnStart.textContent='Démarrer';
    const btnPause = document.createElement('button'); btnPause.className='btn small'; btnPause.textContent='Pause';
    btnStart.onclick = ()=>{ State.timerStart(S,t.id); State.masterPlay(S); updateRow(t.id); };
    btnPause.onclick = ()=>{ State.timerPause(S,t.id); updateRow(t.id); };
    const btnDel = document.createElement('button'); btnDel.className='btn danger small'; btnDel.textContent='Supprimer';
    btnDel.onclick = ()=>{ if(confirm('Supprimer ce timer ?')){ State.timerRemove(S,t.id); buildList(); } };
    rightHead.append(btnStart, btnPause, btnDel);

    const body = el('div','list-item small');
    body.append(document.createElement('div'), document.createElement('div'));
    body.children[0].innerHTML = '<b>Ajuster</b>';
    const tune = unitInputs();
    const btnRowPlus  = document.createElement('button'); btnRowPlus.className='btn secondary small'; btnRowPlus.textContent='+ ajouter';
    const btnRowMinus = document.createElement('button'); btnRowMinus.className='btn secondary small'; btnRowMinus.textContent='− retirer';
    const tuneWrap = el('div','row'); tuneWrap.style.gap='8px'; tuneWrap.style.flexWrap='wrap';
    btnRowPlus.onclick  = ()=>{ State.timerAdd(S, t.id, +tune.secs()); updateRow(t.id); };
    btnRowMinus.onclick = ()=>{ State.timerAdd(S, t.id, -tune.secs()); updateRow(t.id); };
    tuneWrap.append(tune.wrap, btnRowPlus, btnRowMinus);
    body.children[1].appendChild(tuneWrap);
    row.appendChild(body);

    listWrap.appendChild(row);
    rowRefs.set(t.id, { remEl:rem, statusEl:status, startBtn:btnStart, pauseBtn:btnPause });
  }

  function buildList(){
    listWrap.innerHTML='';
    rowRefs.clear();
    if((S.timers||[]).length===0){
      const empty = el('div','panel'); empty.innerHTML='<div class="list-item"><div class="muted small">Aucun timer.</div></div>'; 
      listWrap.appendChild(empty);
    }else{
      (S.timers||[]).forEach(t=> makeRow(t));
    }
    updateAll();
    syncHeader();
  }

  function updateRow(id){
    const t = (S.timers||[]).find(x=> x.id===id); if(!t) return;
    const r = rowRefs.get(id); if(!r) return;
    r.remEl.textContent   = fmt(t.remaining);
    r.statusEl.textContent= t.running ? '⏵' : '⏸️';
    r.pauseBtn.disabled   = !t.running;
    r.startBtn.disabled   = t.running || t.remaining<=0;
  }
  function updateAll(){ (S.timers||[]).forEach(t=> updateRow(t.id)); }

  function syncHeader(){
    const running = !!S.masterClock.running;
    btnMasterPlay.disabled  = running;
    btnMasterPause.disabled = !running;
  }

  function tickLoop(){
    State.tick(S, 1);
    updateAll();
    syncHeader();
  }
  if (typeof window!=='undefined'){
    if(window.__JDR_TIMER_MULTI__) clearInterval(window.__JDR_TIMER_MULTI__);
    window.__JDR_TIMER_MULTI__ = setInterval(tickLoop, 1000);
  }

  buildList();
  return root;
}
export default renderTimerAdmin;
