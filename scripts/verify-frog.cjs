const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('frog-guide.js','utf8'),c);const guide=c.window.OgeFrogGuide;
const read=r=>k=>r[k]===undefined?null:JSON.stringify(r[k]);
assert.equal(guide.pending(read({})),false);
for(const kind of ['hw','test']){
 const key='mk_run_'+kind;
 assert.equal(guide.pending(read({[key]:{kind,ids:[-8],done:false,answers:{'-8':'5'}}})),true);
 assert.equal(guide.pending(read({[key]:{kind,ids:[-8],done:true}})),false);
}
assert.equal(guide.pending(()=>'{broken'),false);
const helper=fs.readFileSync('frog-helper.js','utf8');
for(const old of ['frog-coach','data-tip="simple"','data-tip="start"','data-tip="check"','data-tip="stuck"'])assert.ok(!helper.includes(old),'Removed generic coaching must not return');
assert.ok(helper.includes('body.disabled=locked'));
console.log('PASS: pending assessment detection, completion unlock and generic coaching removed.');
