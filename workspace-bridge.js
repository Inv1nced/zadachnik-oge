/* Same-origin bridge: the protected bank remains encrypted until journal login. */
(()=>{
 if(window.parent===window||!new URLSearchParams(location.search).has('workspace'))return;
 const tell=data=>window.parent.postMessage(data,location.origin);
 addEventListener('message',async e=>{
  if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='close-workspace-board'){BD.close();return}if(e.data?.type!=='open-workspace-task')return;
  try{
   const {lessonCode,rowId,customRow,title,studentId}=e.data;
   if(lessonCode){const l=String(lessonCode).split('-')[0];if(!byId[rowId]){const p=await decryptLesson(l,lessonCode);addRows(p.r,true)}}
   const row=customRow||byId[rowId];if(!row)throw new Error('Задание не загрузилось');
   BD.open('student-'+String(studentId||'default').replace(/[^a-z0-9-]/gi,'')+'-'+row[0],row,String(title||taskLabel(row)));
   tell({type:'board-opened'});
  }catch(err){tell({type:'board-error',message:'Не удалось открыть условие. Повтори вход в журнал и попробуй ещё раз.'})}
 });
 new MutationObserver(()=>{if(document.getElementById('bd').hidden)tell({type:'board-closed'})}).observe(document.getElementById('bd'),{attributes:true,attributeFilter:['hidden']});
 tell({type:'board-ready'});
})();
