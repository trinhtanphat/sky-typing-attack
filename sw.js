const CACHE="skytype-cache-v2";
const FILES=["./","./index.html","./styles.css","./src/engine.js","./src/game.js","./src/fingers.js","./src/audio.js","./favicon.svg","./manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
// Network first prevents permanent stale game code after a Pages deployment, but offline play stays available.
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const res=await fetch(req);
   if(res.ok)await cache.put(req,res.clone());
   return res;
  }catch(err){
   const cached=await cache.match(req);
   if(cached)return cached;
   if(req.mode==="navigate"){const home=await cache.match("./index.html");if(home)return home;}
   throw err;
  }
 })());
});