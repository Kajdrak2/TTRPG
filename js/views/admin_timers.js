// js/views/admin_timers.js — Build T6
// Fixes vs T5:
// - Inputs in timer rows stay EMPTY (no prefill), never auto-cleared except after Add/Sub click.
// - Removed periodic full re-render that caused focus loss; now we re-render only on explicit actions.
// - Live time uses fresh state every tick (get()), so labels stay accurate without reflowing inputs.
// - "Lecture" (master) also starts each timer with remaining > 0 using timerStart().
// - Proper cleanup of per-row tickers on list re-render.

import { el } from '../core/ui.js';
import { get, save, timerCreate, timerAdd, timerStart, timerPause, timerRemove, masterPlay, masterPause, masterResume, timerRemaining } from '../core/state.js';

/* ---------- utils ---------- */
function fmt2(n){ n = Math.floor(Math.abs(+n||0)); return (n<10?'0':'')+n; }
function partsFromSeconds(total){
  total = Math.max(0, Math.floor(+total||0));
  const d = Math.floor(total / 86400);
  total -= d*86400;
  const h = Math.floor(total / 3600);
  total -= h*3600;
  const m = Math.floor(total / 60);
  const s = total - m*60;
  return { d, h, m, s };
}
function human(total){
  const {d,h,m,s} = partsFromSeconds(total);
  if(d>0) return `${d}j ${fmt2(h)}:${fmt2(m)}:${fmt2(s)}`;
  return `${fmt2(h)}:${fmt2(m)}:${fmt2(s)}`;
}
function secsFromInputs(dI,hI,mI,sI){
  const d = Math.max(0, Math.floor(+dI.value||0));
  const h = Math.max(0, Math.floor(+hI.value||0));
  const m = Math.max(0, Math.floor(+mI.value||0));
  const s = Math.max(0, Math.floor(+sI.value||0));
  return d*86400 + h*3600 + m*60 + s;
}
function clearInputs(...ins){ ins.forEach(i=> i.value=''); }

/* ---------- per-row component ---------- */
function timerRow(tid){
  const row = el('div','panel');
  const head = el('div','list-item row'); head.style.gap='8px'; head.style.flexWrap='wrap';

  // pull current data
  const S0 = get();
  const t0 = (S0.timers||[]).find(x=> x.id===tid) || {};

  const nameI = el('input','input'); nameI.value = t0.name||'Timer'; nameI.placeholder='Nom';
  nameI.onchange = ()=>{ const S=get(); const t=(S.timers||[]).find(x=>x.id===tid); if(!t) return; t.name = nameI.value||'Timer'; save(S); };

  const timeLabel = el('div','big'); timeLabel.style.minWidth='160px'; timeLabel.style.fontVariantNumeric='tabular-nums';
  const runningBadge = el('span','badge'); runningBadge.textContent = t0.running ? '▶ en cours' : '❚❚ en pause';
  runningBadge.style.marginLeft='6px';
  function renderTime(){
    const S=get();
    const tt = (S.timers||[]).find(x=> x.id===tid);
    if(!tt){ return; }
    timeLabel.textContent = human(timerRemaining(S, tid));
    runningBadge.textContent = tt.running ? '▶ en cours' : '❚❚ en pause';
  }

  const startBtn = el('button','btn small'); startBtn.textContent='Start';
  startBtn.onclick = ()=>{ const S=get(); const tt=(S.timers||[]).find(x=>x.id===tid); if(!tt) return; if(timerRemaining(S, tid)>0){ timerStart(S, tid); masterPlay(S); } };

  const pauseBtn = el('button','btn small'); pauseBtn.textContent='Pause';
  pauseBtn.onclick = ()=>{ const S=get(); timerPause(S, tid); };

  const delBtn = el('button','btn small danger'); delBtn.textContent='Supprimer';
  delBtn.onclick = ()=>{ const S=get(); timerRemove(S, tid); renderList(); };

  head.append(nameI, timeLabel, runningBadge, startBtn, pauseBtn, delBtn);
  row.append(head);

  // Edit panel: add/subtract with d/h/m/s (kept EMPTY; only used as deltas)
  const edit = el('div','list-item row'); edit.style.gap='8px'; edit.style.flexWrap='wrap';
  const dI = el('input','input'); dI.type='number'; dI.min='0'; dI.placeholder='jours';
  const hI = el('input','input'); hI.type='number'; hI.min='0'; hI.placeholder='heures';
  const mI = el('input','input'); mI.type='number'; mI.min='0'; mI.placeholder='minutes';
  const sI = el('input','input'); sI.type='number'; sI.min='0'; sI.placeholder='secondes';
  const addB = el('button','btn small'); addB.textContent='Ajouter';
  const subB = el('button','btn small'); subB.textContent='Soustraire';
  addB.onclick = ()=>{ const sec = secsFromInputs(dI,hI,mI,sI); if(sec>0){ const S=get(); timerAdd(S, tid, sec); clearInputs(dI,hI,mI,sI); } };
  subB.onclick = ()=>{ const sec = secsFromInputs(dI,hI,mI,sI); if(sec>0){ const S=get(); timerAdd(S, tid, -sec); clearInputs(dI,hI,mI,sI); } };
  edit.append(dI,hI,mI,sI, addB, subB);
  row.append(edit);

  // local live ticker for this row
  const int = setInterval(renderTime, 500);
  timerRow._tickers.set(tid, int);
  renderTime();
  return row;
}
timerRow._tickers = new Map();

