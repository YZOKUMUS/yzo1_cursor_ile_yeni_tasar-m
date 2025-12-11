// Service Worker for PWA Support
const CACHE_NAME = 'arapca-ogrenme-v1';

// Install event - Cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Sadece temel dosyaları cache'le, diğerleri runtime'da eklenecek
        return cache.addAll([
          './index.html',
          './styles.css',
          './app.js',
          './manifest.json'
        ].map(url => new Request(url, {cache: 'reload'}))).catch((error) => {
          console.log('Some files failed to cache:', error);
          // Hata olsa bile devam et
          return Promise.resolve();
        });
      })
  );
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini handle et
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache'de varsa döndür
        if (response) {
          return response;
        }
        
        // Cache'de yoksa network'ten al
        return fetch(event.request).then((response) => {
          // Sadece başarılı response'ları cache'le
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Response'u clone'la (bir kez okunabilir)
          const responseToCache = response.clone();
          
          // Cache'e ekle
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // Network ve cache başarısız olursa, index.html'i döndür (SPA için)
        if (event.request.destination === 'document' || 
            event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html')
            .then((response) => response || caches.match('/index.html'))
            .then((response) => response || caches.match('index.html'));
        }
      })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

function syncProgress() {
  // Sync user progress when online
  return Promise.resolve();
}
