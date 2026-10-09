export const DIFFICULTIES = Object.freeze({
 easy: { speed: 0.78, spawn: 2.45, lives: 6, points: 10 },
 normal: { speed: 1, spawn: 1.95, lives: 5, points: 15 },
 hard: { speed: 1.36, spawn: 1.42, lives: 4, points: 20 }
});
export const WORDS = Object.freeze([
 "sky","sun","star","cloud","rain","light","wind","blue","green","gold","dream","bird","flight","plane","wing","pilot","orbit","rocket","river","ocean","forest","island","valley","mountain","earth","sound","music","sound","rhythm","dance","smile","peace","quick","swift","brave","power","focus","skill","craft","bright","shadow","night","morning","sunset","summer","winter","autumn","spring","storm","thunder","spark","flash","glow","comet","meteor","signal","target","victory","hero","level","combo","bonus","laser","radar","shield","energy","engine","speed","launch","rescue","future","pixel","retro","arcade","typing","letter","word","keyboard","screen","magic","wonder","planet","galaxy","nebula","cosmos","travel","adventure","journey","explore","wonderful","horizon","freedom","journey","castle","dragon","knight","legend","sword","quest","crystal","anchor","harbor","sailor","puzzle","garden","flower","yellow","purple","orange","silver","friend","happy","laugh","kind","courage","strong","clever","smart","ranger","wonder","azure","feather","falcon","eagle","swiftly","glider","airship","flight","voyage","beacon","summit","breeze","sailing","glacier","aurora","zenith","cosmic","fighter","mission","defend","defense","attack","wonder","yemen","yards","rise"
]);
export function formatScore(n){return Math.max(0,Math.floor(n)).toString().padStart(6,"0");}
export function accuracy(correct,total){return total?Math.round(100*correct/total):100;}
export function wpm(correct,elapsedSeconds){return elapsedSeconds>0?Math.round(correct/5/(elapsedSeconds/60)):0;}
export function chooseTarget(enemies,letter){return enemies.filter(e=>e.alive&&e.word[0]===letter).sort((a,b)=>a.x-b.x)[0]??null;}
export function validLetter(value){return /^[a-z]$/i.test(value);}
export function award(word,combo,points){return word.length*points+Math.min(20,Math.floor(combo/3))*5;}
export function difficultyFor(name){return DIFFICULTIES[name]??DIFFICULTIES.normal;}
export function nextSpawn(base,wave){return Math.max(.66,base*Math.pow(.92,Math.max(0,wave-1)));}
export function safeBest(raw){const n=Number(raw);return Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(n))):0;}
