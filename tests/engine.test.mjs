import test from "node:test";
import assert from "node:assert/strict";
import {WORDS,DIFFICULTIES,accuracy,award,chooseTarget,difficultyFor,formatScore,nextSpawn,safeBest,validLetter,wpm} from "../src/engine.js";
test("dictionary contains reference-game words and enough distinct words",()=>{
 assert.ok(["yards","rise","yemen"].every(w=>WORDS.includes(w)));
 assert.ok(new Set(WORDS).size>100);
 assert.ok(WORDS.every(w=>/^[a-z]+$/.test(w)));
});
test("score formatting is six-digit, zero padded",()=>{assert.equal(formatScore(57),"000057");assert.equal(formatScore(-7),"000000");assert.equal(formatScore(1234567),"1234567");});
test("accuracy is deterministic and safe at zero",()=>{assert.equal(accuracy(0,0),100);assert.equal(accuracy(9,10),90);assert.equal(accuracy(7,13),54);});
test("wpm uses five-character standard",()=>{assert.equal(wpm(0,0),0);assert.equal(wpm(50,60),10);assert.equal(wpm(125,30),50);});
test("target chooses closest eligible enemy",()=>{
 const targets=[{word:"wave",x:700,alive:true},{word:"wing",x:300,alive:true},{word:"wind",x:200,alive:false},{word:"sun",x:100,alive:true}];
 assert.equal(chooseTarget(targets,"w").word,"wing");
 assert.equal(chooseTarget(targets,"s").word,"sun");
 assert.equal(chooseTarget(targets,"p"),null);
});
test("target selection does not mutate array",()=>{const a=[{word:"wind",x:400,alive:true},{word:"wing",x:200,alive:true}];chooseTarget(a,"w");assert.equal(a[0].word,"wind");});
test("typing rejects commands, spaces and non-Latin glyphs",()=>{for(const c of ["a","B","z"])assert.ok(validLetter(c));for(const c of ["1"," ","Enter","é",""])assert.equal(validLetter(c),false);});
test("difficulty configuration has increasing challenge",()=>{assert.ok(DIFFICULTIES.easy.speed<DIFFICULTIES.normal.speed);assert.ok(DIFFICULTIES.normal.speed<DIFFICULTIES.hard.speed);assert.ok(DIFFICULTIES.easy.lives>DIFFICULTIES.hard.lives);assert.equal(difficultyFor("bad"),DIFFICULTIES.normal);});
test("scoring rewards word length and combo",()=>{assert.equal(award("sky",1,15),45);assert.ok(award("sky",12,15)>award("sky",1,15));assert.ok(award("planet",1,15)>award("sky",1,15));});
test("spawn interval accelerates but cannot become too short",()=>{assert.equal(nextSpawn(2,1),2);assert.ok(nextSpawn(2,8)<2);assert.ok(nextSpawn(2,100)>=.66);});
test("high-score reading tolerates corruption or malicious values",()=>{assert.equal(safeBest(null),0);assert.equal(safeBest("garbage"),0);assert.equal(safeBest("-5"),0);assert.equal(safeBest("987.7"),987);assert.equal(safeBest("Infinity"),0);});
