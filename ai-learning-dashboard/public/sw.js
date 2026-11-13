// AI Skill Shelf moved to https://mukhrizizraf.github.io/ai-learning-dashboard/
// This replaces the old offline worker: it deletes the old cache, removes itself and reloads open pages,
// so phones that installed the old app reach the redirect instead of a cached copy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const key of await caches.keys()) await caches.delete(key);
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
})()));
