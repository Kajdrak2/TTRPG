// js/views/player.js — Build P16 (ASCII-only, ES5 style)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function tabButton(def, active){
  var b = el('button','btn secondary tab' + (active ? ' active' : ''));
  b.textContent = def.label;
  b.dataset.id = def.id;
  return b;
}
function mountLoader(panel, loader){
  panel.innerHTML = '<div class="muted small">Chargement...</div>';
  Promise.resolve().then(function(){ return loader(); }).then(function(node){
    panel.innerHTML='';
    if(node && node.nodeType===1) panel.appendChild(node);
    else panel.textContent='(contenu vide)';
  }).catch(function(err){
    console.error('[Player loader error]', err);
    var msg = '[Player loader error] ' + (err && err.message ? err.message : String(err));
    panel.innerHTML = '<div class="error">'+ msg +'</div>';
  });
}

export function renderPlayerApp(){
  var S = State.get();
  var root = el('div');
  var tabs = el('div','row'); tabs.style.gap='8px';
  var panel = el('div'); panel.style.marginTop='12px';

  var defs = [
    {id:'p-sheet',  label:'Personnage', loader:function(){ return import('./player_sheet.js').then(function(m){ return (m.renderPlayerSheet||m.default)(S); }); }},
    {id:'p-dice',   label:'Des',        loader:function(){ return import('./player_dice.js').then(function(m){ return (m.renderPlayerDice||m.default)(S); }); }},
    {id:'p-inv',    label:'Objets',     loader:function(){ return import('./player_inventory.js').then(function(m){ return (m.renderPlayerInventory||m.default)(S); }); }},
    {id:'p-combat', label:'Combat',     loader:function(){ return import('./player_combat.js').then(function(m){ return (m.renderPlayerCombat||m.default)(S); }); }},
    {id:'p-lore',   label:'Lore',       loader:function(){ return import('./player_lore.js').then(function(m){ return (m.renderPlayerLore||m.default)(S); }); }},
    {id:'p-mj',     label:'Messagerie', loader:function(){ return import('./player_mj.js').then(function(m){ return (m.renderPlayerMJ||m.default)(S); }); }}
  ];

  for(var i=0;i<defs.length;i++){
    (function(d, isFirst){
      var b = tabButton(d, isFirst);
      b.onclick = function(){
        var t = tabs.querySelectorAll('.tab');
        for(var j=0;j<t.length;j++){ t[j].classList.remove('active'); }
        b.classList.add('active');
        mountLoader(panel, d.loader);
      };
      tabs.appendChild(b);
    })(defs[i], i===0);
  }

  root.appendChild(tabs);
  root.appendChild(panel);
  mountLoader(panel, defs[0].loader);
  return root;
}
export default renderPlayerApp;
if(typeof window!=='undefined') window.renderPlayerApp = renderPlayerApp;
