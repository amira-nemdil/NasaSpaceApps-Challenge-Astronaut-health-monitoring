// App shell only. API responses are never intercepted or cached here.
const CACHE = 'astropulse-shell-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const response = await fetch('/');
      if (!response.ok) throw new Error('App shell unavailable');
      const html = await response.clone().text();
      const assets = [
        ...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
      ].map((match) => match[1]);
      await cache.addAll([
        ...new Set([...assets, '/favicon.svg', '/manifest.webmanifest']),
      ]);
      await cache.put('/', response);
    }),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('astropulse-shell-') && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put('/', response.clone());
          }
          return response;
        })
        .catch(() => caches.match('/')),
    );
  } else if (
    url.pathname.startsWith('/assets/') ||
    ['/favicon.svg', '/manifest.webmanifest'].includes(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        // Public same-origin assets are identical across Origin header variations.
        const saved = await cache.match(event.request, { ignoreVary: true });
        if (saved) return saved;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      }),
    );
  }
});
