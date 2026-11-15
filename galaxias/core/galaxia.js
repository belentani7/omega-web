/* ══════════════════════════════════════════════════════════════════════
   BELENTANI // GALAXIAS — runtime compartido de las 50 páginas.
   Sin dependencias externas. Nunca bloquea la página. Respeta
   prefers-reduced-motion y no interpola datos no confiables en HTML.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SENSES = ['neon', 'matrix', 'venom', 'void', 'ascended'];

  /* Campo de estrellas: rojo sangre cada 7 estrellas (la firma del universo). */
  function starfield(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var S = [], w = 0, h = 0, dpr = 1, t = 0;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(innerWidth * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
    }
    resize();
    addEventListener('resize', resize, { passive: true });
    var N = innerWidth < 700 ? 130 : 240;
    for (var i = 0; i < N; i++) {
      S.push({
        x: Math.random(), y: Math.random(),
        r: (Math.random() * 1.6 + 0.4) * dpr,
        s: (Math.random() * 0.5 + 0.12) * dpr,
        red: i % 7 === 0
      });
    }
    function paint() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < S.length; i++) {
        var p = S[i];
        var tw = 0.35 + 0.65 * Math.abs(Math.sin(t / 90 + i));
        ctx.fillStyle = p.red ? 'rgba(255,0,60,' + tw + ')'
                              : 'rgba(255,255,255,' + (tw * 0.68) + ')';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, 6.2832);
        ctx.fill();
      }
    }
    if (REDUCED) { t = 40; paint(); return; }
    (function frame() {
      t += 1;
      for (var i = 0; i < S.length; i++) {
        S[i].y -= S[i].s / 900;
        if (S[i].y < 0) S[i].y = 1;
      }
      paint();
      requestAnimationFrame(frame);
    })();
  }

  /* Sparks del hero-orbit = las 10 estaciones; la activa brilla en oro. */
  function buildSparks(orbit, estaciones, activa) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < estaciones.length; i++) {
      var s = document.createElement('span');
      s.className = 'spark' + (i === activa ? ' on' : '');
      s.style.setProperty('--a', (i * 36) + 'deg');
      s.style.setProperty('--r', 'calc(var(--r-base, 62%) + ' + (i % 3) * 5 + '%)');
      s.title = estaciones[i][1];
      s.setAttribute('aria-hidden', 'true');
      frag.appendChild(s);
    }
    orbit.appendChild(frag);
  }

  /* Memoria: omega_story guarda las estaciones recorridas (§9 canon). */
  function story(id) {
    try {
      var raw = localStorage.getItem('omega_story');
      var list = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      if (list.indexOf(id) === -1) list.push(id);
      if (list.length > 50) list = list.slice(-50);
      localStorage.setItem('omega_story', JSON.stringify(list));
      return list.length;
    } catch (e) { return 0; }
  }

  function mountGalaxia(cfg) {
    var body = document.body;
    var st = document.getElementById('stars');
    if (st) starfield(st);
    var orbit = document.getElementById('orbit');
    var EST = (window.GALAXIA_I18N && window.GALAXIA_I18N.estaciones) || cfg.estaciones || [];
    if (orbit) buildSparks(orbit, EST, cfg.estacion);
    body.style.setProperty('--beat', cfg.beat + 's');
    document.documentElement.style.setProperty('--hechas', String(story(cfg.id)));

    /* Sentido: 5 paradas = 5 firmas (rojo/verde/púrpura/void/oro). */
    var slider = document.getElementById('sense');
    var out = document.getElementById('sense-out');
    function apply(i, persist) {
      i = Math.max(0, Math.min(SENSES.length - 1, i | 0));
      for (var k = 0; k < SENSES.length; k++) body.classList.remove('sense-' + SENSES[k]);
      body.classList.add('sense-' + SENSES[i]);
      if (slider) slider.value = String(i);
      if (out) out.textContent = SENSES[i].toUpperCase();
      if (persist) { try { localStorage.setItem('omega_sense', String(i)); } catch (e) {} }
    }
    var saved = 0;
    try { saved = parseInt(localStorage.getItem('omega_sense'), 10) || 0; } catch (e) {}
    apply(saved, false);
    if (slider) slider.addEventListener('input', function () { apply(this.value, true); });

    /* i18n: orden fijo PT > ES > EN > CA (regla global del ecosistema).
       No se crean ficheros por idioma: ?lang=xx + hreflang alternates. */
    var LANGS = ['pt', 'es', 'en', 'ca'];
    function langCode() {
      var q = '';
      try { q = new URLSearchParams(location.search).get('lang') || ''; } catch (e) {}
      q = q.toLowerCase();
      if (LANGS.indexOf(q) !== -1) return q;
      var nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
      return LANGS.indexOf(nav) !== -1 ? nav : 'es';
    }
    function langGuardado() {
      try {
        var p = localStorage.getItem('omega_lang') || '';
        return LANGS.indexOf(p) !== -1 ? p : '';
      } catch (e) { return ''; }
    }
    var qlang = '';
    try { qlang = new URLSearchParams(location.search).get('lang') || ''; } catch (e) {}
    var prefs = '';
    try { prefs = localStorage.getItem('omega_lang') || ''; } catch (e) {}
    var lang = LANGS.indexOf(qlang.toLowerCase()) !== -1 ? qlang.toLowerCase()
             : (LANGS.indexOf(prefs) !== -1 ? prefs : langCode());
    applyLang(lang);

    /* Preserva el idioma entre capítulos, incluso con almacenamiento bloqueado. */
    function localLink(href) {
      if (!href) return 'index.html?lang=' + encodeURIComponent(lang);
      return href + (href.indexOf('?') === -1 ? '?' : '&') + 'lang=' + encodeURIComponent(lang);
    }
    var chapterLinks = document.querySelectorAll('a[href]');
    for (var chapterIndex = 0; chapterIndex < chapterLinks.length; chapterIndex++) {
      var anchor = chapterLinks[chapterIndex];
      var href = anchor.getAttribute('href') || '';
      if (/^galaxia-\d{2}\.html$/.test(href) || href === 'index.html') {
        anchor.setAttribute('href', localLink(href));
      }
    }

    /* Entrada original a OMEGA sin editar ni una historia individual. */
    var nav = document.querySelector('.hbar .waveC');
    if (nav && cfg.id !== '00') {
      var omega = document.createElement('a');
      omega.className = 'hn omega-return';
      omega.href = localLink('omega/index.html');
      omega.textContent = '✦ OMEGA';
      omega.setAttribute('aria-label', {
        pt: 'Voltar ao universo imersivo OMEGA',
        es: 'Volver al universo inmersivo OMEGA',
        en: 'Return to the OMEGA immersive universe',
        ca: 'Tornar a l’univers immersiu OMEGA'
      }[lang]);
      nav.insertBefore(omega, nav.querySelector('.wave'));
    }

    /* Teclado: ← anterior · → siguiente · ESC hub · 1-5 sentido. */
    addEventListener('keydown', function (ev) {
      if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
      if (ev.key === 'ArrowLeft' && cfg.prev) location.href = localLink(cfg.prev);
      else if (ev.key === 'ArrowRight' && cfg.next) location.href = localLink(cfg.next);
      else if (ev.key === 'Escape') location.href = localLink('index.html');
      else if ((ev.key === 'o' || ev.key === 'O') && cfg.id !== '00') location.href = localLink('omega/index.html');
      else if (ev.key >= '1' && ev.key <= '5') apply(parseInt(ev.key, 10) - 1, true);
    });

    /* El Ojo late más rápido al acercar el cursor: feedback, no decoración. */
    if (!REDUCED) {
      var eye = document.querySelector('.eye');
      if (eye) eye.addEventListener('pointermove', function () {
        body.style.setProperty('--beat', (cfg.beat * 0.55).toFixed(2) + 's');
      });
      if (eye) eye.addEventListener('pointerleave', function () {
        body.style.setProperty('--beat', cfg.beat + 's');
      });
    }
    window.GALAXIA = { id: cfg.id, firma: cfg.firma, estacion: cfg.estacion,
                       slug: cfg.slug, lang: lang, reduced: REDUCED };
  }

  window.mountGalaxia = mountGalaxia;
  window.omegaStarfield = starfield;
})();
