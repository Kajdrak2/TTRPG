// js/views/player_mj.js — Build PMJ6 (Conversations + destinataires multiples + suppression locale)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function nowStr(){ var d=new Date(); return d.toLocaleString(); }
function uid(){ return 'msg_'+Math.random().toString(36).slice(2,9); }
function convId(){ return 'cv_'+Math.random().toString(36).slice(2,9); }
function ensureConvs(S){
  if(!Array.isArray(S.mjConversations)) S.mjConversations = [];
  return S.mjConversations;
}
function myName(S){ return ((S.players||[])[0] && (S.players[0].name||'')) ? S.players[0].name : 'Joueur'; }
function allPlayerNames(S){ return (S.players||[]).map(function(p){ return p && p.name; }).filter(Boolean); }

// Local hide per viewer (player)
function viewerId(S){ return 'PL:'+myName(S); }
function loadHide(S){ try{ return JSON.parse(localStorage.getItem('chatHide:'+viewerId(S))||'{}') || {}; }catch(e){ return {}; } }
function saveHide(S, h){ try{ localStorage.setItem('chatHide:'+viewerId(S), JSON.stringify(h||{})); }catch(e){} }
function isConvHidden(S,cid){ var h=loadHide(S); return h && h.conversations && h.conversations[cid]; }
function isMsgHidden(S,mid){ var h=loadHide(S); return h && h.messages && h.messages[mid]; }
function hideConv(S,cid){ var h=loadHide(S); (h.conversations||(h.conversations={}))[cid]=true; saveHide(S,h); }
function hideMsg(S,mid){ var h=loadHide(S); (h.messages||(h.messages={}))[mid]=true; saveHide(S,h); }
function clearAllLocal(S){ saveHide(S,{}); }

function convVisibleToMe(S,c){
  var me = myName(S);
  return c.participants.indexOf(me)>=0 || c.participants.indexOf('MJ')>=0 && c.participants.length===1; // private MJ conv invisible
}
function convTitle(S,c){
  var me = myName(S);
  var parts = c.participants.filter(function(x){ return x!==me; });
  return parts.join(', ') || 'Conversation';
}

let _root=null, _curConv=null;

function renderConvList(S, onOpen){
  var wrap = el('div','panel');
  var head = el('div','list-item'); head.innerHTML = '<div><b>Conversations</b></div>'; wrap.appendChild(head);

  // Nouvelle conversation
  var add = el('div','list-item small');
  var left = el('div'); left.textContent='Nouvelle conversation';
  var right = el('div');
  var all = ['MJ'].concat(allPlayerNames(S).filter(function(n){ return n!==myName(S); }));
  var checks = [];
  all.forEach(function(name){
    var label = document.createElement('label'); label.style.marginRight='8px';
    var cb = document.createElement('input'); cb.type='checkbox'; cb.value=name; label.appendChild(cb);
    label.appendChild(document.createTextNode(' '+name));
    checks.push(cb); right.appendChild(label);
  });
  var btn = el('button','btn small'); btn.textContent='Creer';
  btn.onclick = function(){
    var parts = [myName(S)];
    checks.forEach(function(cb){ if(cb.checked) parts.push(cb.value); });
    var uniq = Array.from(new Set(parts));
    if(uniq.length<2) return;
    var c = { id: convId(), participants: uniq.sort(), messages:[], createdAt:Date.now(), updatedAt:Date.now() };
    ensureConvs(S).push(c); State.save(S); onOpen(c);
  };
  right.appendChild(btn);
  add.appendChild(left); add.appendChild(right); wrap.appendChild(add);

  var list = el('div','list'); wrap.appendChild(list);
  ensureConvs(S).forEach(function(c){
    if(!convVisibleToMe(S,c)) return;
    if(isConvHidden(S,c.id)) return;
    var row = el('div','list-item small'); row.style.cursor='pointer';
    var left = el('div'); left.innerHTML = '<b>'+convTitle(S,c)+'</b>';
    var right = el('div'); var delB = el('button','btn small secondary'); delB.textContent='Masquer (local)';
    delB.onclick = function(e){ e.stopPropagation(); hideConv(S,c.id); render(S); };
    row.appendChild(left); row.appendChild(right); right.appendChild(delB);
    row.onclick = function(){ onOpen(c); };
    list.appendChild(row);
  });

  var tools = el('div','list-item small');
  tools.appendChild(document.createElement('div'));
  var clearB = el('button','btn secondary'); clearB.textContent='RAZ local (toutes conversations)';
  clearB.onclick = function(){ clearAllLocal(S); render(S); };
  tools.appendChild(clearB);
  wrap.appendChild(tools);

  return wrap;
}

function messageRow(S,m){
  var row = el('div','list-item small');
  var left = el('div');
  var who = document.createElement('b'); who.textContent = m.from||'?'; left.appendChild(who);
  var when = el('span','muted small'); when.style.marginLeft='8px'; when.textContent = m.time||''; left.appendChild(when);
  var right = el('div'); right.textContent = m.text||'';
  var del = el('button','btn small secondary'); del.textContent='Supprimer (local)'; del.style.marginLeft='8px';
  del.onclick = function(){ hideMsg(S,m.id); render(S); };
  row.appendChild(left); row.appendChild(right); row.appendChild(del);
  return row;
}

function renderConvDetail(S,c){
  var wrap = el('div','panel');
  var head = el('div','list-item');
  head.innerHTML = '<div><b>Conversation : '+convTitle(S,c)+'</b></div>';
  var right = el('div');
  var hideB = el('button','btn secondary'); hideB.textContent='Masquer cette conversation (local)';
  hideB.onclick = function(){ hideConv(S,c.id); render(S); };
  right.appendChild(hideB);
  head.appendChild(right);
  wrap.appendChild(head);

  var list = el('div','list'); wrap.appendChild(list);
  (c.messages||[]).forEach(function(m){
    if(isMsgHidden(S,m.id)) return;
    list.appendChild(messageRow(S,m));
  });

  var bar = el('div','list-item row'); bar.style.gap='8px'; bar.style.flexWrap='wrap';
  var input = document.createElement('input'); input.className='input'; input.placeholder='Votre message';
  var send = el('button','btn'); send.textContent='Envoyer';
  bar.appendChild(input); bar.appendChild(send);
  wrap.appendChild(bar);

  send.onclick = function(){
    var t = (input.value||'').trim(); if(!t) return;
    c.messages.push({ id:uid(), from:myName(S), text:t, time:nowStr() });
    c.updatedAt = Date.now();
    State.save(S);
    input.value='';
    render(S);
  };

  return wrap;
}

function render(S){
  if(!_root) return;
  _root.innerHTML='';
  var main = el('div'); main.className='grid2';
  var left = el('div'), right = el('div');
  left.appendChild(renderConvList(S, function(open){ _curConv=open; render(S); }));
  if(_curConv){ right.appendChild(renderConvDetail(S,_curConv)); }
  else { var p=el('div','panel'); p.innerHTML='<div class="list-item"><div>Selectionnez une conversation</div></div>'; right.appendChild(p); }
  main.appendChild(left); main.appendChild(right);
  _root.appendChild(main);
}

export function renderPlayerMJ(S){
  var box = el('div');
  _root = box;
  render(S);
  return box;
}
export default renderPlayerMJ;
