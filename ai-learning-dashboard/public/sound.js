// AI Skill Shelf: sound. Spoken narration (the browser's speech voice) and soft synthesized
// glass sounds, the same approach as the owner's MPOB dashboard. No audio files are needed.
// Sound is on by default but only ever starts after the visitor clicks something.
(() => {
  'use strict';
  const KEY = 'shelf-sound';
  let on = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();
  let ctx = null;
  const audio = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  // A short glassy tone: pitch glides from f1 to f2 and fades out.
  function tone(f1, f2, dur, gain = 0.05, type = 'sine', delay = 0) {
    if (!on) return;
    try {
      const c = audio(); if (c.state === 'suspended') c.resume();
      const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  }
  const sfx = {
    open() { tone(784, 1175, 0.42, 0.045); tone(1175, 1568, 0.5, 0.03, 'sine', 0.07); },
    close() { tone(659, 392, 0.28, 0.03); },
    tap() { tone(1320, 990, 0.09, 0.022, 'triangle'); },
    step() { tone(523, 784, 0.3, 0.03); }
  };

  // Speech: prefer a natural-sounding English voice when the device has one.
  const speech = 'speechSynthesis' in window;
  let voice = null;
  function pickVoice() {
    if (!speech) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^en/i.test(v.lang) && /natural|neural|aria|jenny|libby|sonia|samantha|daniel|google uk|google us/i.test(v.name))
      || vs.find(v => /^en-(GB|US)/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (speech) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }

  // say(text, {onstart, onend}) returns false when it could not speak (sound off or no speech).
  function say(text, { onstart, onend } = {}) {
    if (!on || !speech) { onend?.(); return false; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 1; u.pitch = 1;
    u.onstart = () => onstart?.();
    u.onend = u.onerror = () => onend?.();
    speechSynthesis.speak(u);
    return true;
  }
  function stop() { if (speech) speechSynthesis.cancel(); }

  function set(value) {
    on = value;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
    if (!on) stop();
    document.querySelectorAll('[data-sound-toggle]').forEach(b => {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
      b.title = on ? 'Sound is on' : 'Sound is off';
    });
    document.dispatchEvent(new CustomEvent('shelf-sound', { detail: on }));
  }

  // Words for a skill's narration, written to be heard, not read.
  function narration(s, sources) {
    const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1] : a[0];
    const say = String(s.say || '').replace(/<[^>]*>/g, 'your link').replace(/https?:\/\/\S+/g, 'your link').replace(/\/(?=\w)/g, '');
    const parts = [`${s.title}.`, s.what];
    if (s.members) parts.push(`This pack holds ${s.members.length} skills.`);
    if (s.useFor?.length) parts.push(`It is good for ${list(s.useFor.map(u => u.charAt(0).toLowerCase() + u.slice(1)))}.`);
    if (say) parts.push(`To try it, say: ${say}`);
    if (sources && s.src && sources[s.src]?.repo) parts.push('The install steps are written right here, so you never need to open GitHub.');
    return parts.join(' ');
  }

  window.ShelfSound = { sfx, say, stop, narration, set, get on() { return on; }, get canSpeak() { return speech; }, toggle() { set(!on); if (on) sfx.tap(); } };
  document.addEventListener('click', e => { if (e.target.closest('[data-sound-toggle]')) window.ShelfSound.toggle(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => set(on)); else set(on);
})();
