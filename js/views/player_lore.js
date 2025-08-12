// js/views/player_lore.js — Build PL1
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
}
function mdToHtml(md){
  // Tiny safe markdown: we escape HTML first, then apply a few patterns
  let s = escapeHtml(md||'');

  // code `inline`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  // italics *text*
  s = s.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  // headings (#, ##, ###) start of line
  s = s.replace(/^(###)\s+(.+)$/gm, '<h4>$2</h4>');
  s = s.replace(/^(##)\s+(.+)$/gm, '<h3>$2</h3>');
  s = s.replace(/^(#)\s+(.+)$/gm, '<h2>$2</h2>');
  // unordered lists
  s = s.replace(/^(?:-|\*)\s+(.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>)(\s*(?!<li>))/gms, '<ul>$1</ul>$2');
  // paragraphs & line breaks
  s = s.replace(/\n{2,}/g, '</p><p>');
  s = '<p>'+s.replace(/\n/g, '<br>')+'</p>';
  return s;
}

export function renderPlayerLore(S){
  const box = el('div');
  const panel = el('div','panel');
  panel.innerHTML = `<div class="list-item"><div><b>Lore</b></div></div>`;
  const inner = el('div','inner'); inner.style.display='block';

  const format = (S.settings && S.settings.loreFormat) || 'text';
  const content = S.lore || '';
  const html = format==='markdown' ? mdToHtml(content) : '<p>'+escapeHtml(content).replace(/\n/g,'<br>')+'</p>';
  inner.innerHTML = html || '<div class="muted small">(Aucun contenu)</div>';

  panel.appendChild(inner);
  box.appendChild(panel);
  return box;
}
export default renderPlayerLore;
