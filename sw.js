
const CACHE_NAME = 'gym-tracker-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/firebase.ts'
];

const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://cdn.jsdelivr.net/npm/idb@8.0.2/+esm'
];

// Установка: кэшируем оболочку приложения
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell and external assets');
      // Добавляем по одному, чтобы один битый URL не ломал весь кэш
      [...APP_SHELL, ...EXTERNAL_ASSETS].forEach(url => {
        cache.add(url).catch(err => console.warn(`[SW] Failed to cache: ${url}`, err));
      });
      return self.skipWaiting();
    })
  );
});

// Активация: чистим старье
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Основной перехватчик запросов
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Стратегия для навигации (обновление страницы)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Стратегия Stale-While-Revalidate для всех остальных ресурсов
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Кэшируем только успешные ответы
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // В случае ошибки сети (мы оффлайн) просто ничего не делаем, 
        // так как мы уже пытаемся вернуть cachedResponse ниже
      });

      return cachedResponse || fetchPromise;
    })
  );
});
