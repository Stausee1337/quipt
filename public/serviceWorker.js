
const staticFiles = [
    '/',
    'index.html',
    'manifest.json',
    'quipt-192.png',
    'quipt-512.png',
    'quipt-icon.svg',
    'serviceWorker.js',
    'assets/bootstrap-icons-4d4572ef.woff',
    'assets/bootstrap-icons-bacd70af.woff2',
    'assets/%s',
    'assets/%s'
];

self.addEventListener('install', event => {
    console.log(event);
    event.waitUntil(
        caches.delete('v2').then(() => {
            caches
                .open('v3')
                .then(async cache => {
                    const promises = staticFiles
                        .filter(file => !file.startsWith('assets'))
                        .map(file => cache.delete(file));
                    await Promise.all(promises);
                    cache.addAll(staticFiles);
                });
        })
    )
})

async function cacheThenNetwork(request) {
    const cachedResponse = await caches.match(request, { ignoreSearch: true });
    if (cachedResponse) {
        console.log('Found response in cache:', cachedResponse);
        return cachedResponse;
    }
    console.log('Falling back to network');
    return fetch(request);
}

self.addEventListener('fetch', (event) => {
    console.log(`Handling fetch event for ${event.request.url}`);
    event.respondWith(cacheThenNetwork(event.request));
});

