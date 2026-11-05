// Build only. Reads the password from stdin; plaintext teacher sources stay outside Pages.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const repo=process.cwd(),source=path.resolve(process.argv[2]||'../site-private-source');
const password=fs.readFileSync(0,'utf8').replace(/[\r\n]+$/,'');
if(!password)throw new Error('Password is required on stdin');
const match=fs.readFileSync(path.join(repo,'zhurnal.html'),'utf8').match(/const ENC="([^"]+)"/);if(!match)throw new Error('Encrypted journal not found');
const raw=Buffer.from(match[1],'base64'),salt=raw.subarray(0,16),key=crypto.pbkdf2Sync(password,salt,200000,32,'sha256');
const decipher=crypto.createDecipheriv('aes-256-gcm',key,raw.subarray(16,28));decipher.setAuthTag(raw.subarray(-16));
const bank=JSON.parse(Buffer.concat([decipher.update(raw.subarray(28,-16)),decipher.final()]).toString('utf8'));
const read=f=>fs.readFileSync(path.join(source,f),'utf8');
function pack({entry,output,bundle,title,styles,scripts,includeBank=false,prefix=''}){
 const html=read(entry),body=html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi,'');if(!body)throw new Error('Missing body: '+entry);
 const payload={title,body,styles,scripts:scripts.map(s=>typeof s==='string'?{inline:read(s)}:s),bank:includeBank?bank:null};
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),ct=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final(),cipher.getAuthTag()]);
 fs.writeFileSync(path.join(repo,bundle),JSON.stringify({version:1,algorithm:'AES-GCM',iterations:200000,salt:salt.toString('base64'),iv:iv.toString('base64'),data:ct.toString('base64')}));
 const encName=path.basename(bundle);
 fs.writeFileSync(path.join(repo,output),`<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Кабинет репетитора — вход</title><link rel="stylesheet" href="${prefix}teacher-access.css?v=20261105coach"></head><body><main id="teacher-access" data-bundle="${encName}"><h1>Кабинет репетитора</h1><p>Материалы для проведения урока доступны после входа.</p><form id="teacher-login"><label for="teacher-password">Пароль журнала</label><input id="teacher-password" type="password" autocomplete="current-password" required><label class="access-remember"><input id="teacher-remember" type="checkbox" checked> Запомнить это устройство</label><button type="submit">Войти в кабинет</button><p id="teacher-access-error" class="access-error" role="status" aria-live="polite"></p></form><p class="access-footer"><a href="${prefix}index.html">Перейти к заданиям для ученика</a></p></main><script src="${prefix}teacher-access.js?v=20261105coach"></script></body></html>\n`);
 // Independently check the exact published ciphertext before reporting a successful build.
 const verify=crypto.createDecipheriv('aes-256-gcm',key,iv);verify.setAuthTag(ct.subarray(-16));const back=JSON.parse(Buffer.concat([verify.update(ct.subarray(0,-16)),verify.final()]));if(back.body!==body)throw new Error('Roundtrip failed');
 console.log(output+': encrypted bundle verified');
}
// Core and shell contain no private teaching material.
const core={inline:fs.readFileSync(path.join(repo,'learning-core.js'),'utf8')};
pack({entry:'teach.html',output:'teach.html',bundle:'teacher-workspace.enc.json',title:'Вести урок · Физика рядом',styles:['teach.css?v=20261103privacy','site-shell.css?v=20261103privacy'],scripts:[core,'tutor-plan/plan-data.js','practice-data.js','teach.js',{src:'site-shell.js?v=20261105coach'}],includeBank:true});
pack({entry:'tutor-plan/index.html',output:'tutor-plan/index.html',bundle:'tutor-plan/teacher-plan.enc.json',title:'Маршрут к ОГЭ · кабинет репетитора',styles:['style.css','../site-shell.css?v=20261103privacy'],scripts:['tutor-plan/plan-data.js',{inline:'window.__OGE_METHOD_GUIDE_TEXT='+JSON.stringify(read('tutor-plan/method-guide.md'))+';'},'tutor-plan/app.js',{src:'../site-shell.js?v=20261105coach'}],prefix:'../'});
