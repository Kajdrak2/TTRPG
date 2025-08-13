// js/views/player_inventory.js — Build A5 (actions réactives + affichage bonus équipements)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function secondsToHuman(sec){
  sec = Math.max(0, Math.floor(+sec||0));
  const d=Math.floor(sec/86400); sec%=86400;
  const h=Math.floor(sec/3600); sec%=3600;
  const m=Math.floor(sec/60); const s=sec%60;
  const parts=[];
  if(d) parts.push(d+'j');
  if(h) parts.push(h+'h');
  if(m) parts.push(m+'m');
  if(s || parts.length===0) parts.push(s+'s');
  return parts.join(' ');
}
function typeLabel(it){ const t=it?.type||'misc'; if(t==='equipment') return 'Équipement'; if(t==='consumable') return 'Consommable'; return 'Divers'; }
function effectSummary(it){
  if(!it || !it.mods) return '';
  const a=[];
  const st = it.mods.stats||{}; const ks = Object.keys(st);
  if(ks.length) a.push('Stats: '+ ks.map(k=> k+' '+(st[k]>=0?'+':'')+st[k]).join(', '));
  const ct = it.mods.cats||{}; const kc = Object.keys(ct);
  if(kc.length) a.push('Catégories: '+ kc.map(k=> k+' '+(ct[k]>=0?'+':'')+ct[k]).join(', '));
  const rs = it.mods.resources||{}; const kr = Object.keys(rs);
  if(kr.length) a.push('Ressources: '+ kr.map(k=> k+' max+='+(+rs[k].max||0)+' start+='+(+rs[k].start||0)).join(', '));
  return a.join(' · ');
}

