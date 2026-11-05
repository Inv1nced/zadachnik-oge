/* Keep the helper silent during saved unfinished assessments. */
(()=>{
function pending(read){return ['hw','test'].some(kind=>{try{const run=JSON.parse(read('mk_run_'+kind)||'null');return !!run&&run.kind===kind&&run.done!==true&&Array.isArray(run.ids)&&run.ids.length>0}catch{return false}})}
window.OgeFrogGuide={pending};
})();
