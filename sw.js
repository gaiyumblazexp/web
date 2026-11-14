const K='zyvora-v1',A=['index.html','style.css','core.js','manifest.json','icon-192.png'];
self.addEventListener('install',x=>x.waitUntil(caches.open(K).then(c=>c.addAll(A))));
self.addEventListener('fetch',x=>{if(x.request.method!='GET'||!x.request.url.startsWith(self.location.origin))return;x.respondWith(fetch(x.request).then(r=>{const c=r.clone();caches.open(K).then(h=>h.put(x.request,c));return r}).catch(()=>caches.match(x.request)))});
