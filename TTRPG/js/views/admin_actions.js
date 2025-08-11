// TTRPG/js/views/admin_actions.js
// ES module. Provides an Actions placeholder and uses the combat modal hook.
// Exports renderAdminActions(S) and default; assigns window.renderAdminActions too.

function el(tag, cls){ const n=document.createElement(tag); if(cls) n.className=cls; return n; }

export function renderAdminActions(S){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Actions</b> <span class="muted small">(Q/R, dialogues MJ & joueurs)</span></div></div>';
  const row = el('div','list-item row');
  const openB = el('button','btn'); openB.textContent='Ouvrir console de combat…';
  openB.onclick = ()=>{
    if(typeof window!=='undefined' && typeof window.__openCombatModal==='function'){
      window.__openCombatModal(S, {});
    }else{
      alert('Hook combat indisponible. Ouvre le Bestiaire au moins une fois.');
    }
  };
  row.append(openB);
  box.append(row);
  return box;
}
export default renderAdminActions;
if(typeof window!=='undefined') window.renderAdminActions = (S)=>renderAdminActions(S);
