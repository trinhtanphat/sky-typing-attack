// Procedural Web Audio: no external assets, codecs, downloads or autoplay bypass.
// Every audible action is gated by a trusted user interaction and AudioContext.resume().
const SOUNDS={
 shot:[680,.11,"square",.12],
 hit:[380,.09,"triangle",.08],
 kill:[880,.21,"triangle",.16],
 miss:[165,.16,"sawtooth",.10],
 danger:[135,.3,"sawtooth",.16],
 combo:[1060,.25,"triangle",.16],
 wave:[540,.3,"triangle",.12],
 start:[740,.3,"triangle",.12],
 end:[220,.52,"sawtooth",.13],
};
const NOTES=[196,247,294,392,330,294,247,220,196,247,294,440,392,330,294,247];
export class ArcadeAudio{
 constructor({enabled=true,volume=.7,music=true,onStatus=()=>{}}={}){
  this.enabled=enabled;this.music=music;this.volume=volume;this.onStatus=onStatus;
  this.context=null;this.master=null;this.fx=null;this.bgm=null;this.playing=false;this.nextBeat=0;this.beat=0;this.hasGesture=false;
 }
 get state(){return this.context?.state??"locked";}
 get ready(){return this.enabled&&this.context?.state==="running";}
 async unlock(){
  this.hasGesture=true;
  if(!this.enabled){this.onStatus(this.state);return false;}
  try{
   if(!this.context){
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C){this.onStatus("unsupported");return false;}
    this.context=new C();
    this.master=this.context.createGain();this.master.gain.value=this.volume;
    this.fx=this.context.createGain();this.fx.gain.value=.75;
    this.bgm=this.context.createGain();this.bgm.gain.value=.22;
    this.fx.connect(this.master);this.bgm.connect(this.master);this.master.connect(this.context.destination);
   }
   if(this.context.state!=="running")await this.context.resume();
   this.onStatus(this.context.state);
   return this.ready;
  }catch(error){this.onStatus("blocked");return false;}
 }
 setEnabled(value){
  this.enabled=Boolean(value);
  if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.016);
  if(!this.enabled)this.playing=false;
  this.onStatus(this.enabled?(this.ready?"running":"locked"):"muted");
 }
 setVolume(v){
  const next=Number(v);
  if(!Number.isFinite(next))return;
  this.volume=Math.max(0,Math.min(1,next));
  if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.025);
 }
 setMusic(v){this.music=Boolean(v);if(!this.music)this.nextBeat=0;}
 // Synth tone, bounded number of oscillators and self-cleaning audio nodes.
 tone(frequency,duration=.12,wave="triangle",level=.1,{dest=this.fx,at=this.context?.currentTime??0,slide=.78}={}){
  if(!this.ready||!dest)return;
  const c=this.context;
  const oscillator=c.createOscillator(),gain=c.createGain();
  oscillator.type=wave;
  oscillator.frequency.setValueAtTime(Math.max(55,frequency),at);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(55,frequency*slide),at+duration);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(dest);
  oscillator.start(at);oscillator.stop(at+duration+.015);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 }
 effect(name){
  if(!this.ready)return;
  const [freq,duration,wave,volume]=SOUNDS[name]??SOUNDS.hit;
  this.tone(freq,duration,wave,volume);
  if(name==="kill"||name==="combo"){
   this.tone(freq*1.26,duration*.82,"sine",volume*.65,{at:this.context.currentTime+.055});
  }
  if(name==="shot")this.tone(1100,.045,"sine",.055,{at:this.context.currentTime+.025,slide:.55});
 }
 setPlaying(value){
  this.playing=Boolean(value);
  if(this.playing){this.nextBeat=0;this.beat=0;}
 }
 tick(){
  if(!this.playing||!this.music||!this.ready)return;
  const now=this.context.currentTime;
  if(this.nextBeat===0)this.nextBeat=now+.07;
  // Schedule two beats ahead, guarded against runaway loops on background resume.
  for(let i=0;i<3&&this.nextBeat<now+.22;i++){
   const n=this.beat%NOTES.length;
   this.tone(NOTES[n],.20,"triangle",.11,{dest:this.bgm,at:this.nextBeat,slide:1});
   if(n%4===0)this.tone(98,.19,"sine",.12,{dest:this.bgm,at:this.nextBeat,slide:.95});
   if(n%2===0)this.tone(2350,.035,"square",.017,{dest:this.bgm,at:this.nextBeat,slide:.92});
   this.beat++;this.nextBeat+=.24;
  }
  if(this.nextBeat<now-.4)this.nextBeat=now+.07;
 }
}
