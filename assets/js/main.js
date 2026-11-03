/* Clínica Montesinos — interacción y movimiento (GSAP + ScrollTrigger + SplitText + Lenis) */
(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------------- Scroll suave (Lenis) ---------------- */
  let lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger, SplitText);
  if (!reduce && typeof window.Lenis !== 'undefined' && hasGSAP) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.__lenis = lenis;

  const headerH = () => (window.innerWidth < 760 ? 72 : 80);
  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -headerH() + 1, duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = id === '#top' || id === '#inicio' ? 0 : document.querySelector(id);
      if (el === null) return;
      e.preventDefault();
      closeMobile();
      scrollToTarget(el);
    });
  });

  /* ---------------- Cabecera ---------------- */
  const header = $('.site-header');
  let lastY = 0;
  const onScroll = (y) => {
    header.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY && y > 240;
    if (!header.classList.contains('menu-open')) header.classList.toggle('is-hidden', goingDown);
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  // Submenús
  const subs = $$('.has-sub');
  const closeSubs = (except) => subs.forEach((li) => {
    if (li === except) return;
    li.classList.remove('is-open');
    li.querySelector('button').setAttribute('aria-expanded', 'false');
  });
  subs.forEach((li) => {
    const btn = li.querySelector('button');
    const open = () => { closeSubs(li); li.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
    btn.addEventListener('click', () => (li.classList.contains('is-open') ? closeSubs() : open()));
    if (finePointer) {
      let t;
      li.addEventListener('mouseenter', () => { clearTimeout(t); open(); });
      li.addEventListener('mouseleave', () => { t = setTimeout(() => closeSubs(), 160); });
    }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.has-sub')) closeSubs(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSubs(); closeMobile(); closeWa(); } });

  // Menú móvil
  const burger = $('.burger');
  const mobile = $('#mobile-menu');
  function closeMobile() {
    if (!mobile || mobile.hidden) return;
    mobile.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    header.classList.remove('menu-open');
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    lenis && lenis.start();
  }
  burger.addEventListener('click', () => {
    if (!mobile.hidden) return closeMobile();
    mobile.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    header.classList.add('menu-open', 'is-scrolled');
    document.body.classList.add('menu-open');
    header.classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
    lenis && lenis.stop();
    if (hasGSAP && !reduce) gsap.from(mobile.querySelectorAll('.mm-link, .mm-foot > *'), { y: 24, opacity: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' });
  });
  mobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobile));

  /* ---------------- Selector de áreas ---------------- */
  const areasUI = $('[data-areas]');
  const areas = $$('[data-area]', areasUI);
  const panel = $('.areas-panel-inner');
  const mqDesktop = window.matchMedia('(min-width: 901px)');
  let current = null;

  // envolver el contenido para animar la altura en móvil
  areas.forEach((li) => {
    const d = li.querySelector('.area-detail');
    const inner = document.createElement('div');
    inner.className = 'area-detail-inner';
    while (d.firstChild) inner.appendChild(d.firstChild);
    d.appendChild(inner);
  });

  const fillPanel = (li, animate) => {
    const html = li.querySelector('.area-detail-inner').innerHTML;
    if (!animate || !hasGSAP || reduce) { panel.innerHTML = `<div class="area-detail">${html}</div>`; return; }
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      rotateY: -8, opacity: 0, y: 10, duration: 0.22, ease: 'power2.in',
      onComplete: () => {
        panel.innerHTML = `<div class="area-detail">${html}</div>`;
        const img = panel.querySelector('img');
        img && img.removeAttribute('loading');
        gsap.fromTo(panel, { rotateY: 8, opacity: 0, y: 10 }, { rotateY: 0, opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
        gsap.from(panel.querySelectorAll('img, p, a'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
      },
    });
  };

  const setMobileHeights = (instant) => {
    areas.forEach((li) => {
      const d = li.querySelector('.area-detail');
      const open = li === current;
      if (mqDesktop.matches) { d.style.height = ''; return; }
      if (!hasGSAP || reduce || instant) { d.style.height = open ? 'auto' : '0px'; return; }
      gsap.to(d, { height: open ? 'auto' : 0, duration: 0.6, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
    });
  };

  const activate = (li, animate = true) => {
    if (!mqDesktop.matches && li === current && animate) {
      // en móvil, tocar la abierta la cierra
      current = null;
    } else {
      if (li === current && mqDesktop.matches) return;
      current = li;
    }
    areas.forEach((a) => {
      const on = a === current;
      a.classList.toggle('is-active', on);
      a.querySelector('.area-btn').setAttribute('aria-expanded', String(on));
    });
    if (mqDesktop.matches && current) fillPanel(current, animate);
    else setMobileHeights(!animate);
  };

  areas.forEach((li) => {
    const btn = li.querySelector('.area-btn');
    btn.addEventListener('click', () => activate(li));
    if (finePointer) btn.addEventListener('mouseenter', () => mqDesktop.matches && activate(li));
  });
  activate(areas[0], false);
  mqDesktop.addEventListener('change', () => {
    if (!current) current = areas[0];
    areas.forEach((a) => a.classList.toggle('is-active', a === current));
    if (mqDesktop.matches) fillPanel(current, false);
    setMobileHeights(true);
  });

  // Inclinación 3D del panel con el ratón
  if (finePointer && hasGSAP && !reduce) {
    const wrap = $('.areas-panel');
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(panel, { rotateY: x * 7, rotateX: -y * 7, duration: 0.8, ease: 'power3.out' });
      const img = panel.querySelector('img');
      img && gsap.to(img, { x: x * 22, y: y * 22, z: 40, duration: 0.8, ease: 'power3.out' });
    });
    wrap.addEventListener('pointerleave', () => {
      gsap.to(panel, { rotateY: 0, rotateX: 0, duration: 1, ease: 'power3.out' });
      const img = panel.querySelector('img');
      img && gsap.to(img, { x: 0, y: 0, z: 0, duration: 1, ease: 'power3.out' });
    });
  }

  /* ---------------- Opiniones ---------------- */
  const slides = $$('.op-slide');
  const cur = $('.op-cur');
  const bar = $('.op-progress span');
  const stage = $('.op-stage');
  let idx = 0;
  let timer = null;
  const DURATION = 9;
  const show = (n, dir = 1) => {
    const prev = slides[idx];
    idx = (n + slides.length) % slides.length;
    const next = slides[idx];
    cur.textContent = idx + 1;
    if (!hasGSAP || reduce) {
      prev.classList.remove('is-active'); next.classList.add('is-active');
    } else {
      gsap.to(prev, { opacity: 0, y: -16 * dir, duration: 0.45, ease: 'power2.in', onComplete: () => { prev.classList.remove('is-active'); gsap.set(prev, { clearProps: 'all' }); } });
      next.classList.add('is-active');
      const p = next.querySelector('p');
      gsap.set(next, { opacity: 1, y: 0 });
      if (!p._split) p._split = new SplitText(p, { type: 'lines', linesClass: 'op-line', mask: 'lines' });
      gsap.fromTo(p._split.lines, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'power4.out', delay: 0.35 });
      gsap.fromTo(next.querySelector('footer'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.6, ease: 'power3.out' });
    }
    restart();
  };
  const restart = () => {
    if (!hasGSAP || reduce) return;
    timer && timer.kill();
    gsap.set(bar, { scaleX: 0 });
    timer = gsap.to(bar, { scaleX: 1, duration: DURATION, ease: 'none', onComplete: () => show(idx + 1) });
  };
  $('.op-next').addEventListener('click', () => show(idx + 1, 1));
  $('.op-prev').addEventListener('click', () => show(idx - 1, -1));
  stage.addEventListener('mouseenter', () => timer && timer.pause());
  stage.addEventListener('mouseleave', () => timer && timer.resume());
  let sx = null;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  /* ---------------- WhatsApp ---------------- */
  const waFab = $('.wa-fab');
  const waPanel = $('#wa-panel');
  const mbar = $('.mbar');
  const isSheet = () => window.innerWidth <= 760;
  let waOpener = null;
  function closeWa() {
    if (waPanel.hidden) return;
    const done = () => { waPanel.hidden = true; mbar && mbar.classList.remove('is-hidden-by-wa'); waOpener && waOpener.focus({ preventScroll: true }); };
    [waFab, $('.mbar-wa')].forEach((b) => b && b.setAttribute('aria-expanded', 'false'));
    if (hasGSAP && !reduce) {
      gsap.to(waPanel, isSheet()
        ? { yPercent: 100, duration: 0.28, ease: 'power2.out', onComplete: done }
        : { opacity: 0, scale: 0.96, y: 8, duration: 0.18, ease: 'power2.out', onComplete: done });
    } else done();
    lenis && lenis.start();
  }
  function openWa(opener) {
    if (!waPanel.hidden) return closeWa();
    waOpener = opener;
    waPanel.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    if (hasGSAP && !reduce) {
      if (isSheet()) gsap.fromTo(waPanel, { yPercent: 100, opacity: 1, scale: 1, y: 0 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' });
      else gsap.fromTo(waPanel, { opacity: 0, scale: 0.95, y: 10, yPercent: 0 }, { opacity: 1, scale: 1, y: 0, duration: 0.26, ease: 'power3.out' });
    }
    if (isSheet()) lenis && lenis.stop();
    setTimeout(() => $('#wa-nombre').focus({ preventScroll: true }), 260);
  }
  waFab.addEventListener('click', () => openWa(waFab));
  const mbarWa = $('.mbar-wa');
  mbarWa && mbarWa.addEventListener('click', () => openWa(mbarWa));
  $('.wa-close').addEventListener('click', closeWa);
  document.addEventListener('pointerdown', (e) => {
    if (!waPanel.hidden && !e.target.closest('.wa') && !e.target.closest('.mbar')) closeWa();
  });

  // Barra inferior en móvil: aparece tras la portada, se aparta en el pie
  if (mbar) {
    const heroEl = $('.hero');
    const footer = $('.site-footer');
    const io = new IntersectionObserver(() => {
      const heroOut = heroEl.getBoundingClientRect().bottom < window.innerHeight * 0.35;
      const footIn = footer.getBoundingClientRect().top < window.innerHeight * 0.9;
      mbar.classList.toggle('is-on', heroOut && !footIn);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(heroEl); io.observe(footer);
    const tick = () => {
      const heroOut = heroEl.getBoundingClientRect().bottom < window.innerHeight * 0.35;
      const footIn = footer.getBoundingClientRect().top < window.innerHeight * 0.9;
      mbar.classList.toggle('is-on', heroOut && !footIn);
    };
    if (lenis) lenis.on('scroll', tick); else window.addEventListener('scroll', tick, { passive: true });
  }

  $('.wa-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nombre = f.nombre.value.trim();
    const tel = f.telefono.value.trim();
    const ok = nombre && tel.replace(/\D/g, '').length >= 9 && f.privacidad.checked;
    $('.wa-error').hidden = !!ok;
    if (!ok) return;
    const msg = `Hola, soy ${nombre} (tel. ${tel}). Os escribo desde la web para consultar mi caso`;
    window.open(`https://wa.me/34963953385?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });

  /* ================= MOVIMIENTO ================= */
  if (!hasGSAP) return;

  // Contador (también con movimiento reducido: va directo al valor)
  const counter = $('[data-count]');

  if (reduce) {
    counter.textContent = counter.dataset.count;
    restart();
    return;
  }

  // Las líneas se calculan con la tipografía ya cargada
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  gsap.set('.hero-copy', { autoAlpha: 0 });
  fontsReady.then(startMotion);

  function startMotion() {
  gsap.set('.hero-copy', { autoAlpha: 1 });

  /* --- Hero: entrada --- */
  const h1 = $('.hero h1');
  const split = new SplitText(h1, { type: 'lines', mask: 'lines' });
  const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 });
  heroTl
    .from(split.lines, { yPercent: 115, duration: 1.3, stagger: 0.09 })
    .from('[data-hero]', { y: 22, opacity: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out' }, 0.3)
    .from('.hero-stage', { scale: 0.9, autoAlpha: 0, duration: 1.8, ease: 'expo.out' }, 0)
    .from('.hero-floor', { scaleX: 0.4, opacity: 0, duration: 1.8, ease: 'expo.out' }, 0.2)
    .from('.branch', { opacity: 0, duration: 2.4, ease: 'power2.out' }, 0);

  if (finePointer) {
    // Botones magnéticos
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.5, ease: 'power3.out' });
      });
      b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .45)' }));
    });
  }

  // El texto del hero se aleja suavemente al hacer scroll
  gsap.to('.hero-grid', {
    yPercent: -14, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* --- Foto de la clínica que se abre desde el círculo (firma) --- */
  const isMobile = window.innerWidth < 760;
  gsap.timeline({
    scrollTrigger: { trigger: '.reveal-photo', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
  })
    .fromTo('.reveal-frame', { clipPath: `circle(${isMobile ? 30 : 16}% at 50% 50%)` }, { clipPath: 'circle(75% at 50% 50%)', ease: 'power2.inOut', duration: 1 }, 0)
    .fromTo('.reveal-frame img', { scale: 1.3 }, { scale: 1, ease: 'power2.out', duration: 1 }, 0)
    .to('.reveal-caption', { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.75);

  /* --- Entradas de cada sección (título, texto, imagen) --- */
  $$('[data-reveal]').forEach((el) => {
    const kids = el.children.length > 1 && !el.matches('a, .btn') ? [...el.children] : [el];
    gsap.from(kids, {
      y: 30, opacity: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  $$('[data-split]').forEach((el) => {
    if (el === h1) return;
    const s = new SplitText(el, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, {
      yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  /* --- Enfoque: panel que sube y fotos con profundidad --- */
  gsap.from('.ph-team', {
    yPercent: 10, rotateX: 10, transformPerspective: 1200, transformOrigin: '50% 100%', ease: 'none',
    scrollTrigger: { trigger: '.enfoque-photos', start: 'top bottom', end: 'bottom 70%', scrub: 0.8 },
  });
  gsap.from('.ph-laura', {
    yPercent: 22, ease: 'none',
    scrollTrigger: { trigger: '.enfoque-photos', start: 'top bottom', end: 'bottom 75%', scrub: 0.8 },
  });
  gsap.from('.pillars .petal', {
    rotate: -140, scale: 0.4, opacity: 0, duration: 1.4, stagger: 0.12, ease: 'expo.out',
    scrollTrigger: { trigger: '.pillars', start: 'top 85%', once: true },
  });

  /* --- Vídeo: se despliega en 3D --- */
  gsap.fromTo('.nosabes-frame',
    { rotateX: 16, scale: 0.86, y: 60 },
    { rotateX: 0, scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.nosabes', start: 'top bottom', end: 'top 15%', scrub: 0.8 } });
  gsap.fromTo('.nosabes-video', { scale: 1.2 }, {
    scale: 1, ease: 'none', scrollTrigger: { trigger: '.nosabes', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* --- Áreas: los nombres entran uno a uno --- */
  gsap.from('.area', {
    x: -30, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out',
    scrollTrigger: { trigger: '.areas-list', start: 'top 85%', once: true },
  });
  gsap.from('.areas-panel-inner', {
    rotateY: -18, rotateX: 6, opacity: 0, x: 40, duration: 1.4, ease: 'expo.out', transformPerspective: 1200,
    scrollTrigger: { trigger: '.areas-ui', start: 'top 80%', once: true },
  });

  /* --- Experiencia: obturador sobre la foto + contador --- */
  gsap.timeline({ scrollTrigger: { trigger: '.exp-media', start: 'top 80%', once: true } })
    .fromTo('.exp-photo', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 28px 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 28px 28px)', duration: 1.3, ease: 'expo.inOut' })
    .fromTo('.exp-photo img', { scale: 1.15 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.2)
    .from('.exp-badge', { scale: 0.6, opacity: 0, rotate: -60, duration: 1.2, ease: 'expo.out' }, 0.7)
    .to({ v: 0 }, {
      v: +counter.dataset.count, duration: 1.6, ease: 'power2.out',
      onUpdate() { counter.textContent = Math.round(this.targets()[0].v); },
    }, 0.8);
  gsap.from('.exp-list li', {
    y: 24, opacity: 0, duration: 1, stagger: 0.09, ease: 'power3.out',
    scrollTrigger: { trigger: '.exp-list', start: 'top 85%', once: true },
  });

  /* --- Duda: foto con paralaje --- */
  gsap.fromTo('.duda-bg', { yPercent: -8 }, {
    yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.duda', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* --- Opiniones: arrancar el carrusel al entrar --- */
  const firstP = slides[0].querySelector('p');
  firstP._split = new SplitText(firstP, { type: 'lines', mask: 'lines' });
  gsap.set(firstP._split.lines, { yPercent: 110 });
  ScrollTrigger.create({
    trigger: '.opiniones', start: 'top 70%', once: true,
    onEnter: () => {
      gsap.to(firstP._split.lines, { yPercent: 0, duration: 1, stagger: 0.05, ease: 'power4.out' });
      restart();
    },
  });
  gsap.to('.op-iso', {
    rotate: 120, ease: 'none', scrollTrigger: { trigger: '.opiniones', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* --- Aseguradoras: fichas que giran al entrar --- */
  gsap.from('.seg-lead > *, .seg-marquee', {
    y: 26, opacity: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.seg-board', start: 'top 85%', once: true },
  });

  /* --- Pie: el isotipo y la palabra --- */
  gsap.from('.ft-iso', {
    rotate: -120, scale: 0.6, ease: 'none',
    scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'top 30%', scrub: 0.8 },
  });
  gsap.from('.ft-word', {
    xPercent: 8, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'top 30%', scrub: 0.8 },
  });

  ScrollTrigger.refresh();
  window.addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
