import assert from "node:assert/strict";
import fs from "node:fs";
const CDP=process.env.CDP_PORT||"9351";
const URL="http://127.0.0.1:"+CDP+"/json/list";
const pages=await(await fetch(URL)).json();
const page=pages.find(p=>p.type==="page"&&p.url.includes("8763"));
assert.ok(page,"Expected local game tab");
const socket=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
const waiting=new Map();let id=0;const exceptions=[];
socket.addEventListener("message",event=>{
 const m=JSON.parse(event.data);
 if(m.method==="Runtime.exceptionThrown")exceptions.push(m.params.exceptionDetails?.text+" "+(m.params.exceptionDetails?.exception?.description||""));
 if(m.id&&waiting.has(m.id)){const [resolve,reject]=waiting.get(m.id);waiting.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}
});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const i=++id;waiting.set(i,[resolve,reject]);socket.send(JSON.stringify({id:i,method,params}));});}
async function evaluate(expression){const r=await cdp("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+" "+(r.exceptionDetails.exception?.description||""));return r.result.value;}
await cdp("Runtime.enable");await cdp("Page.enable");await cdp("Page.reload",{ignoreCache:true});
for(let n=0;n<30;n++){if(await evaluate("Boolean(window.__skytypeDebug)"))break;await new Promise(r=>setTimeout(r,100));}
assert.equal(await evaluate("Boolean(window.__skytypeDebug)"),true,"Game JS loaded");
assert.equal(await evaluate("document.title"),"SkyType Attack — Đánh máy, bảo vệ bầu trời");
assert.equal(await evaluate("window.__skytypeDebug.state.phase"),"menu");
assert.equal(await evaluate("getComputedStyle(document.querySelector('#overlay')).display"),"flex");
console.log("PASS: DOM, CSS, JS module load and start menu");
const screenshot=await cdp("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
fs.writeFileSync("preview.png",Buffer.from(screenshot.data,"base64"));
console.log("PASS: screenshot saved ("+fs.statSync("preview.png").size+" bytes)");
const gameResult=await evaluate(`(() => {
 const game=window.__skytypeDebug;
 game.start();
 const original=game.state;
 const word=original.enemies[0].word;
 for(const char of word)document.dispatchEvent(new KeyboardEvent("keydown",{key:char,bubbles:true,cancelable:true}));
 return {firstWord:word,life:game.state.lives,score:game.state.score,phase:game.state.phase,enemies:game.state.enemies.length,combo:game.state.combo};
})()`);
assert.ok(gameResult.score>0,"Typing full word earns points");
assert.equal(gameResult.combo,1);
assert.equal(gameResult.phase,"playing");
console.log("PASS: keyboard shoots aircraft: "+JSON.stringify(gameResult));
const paused=await evaluate(`(() => {document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));return window.__skytypeDebug.state.phase;})()`);
assert.equal(paused,"paused");console.log("PASS: escape pauses game");
const resumed=await evaluate(`(() => {document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));return window.__skytypeDebug.state.phase;})()`);
assert.equal(resumed,"playing");console.log("PASS: escape resumes game");
await cdp("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true});
const mobile=await evaluate(`({innerWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,input:getComputedStyle(document.querySelector(".mobile-input-wrap")).display,frameWidth:document.querySelector("#gameFrame").getBoundingClientRect().width})`);
assert.ok(mobile.scrollWidth<=mobile.innerWidth+2,"No horizontal overflow on 390px mobile");
assert.equal(mobile.input,"block");
console.log("PASS: mobile layout "+JSON.stringify(mobile));
const mobilePlay=await evaluate(`(() => {const game=window.__skytypeDebug;game.start();const word=game.state.enemies[0].word;const input=document.querySelector("#mobileInput");input.value=word;input.dispatchEvent(new Event("input",{bubbles:true}));return {score:game.state.score,word,inputCleared:input.value===""};})()`);
assert.ok(mobilePlay.score>0,"Virtual keyboard input should score");assert.equal(mobilePlay.inputCleared,true);
console.log("PASS: mobile keyboard gameplay "+JSON.stringify(mobilePlay));
assert.equal(exceptions.length,0,"No uncaught JS exceptions: "+exceptions.join("; "));
console.log("PASS: 0 uncaught JavaScript exceptions");
socket.close();
