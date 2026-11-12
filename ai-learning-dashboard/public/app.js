// Installation is offered only when the browser can handle it.
(() => {
  const floaters = document.getElementById('floaters');
  if (floaters && window.ShelfToys && window.SKILL_DATA) {
    // A still sticker wall: the cartoon category toys scattered at angles around the edges (no motion).
    const spots = [[2,8,84,-12],[9,30,64,10],[3,52,90,-6],[8,76,70,14],[2,92,78,-18],[94,6,80,12],[89,26,66,-10],[96,44,92,8],[90,64,70,-14],[95,86,84,6],[30,95,60,-8],[62,96,66,10],[48,1,58,-6],[20,0,62,12],[78,0,60,-12],[13,56,56,4]];
    const cats = window.SKILL_DATA.categories;
    floaters.innerHTML = spots.map(([x, y, size, r], i) => `<div class="floater sticker" data-cat="${cats[i % cats.length].id}" style="left:${x}%;top:${y}%;--size:${size}px;rotate:${r}deg">${ShelfToys.toy(cats[i % cats.length].id, 'float-toy')}</div>`).join('');
    const libraryIcon = document.querySelector('#tabbar [data-section="library"] svg');
    if (libraryIcon) libraryIcon.outerHTML = ShelfToys.toy('all','nav-toy');
    const guideIcon = document.querySelector('#tabbar [data-guide] svg');
    if (guideIcon) guideIcon.outerHTML = ShelfToys.toy('workflow','nav-toy');
  }
  const button = document.getElementById('install-app');
  let installPrompt;
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    button.disabled = true;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null; button.hidden = true;
    } finally { button.disabled = false; }
  });
  addEventListener('appinstalled', () => { button.hidden = true; installPrompt = null; });
  if ('serviceWorker' in navigator && ['https:', 'http:'].includes(location.protocol)) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Online use remains available if offline storage is blocked.
      document.getElementById('storage-note').textContent = 'Offline mode is unavailable in this browser.';
    });
  }
})();
