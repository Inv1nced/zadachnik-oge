const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('frog-guide.js','utf8'),c);const guide=c.window.OgeFrogGuide;
const read=r=>k=>r[k]===undefined?null:JSON.stringify(r[k]);
assert.equal(guide.pending(read({})),false);
for(const kind of ['hw','test']){
 const key='mk_run_'+kind;
 assert.equal(guide.pending(read({[key]:{kind,ids:[-8],done:false,answers:{'-8':'5'}}})),true);
 assert.equal(guide.pending(read({[key]:{kind,ids:[-8],done:true}})),false);
}
assert.equal(guide.pending(()=>'{broken'),false);
for(const block of [...Array.from({length:23},(_,i)=>String(i+1)),'X']){
 assert.ok(guide.simple[block]?.length>40);
 for(const mode of ['formula','fact','simple'])assert.equal(guide.message(mode,block,0,true),guide.message('start',null,0,true));
 for(const mode of ['start','check','stuck'])assert.equal(guide.message(mode,block,999,true),guide.message(mode,block,2,true),'Repeated clicks must stop at the final coaching prompt');
}
console.log('PASS: pending homework/test protection, completion unlock, all block explanations, restricted hint routing and capped prompts.');
