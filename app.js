const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Работает всегда, даже без GSAP ---------- */

// Шапка: фон после начала прокрутки, прячется при прокрутке вниз
let lastY = 0;
addEventListener('scroll', () => {
  const h = $('.header');
  h.classList.toggle('solid', scrollY > 40);
  h.classList.toggle('hide', scrollY > lastY && scrollY > 400);
  lastY = scrollY;
}, { passive: true });

// Плавный переход по ссылкам (CSS scroll-behavior: smooth ломает ScrollTrigger)
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const el = document.querySelector(a.getAttribute('href'));
  if (el) { e.preventDefault(); el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
}));

// «Открыто сейчас» по времени Оренбурга (UTC+5): Пн–Чт 8–22, Пт–Вс 8–24
(() => {
  const now = new Date(Date.now() + 5 * 3600e3);
  const day = now.getUTCDay(), h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const close = day >= 1 && day <= 4 ? 22 : 24;
  const open = h >= 8 && h < close;
  const st = $('.status');
  st.classList.toggle('closed', !open);
  st.querySelector('.status-text').textContent = open
    ? `Открыто до ${close === 24 ? '00:00' : '22:00'}`
    : 'Сейчас закрыто, откроемся в 8:00';
  $$('.hours tr').forEach(tr => tr.classList.toggle('today', tr.dataset.days.split(',').includes(String(day))));
})();

// Вкладки меню
$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  const i = +tab.dataset.tab;
  $$('.tab').forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); });
  $$('.panel').forEach((p, k) => p.classList.toggle('on', k === i));
  if (window.gsap && !reduce) gsap.from($$('.panel.on li'), { y: 16, opacity: 0, stagger: 0.05, duration: 0.45, ease: 'power3.out' });
}));

// Деления циферблата
$('.clock .ticks').innerHTML = Array.from({ length: 12 }, (_, i) =>
  `<line x1="100" y1="${i % 3 ? 16 : 14}" x2="100" y2="${i % 3 ? 24 : 30}" transform="rotate(${i * 30} 100 100)"/>`).join('');
