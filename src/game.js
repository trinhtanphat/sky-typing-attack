import { DIFFICULTIES, WORDS, accuracy, award, chooseTarget, difficultyFor, formatScore, nextSpawn, safeBest, validLetter, wpm } from "./engine.js";

const W = 1100, H = 620, BEST_KEY = "skytype-attack-best-v1";
const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas"), ctx = canvas.getContext("2d", {alpha:false});
const ui = Object.fromEntries(["score","combo","lives","accuracy","accuracyBar","wpm","wpmBar","wave","waveBar","overlay","overlayKicker","overlayTitle","overlayText","startBtn","difficulty","runState","pauseBtn","headerHighScore","toast","activeWord","wordProgress","soundBtn","mobileInput"].map(id=>[id,$(id)]));
const random = (min,max) => min + Math.random()*(max-min);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const homeClouds = Array.from({length:13},(_,i)=>({x:(i*181+37)%1230,y:60+(i*73)%370,r:24+(i*13)%31,s:5+(i%4)*4}));
let soundOn=true, audio=null, audioEnabled=false, best=0, phase="menu", level="normal";
let score=0, combo=0, lives=5, charsCorrect=0, keystrokes=0, elapsed=0, worldClock=0, wave=1, spawnClock=0, enemyId=0, shake=0, freezeFlash=0;
let enemies=[], shots=[], particles=[], scorePopups=[], active=null, wordBuffer="", toastTimer=0, lastFrame=performance.now();
let planeBob=0;
try{best=safeBest(localStorage.getItem(BEST_KEY));}catch(e){best=0;}
ui.headerHighScore.textContent=formatScore(best);

