/* Golden Tiger offline support: keeps the app on the phone after the first visit. */
var CACHE='golden-tiger-v1';
var ASSETS=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-512.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;if(req.method!=='GET')return;
  var url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    /* network first (so updates arrive), cached copy after 3.5 s or when offline */
    e.respondWith(new Promise(function(resolve){
      var done=false;
      function fromCache(){return caches.match('./index.html');}
      var timer=setTimeout(function(){fromCache().then(function(r){if(r&&!done){done=true;resolve(r);}});},3500);
      fetch(req).then(function(res){
        if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});}
        if(!done){done=true;clearTimeout(timer);resolve(res);}
      }).catch(function(){
        fromCache().then(function(r){if(!done){done=true;clearTimeout(timer);resolve(r||Response.error());}});
      });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function(r){
    return r||fetch(req).then(function(res){
      if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
      return res;
    });
  }));
});
