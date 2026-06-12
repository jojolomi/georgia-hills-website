const CACHE_NAME = 'gh-cache-v24';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/arabic.html',
  '/destination.html',
  '/contact.html',
  '/contact-ar.html',
  '/blog.html',
  '/blog-ar.html',
  '/booking.html',
  '/booking-ar.html',
  '/article-georgian-food.html',
  '/article-georgian-food-ar.html',
  '/article-7-days-georgia.html',
  '/article-7-days-georgia-ar.html',
  '/article-is-georgia-safe.html',
  '/services.html',
  '/services-ar.html',
  '/guide.html',
  '/guide-ar.html',
  '/about.html',
  '/about-ar.html',
  '/honeymoon.html',
  '/honeymoon-ar.html',
  '/tbilisi.html',
  '/tbilisi-ar.html',
  '/kazbegi.html',
  '/kazbegi-ar.html',
  '/martvili.html',
  '/martvili-ar.html',
  '/signagi.html',
  '/signagi-ar.html',
  '/style.css',
  '/script.js',
  '/404.html',
  '/legal.html',
  '/favicon.ico',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
  'https://cdn.jsdelivr.net/npm/flatpickr'
];

// 1. INSTALL: Browser downloads and saves the critical files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Clean up old caches (if you update your website)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. FETCH: Intercept network requests
// Strategy: "Stale-While-Revalidate"
// It serves the cached version immediately (fast) AND fetches a new version in the background to update the cache for next time.
self.addEventListener('fetch', (event) => {
  // Skip non-http requests (like chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  // Network-first for page navigations to avoid stale HTML after deployments
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          return cachedPage || caches.match('/index.html');
        })
    );
    return;
  }

  // OPTIMIZATION: For destination.html, ignore query params when matching cache
  // This ensures we serve the cached app shell regardless of the ?id=... param
  const isDestination = event.request.url.includes('/destination.html');

  event.respondWith(
    caches.match(event.request, { ignoreSearch: isDestination }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid responses (not errors)
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, we just rely on what we returned from cache
        // If both fail and it's a navigation request, return the cached home page
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      // Return cached response if found, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