const setClock = min => {
  $('.hand-h').setAttribute('transform', `rotate(${(min / 720) * 360} 100 100)`);
  $('.hand-m').setAttribute('transform', `rotate(${min * 6} 100 100)`);
  const m = Math.round(min / 10) * 10 % 1440;
  $('.clock-time').textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
setClock(480);

// Лимонады: цвет стакана и фона
const flavors = $$('.flavors li');
let curFlavor = -1;
const setFlavor = i => {
  if (i === curFlavor) return;
  curFlavor = i;
  $('.lab').style.setProperty('--c', flavors[i].dataset.c);
  flavors.forEach((f, k) => f.classList.toggle('on', k === i));
  $('.cup-name').textContent = flavors[i].textContent;
  if (window.gsap && !reduce) gsap.fromTo('.cup-box', { rotate: -7 }, { rotate: 0, duration: 1, ease: 'elastic.out(1, .4)' });
};
flavors.forEach((f, i) => { f.addEventListener('click', () => setFlavor(i)); f.addEventListener('mouseenter', () => setFlavor(i)); });
setFlavor(0);

// Без GSAP или при «уменьшить движение» – статично, лимонады листаются сами
if (!window.gsap || !window.ScrollTrigger || reduce) {
  document.documentElement.classList.add('no-gsap');
  let k = 0;
  setInterval(() => setFlavor(++k % flavors.length), 2200);
} else {
  motion();
}

/* ---------- Моушн ---------- */
function motion() {
  gsap.registerPlugin(ScrollTrigger);
  const small = innerWidth < 700;

  const splitWords = el => {
    const esc = w => w.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    el.innerHTML = el.innerHTML.replace(/<small[\s\S]*<\/small>/, m => (el._small = m, ''));
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w"><span>${esc(w)}</span></span>`).join(' ') + (el._small || '');
    return el.querySelectorAll('.w > span');
  };

  // 1. Первый экран: буквы ZERNO выпрыгивают, карточки падают на стол
  gsap.timeline({ delay: 2 })
    .from('.big-word span', { yPercent: 110, rotate: 12, duration: 1, ease: 'back.out(1.6)', stagger: 0.08 }, 0)
    .from('.status', { opacity: 0, y: 20, duration: 0.6 }, 0)
    .from('.hero-sub, .hero .btns', { opacity: 0, y: 30, stagger: 0.12, duration: 0.8, ease: 'power3.out' }, 0.4)
    .from('.hc', { y: -260, opacity: 0, rotate: () => gsap.utils.random(-30, 30), duration: 1.1, ease: 'bounce.out', stagger: 0.18 }, 0.2)
    .from('.beans i', { scale: 0, duration: 0.8, ease: 'back.out(3)', stagger: 0.08 }, 0.8);

  gsap.to('.beans i', { rotation: '+=40', yoyo: true, repeat: -1, duration: 3, ease: 'sine.inOut', stagger: 0.4 });
  if (fine) {
    const items = $$('[data-depth]');
    addEventListener('mousemove', e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      items.forEach(el => gsap.to(el, { x: x * el.dataset.depth, y: y * el.dataset.depth, duration: 1.1, ease: 'power3.out' }));
    });
  }
  // Карточки разъезжаются при прокрутке
  const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hc1', { xPercent: -25, yPercent: -10, rotate: -14, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hc2', { xPercent: 25, yPercent: 10, rotate: 12, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hc3', { yPercent: 40, ease: 'none', scrollTrigger: heroST });
  gsap.to('.big-word', { letterSpacing: '0.3em', opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true } });

  // 2. Бегущая строка ускоряется от скорости прокрутки
  const mq = gsap.to('.mq-in', { xPercent: -50, repeat: -1, duration: 30, ease: 'none' });
  let boost = 0;
  ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 250, 8); } });
  gsap.ticker.add(() => { boost *= 0.93; mq.timeScale(1 + boost); });

  // 3. Заголовки по словам, подписи проявляются
  $$('.split').forEach(h => gsap.from(splitWords(h), { yPercent: 115, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('section:not(.hero) .kicker, .lead').forEach(el => gsap.from(el, { opacity: 0, y: 20, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 90%' } }));

  // 4. Циферблат: стрелки бегут с 8:00 до полуночи
  const t = { m: 480 };
  gsap.to(t, { m: 1440, ease: 'none', onUpdate: () => setClock(t.m), scrollTrigger: { trigger: '.breakfast', start: 'top 70%', end: 'bottom 30%', scrub: 0.5 } });
  gsap.from('.clock', { scale: 0.6, rotate: -90, opacity: 0, duration: 1.2, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.breakfast', start: 'top 75%' } });
  gsap.from('.breakfast .price-list li', { x: 40, opacity: 0, stagger: 0.07, duration: 0.6, scrollTrigger: { trigger: '.breakfast .price-list', start: 'top 85%' } });

  // 5. Кухня: секция закрепляется, карточки едут вбок и выпрямляются
  const track = $('.k-track');
  const dist = () => track.scrollWidth - innerWidth;
  const hs = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.kitchen', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
  $$('.k-card').forEach((c, i) => {
    gsap.from(c, { rotate: i % 2 ? 10 : -10, yPercent: i % 2 ? 14 : -14, scale: 0.85, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: hs, start: 'left right', end: 'center 60%', scrub: true } });
  });

  // 6. Меню
  gsap.from('.tab', { y: 30, opacity: 0, stagger: 0.07, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '.tabs', start: 'top 88%' } });
  gsap.from('.panels', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.panels', start: 'top 90%' } });

  // 7. Лимонады: секция закрепляется, вкусы сменяются по прокрутке
  ScrollTrigger.create({
    trigger: '.lab', start: 'top top', end: () => '+=' + innerHeight * 2.4, pin: true, invalidateOnRefresh: true,
    onUpdate: s => setFlavor(Math.min(flavors.length - 1, Math.floor(s.progress * flavors.length)))
  });
  gsap.from('.cup-box', { y: 200, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.lab', start: 'top 70%' } });

  // 8. Бабл-ти: шарики-вкусы выпрыгивают
  gsap.from('.chips span', { scale: 0, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'back.out(2.4)', scrollTrigger: { trigger: '.chips', start: 'top 88%' } });

  // 9. Десерты раскрываются веером
  const k = small ? 0.5 : 1;
  const fan = [[-15, -200, 30], [-5, -68, 0], [5, 68, 0], [15, 200, 30]];
  $$('.fan img').forEach((img, i) => {
    const [r, x, y] = fan[i];
    gsap.fromTo(img, { rotate: 0, x: 0, y: 0 }, { rotate: r, x: x * k, y: y * k, ease: 'none', scrollTrigger: { trigger: '.sweets', start: 'top 80%', end: 'center 50%', scrub: true } });
  });

  // 10. Контакты
  gsap.fromTo('.map', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.contacts', start: 'top 65%' } });
  gsap.from('.hours tr, .contacts dl > div, .contacts .btns', { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, scrollTrigger: { trigger: '.contacts', start: 'top 65%' } });

  // Магнитные кнопки
  if (fine) $$('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.3 });
    });
    b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, .4)' }));
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
