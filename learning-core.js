/* Shared answer rules. Pending manual work is never an incorrect numeric answer. */
(function(root){
'use strict';
const norm=v=>String(v??'').trim().replace(/−/g,'-').replace(/,/g,'.');
const numeric=v=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(norm(v))&&Number.isFinite(Number(norm(v)));
const checkable=r=>!!r&&['b','m'].includes(r[3])&&numeric(r[4]);
function correct(r,value){
 if(!checkable(r))return null;
 const g=norm(value),a=norm(r[4]);
 if(r[3]==='m'){
  const digits=String(value??'').trim().replace(/[\s;,]/g,'');
  if(!/^\d+$/.test(digits))return false;
  const unordered=r[8]?.answerOrder==='any'||(r[1]>=10112&&r[1]<=10116);
  return unordered?digits.split('').sort().join('')===a.split('').sort().join(''):digits===a;
 }
 if (r[8]?.answerDecimals===2) return numeric(g)&&Number(g).toFixed(2)===Number(a).toFixed(2);
 const threshold=r[8]?.numericTolerance===0.01?Math.max(1e-6,Math.abs(Number(a))*0.01):1e-9*Math.max(1,Math.abs(Number(a)));
 return numeric(g)&&Math.abs(Number(g)-Number(a))<=threshold;
}
function summary(rows){return {correct:rows.filter(r=>r[2]===1).length,automatic:rows.filter(r=>r[2]!==null).length,pending:rows.filter(r=>r[2]===null&&String(r[1]??'').trim()).length};}
function snapshotRow(r,label){return [r[0],r[1],r[2],r[3],r[4],r[5],r[6],Array.isArray(r[7])?[...r[7]]:[],{...(r[8]||{}),...(label?{label}:{})}];}
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function isFigure(src){
 return typeof src==='string' && (
  /^data:image\/(?:svg\+xml|png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(src) ||
  /^data:image\/svg\+xml;charset=utf-8,%3Csvg[\w!~*'().%+-]+$/i.test(src) ||
  /^bank\/figures\/[a-z0-9_-]+\.(?:svg|png|jpe?g|webp)$/i.test(src)
 );
}
function conditionHTML(row){
 let index=0;
 const figures=Array.isArray(row[7])?row[7]:[];
 const figure=src=>isFigure(src)
  ? `<img class="review-figure" src="${escapeHtml(src)}" alt="Рисунок к задаче"><span class="review-figure-error" hidden>Рисунок не загрузился</span>`
  : '<span class="review-figure-error">Рисунок отсутствует или повреждён</span>';
 const body=escapeHtml(row[6]).replace(/\[рисунок\]/g,()=>figure(figures[index++]));
 return body.replace(/\r?\n/g,'<br>')+figures.slice(index).map(figure).join('');
}
function markBrokenFigures(container) {
 for (const img of container.querySelectorAll('img.review-figure')) {
  const showError=()=>{img.hidden=true;img.nextElementSibling.hidden=false};
  img.addEventListener('error',showError,{once:true});
  if(img.complete&&!img.naturalWidth)showError();
 }
}
const api={norm,numeric,checkable,correct,summary,snapshotRow,isFigure,conditionHTML,markBrokenFigures,escapeHtml};root.OgeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
