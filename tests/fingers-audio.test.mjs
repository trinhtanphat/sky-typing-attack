import test from "node:test";
import assert from "node:assert/strict";
import { FINGERS,KEY_ROWS,colorFor,fingerFor,fingerId,keyInfo } from "../src/fingers.js";
import {ArcadeAudio} from "../src/audio.js";
test("all 26 QWERTY keys have exactly one finger",()=>{
 const letters=KEY_ROWS.join("");
 assert.equal(new Set(letters).size,26);
 assert.equal(letters.length,26);
 for(const key of letters){const finger=fingerFor(key);assert.ok(finger,key);assert.ok(finger.keys.includes(key));assert.match(colorFor(key),/^#[a-f0-9]{6}$/i);}
});
test("finger assignment follows standard QWERTY rows",()=>{
 const expected={q:"LP",a:"LP",z:"LP",w:"LR",s:"LR",x:"LR",e:"LM",d:"LM",c:"LM",r:"LI",t:"LI",f:"LI",g:"LI",v:"LI",b:"LI",y:"RI",u:"RI",h:"RI",j:"RI",n:"RI",m:"RI",i:"RM",k:"RM",o:"RR",l:"RR",p:"RP"};
 for(const [key,id] of Object.entries(expected))assert.equal(fingerId(key),id,key);
});
test("finger colors are eight distinct bright colors and case insensitive",()=>{
 assert.equal(new Set(Object.values(FINGERS).map(f=>f.color)).size,8);
 assert.equal(colorFor("W"),colorFor("w"));
 assert.equal(fingerFor("@"),null);
 assert.equal(colorFor("?"),"#ffffff");
});
test("next key follows word index for live guidance",()=>{
 assert.deepEqual(keyInfo("sky",1),{letter:"k",finger:"Giữa phải",color:FINGERS.RM.color,id:"RM"});
 assert.equal(keyInfo("sky",3),null);
 assert.equal(keyInfo("",0),null);
});
test("sound engine is silent before unlock and respects volume and mute",()=>{
 const player=new ArcadeAudio({enabled:true,volume:.7});
 assert.equal(player.ready,false);
 assert.equal(player.state,"locked");
 player.effect("kill");player.tick(); // no external AudioContext needed for unit tests
 player.setVolume(.4);assert.equal(player.volume,.4);
 player.setVolume(8);assert.equal(player.volume,1);
 player.setVolume(-1);assert.equal(player.volume,0);
 player.setEnabled(false);assert.equal(player.enabled,false);
 player.setMusic(false);assert.equal(player.music,false);
 player.setMusic(true);assert.equal(player.music,true);
 player.setPlaying(true);assert.equal(player.playing,true);
 player.setPlaying(false);assert.equal(player.playing,false);
});