export function renderPlayerInventory(){
  const S = State.get();
  const pIndex = 0;
  const p = (S.players||[])[pIndex] || null;
  const root = el('div');

  const refresh = ()=>{
    // rebuild whole view from latest state
    const S2 = State.get();
    while(root.firstChild) root.removeChild(root.firstChild);
    build(S2);
  };

  function build(Sn){
    const player = (Sn.players||[])[pIndex] || null;

    
  // -------- Effets actifs (consommables en cours)
  let _effInterval;
  (function(){
    const pnl = el('div','panel'); pnl.innerHTML = '<div class="list-item"><div><b>Effets actifs</b></div><div class="muted small">Consommables en cours</div></div>';
    const list = el('div','list'); pnl.appendChild(list); root.appendChild(pnl);
    function renderEffects(){
      list.innerHTML='';
      const Sx = State.get();
      const effs = (State.effectListForPlayer && State.effectListForPlayer(Sx, pIndex)) || [];
      if(!effs.length){
        const empty = el('div','list-item small muted'); empty.textContent='(aucun)';
        list.appendChild(empty);
        return;
      }
      const byId = {}; (Sx.items||[]).forEach(it=>{ if(it && it.id) byId[String(it.id)] = it; });
      effs.forEach(eff=>{
        const it = byId[String(eff.itemId)] || null;
        const row = el('div','list-item small');
        const left = document.createElement('div');
        const title = document.createElement('div'); title.innerHTML = '<b>'+(it?.name || eff.name || 'Effet')+'</b>';
        const sub = document.createElement('div'); sub.className='muted small';
        const rem = State.timerRemaining(Sx, eff.timerId);
        const parts = ['Reste: '+secondsToHuman(rem)]; 
        if(it){ 
          const es = (it.mods? ( (it.mods.stats&&Object.keys(it.mods.stats).length)? 'Stats: '+Object.keys(it.mods.stats).map(k=>k+' '+(it.mods.stats[k]>=0?'+':'')+it.mods.stats[k]).join(', ') : '' ) : '' );
          const ec = (it.mods? ( (it.mods.cats&&Object.keys(it.mods.cats).length)? 'Catégories: '+Object.keys(it.mods.cats).map(k=>k+' '+(it.mods.cats[k]>=0?'+':'')+it.mods.cats[k]).join(', ') : '' ) : '' );
          const er = (it.mods? ( (it.mods.resources&&Object.keys(it.mods.resources).length)? 'Ressources: '+Object.keys(it.mods.resources).map(k=>k+' max+='+(+it.mods.resources[k].max||0)+' start+='+(+it.mods.resources[k].start||0)).join(', ') : '' ) : '' );
          [es,ec,er].forEach(x=>{ if(x) parts.push(x); });
        }
        sub.textContent = parts.join(' — ');
        left.append(title, sub);
        const right = document.createElement('div');
        const cancelB = document.createElement('button'); cancelB.className='btn small secondary'; cancelB.textContent='Annuler';
        cancelB.onclick = ()=>{ cancelB.disabled=true; State.cancelEffect(State.get(), eff.id); State.save(State.get()); renderEffects(); };
        right.append(cancelB);
        row.append(left, right);
        list.appendChild(row);
      });
    }
    renderEffects();
    if(_effInterval) clearInterval(_effInterval);
    _effInterval = setInterval(renderEffects, 1000);
  })();
// -------- Équipement
    (function(){
      const pnl = el('div','panel'); pnl.innerHTML = '<div class="list-item"><div><b>Équipement</b></div></div>';
      const list = el('div','list'); pnl.appendChild(list); root.appendChild(pnl);
      const slots = Array.isArray(Sn?.settings?.slots) && Sn.settings.slots.length ? Sn.settings.slots.slice() : ['slot'];
      if(!player){
        const empty = el('div','list-item small muted'); empty.textContent='(aucun joueur)';
        list.appendChild(empty); return;
      }
      slots.forEach(slotName=>{
        const row = el('div','list-item small');
        const left = document.createElement('div'); left.textContent = slotName;
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px'; right.style.alignItems='center';
        const slotItem = (player.inv||[]).find(s=>{
          const it = (Sn.items||[]).find(ii=> String(ii.id)===String(s.itemId));
          if(!it || it.type!=='equipment') return false;
          const sl = it.slot || slots[0];
          return s.equipped && sl===slotName;
        });
        if(slotItem){
          const it = (Sn.items||[]).find(ii=> String(ii.id)===String(slotItem.itemId));
          const name = document.createElement('span'); name.innerHTML = '<b>'+(it?.name || ('Objet '+slotItem.itemId))+'</b>';
          const bonus = document.createElement('span'); bonus.className='muted small'; const eff = effectSummary(it); if(eff) bonus.textContent=' — '+eff;
          const unB  = document.createElement('button'); unB.className='btn small secondary'; unB.textContent='Retirer';
          unB.onclick = ()=>{ unB.disabled=true; State.unequipSlot(Sn,player,slotName); State.save(Sn); refresh(); };
          right.append(name, bonus, unB);
        }else{
          const em = document.createElement('span'); em.className='muted small'; em.textContent='(vide)';
          right.appendChild(em);
        }
        row.append(left,right); list.appendChild(row);
      });
    })();

    // -------- Sac (agrégé) avec actions
    (function(){
      const pnl = el('div','panel'); pnl.innerHTML = '<div class="list-item"><div><b>Sac</b></div></div>';
      const list = el('div','list'); pnl.appendChild(list); root.appendChild(pnl);
      if(!player){
        const empty = el('div','list-item small muted'); empty.textContent='(aucun joueur)';
        list.appendChild(empty); return;
      }
      const agg = {};
      (player.inv||[]).forEach(s=>{ if(s.equipped) return; const id=String(s.itemId); agg[id]=(agg[id]||0)+1; });
      const byId = {}; (Sn.items||[]).forEach(it=>{ if(it && it.id) byId[String(it.id)] = it; });
      const ids = Object.keys(agg);
      if(!ids.length){ const empty = el('div','list-item small muted'); empty.textContent='(vide)'; list.appendChild(empty); }
      ids.forEach(id=>{
        const it = byId[id]; const qty = agg[id]||0;
        const row = el('div','list-item small');
        const left = document.createElement('div');
        const title = document.createElement('div'); title.innerHTML = '<b>'+(it?.name||('Objet '+id))+'</b> × '+qty;
        const sub = document.createElement('div'); sub.className='muted small';
        if(it?.type==='consumable'){
          const parts = [];
          if(it.durationSec) parts.push('Durée: '+secondsToHuman(it.durationSec));
          const eff = effectSummary(it); if(eff) parts.push(eff);
          sub.textContent = parts.join(' — ') || 'Consommable';
        }else{
          const eff = effectSummary(it);
          sub.textContent = eff ? (typeLabel(it)+' — '+eff) : typeLabel(it);
        }
        left.append(title, sub);

        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px';
        if(it){
          if(it.type==='equipment'){
            const eqB=document.createElement('button'); eqB.className='btn small'; eqB.textContent='Équiper';
            eqB.onclick=()=>{ eqB.disabled=true; State.equipOne(Sn, player, it.id); State.save(Sn); refresh(); };
            right.append(eqB);
          }
          if(it.type==='consumable'){
            const cdActive = State.isCooldownActive(Sn, player, it.id);
            const useB=document.createElement('button'); useB.className='btn small'; useB.textContent= cdActive ? 'Recharge…' : 'Utiliser';
            useB.disabled = !!cdActive;
            useB.onclick=()=>{
              useB.disabled=true;
              // retirer 1 exemplaire non équipé
              const idx = (player.inv||[]).findIndex(s=> !s.equipped && String(s.itemId)===String(it.id));
              if(idx>=0){ player.inv.splice(idx,1); }
              State.createEffectFromItem(Sn, pIndex, it);
              State.startCooldown(Sn, player, it);
              State.save(Sn);
              refresh();
            };
            right.append(useB);
          }
        }

        row.append(left, right);
        list.appendChild(row);
      });
    })();

    // -------- Lootbox (prendre)
    (function(){
      State.ensureLootbox(Sn);
      const byId = {}; (Sn.items||[]).forEach(it=>{ if(it && it.id) byId[String(it.id)] = it; });
      const pnl = el('div','panel'); pnl.innerHTML = '<div class="list-item"><div><b>Lootbox</b></div><div class="muted small">Objets disponibles</div></div>';
      const list = el('div','list'); pnl.appendChild(list); root.appendChild(pnl);

      if(!Sn.lootbox || !Sn.lootbox.length){
        const empty = el('div','list-item small muted'); empty.textContent = '(vide)';
        list.appendChild(empty);
      } else {
        Sn.lootbox.forEach(st=>{
          const it = byId[String(st.itemId)] || null;
          const row = el('div','list-item small');
          const left = el('div');
          const name = document.createElement('div'); name.innerHTML = '<b>'+(it?.name||('Objet '+String(st.itemId)))+'</b> × '+(st.qty||0);
          const sub = document.createElement('div'); sub.className='muted small';
          let subParts = [ typeLabel(it) ];
          if(it && it.type==='consumable'){
            if(it.durationSec) subParts.push('Durée: '+secondsToHuman(it.durationSec));
            const eff = effectSummary(it); if(eff) subParts.push(eff);
          } else if(it && it.type==='equipment'){
            const eff = effectSummary(it); if(eff) subParts.push(eff);
          }
          sub.textContent = subParts.join(' — ');
          left.append(name, sub);
          const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px';
          const qtyI = document.createElement('input'); qtyI.type='number'; qtyI.className='input'; qtyI.min=1; qtyI.value=1; qtyI.style.width='70px'; qtyI.max = (st.qty||1); qtyI.oninput=()=>{ if(+qtyI.value > (st.qty||0)) qtyI.value = st.qty||0; if(+qtyI.value<1) qtyI.value=1; };
          const takeB = document.createElement('button'); takeB.className='btn small'; takeB.textContent='Prendre'; if(!(st.qty>0)) takeB.disabled=true;
          takeB.onclick = ()=>{
            takeB.disabled=true;
            const n = Math.max(1, Math.floor(+qtyI.value||0));
            const taken = State.lootboxTake(Sn, st.itemId, n);
            const pl = (Sn.players||[])[pIndex]; if(pl){ for(let i=0;i<taken;i++) State.addItemToPlayer(Sn, pl, st.itemId); }
            State.save(Sn);
            refresh();
          };
          right.append(qtyI, takeB);
          row.append(left, right);
          list.appendChild(row);
        });
      }
    })();
  } // build

  build(S);
  return root;
}

export default renderPlayerInventory;