function sfx(freq=440,duration=.07,type="sine",volume=.035){
 if(!soundOn)return;
 try{
  if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();}
  if(audio.state==="suspended"){audio.resume().catch(()=>{});}
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  oscillator.type=type;oscillator.frequency.setValueAtTime(freq,now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60,freq*.68),now+duration);
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now);oscillator.stop(now+duration);
 }catch(e){/* Audio can be denied by browser, gameplay still works. */}
}
function toast(message){ui.toast.textContent=message;ui.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove("show"),930);}
function refresh(){
 ui.score.textContent=formatScore(score);
 ui.combo.textContent="×"+String(combo).padStart(2,"0");
 ui.lives.textContent=Array.from({length:lives},()=> "♥").join(" ")||"—";
 ui.lives.setAttribute("aria-label",lives+" mạng");
 const acc=accuracy(charsCorrect,keystrokes),speed=wpm(charsCorrect,elapsed);
 ui.accuracy.textContent=String(acc);ui.accuracyBar.style.width=acc+"%";
 ui.wpm.textContent=String(speed);ui.wpmBar.style.width=clamp(speed/115*100,0,100)+"%";
 ui.wave.firstChild.textContent=String(wave).padStart(2,"0");ui.waveBar.style.width=(10+((elapsed%22)/22)*90)+"%";
 ui.wordProgress.classList.toggle("visible",Boolean(active));
 ui.activeWord.replaceChildren();
 if(active){
  const yes=document.createElement("span");yes.className="typed-part";yes.textContent=wordBuffer;
  ui.activeWord.append(yes,document.createTextNode(active.word.slice(wordBuffer.length)));
 }
 ui.runState.textContent=phase==="playing"?"ĐANG CHIẾN ĐẤU":phase==="paused"?"TẠM DỪNG":phase==="over"?"KẾT THÚC":"SẴN SÀNG";
 ui.pauseBtn.textContent=phase==="paused"?"▶":"Ⅱ";
 ui.pauseBtn.setAttribute("aria-label",phase==="paused"?"Tiếp tục trò chơi":"Tạm dừng trò chơi");
}
function showOverlay(kind){
 ui.overlay.classList.remove("hidden");
 if(kind==="paused"){
  ui.overlayKicker.textContent="TẠM DỪNG CHUYẾN BAY";
  ui.overlayTitle.textContent="Tạm nghỉ một chút?";
  ui.overlayText.textContent="Trò chơi đã tạm dừng. Nhấn Tiếp tục hoặc phím ESC để quay lại bầu trời.";
  ui.startBtn.innerHTML="TIẾP TỤC <span>↗</span>";
  ui.difficulty.parentElement.hidden=true;
 }else if(kind==="over"){
  ui.overlayKicker.textContent=score>=best&&score>0?"✦ KỶ LỤC MỚI ✦":"KẾT THÚC NHIỆM VỤ";
  ui.overlayTitle.textContent=formatScore(score)+" điểm";
  ui.overlayText.textContent="Hạ "+String(downed)+" mục tiêu · Combo cao nhất ×"+maxCombo+" · Chính xác "+accuracy(charsCorrect,keystrokes)+"% · "+wpm(charsCorrect,elapsed)+" WPM. Sẵn sàng thử lại?";
  ui.startBtn.innerHTML="CHƠI LẠI <span>↗</span>";
  ui.difficulty.parentElement.hidden=false;
 }else{
  ui.overlayKicker.textContent="SẴN SÀNG CẤT CÁNH?";
  ui.overlayTitle.textContent="Bầu trời đang chờ bạn.";
  ui.overlayText.textContent="Gõ chữ cái trên bàn phím để khóa và phá hủy phi cơ địch trước khi chúng lọt qua phòng tuyến.";
  ui.startBtn.innerHTML="BẮT ĐẦU CHƠI <span>↗</span>";
  ui.difficulty.parentElement.hidden=false;
 }
}
let downed=0,maxCombo=0;
function start(){
 level=ui.difficulty.value;
 score=0;combo=0;maxCombo=0;lives=difficultyFor(level).lives;
 charsCorrect=0;keystrokes=0;elapsed=0;wave=1;spawnClock=0;enemyId=0;shake=0;freezeFlash=0;downed=0;
 enemies=[];shots=[];particles=[];scorePopups=[];active=null;wordBuffer="";
 phase="playing";ui.overlay.classList.add("hidden");ui.toast.classList.remove("show");
 spawnEnemy();spawnClock=-.15;refresh();
 canvas.parentElement.focus({preventScroll:true});
 if(window.matchMedia("(pointer:coarse)").matches) ui.mobileInput.focus({preventScroll:true});
 sfx(660,.13,"triangle",.04);
}
function pauseToggle(){
 if(phase==="playing"){phase="paused";showOverlay("paused");refresh();}
 else if(phase==="paused"){phase="playing";ui.overlay.classList.add("hidden");lastFrame=performance.now();refresh();}
}
function gameOver(){
 phase="over";active=null;wordBuffer="";
 if(score>best){best=score;try{localStorage.setItem(BEST_KEY,String(best));}catch(e){/* optional */}}
 ui.headerHighScore.textContent=formatScore(best);
 showOverlay("over");refresh();sfx(220,.48,"sawtooth",.04);
}
function lostEnemy(e){
 if(!e.alive)return;
 e.alive=false; if(active===e){active=null;wordBuffer="";}
 lives--;combo=0;shake=9;freezeFlash=.35;burst(100,e.y,"#f4aa74",20);sfx(180,.21,"sawtooth",.046);
 toast(lives>0?"PHÒNG TUYẾN BỊ XÂM NHẬP!":"HẾT MẠNG!");
 refresh();
 if(lives<=0)gameOver();
}
function spawnEnemy(){
 const cfg=difficultyFor(level);
 const maxLen=clamp(4+Math.floor(wave/2),4,10);
 const minLen=wave>=4?4:3;
 const choices=WORDS.filter(word=>word.length>=minLen&&word.length<=maxLen&&!enemies.some(e=>e.alive&&e.word===word));
 const word=choices[Math.floor(Math.random()*choices.length)]||"sky";
 let y=0;
 for(let tries=0;tries<12;tries++){
  y=random(174,475);
  if(!enemies.some(e=>e.alive&&e.x>780&&Math.abs(e.y-y)<62))break;
 }
 const colors=["#f4a16a","#e8c985","#a1dde3","#efd3a6","#98c6de"];
 enemies.push({id:++enemyId,word,x:W+100,y,baseY:y,speed:(36+wave*5+random(0,21))*cfg.speed,bob:random(0,6.28),scale:random(.85,1.12),color:colors[enemyId%colors.length],alive:true,angle:random(-.04,.04)});
}
function burst(x,y,color,count=15){
 for(let i=0;i<count;i++){
  const a=random(0,Math.PI*2),s=random(35,190),life=random(.3,.9);
  particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,r:random(1.5,4.3),color});
 }
}
function destroy(e){
 if(!e.alive)return;
 e.alive=false;downed++;combo++;maxCombo=Math.max(maxCombo,combo);
 const points=award(e.word,combo,difficultyFor(level).points);
 score+=points;burst(e.x,e.y,e.color,22);burst(e.x,e.y,"#faffdd",10);
 scorePopups.push({x:e.x,y:e.y-57,text:"+"+points,life:.95});
 if(combo>=3&&combo%3===0)toast("COMBO ×"+combo+"!");
 else if(e.word.length>=8)toast("PERFECT SHOT!");
 sfx(540+Math.min(450,combo*23),.13,"triangle",.053);
 active=null;wordBuffer="";refresh();
}
function fire(e){
 shots.push({x:175,y:442+planeBob,tx:e.x,ty:e.y,life:.20,max:.20});
 if(shots.length>35)shots.shift();
}
function typeLetter(key){
 if(phase!=="playing"||!validLetter(key))return;
 const letter=key.toLowerCase();keystrokes++;
 if(!active){
  active=chooseTarget(enemies,letter);
  wordBuffer="";
 }
 if(active && active.alive && active.word[wordBuffer.length]===letter){
  wordBuffer+=letter;charsCorrect++;fire(active);sfx(460+wordBuffer.length*45,.053,"sine",.018);
  if(wordBuffer===active.word)destroy(active);
 }else{
  combo=0;shake=2.5; sfx(170,.055,"square",.011);
 }
 refresh();
}
function backspace(){
 if(phase!=="playing")return;
 if(wordBuffer.length)wordBuffer=wordBuffer.slice(0,-1);
 if(!wordBuffer)active=null;
 refresh();
}
function update(dt){
 worldClock+=dt;planeBob=Math.sin(worldClock*2.7)*3;
 for(const c of homeClouds){c.x-=c.s*dt;if(c.x< -160)c.x=1230;}
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);
 }
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;if(s.life<=0)shots.splice(i,1);}
 for(let i=scorePopups.length-1;i>=0;i--){const p=scorePopups[i];p.y-=24*dt;p.life-=dt;if(p.life<=0)scorePopups.splice(i,1);}
 shake=Math.max(0,shake-25*dt);freezeFlash=Math.max(0,freezeFlash-dt);
 if(phase!=="playing")return;
 elapsed+=dt;const newWave=1+Math.floor(elapsed/22);
 if(newWave!==wave){wave=newWave;toast("SÓNG "+wave+" ĐANG TỚI!");sfx(700,.21,"triangle",.04);}
 spawnClock+=dt;
 if(spawnClock>=nextSpawn(difficultyFor(level).spawn,wave)&&enemies.filter(e=>e.alive).length<13){spawnClock=0;spawnEnemy();}
 for(const e of enemies){
  if(!e.alive)continue;
  e.x-=e.speed*dt;e.y=e.baseY+Math.sin(worldClock*2+e.bob)*5;
  if(e.x<112)lostEnemy(e);
 }
 enemies=enemies.filter(e=>e.alive);
}
function roundRect(x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function drawCloud(x,y,r,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;
 ctx.shadowBlur=16;ctx.shadowColor="rgba(255,255,255,.17)";
 ctx.fillStyle="#f2ffff";
 ctx.beginPath();ctx.ellipse(x-1.15*r,y+5,.94*r,.35*r,0,0,7);
 ctx.ellipse(x-.35*r,y-.12*r,.67*r,.5*r,0,0,7);
 ctx.ellipse(x+.35*r,y-.27*r,.68*r,.64*r,0,0,7);
 ctx.ellipse(x+.97*r,y+.08*r,.68*r,.36*r,0,0,7);ctx.fill();ctx.restore();
}
function drawRidge(base,color,seed,height){
 ctx.beginPath();ctx.moveTo(0,H);
 for(let x=-100;x<=W+120;x+=55){
  const h=Math.sin(x*.012+seed)*height*.54+Math.sin(x*.037+seed*1.7)*height*.3+Math.sin(x*.0032+seed)*height*.4;
  ctx.lineTo(x,base-h);
 }
 ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function drawBackground(){
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,"#5db7d5");g.addColorStop(.56,"#9ad9d1");g.addColorStop(1,"#e1e4b7");
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const sunlight=ctx.createRadialGradient(875,119,4,875,119,260);
 sunlight.addColorStop(0,"rgba(255,250,212,.75)");sunlight.addColorStop(.15,"rgba(255,249,202,.4)");sunlight.addColorStop(1,"rgba(255,238,210,0)");
 ctx.fillStyle=sunlight;ctx.fillRect(580,0,520,430);
 ctx.beginPath();ctx.arc(875,119,37,0,Math.PI*2);ctx.fillStyle="#fff3cd";ctx.fill();
 ctx.fillStyle="rgba(255,255,255,.15)";
 for(let i=0;i<24;i++){const x=(i*137+67)%W,y=80+(i*93)%290;ctx.fillRect(x,y,2,2);}
 for(const c of homeClouds)drawCloud(c.x,c.y,c.r,.42+(c.y%7)*.035);
 drawRidge(440,"#6ba3a7",1.5,58);
 drawRidge(480,"#447e91",.55,83);
 drawRidge(510,"#316c83",2.7,62);
 drawRidge(553,"#28576b",4.2,39);
 ctx.fillStyle="#244f58";ctx.fillRect(0,583,W,37);
 for(let i=0;i<45;i++){
  const x=(i*43+19)%W,h=12+(i*7)%41;
  ctx.fillStyle=i%3===0?"#2a6270":"#27535a";
  ctx.beginPath();ctx.moveTo(x-12,592);ctx.lineTo(x,592-h);ctx.lineTo(x+13,592);ctx.fill();
 }
 ctx.fillStyle="#d7f5d5";ctx.globalAlpha=.21;ctx.fillRect(0,579,W,3);ctx.globalAlpha=1;
 // Guide line on the left: enemies must not cross.
 ctx.save();ctx.setLineDash([8,12]);ctx.beginPath();ctx.moveTo(112,87);ctx.lineTo(112,568);ctx.strokeStyle="rgba(250,245,191,.35)";ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
 ctx.translate(92,340);ctx.rotate(-Math.PI/2);ctx.fillStyle="rgba(240,252,219,.64)";ctx.font="900 11px system-ui";ctx.letterSpacing="2px";ctx.fillText("DEFENSE LINE",0,0);ctx.restore();
}
function drawPlane(x,y,scale,color,bob=0,isPlayer=false){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(isPlayer?Math.sin(worldClock*1.4)*.02:Math.sin(worldClock*2+bob)*.035);
 if(isPlayer){
  ctx.fillStyle="rgba(1,34,48,.21)";ctx.beginPath();ctx.ellipse(0,42,56,9,0,0,7);ctx.fill();
  ctx.fillStyle="#244f64";ctx.beginPath();ctx.moveTo(-39,7);ctx.lineTo(-63,-24);ctx.lineTo(-37,-20);ctx.lineTo(-6,4);ctx.fill();
  ctx.fillStyle="#e6f9e6";ctx.beginPath();ctx.moveTo(-44,-6);ctx.lineTo(18,-10);ctx.quadraticCurveTo(42,-9,60,0);ctx.quadraticCurveTo(28,18,-44,10);ctx.closePath();ctx.fill();
  ctx.fillStyle="#69bac3";ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(-36,33);ctx.lineTo(24,25);ctx.lineTo(33,-1);ctx.closePath();ctx.fill();
  ctx.fillStyle="#f9d58d";ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(14,-11);ctx.lineTo(26,-6);ctx.lineTo(11,-1);ctx.closePath();ctx.fill();
  ctx.fillStyle="#286a89";roundRect(5,-9,19,6,3,"#346d85");
  ctx.strokeStyle="#ffefbe";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(61,-16);ctx.lineTo(61,16);ctx.stroke();
  ctx.beginPath();ctx.arc(61,0,18+Math.sin(worldClock*30)*2,0,7);ctx.strokeStyle="#e9f6e680";ctx.lineWidth=1;ctx.stroke();
 }else{
  ctx.fillStyle="#3b6274";ctx.beginPath();ctx.moveTo(-33,0);ctx.lineTo(23,-8);ctx.quadraticCurveTo(41,0,27,10);ctx.lineTo(-33,8);ctx.closePath();ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-33,0);ctx.lineTo(-48,-23);ctx.lineTo(-30,-17);ctx.lineTo(-11,2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-6,-1);ctx.lineTo(-22,24);ctx.lineTo(22,15);ctx.lineTo(20,-3);ctx.closePath();ctx.fill();
  ctx.fillStyle="#f2e4c7";ctx.beginPath();ctx.moveTo(-4,-7);ctx.lineTo(10,-16);ctx.lineTo(21,-11);ctx.lineTo(22,-5);ctx.closePath();ctx.fill();
  ctx.fillStyle="#2f6981";ctx.beginPath();ctx.ellipse(16,-6,8,5,-.2,0,7);ctx.fill();
  ctx.strokeStyle="#e8ffff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-44,-17);ctx.lineTo(-44,16);ctx.stroke();
  ctx.strokeStyle="#e8ffff88";ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(-44,0,7,21,0,0,7);ctx.stroke();
  ctx.fillStyle="#fff5c2";ctx.fillRect(32,0,5,3);
 }
 ctx.restore();
}
function drawWord(e){
 const fontSize=23,word=e.word,pad=18,labelW=word.length*15.2+pad*2,top=e.y-63-labelW*0;
 const x=e.x-labelW/2,y=top-17;
 ctx.save();
 ctx.shadowColor=active===e?"#f5edb0":"rgba(22,69,91,.3)";ctx.shadowBlur=active===e?18:8;
 ctx.lineWidth=active===e?2.7:1.5;
 roundRect(x,y,labelW,43,9,active===e?"rgba(24,73,84,.94)":"rgba(31,87,100,.78)",active===e?"#fbef9c":"rgba(234,255,243,.72)");
 ctx.shadowBlur=0;
 if(active===e){ctx.beginPath();ctx.moveTo(e.x,y+43);ctx.lineTo(e.x,e.y-22);ctx.strokeStyle="#fff1aeaa";ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);}
 ctx.font="900 "+fontSize+"px ui-sans-serif,system-ui";ctx.textBaseline="middle";ctx.textAlign="center";
 ctx.fillStyle="#ecf8ee";
 ctx.shadowColor="#174c69";ctx.shadowBlur=3;
 if(active===e){
  const done=wordBuffer.length,spacing=15.2;
  const left=e.x-(word.length*spacing)/2;
  for(let i=0;i<word.length;i++){
   ctx.fillStyle=i<done?"#a1fabe":"#fff7e5";
   ctx.fillText(word[i],left+i*spacing+spacing/2,y+21);
  }
 }else{
  ctx.fillText(word,e.x,y+21);
 }
 ctx.restore();
}
function drawDecorative(){
 const demo=[{x:710,y:205,word:"yards",color:"#e8c985",scale:1.1,bob:1,alive:true},{x:448,y:320,word:"rise",color:"#f4a16a",scale:.95,bob:2,alive:true},{x:884,y:385,word:"yemen",color:"#a1dde3",scale:1,bob:3,alive:true},{x:235,y:206,word:"sky",color:"#edc698",scale:.8,bob:5,alive:true}];
 for(const [i,e] of demo.entries()){const t=worldClock*.5+i;e.x+=Math.sin(t)*7;e.y+=Math.cos(t)*3;drawPlane(e.x,e.y,e.scale,e.color,e.bob);drawWord(e);}
}
function drawPlayer(){
 drawPlane(139,438+planeBob,1.23,"#9ce1cf",0,true);
 ctx.save();ctx.strokeStyle="rgba(255,246,184,.26)";ctx.setLineDash([8,13]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(205,438+planeBob);ctx.lineTo(325,438+planeBob);ctx.stroke();ctx.restore();
}
function drawShots(){
 for(const s of shots){
  const t=1-s.life/s.max,progress=t*t*(3-2*t),x=s.x+(s.tx-s.x)*progress,y=s.y+(s.ty-s.y)*progress;
  ctx.save();ctx.shadowBlur=15;ctx.shadowColor="#fffaa4";ctx.strokeStyle="#fff8d9";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-22,y+6);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle="#fffef6";ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();ctx.restore();
 }
}
function drawParticles(){
 for(const p of particles){ctx.save();ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life/p.max,0,7);ctx.fill();ctx.restore();}
 for(const p of scorePopups){ctx.save();ctx.globalAlpha=clamp(p.life/.3,0,1);ctx.textAlign="center";ctx.fillStyle="#fffbd1";ctx.font="900 24px system-ui";ctx.shadowColor="#1b5e75";ctx.shadowBlur=5;ctx.fillText(p.text,p.x,p.y);ctx.restore();}
}
function paint(){
 ctx.save();
 if(shake>0)ctx.translate(random(-shake,shake),random(-shake,shake));
 drawBackground();
 if(phase==="menu"){drawDecorative();}
 else{for(const e of enemies)drawPlane(e.x,e.y,e.scale,e.color,e.bob);drawShots();for(const e of enemies)drawWord(e);}
 drawPlayer();drawParticles();
 if(freezeFlash>0){ctx.fillStyle="rgba(255,175,140,"+freezeFlash*.34+")";ctx.fillRect(0,0,W,H);}
 ctx.restore();
}
function resizeCanvas(){
 const rect=canvas.getBoundingClientRect();
 if(rect.width<=0)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
}
function frame(now){
 const dt=clamp((now-lastFrame)/1000,0,.055);lastFrame=now;
 resizeCanvas();update(dt);paint();
 if(phase==="playing"&&Math.floor(now/220)!==Math.floor((now-dt*1000)/220))refresh();
 requestAnimationFrame(frame);
}
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){if(phase==="playing"||phase==="paused"){e.preventDefault();pauseToggle();}return;}
 if(e.key==="Enter"&&(phase==="menu"||phase==="over")){if(document.activeElement?.tagName==="SELECT")return;start();return;}
 if(phase!=="playing")return;
 if(e.key==="Backspace"){e.preventDefault();backspace();return;}
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.target===ui.mobileInput||e.target?.tagName==="SELECT")return;
 if(validLetter(e.key)){e.preventDefault();typeLetter(e.key);}
});
ui.mobileInput.addEventListener("input",()=>{
 const val=ui.mobileInput.value;ui.mobileInput.value="";
 for(const c of val)if(validLetter(c))typeLetter(c);
});
ui.startBtn.addEventListener("click",()=>phase==="paused"?pauseToggle():start());
$("restartBtn").addEventListener("click",start);
ui.pauseBtn.addEventListener("click",pauseToggle);
ui.soundBtn.addEventListener("click",()=>{
 soundOn=!soundOn;ui.soundBtn.setAttribute("aria-pressed",String(soundOn));
 ui.soundBtn.innerHTML=soundOn?"♫ <span>Âm thanh: Bật</span>":"♪ <span>Âm thanh: Tắt</span>";
 if(soundOn)sfx(610,.08,"triangle",.026);
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&phase==="playing")pauseToggle();});
window.addEventListener("resize",resizeCanvas,{passive:true});
window.addEventListener("pointerdown",()=>{if(!audioEnabled){audioEnabled=true;if(soundOn)sfx(380,.04,"sine",.002);}}, {once:true});
refresh();showOverlay("menu");requestAnimationFrame(frame);
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
window.__skytypeDebug={get state(){return {phase,score,combo,lives,wave,elapsed,enemies:enemies.map(e=>({word:e.word,x:e.x,y:e.y})),wordBuffer};},start,typeLetter,pauseToggle};
