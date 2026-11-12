// Installation is offered only when the browser can handle it.
(() => {
  const floaters = document.getElementById('floaters');
  if (floaters && window.ShelfToys && window.SKILL_DATA) {
    const spots = [[3,16,76],[91,12,68],[96,49,84],[2,70,70],[78,88,64],[43,94,66]];
    floaters.innerHTML = window.SKILL_DATA.categories.map((cat,i) => {
      const [x,y,size] = spots[i];
      return `<div class="floater" data-cat="${cat.id}" style="left:${x}%;top:${y}%;--size:${size}px;--d:${17+i*2}s;--delay:-${i*3}s;--dx:${i%2?-22:26}px;--dy:${i%2?30:-26}px">${ShelfToys.toy(cat.id,'float-toy')}</div>`;
    }).join('');
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
