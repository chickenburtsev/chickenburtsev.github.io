/* Vladimir Burtsev — portfolio · shared behaviour (no external libraries).
   Progressive enhancement: every section is readable without JS. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var CFG = window.VB_CONFIG || { RESEARCH: [] };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* ---------- theme toggle (key kept from the previous site: vb-theme) ---------- */
  var tbtn = d.getElementById('themeBtn');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function syncThemeBtn() {
    if (!tbtn) return;
    var dark = currentTheme() === 'dark';
    tbtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }
  if (tbtn) {
    syncThemeBtn();
    tbtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('vb-theme', next); } catch (e) {}
      syncThemeBtn();
    });
  }

  /* ---------- sticky nav border ---------- */
  var nav = d.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- language switch keeps the current anchor ---------- */
  d.querySelectorAll('a[data-lang-switch]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (location.hash) a.href = a.getAttribute('href').split('#')[0] + location.hash;
    });
  });

  /* ---------- links from assets/config.js ---------- */
  if (CFG.COCOFLY_URL) {
    d.querySelectorAll('[data-link="cocofly"]').forEach(function (a) {
      a.href = CFG.COCOFLY_URL; a.target = '_blank'; a.rel = 'noopener';
    });
    d.querySelectorAll('[data-link-text="cocofly"]').forEach(function (el) {
      try { el.textContent = new URL(CFG.COCOFLY_URL).host; } catch (e) { el.textContent = CFG.COCOFLY_URL; }
    });
  }
  var rmap = {};
  (CFG.RESEARCH || []).forEach(function (r) { rmap[r.id] = r.url; });
  d.querySelectorAll('[data-research]').forEach(function (a) {
    var url = rmap[a.getAttribute('data-research')];
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
    else {
      a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true');
      var lbl = a.querySelector('[data-label]');
      if (lbl && a.dataset.na) lbl.textContent = a.dataset.na;
    }
  });

  /* ---------- reveal on scroll ---------- */
  var rv = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (x) { io.observe(x); });
  } else {
    rv.forEach(function (x) { x.classList.add('on'); });
  }

  /* ---------- neuromap ---------- */
  var nmRoot = d.getElementById('nm');
  var nmDataEl = d.getElementById('nm-data');
  if (nmRoot && nmDataEl) {
    try { neuromap(nmRoot, JSON.parse(nmDataEl.textContent)); } catch (e) { if (window.console) console.error(e); }
  }

  function neuromap(host, D) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var stage = host.querySelector('.nm-stage');
    var panel = host.querySelector('.nm-panel');
    var zbar = host.querySelector('.nm-zones');
    var Z = {}, N = {}, order = [];
    D.zones.forEach(function (z) { Z[z.id] = z; z.kids = []; });
    D.nodes.forEach(function (n) {
      N[n.id] = n; n.adj = [];
      if (n.hub) Z[n.z].hub = n; else Z[n.z].kids.push(n);
    });
    D.zones.forEach(function (z) { order.push(z.hub); z.kids.forEach(function (k) { order.push(k); }); });
    // edges: implicit spokes (child → own hub) + explicit cross links
    var E = [];
    D.zones.forEach(function (z) { z.kids.forEach(function (k) { E.push({ a: k, b: z.hub, x: false }); }); });
    D.edges.forEach(function (p) { if (N[p[0]] && N[p[1]]) E.push({ a: N[p[0]], b: N[p[1]], x: true }); });
    E.forEach(function (e) { e.a.adj.push(e.b); e.b.adj.push(e.a); });

    // positions (normalised) — desktop 3×3, mobile 2×4
    var POS = {
      d: { W: 1000, H: 620, care: [.15, .19], co: [.5, .15], qa: [.85, .19], in: [.17, .53], md: [.5, .5], out: [.83, .53], kn: [.33, .85], ops: [.7, .86] },
      m: { W: 420, H: 800, co: [.29, .1], qa: [.77, .12], in: [.25, .37], md: [.75, .36], care: [.25, .63], out: [.75, .62], kn: [.27, .88], ops: [.75, .88] }
    };
    var mode = null, svg, gE, gN, tip, pulseLayer, sel = null, pulses = [], raf = 0, visible = false, lastSpawn = 0;

    // zone chips
    D.zones.forEach(function (z) {
      var b = d.createElement('button');
      b.type = 'button'; b.style.setProperty('--c', 'var(' + z.c + ')');
      b.innerHTML = '<i></i>' + esc(z.l);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { select(z.hub, true); });
      z.btn = b; zbar.appendChild(b);
    });

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function el(tag, attrs, parent) {
      var x = d.createElementNS(SVGNS, tag);
      for (var k in attrs) x.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(x);
      return x;
    }

    function layout(m) {
      var P = POS[m], W = P.W, H = P.H, mob = m === 'm';
      D.zones.forEach(function (z) {
        var h = z.hub, p = P[z.id];
        h.x = p[0] * W; h.y = p[1] * H;
        var n = z.kids.length;
        var R = (mob ? 46 : 60) + n * (mob ? 2.3 : 3.1);
        var gap = 70 * Math.PI / 180;                // keep the sector under the hub free for its label
        var span = 2 * Math.PI - gap, a0 = Math.PI / 2 + gap / 2;
        z.kids.forEach(function (k, i) {
          var a = a0 + span * (n === 1 ? .5 : i / (n - 1));
          var rr = R * (i % 2 ? 1.08 : .94);
          k.x = h.x + Math.cos(a) * rr; k.y = h.y + Math.sin(a) * rr * (mob ? .9 : .78);
          k.hx = k.x; k.hy = k.y;
        });
      });
      // light relaxation so no two dots overlap
      var all = D.nodes, minC = mob ? 21 : 24, minH = mob ? 30 : 36, pad = 14;
      for (var it = 0; it < 90; it++) {
        for (var i = 0; i < all.length; i++) for (var j = i + 1; j < all.length; j++) {
          var a = all[i], b = all[j];
          if (a.hub && b.hub) continue;
          var md = (a.hub || b.hub) ? minH : minC;
          var dx = b.x - a.x, dy = b.y - a.y, dd = Math.sqrt(dx * dx + dy * dy) || .01;
          if (dd < md) {
            var push = (md - dd) / 2, ux = dx / dd, uy = dy / dd;
            if (!a.hub) { a.x -= ux * push; a.y -= uy * push; }
            if (!b.hub) { b.x += ux * push; b.y += uy * push; }
          }
        }
        all.forEach(function (n) {
          if (n.hub) return;
          n.x += (n.hx - n.x) * .04; n.y += (n.hy - n.y) * .04;
          n.x = Math.max(pad, Math.min(W - pad, n.x)); n.y = Math.max(pad, Math.min(H - pad, n.y));
        });
      }
      return P;
    }

    function build() {
      var m = stage.clientWidth < 640 ? 'm' : 'd';
      if (m === mode) return;
      mode = m;
      var P = layout(m), mob = m === 'm';
      stage.innerHTML = '';
      svg = el('svg', { viewBox: '0 0 ' + P.W + ' ' + P.H, role: 'group', tabindex: '0', 'aria-label': D.ui.aria, 'aria-describedby': 'nm-panel' });
      stage.appendChild(svg);
      gE = el('g', {}, svg); pulseLayer = el('g', {}, svg); gN = el('g', {}, svg);
      E.forEach(function (e) {
        e.el = el('line', { x1: e.a.x.toFixed(1), y1: e.a.y.toFixed(1), x2: e.b.x.toFixed(1), y2: e.b.y.toFixed(1), class: 'nm-e' + (e.x ? ' x' : '') }, gE);
        e.el.style.setProperty('--c', 'var(' + Z[(e.a.hub ? e.a : e.b).z].c + ')');
      });
      D.nodes.forEach(function (n) {
        var g = el('g', { class: 'nm-n' + (n.hub ? ' hub' : ''), 'data-id': n.id }, gN);
        g.style.setProperty('--c', 'var(' + Z[n.z].c + ')');
        el('circle', { class: 'hit', cx: n.x, cy: n.y, r: mob ? 15 : 14 }, g);
        el('circle', { class: 'dot', cx: n.x, cy: n.y, r: n.hub ? (mob ? 11 : 12) : (mob ? 5.5 : 6) }, g);
        if (n.hub) {
          var t = el('text', { class: 'nm-lbl', x: n.x, y: n.y + (mob ? 30 : 33), 'text-anchor': 'middle' }, g);
          t.textContent = n.s || n.l;
        }
        g.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') select(n, false); });
        g.addEventListener('click', function () { select(n, true); });
        n.g = g;
      });
      tip = el('text', { class: 'nm-tip', x: 0, y: 0, 'text-anchor': 'middle', visibility: 'hidden' }, svg);
      svg.addEventListener('keydown', onKey);
      svg.addEventListener('pointerleave', function () { if (pinned) select(pinned, true, true); });
      if (sel) { var s = sel; sel = null; select(s, true, true); }
    }

    var pinned = null;
    function select(n, pin, silent) {
      if (!n) return;
      if (pin) pinned = n;
      if (sel === n && !silent) { showTip(n); return; }
      sel = n;
      host.classList.add('focus');
      var nb = {}; n.adj.forEach(function (a) { nb[a.id] = 1; });
      if (n.hub) Z[n.z].kids.forEach(function (k) { nb[k.id] = 1; });
      D.nodes.forEach(function (m) {
        if (!m.g) return;
        m.g.classList.toggle('on', m === n);
        m.g.classList.toggle('nb', !!nb[m.id]);
      });
      E.forEach(function (e) {
        if (!e.el) return;
        var hit = e.a === n || e.b === n;
        e.el.classList.toggle('hl', hit);
        if (hit) e.el.style.setProperty('--c', 'var(' + Z[n.z].c + ')');
      });
      D.zones.forEach(function (z) { z.btn.setAttribute('aria-pressed', z.id === n.z ? 'true' : 'false'); });
      showTip(n);
      renderPanel(n);
    }
    function showTip(n) {
      if (!tip) return;
      if (n.hub) { tip.setAttribute('visibility', 'hidden'); return; }
      var W = POS[mode].W;
      tip.textContent = n.l;
      var anchor = n.x < W * .18 ? 'start' : (n.x > W * .82 ? 'end' : 'middle');
      tip.setAttribute('text-anchor', anchor);
      tip.setAttribute('x', (anchor === 'start' ? n.x - 6 : anchor === 'end' ? n.x + 6 : n.x).toFixed(1));
      var below = n.y > Z[n.z].hub.y + 4;             // keep clear of the hub label, which sits under the hub
      tip.setAttribute('y', (below ? n.y + 22 : n.y - 13).toFixed(1));
      tip.setAttribute('visibility', 'visible');
    }
    function renderPanel(n) {
      var z = Z[n.z];
      var rel = n.adj.filter(function (a, i, arr) { return arr.indexOf(a) === i; });
      if (n.hub) rel = z.kids.concat(rel.filter(function (a) { return a.z !== n.z; }));
      panel.style.setProperty('--c', 'var(' + z.c + ')');
      panel.innerHTML = '<span class="z"><i></i>' + esc(z.l) + '</span><h5>' + esc(n.l) + '</h5><p>' + esc(n.d) + '</p>' +
        (rel.length ? '<span class="rel">' + esc(D.ui.rel) + '</span><div class="rels">' + rel.map(function (r) {
          return '<button type="button" data-go="' + esc(r.id) + '">' + esc(r.l) + '</button>';
        }).join('') + '</div>' : '');
      panel.querySelectorAll('[data-go]').forEach(function (b) {
        b.addEventListener('click', function () { select(N[b.getAttribute('data-go')], true); });
      });
    }
    function onKey(ev) {
      var k = ev.key, i = sel ? order.indexOf(sel) : -1;
      if (k === 'ArrowRight' || k === 'ArrowDown') { ev.preventDefault(); select(order[(i + 1) % order.length], true); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { ev.preventDefault(); select(order[(i - 1 + order.length) % order.length], true); }
      else if (k === 'Home') { ev.preventDefault(); select(order[0], true); }
      else if (k === 'Escape') { reset(); }
    }
    function reset() {
      sel = pinned = null; host.classList.remove('focus');
      D.nodes.forEach(function (m) { if (m.g) m.g.classList.remove('on', 'nb'); });
      E.forEach(function (e) { if (e.el) e.el.classList.remove('hl'); });
      D.zones.forEach(function (z) { z.btn.setAttribute('aria-pressed', 'false'); });
      if (tip) tip.setAttribute('visibility', 'hidden');
      panel.style.removeProperty('--c');
      panel.innerHTML = D.ui.intro;
      panel.querySelectorAll('[data-go]').forEach(function (b) {
        b.addEventListener('click', function () { select(N[b.getAttribute('data-go')], true); });
      });
    }

    // impulses travelling along the main pipeline (only while visible, never with reduced motion)
    var FLOW = (D.flow || []).map(function (p) { return [N[p[0]], N[p[1]]]; }).filter(function (p) { return p[0] && p[1]; });
    function tick(ts) {
      raf = 0;
      if (!visible || reduced || d.hidden || !pulseLayer) return;
      if (ts - lastSpawn > 420 && pulses.length < 7 && FLOW.length) {
        lastSpawn = ts;
        var f = FLOW[Math.floor(Math.random() * FLOW.length)];
        pulses.push({ a: f[0], b: f[1], t0: ts, dur: 1500 + Math.random() * 900, el: el('circle', { class: 'nm-pulse', r: mode === 'm' ? 2.6 : 3 }, pulseLayer) });
      }
      pulses = pulses.filter(function (p) {
        var t = (ts - p.t0) / p.dur;
        if (t >= 1) { p.el.remove(); return false; }
        var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        p.el.setAttribute('cx', (p.a.x + (p.b.x - p.a.x) * e).toFixed(1));
        p.el.setAttribute('cy', (p.a.y + (p.b.y - p.a.y) * e).toFixed(1));
        p.el.setAttribute('opacity', (Math.sin(Math.PI * t) * .9).toFixed(2));
        return true;
      });
      raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && visible && !reduced) raf = requestAnimationFrame(tick); }

    reset();
    build();
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        var before = mode; build();
        if (before !== mode) { pulses.forEach(function (p) { p.el.remove(); }); pulses = []; }
      }).observe(stage);
    } else window.addEventListener('resize', build);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }, { threshold: .15 }).observe(stage);
    }
    d.addEventListener('visibilitychange', kick);
  }
})();
