const CACHE = "f1-openf1-dynamic-v10";

// Cache-first for app shell, network-first for OpenF1.
const SHELL = [
	"./",
	"./index.html",
	"./404.html",
	"./manifest.webmanifest",
	"./src/main.js",
	"./src/app/config.js",
	"./src/app/state.js",
	"./src/app/router.js",
	"./src/api/openf1.js",
	"./src/api/scheduler.js",
	"./src/replay/interpolate.js",
	"./src/replay/timeline.js",
	"./src/ui/layout.js",
	"./src/ui/dom.js",
	"./src/ui/toast.js",
	"./src/ui/timingTower.js",
	"./src/ui/driverFocus.js",
	"./src/ui/weather.js",
	"./src/ui/raceControl.js",
	"./src/ui/teamRadio.js",
	"./src/ui/trackMap.js",
	"./src/styles/app.css",
	"./src/styles/tower.css",
	"./src/styles/map.css",
	"./src/styles/components.css"
];

self.addEventListener("install", (evt) => {
	evt.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
	evt.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (evt) => {
	const url = new URL(evt.request.url);

	// OpenF1: network-first; if offline, serve cached; if no cache, serve []
	if (url.origin === "https://api.openf1.org") {
		evt.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				try {
					const res = await fetch(evt.request);
					cache.put(evt.request, res.clone()).catch(() => {});
					return res;
				} catch {
					const cached = await cache.match(evt.request);
					return (
						cached ||
						new Response("[]", {
							status: 200,
							headers: { "Content-Type": "application/json" }
						})
					);
				}
			})()
		);
		return;
	}

	// Everything else: cache-first
	evt.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cached = await cache.match(evt.request);
			if (cached) return cached;
			const res = await fetch(evt.request);
			cache.put(evt.request, res.clone()).catch(() => {});
			return res;
		})()
	);
});
