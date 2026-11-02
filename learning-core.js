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
  const digits=g.replace(/[\s;,]/g,'');
  if(!/^\d+$/.test(digits))return false;
  return r[1]>=10112&&r[1]<=10116?digits.split('').sort().join('')===a.split('').sort().join(''):digits===a;
 }
 return numeric(g)&&Math.abs(Number(g)-Number(a))<=1e-9*Math.max(1,Math.abs(Number(a)));
}
function summary(rows){return {correct:rows.filter(r=>r[2]===1).length,automatic:rows.filter(r=>r[2]!==null).length,pending:rows.filter(r=>r[2]===null).length};}
function snapshotRow(r,label){return [r[0],r[1],r[2],r[3],r[4],r[5],r[6],Array.isArray(r[7])?r[7]:[],{...(r[8]||{}),label}];}
const api={norm,numeric,checkable,correct,summary,snapshotRow};root.OgeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
