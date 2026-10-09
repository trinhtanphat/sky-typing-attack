// Conventional QWERTY touch-typing zones. Each letter is assigned to one finger.
export const FINGERS=Object.freeze({
 LP:{name:"Út trái",color:"#ff8dba",short:"ÚT TRÁI",keys:"qaz"},
 LR:{name:"Áp út trái",color:"#ffbf7a",short:"ÁP ÚT TRÁI",keys:"wsx"},
 LM:{name:"Giữa trái",color:"#ffe58a",short:"GIỮA TRÁI",keys:"edc"},
 LI:{name:"Trỏ trái",color:"#adf2a1",short:"TRỎ TRÁI",keys:"rtfgvb"},
 RI:{name:"Trỏ phải",color:"#80eae7",short:"TRỎ PHẢI",keys:"yuhjnm"},
 RM:{name:"Giữa phải",color:"#86b9ff",short:"GIỮA PHẢI",keys:"ik"},
 RR:{name:"Áp út phải",color:"#bd9cff",short:"ÁP ÚT PHẢI",keys:"ol"},
 RP:{name:"Út phải",color:"#ff9fee",short:"ÚT PHẢI",keys:"p"}
});
const byKey=Object.fromEntries(Object.entries(FINGERS).flatMap(([finger,data])=>[...data.keys].map(key=>[key,finger])));
export const KEY_ROWS=Object.freeze(["qwertyuiop","asdfghjkl","zxcvbnm"]);
export function fingerFor(letter){return FINGERS[byKey[String(letter).toLowerCase()]]??null;}
export function fingerId(letter){return byKey[String(letter).toLowerCase()]??null;}
export function colorFor(letter){return fingerFor(letter)?.color??"#ffffff";}
export function keyInfo(word,index=0){
 const letter=word?.[index]?.toLowerCase()??"";
 const finger=fingerFor(letter);
 return finger?{letter,finger:finger.name,color:finger.color,id:fingerId(letter)}:null;
}
