const cacheName = 'challengers-route-cache-v1'

const filesToCache = [
    'manifest.json',
    'index.html',
    'markerContent.js',
    'offline.html',
    'css/main.css',
    'icons/icon_small.png',
    'icons/icon_medium.png',
    'icons/icon_large.png',
    'media/ivy_cafe.jpg',
    'media/clay_acrylic_courts.jpg',
    'media/centre_court.jpg',
    'media/icon.png',
    'media/wimbledon_common.jpg',
    'media/wimbledon_museum.jpg',
    'media/aorangi_practice.jpg',
    'media/village_stables.jpg',
    'media/all_england_club.jpg',
    'media/hotel_du_vin.jpg',
    'media/polka_theatre.jpg',
    'media/marker-icon.png',
    'media/wimbledon_park_courts.jpg',
    'media/pharmacy-icon.png',
    'media/no2_court.jpg',
    'media/park-icon.png',
    'media/stadium-icon.png',
    'media/theatre-icon.png',
    'media/wimbledon_station.jpg',
    'media/no1_court.jpg',
    'media/transport-icon.png',
    'media/restaurant-icon.png',
    'media/lodging-icon.png',
    'media/museum-icon.png',
    'media/aeltc_community_courts.jpg',
    'media/cafe-icon.png',
    'media/attraction-icon.png',
    'media/atm-icon.png'
]

// Install the service worker and cache the files in the array filesToCache[]
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                return cache.addAll(filesToCache)
            })
    )
})

// Delete old versions of the cache when a new version is first loaded
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(name => {
                        if (name !== cacheName) {
                            return caches.delete(name)
                        }
                    })
                )
            })
    )
})

// Fetch strategy: Cache first, then online, then offline page
self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request)
            .then(response => {
                if (response) {
                    return response  // file found in cache
                }
                return fetch(e.request)  // file found online
                    .catch(() => {
                        return caches.match('offline.html')  // offline and not in cache
                    })
            })
    )
})