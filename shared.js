/* Código compartido por index.html, menu.html y admin.html */
const POLARIS = (() => {
  const SUPABASE_URL = 'https://plwmvqdztejlfjbjzfjv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_QUBbXk2KJkCnr-ddVVGJRQ_2sdwK4VQ'; // clave pública, es seguro que esté aquí

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Solo se permiten enlaces https:// (y rutas locales img/...). Todo lo demás se descarta.
  const safeHttps = u => { try { const x = new URL(String(u || '').trim()); return x.protocol === 'https:' && x.hostname.includes('.') && !x.username && !x.password ? x.href : ''; } catch (e) { return ''; } };
  const safeImg = u => { u = String(u || '').trim(); return /^img\/[A-Za-z0-9_.\/-]+$/.test(u) && !u.includes('..') ? u : safeHttps(u); };
  const initial = name => (String(name || '').trim().charAt(0) || '?').toUpperCase();

  // "2500" -> "$2.500" · "2.500" -> "$2.500" · "A consultar" se deja igual
  function fmtPrice(p) {
    p = String(p || '').trim();
    if (/^\d+$/.test(p)) return '$' + Number(p).toLocaleString('es-CL');
    if (/^[\d.,]+$/.test(p)) return '$' + p;
    return p;
  }

  /* ---- datos: base de datos con respaldo en clients.json ---- */
  async function fromDb(id) {
    const get = async pid => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(pid)}&select=*`,
        { headers: { apikey: SUPABASE_KEY }, signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error('db ' + r.status);
      return (await r.json())[0] || null;
    };
    let p = await get(id);
    if (p && p.same_as) p = (await get(p.same_as)) || p;
    return p;
  }
  async function fromSnapshot(id) {
    const data = await (await fetch('clients.json?v=' + Date.now())).json();
    let p = data[id];
    if (p && p.same_as) p = data[p.same_as] || p;
    return p || null;
  }
  async function getProfile(id) {
    try { return await fromDb(id); } catch (e) { return await fromSnapshot(id); }
  }

  /* ---- tema por negocio: { accent: '#rrggbb', mode: 'light' | 'dark' } ---- */
  const DEFAULT_ACCENT = '#1e40af';
  const BASE = {
    light: { bg: '#faf7f2', surface: '#ffffff', text: '#1c1917', muted: '#57534e', line: '#e3dbcf' },
    dark: { bg: '#141210', surface: '#1f1c19', text: '#f5f1ea', muted: '#b4ada6', line: '#3a3530' }
  };
  const isHex = h => /^#[0-9a-f]{6}$/i.test(String(h || ''));
  const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb2hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  // Aclara u oscurece un color hasta que tenga el contraste mínimo contra el fondo
  function ensure(c, bg, min) {
    const target = lum(bg) > .35 ? [0, 0, 0] : [255, 255, 255];
    for (let t = 0; t <= 1.001; t += .04) { const m = mix(c, target, t); if (ratio(m, bg) >= min) return m; }
    return target;
  }
  function themeVars(theme) {
    const t = theme || {};
    const mode = t.mode === 'dark' ? 'dark' : 'light';
    const b = BASE[mode], bg = hex2rgb(b.bg);
    let accent = hex2rgb(isHex(t.accent) ? t.accent : DEFAULT_ACCENT);
    const white = [255, 255, 255], ink = hex2rgb('#1c1917');
    const on = ratio(accent, white) >= ratio(accent, ink) ? white : ink;
    let fill = ratio(accent, on) >= 4.5 ? accent : ensure(accent, on, 4.5);
    if (ratio(fill, bg) < 1.6) fill = ensure(fill, bg, 1.6); // que el botón no se pierda en el fondo
    const onFill = ratio(fill, white) >= ratio(fill, ink) ? white : ink;
    return {
      mode,
      '--bg': b.bg, '--surface': b.surface, '--text': b.text, '--muted': b.muted, '--line': b.line,
      '--accent': rgb2hex(fill), '--on-accent': rgb2hex(onFill),
      '--accent-ink': rgb2hex(ensure(accent, bg, 4.5)),
      '--accent-soft': rgb2hex(mix(accent, bg, mode === 'dark' ? .78 : .88))
    };
  }
  function applyTheme(theme, el = document.documentElement) {
    const v = themeVars(theme);
    for (const k in v) if (k.startsWith('--')) el.style.setProperty(k, v[k]);
    el.dataset.mode = v.mode;
    el.style.colorScheme = v.mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = v['--bg'];
  }

  return { SUPABASE_URL, SUPABASE_KEY, DEFAULT_ACCENT, esc, safeHttps, safeImg, initial, fmtPrice, getProfile, isHex, themeVars, applyTheme };
})();
