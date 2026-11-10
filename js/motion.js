/* motion engine: reveals, words, curtains, stacks, lane, panel, menu, map */
(function () {
  var d = document, h = d.documentElement, W = window;
  h.classList.add('m-ready');
  var on = h.classList.contains('m-on');
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* fixed strip + header height */
  var top = d.querySelector('.top');
  var setTop = function () { h.style.setProperty('--top-h', top.offsetHeight + 'px'); };
  if (top) { setTop(); if ('ResizeObserver' in W) new ResizeObserver(setTop).observe(top); }

  /* menu */
  var bt = d.querySelector('.burger');
  var setMenu = function (o) { bt.setAttribute('aria-expanded', o ? 'true' : 'false'); h.classList.toggle('menu-open', o); };
  if (bt) {
    bt.addEventListener('click', function () { setMenu(bt.getAttribute('aria-expanded') !== 'true'); });
    d.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && h.classList.contains('menu-open')) { setMenu(false); bt.focus(); } });
  }

  /* map on click */
  d.querySelectorAll('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.map'), f = d.createElement('iframe');
      f.src = box.getAttribute('data-src'); f.title = 'Карта: Your Story, ул. Гоголя, 26';
      f.setAttribute('allowfullscreen', ''); f.loading = 'lazy';
      box.innerHTML = ''; box.appendChild(f); box.classList.add('map-live');
    });
  });

  if (!on) return;

  /* words: H1 / H2 rise from under a mask */
  var n = 0;
  var wrap = function (el, step) {
    Array.prototype.slice.call(el.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var fr = d.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { fr.appendChild(d.createTextNode(t)); return; }
          var w = d.createElement('span'), i = d.createElement('span');
          w.className = 'w'; i.className = 'wi'; i.style.setProperty('--wd', (n++ * step) + 'ms');
          i.textContent = t; w.appendChild(i); fr.appendChild(w);
        });
        c.parentNode.replaceChild(fr, c);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') wrap(c, step);
    });
  };
  d.querySelectorAll('[data-split]').forEach(function (el) {
    n = 0; el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    wrap(el, el.tagName === 'H1' ? 70 : 60);
    if (!el.hasAttribute('data-rv')) el.setAttribute('data-rv', 'words');
  });

  /* stagger index from parent */
  d.querySelectorAll('[data-stagger]').forEach(function (p) {
    var k = 0; Array.prototype.forEach.call(p.children, function (c) { if (c.hasAttribute('data-rv')) c.style.setProperty('--i', k++); });
  });

  /* marks: captions assemble from noise (aria-hidden twin) */
  var GL = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ·+/×';
  d.querySelectorAll('[data-marks]').forEach(function (el) {
    var txt = el.textContent;
    el.textContent = '';
    var r = d.createElement('span'); r.className = 'mk-real'; r.textContent = txt;
    var t = d.createElement('span'); t.className = 'mk-twin'; t.setAttribute('aria-hidden', 'true');
    el.appendChild(r); el.appendChild(t); el.classList.add('mk', 'run');
    if (!el.parentNode.closest('[data-rv]')) el.setAttribute('data-rv', 'marks');
    el._marks = function () {
      var s = performance.now(), dur = 700;
      var tick = function (now) {
        var p = clamp((now - s) / dur), k = Math.floor(p * txt.length), out = '';
        for (var j = 0; j < txt.length; j++) out += j < k || txt[j] === ' ' ? txt[j] : GL[(Math.random() * GL.length) | 0];
        t.textContent = out;
        if (p < 1) requestAnimationFrame(tick); else { el.classList.remove('run'); t.textContent = ''; }
      };
      requestAnimationFrame(tick);
    };
  });

  /* reveal */
  var els = Array.prototype.slice.call(d.querySelectorAll('[data-rv]'));
  var show = function (el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el._marks) el._marks();
    if (el.getAttribute('data-rv') === 'photo') {
      var done = function () { el.classList.add('done'); };
      el.addEventListener('transitionend', function (e) { if (e.target === el && e.propertyName === 'clip-path') done(); });
      setTimeout(done, 1700);
    }
    var m = el.querySelectorAll('[data-marks]'); for (var q = 0; q < m.length; q++) show(m[q]);
  };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && h.classList.contains('go')) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (e) { io.observe(e); });
  var sweep = function () {
    if (!h.classList.contains('go')) return;
    var H = innerHeight;
    els.forEach(function (e) { if (!e.classList.contains('in') && e.getBoundingClientRect().top < H) show(e); });
  };
  ['load', 'hashchange', 'beforeprint'].forEach(function (ev) { W.addEventListener(ev, sweep); });

  /* light-up paragraph */
  var lights = [];
  d.querySelectorAll('[data-light]').forEach(function (p) {
    var ws = []; var txt = p.textContent.trim(); p.textContent = '';
    txt.split(/\s+/).forEach(function (t, i) {
      var s = d.createElement('span'); s.className = 'lw'; s.textContent = t; p.appendChild(s); ws.push(s);
      if (i < 999) p.appendChild(d.createTextNode(' '));
    });
    lights.push({ p: p, ws: ws });
  });

  /* lane: scroll-driven horizontal track (>=900 only) */
  var lane = d.querySelector('[data-lane]'), mq = matchMedia('(min-width: 900px)'), dist = 0;
  var track = lane && lane.querySelector('.lane-track'), bar = lane && lane.querySelector('.lane-bar i');
  var setLane = function () {
    if (!lane) return;
    if (mq.matches) {
      h.classList.add('lane-on');
      dist = Math.max(0, track.scrollWidth - track.parentNode.clientWidth);
      lane.style.height = 'calc(' + dist + 'px + 100svh)';
    } else { h.classList.remove('lane-on'); lane.style.height = ''; track.style.transform = ''; }
  };

  /* final panel */
  var panel = d.querySelector('[data-panel]');

  /* cursor (fine pointer only) */
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var spot = d.querySelector('.spot'), tilts = d.querySelectorAll('[data-tilt]');
  if (fine) {
    var mx = 0, my = 0, mt = false;
    W.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!mt) { mt = true; requestAnimationFrame(function () {
        mt = false;
        if (spot) spot.style.transform = 'translate3d(' + (mx - 300) + 'px,' + (my - 300) + 'px,0)';
        tilts.forEach(function (t) {
          var r = t.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) return;
          var x = (mx - r.left - r.width / 2) / innerWidth, y = (my - r.top - r.height / 2) / innerHeight;
          t.style.transform = 'perspective(900px) rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)';
        });
      }); }
    }, { passive: true });
    if (spot) spot.classList.add('spot-on');
  }

  /* scroll loop: one rAF per scroll burst */
  var ticking = false;
  var frame = function () {
    ticking = false;
    var H = innerHeight;
    sweep();
    lights.forEach(function (L) {
      var r = L.p.getBoundingClientRect(), p = clamp((H * 0.9 - r.top) / (H * 0.55)), k = p * L.ws.length;
      L.ws.forEach(function (w, i) { w.classList.toggle('lit', i < k); });
    });
    if (lane && h.classList.contains('lane-on')) {
      var r = lane.getBoundingClientRect(), span = lane.offsetHeight - H, p = span > 0 ? clamp(-r.top / span) : 0;
      track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    }
    if (panel) {
      var pr = panel.getBoundingClientRect(), pp = clamp((H - pr.top) / (H * 0.6));
      panel.style.setProperty('--fx', (48 * (1 - pp)).toFixed(1) + 'px');
    }
  };
  var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  W.addEventListener('scroll', req, { passive: true });
  W.addEventListener('resize', function () { setLane(); req(); });
  W.addEventListener('load', function () { setLane(); req(); });
  if (mq.addEventListener) mq.addEventListener('change', function () { setLane(); req(); });

  /* hero intro: start 300 ms after DOMContentLoaded */
  var start = function () { setLane(); setTimeout(function () { h.classList.add('go'); frame(); }, 300); };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