/* ---------- list ---------- */
let _listContainer = null;
function clearTickers(){
  timerRow._tickers.forEach(id=> clearInterval(id));
  timerRow._tickers.clear();
}
function renderList(){
  if(!_listContainer) return;
  clearTickers();
  const S = get();
  _listContainer.innerHTML='';
  (S.timers||[]).forEach(t=>{ _listContainer.appendChild(timerRow(t.id)); });
}

/* ---------- creation panel ---------- */
function creationPanel(){
  const box = el('div','panel');
  box.innerHTML = `<div class="list-item"><div><b>Nouveau timer</b></div></div>`;
  const bar = el('div','list-item row'); bar.style.gap='8px'; bar.style.flexWrap='wrap';

  const nameI = el('input','input'); nameI.placeholder='Nom (ex. Effet de poison)';
  const dI = el('input','input'); dI.type='number'; dI.min='0'; dI.placeholder='jours';
  const hI = el('input','input'); hI.type='number'; hI.min='0'; hI.placeholder='heures';
  const mI = el('input','input'); mI.type='number'; mI.min='0'; mI.placeholder='minutes';
  const sI = el('input','input'); sI.type='number'; sI.min='0'; sI.placeholder='secondes';
  const addB = el('button','btn'); addB.textContent='Créer';
  addB.onclick = ()=>{
    const sec = secsFromInputs(dI,hI,mI,sI);
    if(sec<=0) return;
    const S=get();
    const id = timerCreate(S, (nameI.value||'Timer'), sec);
    // Start master clock only if not already running
    masterPlay(S);
    nameI.value=''; clearInputs(dI,hI,mI,sI);
    renderList();
  };

  bar.append(nameI, dI,hI,mI,sI, addB);
  box.append(bar);
  return box;
}

/* ---------- master controls ---------- */
function masterControls(){
  const S = get();
  const box = el('div','panel');
  const bar = el('div','list-item row'); bar.style.gap='8px'; bar.style.flexWrap='wrap';
  const status = el('div','muted'); status.textContent = S.masterClock && S.masterClock.running ? 'Horloge maître: ▶ en cours' : 'Horloge maître: ❚❚ en pause';
  const play = el('button','btn small'); play.textContent='Lecture';
  const pause = el('button','btn small'); pause.textContent='Pause';
  const resume = el('button','btn small'); resume.textContent='Reprendre';

  play.onclick = ()=>{ 
    const S=get(); 
    masterPlay(S); 
    // ensure each timer starts if it has time left
    (S.timers||[]).forEach(t=>{ if(timerRemaining(S, t.id) > 0) timerStart(S, t.id); });
    status.textContent='Horloge maître: ▶ en cours'; 
  };
  pause.onclick = ()=>{ const S=get(); masterPause(S); status.textContent='Horloge maître: ❚❚ en pause'; };
  resume.onclick = ()=>{ const S=get(); masterResume(S); status.textContent='Horloge maître: ▶ en cours'; };

  bar.append(status, play, pause, resume);
  box.append(bar);

  // live refresh of the label (doesn't touch rows/inputs)
  setInterval(()=>{
    const S=get();
    status.textContent = S.masterClock && S.masterClock.running ? 'Horloge maître: ▶ en cours' : 'Horloge maître: ❚❚ en pause';
  }, 1000);
  return box;
}

/* ---------- root ---------- */
export function renderAdminTimers(){
  const root = el('div');
  root.append(creationPanel(), masterControls());

  const listWrap = el('div','panel');
  listWrap.innerHTML = `<div class="list-item"><div><b>Timers</b></div></div>`;
  _listContainer = el('div');
  listWrap.append(_listContainer);
  root.append(listWrap);

  renderList();
  // no periodic full re-render; rows tick individually
  return root;
}
export default renderAdminTimers;
if(typeof window!=='undefined') window.renderAdminTimers = renderAdminTimers;
