/* ====================================================
   Birthday Site v4 — App JS
   Vanilla JS SPA: routing, transitions, particles
   Enhanced effects: chromatic aberration, better glitch, energy rings
   ==================================================== */
'use strict';

// ── Utility ──────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function lerp(a,b,t){ return a+(b-a)*t; }

// ── State ─────────────────────────────────────────────
let currentPage = 'hub';
let mouseX = window.innerWidth/2;
let mouseY = window.innerHeight/2;
let pageAccent = '#9b4dca';
let reiIntroSeen = false;
let evaTimer = null; // глобальный таймер Рей — чтобы сбрасываться при выходе со страницы

//── Soul Eater Audio ───────────────────────────────────
let soulEaterAudio = null;
let stardewAudio = null;

function handleSoulEaterAudio(target) {
  if (target !== 'soul-eater' && target !== 'soul-eater-stein' && target !== 'soul-eater-kid') {
    if (soulEaterAudio && !soulEaterAudio.paused) {
      const fadeOut = setInterval(() => {
        soulEaterAudio.volume = Math.max(0, soulEaterAudio.volume - 0.03);
        if (soulEaterAudio.volume <= 0) {
          clearInterval(fadeOut);
          soulEaterAudio.pause();
      soulEaterAudio.currentTime = 0;
    }
  }, 50); // затухает ~0.75 секунды
}
    return;
  }
  if (soulEaterAudio && !soulEaterAudio.paused) return;
  if (!soulEaterAudio) {
    soulEaterAudio = new Audio('./audios/audio-soul-eater.mp3'); // ← вставь свой путь
    soulEaterAudio.loop = true;
  }
  soulEaterAudio.volume = 0;
  soulEaterAudio.play().then(() => {
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.01, 0.45);
      soulEaterAudio.volume = vol;
      if (vol >= 0.45) clearInterval(fadeIn);
    }, 250); // нарастает ~1.8 секунды
  }).catch(() =>  {
    document.addEventListener('click', () => {
      soulEaterAudio.play().then(() => {
        let vol = 0;
        const fadeIn = setInterval(() => {
          vol = Math.min(vol + 0.02, 0.45);
          soulEaterAudio.volume = vol;
          if (vol >= 0.45) clearInterval(fadeIn);
        }, 180);
      });
    }, { once: true });
  });
}

function handleStardewAudio(target) {
  // список id страниц Stardew Valley — замени на свои
  const stardewPages = ['stardew']; // и т.д.

  if (!stardewPages.includes(target)) {
    if (stardewAudio && !stardewAudio.paused) {
      const fadeOut = setInterval(() => {
        stardewAudio.volume = Math.max(0, stardewAudio.volume - 0.03);
        if (stardewAudio.volume <= 0) {
          clearInterval(fadeOut);
          stardewAudio.pause();
          stardewAudio.currentTime = 0;
        }
      }, 50);
    }
    return;
  }

  if (stardewAudio && !stardewAudio.paused) return;

  if (!stardewAudio) {
    stardewAudio = new Audio('./audios/audio-stardew.mp3');
    stardewAudio.loop = true;
    stardewAudio.volume = 0;
  }

  stardewAudio.play().then(() => {
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.01, 0.45);
      stardewAudio.volume = vol;
      if (vol >= 0.45) clearInterval(fadeIn);
    }, 250);
  }).catch(() => {
    document.addEventListener('click', () => {
      stardewAudio.play().then(() => {
        let vol = 0;
        const fadeIn = setInterval(() => {
          vol = Math.min(vol + 0.02, 0.45);
          stardewAudio.volume = vol;
          if (vol >= 0.45) clearInterval(fadeIn);
        }, 180);
      });
    }, { once: true });
  });
}
// ── Router ─────────────────────────────────────────────
const Router = {
  current: 'hub',
  _pendingNav: null,

  navigate(target, clusterEl, clickX, clickY) {
    if (target === this.current) return;
    const prev   = $('page-' + this.current);
    const next   = $('page-' + target);
    if (!next) { console.warn('Unknown page:', target); return; }
    const from   = this.current;
    this.current = target;
    // Сбрасываем transition-canvas на старте КАЖДОГО навигации — на случай зависания
    if (Transitions && Transitions.canvas) {
      Transitions.canvas.style.display = 'none';
      Transitions.busy = false;
    }
    if (from !== 'hub' && target !== 'hub' && target !== 'letter') {
      // Обновляем акцент и частицы при sub-nav переходах
      const accent = next.dataset.accent || '#9b4dca';
      pageAccent = accent;
      CursorSystem.setAccent(accent);
      // Снимаем page-entering с обеих страниц на случай race condition
      prev.classList.remove('page-entering');
      next.classList.remove('page-entering');
      // Стопим частицы ДО glitch — очищаем canvas
      Particles.stop(true);
      Transitions.glitch(prev, next);
      // Запускаем новые частицы после смены
      setTimeout(() => {
        Particles.setPage(next);
        Particles.start();
        RevealObserver.refresh(next);
      }, 500);
      handleSoulEaterAudio(target);
      handleStardewAudio(target);
      return;
    }
    // evaTimer — глобальная переменная — объявлена выше

    function startEvaTimer() {
      if (evaTimer) return; // не запускать ещё раз если уже идёт
      evaTimer = setTimeout(() => {
        evaTimer = null;
        triggerReiInterruption();
      }, 10000);
    }

    function stopEvaTimer() {
      clearTimeout(evaTimer);
      evaTimer = null;
    }

    function triggerReiInterruption() {
      const W = window.innerWidth, H = window.innerHeight;
      let running = true, frame = 0;

      if (!document.querySelector('link[href*="Pirata+One"]')) {
        const lnk = document.createElement('link');
        lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=Pirata+One&display=swap';
        document.head.appendChild(lnk);
      }

      // ─── OVERLAY ───────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.style.cssText = `position:fixed;inset:0;z-index:99999;pointer-events:all;overflow:hidden;`;
      document.body.appendChild(overlay);

      // Canvas помех
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      canvas.style.cssText = `position:absolute;inset:0;`;
      overlay.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // Субтитры (по центру)
      const sub = document.createElement('div');
      sub.style.cssText = `
      position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      z-index:3;pointer-events:none;padding:2rem;opacity:0;
      transition:opacity 0.5s ease;
    `;
      overlay.appendChild(sub);

      // Контейнер для плавающих надписей
      const floatLayer = document.createElement('div');
      floatLayer.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2;`;
      overlay.appendChild(floatLayer);

      // ─── ФАЗА 1: ПОМЕХИ → ЧЁРНЫЙ ──────────────────────────────
      // ─── ФАЗА 1: ПОМЕХИ → ЧЁРНЫЙ (плавно) ────────────────────────
      function drawGlitch() {
          if (!running) return;
          frame++;

          let glitchAlpha;
          if (frame <= 60) {
              glitchAlpha = frame / 60;        // нарастание 0 → 1
          } else {
              glitchAlpha = 1 - (frame - 60) / 40; // затухание 1 → 0
          }
          glitchAlpha = Math.max(0, glitchAlpha);

          ctx.clearRect(0, 0, W, H);
          const bgAlpha = frame <= 60 ? (0.07 + glitchAlpha * 0.93) : 1;
          ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
          ctx.fillRect(0, 0, W, H);

          const count = Math.floor(glitchAlpha * 28);
          for (let i = 0; i < count; i++) {
              const y = Math.random() * H;
              const h = 1 + Math.random() * (2 + glitchAlpha * 18);
              const sx = (Math.random() - 0.5) * glitchAlpha * 90;
              ctx.fillStyle = `rgba(${120+Math.random()*80},0,0,${Math.random()*0.45*glitchAlpha})`;
              ctx.fillRect(sx, y, W, h);
              ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.55*glitchAlpha})`;
              ctx.fillRect(sx - 5, y + 1, W, h * 0.5);
          }
          if (glitchAlpha > 0.4 && Math.random() > 0.93) {
              ctx.fillStyle = `rgba(140,0,0,${Math.random()*0.2*glitchAlpha})`;
              ctx.fillRect(0, 0, W, H);
          }
          if (frame === 60) {
            startAudioPhase();
          }
          if (frame >= 100) {
              running = false;
              return;
          }
          requestAnimationFrame(drawGlitch);
      }
      drawGlitch();

      // ─── ФАЗА 2: АУДИО + СУБТИТРЫ (через 3.2s) ────────────────
      function startAudioPhase() {
        const audio = new Audio('./audios/audio-rei.mp3');
        audio.volume = 1;
        // ── СУБТИТРЫ (подбери time под свой файл) ──
        // [ timeIn, timeOut, text, narrator? ]
        const CUES = [
          [0.0,  2.4,  'Персонаж номер три. Дело Аянами Рей', true ],
          [2.4,  3.7,  'Кто я?'                                     ],
          [3.9,  5.4,  'Аянами Рей'                                ],
          [5.55,  7.35, 'А кто ты?'                                  ],
          [7.6, 8.7, 'Аянами Рей'                                ],
          [9.4, 11.35, 'Ты тоже Аянами Рей?'                       ],
          [11.7, 12.3, 'Да'                                        ],
          [12.45, 15.25, 'Я та, кого знают как Аянами Рей'          ],
          [15.4, 18.2, 'Мы все те, кого знают как Аянами Рей'     ],
          [18.9, 21.9, 'Просто потому что другие зовут нас Аянами Рей'],
        ];
        //от 22 до 39
        // финальная фраза от 39,5
        // ← НАСТРОЙ ЭТИ ДВА ЗНАЧЕНИЯ под длину своего аудио:
        const FLOAT_START  = 22;
        const FINAL_START  = -8;    // за сколько секунд ДО конца показать финал
        //                            (audio.duration + FINAL_START)

        let lastCueIdx = -1;
        let floatPhase = false;
        let endPhase   = false;
        let floatTimer = null;
        const floatEls = [];

        function showSub(text, narrator, final) {
          if (final) {
            sub.style.transition = 'opacity 0.5s ease';
          } else {
            sub.style.transition = 'none';
          }

          if (final) {
            sub.style.opacity = '0';
            setTimeout(() => {
              if (final) {
                sub.innerHTML = `<div style="
                  font-family:'Martel',serif;
                  font-size:clamp(1.1rem,2.8vw,2rem);
                  font-weight:500;
                  color:#ffffff;letter-spacing:0.3em;
                  text-shadow:0 0 30px rgba(255,255,255,0.2), 0 0 60px rgba(180,0,0,0.4);
                  border-top:1px solid rgba(139,0,0,0.4);
                  border-bottom:1px solid rgba(139,0,0,0.4);
                  padding:0.8rem 2rem;
                ">${text}</div>`;
              }
              sub.style.opacity = '1';
            }, 120);
            return;
          }

           if (narrator) {
              sub.innerHTML = `<div style="
                font-family:'Martel',serif;
                font-size:clamp(1.2rem,3vw,2rem);
                font-weight:900;
                color:#ffffff;;letter-spacing:0.3em;text-transform:uppercase;
                text-align:center;line-height:2;
                text-shadow:0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255, 255, 255, 0.5);
              ">Персонаж Номер III<br>Дело Аянами Рей</div>`;
            } else {
            sub.innerHTML = `<div style="
              position:relative;
              font-family:'Martel',serif;
              font-size:clamp(1.6rem,4.5vw,3.4rem);
              font-weight:500;
              color:#ffffff;
              width: 100%;
              text-align: center; 
              letter-spacing:0.15em;line-height:1.3;
              text-shadow:0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(180,0,0,0.5);
            " data-text="${text}">
              ${text}
              <span style="
                position:absolute;inset:0;
                font-family:'Martel',serif;
                font-size:inherit;letter-spacing:inherit;
                color:#fff;opacity:0.06;
                animation:eva-glitch 0.18s steps(1) infinite;
                pointer-events:none;
              ">${text}</span>
            </div>`;
          }

          sub.style.opacity = '1';
        }

        function hideSub(final = false) {
          sub.style.transition = final ? 'opacity 0.5s ease' : 'none';
          sub.style.opacity = '0';
        }
        function spawnFloat() {
          const el = document.createElement('div');
          const x   = Math.random() * 88 + 4;
          const y   = Math.random() * 88 + 4;
          const sz  = (0.7 + Math.random() * 2.2).toFixed(2);
          const rot = ((Math.random() - 0.5) * 28).toFixed(1);
          el.style.cssText = `
            position:absolute;left:${x}%;top:${y}%;
            transform:translate(-50%,-50%) rotate(${rot}deg);
            font-family:'Pirata One',serif;
            font-size:clamp(${sz}rem,${sz*1.8}vw,${sz*1.4}rem);
            color:rgba(255,255,255,${(0.15+Math.random()*0.5).toFixed(2)});
            white-space:nowrap;opacity:0;
            transition:opacity 0.25s ease;
          `;
          el.textContent = 'Аянами Рей';
          floatLayer.appendChild(el);
          floatEls.push(el);
          requestAnimationFrame(() => { el.style.opacity = '1'; });
        }

        function startEndPhase() {
          endPhase = true;
          clearInterval(floatTimer);
          hideSub();

          // Убираем все плавающие надписи
          floatEls.forEach(el => {
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 350);
          });
          floatEls.length = 0;
          setTimeout(() => {
            sub.style.transition = 'opacity 0.5s ease';
            hideSub();
          }, 4500);
          const t0 = audio.currentTime;
          setTimeout(() => showSub('Да', false, true),                                 Math.max(100,  (39.2 - t0) * 1000));
          setTimeout(() => showSub('Я та, кого знают как Аянами Рей', false, true),    Math.max(1200, (40.2 - t0) * 1000));

          
          // Исходящие помехи
          setTimeout(() => {
            let gf = 0;
            let outRunning = true;
            function drawOut() {
              if (!outRunning) return;
              gf++;
              let glitchAlpha;
              if (gf <= 30) {
                  glitchAlpha = gf / 30;
              } else {
                  glitchAlpha = 1 - (gf - 30) / 30;
              }
              glitchAlpha = Math.max(0, glitchAlpha);

              ctx.clearRect(0,0,W,H);
              ctx.fillStyle = `rgba(0,0,0,1)`;
              ctx.fillRect(0,0,W,H);
              for (let i = 0; i < Math.floor(glitchAlpha * 38); i++) {
                  const y = Math.random() * H;
                  const h = 1 + Math.random() * (3 + glitchAlpha * 22);
                  ctx.fillStyle = `rgba(${130+Math.random()*80},0,0,${Math.random()*0.55*glitchAlpha})`;
                  ctx.fillRect((Math.random()-0.5)*glitchAlpha*110, y, W, h);
              }

              if (gf === 30) {
                  doNavigate();  // ← переход на пике помех
              }

              if (gf < 60) {
                  requestAnimationFrame(drawOut);
              } else {
                  outRunning = false;
              }
           }
            drawOut();
          }, 4500);

          // Переход на страницу
          function doNavigate() {
            audio.pause();
            reiIntroSeen = true;
            stopEvaTimer();

            ['eva','eva-asuka','eva-kaworu','eva-misato'].forEach(id => {
              const nav = document.querySelector(`#page-${id} .sub-nav`);
              if (!nav || nav.querySelector('[data-subpage="eva-rei"]')) return;
              const btn = document.createElement('button');
              btn.className = 'sub-nav-btn';
              btn.dataset.subpage = 'eva-rei';
              btn.innerHTML = `<img src="./photos/icon-rei.jpg" alt="Рей"><span>Рей</span>`;
              btn.addEventListener('click', e => {
                Router.navigate('eva-rei', null, e.clientX, e.clientY);
                nav.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const rn = document.querySelector('#page-eva-rei .sub-nav');
                if (rn) rn.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.subpage === 'eva-rei'));
              });
              nav.appendChild(btn);
            });

            // Переключаем страницу пока экран тёмный
            const ap = document.querySelector('.page.active');
            const rp = document.getElementById('page-eva-rei');
            if (ap) ap.classList.remove('active');
            if (rp) {
              rp.classList.add('active');
              rp.scrollTop = 0;
            }
            Router.current = 'eva-rei';
            currentPage = 'eva-rei';
            const rn = document.querySelector('#page-eva-rei .sub-nav');
            if (rn) rn.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.subpage === 'eva-rei'));

            // Теперь плавно убираем оверлей — под ним уже страница Рей
            setTimeout(() => {
              overlay.style.transition = 'opacity 1s ease';
              overlay.style.opacity = '0';
              overlay.style.pointerEvents = 'none';
              setTimeout(() => {
                overlay.remove();
                if (typeof RevealObserver !== 'undefined') RevealObserver.refresh(rp);
              }, 1050);
            });
          }
        }

        // ── СИНХРОНИЗАЦИЯ ──
        audio.addEventListener('timeupdate', () => {
          const t = audio.currentTime;
          const dur = audio.duration || 999;

          // Субтитры (пока не плавающая фаза)
          if (!floatPhase) {
            let found = -1;
            for (let i = 0; i < CUES.length; i++) {
              if (t >= CUES[i][0] && t < CUES[i][1]) { found = i; break; }
            }
            if (found !== lastCueIdx) {
              lastCueIdx = found;
              found >= 0 ? showSub(CUES[found][2], CUES[found][3]) : hideSub();
            }
          }

          // Начало плавающей фазы
          if (!floatPhase && t >= FLOAT_START) {
            floatPhase = true;
            hideSub();
            floatTimer = setInterval(spawnFloat, 320);
          }

          // Финальная фаза
          if (!endPhase && t >= 39.3) {
            startEndPhase();
          }
        });

        // Запасной тригер финала по ended
        audio.addEventListener('ended', () => { if (!endPhase) startEndPhase(); });

        // Автоплей / fallback
        audio.play().catch(() => {
          const tap = document.createElement('div');
          tap.style.cssText = `
              position:absolute;inset:0;display:flex;align-items:center;
              justify-content:center;cursor:pointer;z-index:10;
              font-family:'Pirata One',serif;font-size:clamp(0.9rem,2.5vw,1.3rem);
              color:rgba(180,180,180,0.75);letter-spacing:0.35em;
              opacity:0;transition:opacity 1.2s ease;
          `;
          tap.textContent = '[ нажми для продолжения ]';
          overlay.appendChild(tap);
          requestAnimationFrame(() => { tap.style.opacity = '1'; });
          tap.addEventListener('click', () => { tap.remove(); audio.play(); }, { once: true });
        });

      }
}

    if (['eva', 'eva-asuka', 'eva-kaworu', 'eva-misato'].includes(target) && !reiIntroSeen) {
      startEvaTimer();
    } else {
      stopEvaTimer();
    }

    // Update accent
    const accent = next.dataset.accent || '#9b4dca';
    pageAccent = accent;
    CursorSystem.setAccent(accent);

    // Use scythe slash transition when CursorEngine is available (desktop)
    const cx = clickX || (clusterEl ? clusterEl.getBoundingClientRect().left + clusterEl.getBoundingClientRect().width/2 : window.innerWidth/2);
    const cy = clickY || (clusterEl ? clusterEl.getBoundingClientRect().top + clusterEl.getBoundingClientRect().height/2 : window.innerHeight/2);

    if (window._CursorEngine && window._CursorEngine.spawnNavSlash) {

      window._CursorEngine.spawnNavSlash(cx, cy, () => {
        // ← здесь экран уже перекрыт разрезом — теперь безопасно останавливать
        HubCanvas.stop();
        Particles.stop();

        prev.classList.remove('active');
        next.classList.add('active');

        if (target === 'hub') {
          HubCanvas.start();
        } else {
          Particles.setPage(next);
          Particles.start();
        }

        next.classList.add('page-entering');
        setTimeout(() => next.classList.remove('page-entering'), 2000);
        setTimeout(() => RevealObserver.refresh(next), 60);
        currentPage = target;
        handleSoulEaterAudio(target);
        handleStardewAudio(target)
      });

    } else {
      // Fallback for touch/mobile
      if (target === 'letter') {
        Transitions.fadeBlack(prev, next);
      } else if (from === 'hub') {
        Transitions.particleDissolve(prev, next, clusterEl, accent);
      } else if (target === 'hub') {
        Transitions.reverseGather(prev, next);
      } else {
        Transitions.glitch(prev, next);
      }
      setTimeout(() => RevealObserver.refresh(next), 100);
    }
  }
};

// ── Transitions ────────────────────────────────────────
const Transitions = {
  canvas: null,
  ctx: null,
  busy: false,

  init() {
    this.canvas = $('transition-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  _show(from, to) {
    from.classList.remove('active');
    to.classList.add('active');
  },

  // Hub → Section: dramatic particle explosion
  particleDissolve(from, to, clusterEl, accentColor) {
    if (this.busy) { this._show(from, to); return; }
    this.busy = true;
    this.canvas.style.display = 'block';

    const W = this.canvas.width, H = this.canvas.height;
    const ctx = this.ctx;
    let ox = W/2, oy = H/2;
    if (clusterEl) {
      const r = clusterEl.getBoundingClientRect();
      ox = r.left + r.width/2;
      oy = r.top  + r.height/2;
    }
    const c = hexToRgb(accentColor || '#9b4dca');
    const colorStr = `rgb(${c.r},${c.g},${c.b})`;

    const N = 420;
    const pts = Array.from({length:N}, () => {
      const a = Math.random()*Math.PI*2;
      const spd = 3 + Math.random()*12;
      return { x:ox, y:oy, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd - Math.random()*2,
               sz:1+Math.random()*4, life:0, maxLife:35+Math.random()*35 };
    });

    let phase = 0; // 0=scatter 1=reform
    let frame = 0;
    const SCATTER = 48, REFORM = 40;

    const draw = () => {
      ctx.clearRect(0,0,W,H);

      if (phase === 0) {
        ctx.fillStyle = `rgba(6,6,15,${frame/SCATTER * 0.96})`;
        ctx.fillRect(0,0,W,H);

        // chromatic aberration effect during scatter
        if (frame > 5 && frame < 30) {
          const intensity = Math.sin((frame-5)/25 * Math.PI) * 0.15;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = intensity;
          // Red shift
          pts.forEach(p => {
            if (p.life >= p.maxLife) return;
            ctx.fillStyle = `rgba(255,50,50,0.6)`;
            ctx.beginPath(); ctx.arc(p.x+3,p.y,p.sz*0.7,0,Math.PI*2); ctx.fill();
          });
          // Cyan shift
          pts.forEach(p => {
            if (p.life >= p.maxLife) return;
            ctx.fillStyle = `rgba(50,200,255,0.6)`;
            ctx.beginPath(); ctx.arc(p.x-3,p.y,p.sz*0.7,0,Math.PI*2); ctx.fill();
          });
          ctx.restore();
        }

        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.97; p.life++;
          const a = Math.max(0, 1 - p.life/p.maxLife) * 0.85;
          if (a < 0.01) return;
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = colorStr; ctx.shadowColor = colorStr; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill(); ctx.restore();
        });
        if (++frame >= SCATTER) {
          phase = 1; frame = 0;
          this._show(from, to);
          pts.forEach(p => {
            const a = Math.random()*Math.PI*2;
            const d = 120 + Math.random()*500;
            p.x = W/2+Math.cos(a)*d; p.y = H/2+Math.sin(a)*d;
            p.vx = (W/2-p.x)/REFORM * (0.8+Math.random()*0.4);
            p.vy = (H/2-p.y)/REFORM * (0.8+Math.random()*0.4);
            p.life = 0; p.maxLife = REFORM; p.sz *= 0.7;
          });
        }
      } else {
        ctx.fillStyle = `rgba(6,6,15,${Math.max(0, 1 - frame/REFORM)})`;
        ctx.fillRect(0,0,W,H);
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.life++;
          const a = Math.max(0, (1-p.life/p.maxLife)) * 0.55;
          if (a < 0.01) return;
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = colorStr; ctx.shadowColor = colorStr; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill(); ctx.restore();
        });
        if (++frame >= REFORM) {
          ctx.clearRect(0,0,W,H);
          this.canvas.style.display = 'none';
          this.busy = false; return;
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  },

  // Section → Hub: cross-fade through darkness with energy rings
  reverseGather(from, to) {
    if (this.busy) { this._show(from, to); return; }
    this.busy = true;
    this.canvas.style.display = 'block';
    const ctx = this.ctx; const W = this.canvas.width, H = this.canvas.height;
    const cx = W/2, cy = H/2;
    const c = hexToRgb(pageAccent);
    let f = 0; const T = 42;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      const p = f/T;
      ctx.fillStyle = `rgba(6,6,15,${Math.sin(p*Math.PI)})`;
      ctx.fillRect(0,0,W,H);

      // Energy ring converging effect
      if (f > 5 && f < 32) {
        const ringProgress = (f-5) / 27;
        const ringRadius = (1 - ringProgress) * Math.max(W,H) * 0.5 + 20;
        ctx.save();
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${Math.sin(ringProgress*Math.PI)*0.4})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI*2);
        ctx.stroke();
        // Second ring offset
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius * 0.7, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }

      if (f===21) this._show(from, to);
      if (++f>=T){ this.canvas.style.display='none'; this.busy=false; return; }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  },

  // Sub-page: glitch morph — enhanced with chromatic lines
  glitch(from, to) {
    if (this.busy) {
      // Безопасно показываем страницу и сбрасываем canvas
      this.canvas.style.display = 'none';
      this.busy = false;
      this._show(from, to);
      return;
    }
    this.busy = true;
    this.canvas.style.display = 'block';
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    let f = 0;
    const T = 55;
    const MID = Math.floor(T / 2);  // момент смены
    let swapped = false;
    let done = false;

    // Защитный таймаут — если RAF по какой-то причине не завершится
    const safetyTimer = setTimeout(() => {
      if (!done) {
        done = true;
        if (!swapped) this._show(from, to);
        ctx.clearRect(0, 0, W, H);
        this.canvas.style.display = 'none';
        this.busy = false;
      }
    }, 1500);

    const draw = () => {
      if (done) return;
      ctx.clearRect(0, 0, W, H);
      const p = f / T;

      // темнота нарастает к середине и спадает — sin-кривая
      const darkness = Math.sin(p * Math.PI);
      ctx.fillStyle = `rgba(6,6,15,${darkness * 0.98})`;
      ctx.fillRect(0, 0, W, H);

      // помехи только в первой половине
      if (f > 3 && f < MID) {
        const intensity = Math.sin((f / MID) * Math.PI);
        for (let i = 0; i < Math.floor(8 * intensity); i++) {
          const y = Math.random() * H;
          const h = 1 + Math.random() * 8;
          const offset = (Math.random() - 0.5) * 20;
          ctx.fillStyle = `rgba(255,0,60,${0.4 * intensity})`;
          ctx.fillRect(offset, y, W, h);
          ctx.fillStyle = `rgba(0,200,255,${0.3 * intensity})`;
          ctx.fillRect(-offset, y + 2, W, h * 0.6);
        }
        if (Math.random() > 0.6) {
          ctx.save();
          ctx.globalAlpha = 0.5 * intensity;
          ctx.fillStyle = '#06060f';
          ctx.fillRect(0, Math.random() * H, W, 10 + Math.random() * 30);
          ctx.restore();
        }
      }

      // смена страницы в пик темноты — невидимо
      if (!swapped && f >= MID) {
        this._show(from, to);
        swapped = true;
      }

      if (++f >= T) {
        done = true;
        clearTimeout(safetyTimer);
        ctx.clearRect(0, 0, W, H);
        this.canvas.style.display = 'none';
        this.busy = false;
        return;
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  },

  // → Letter: fade through pure black with blur
  fadeBlack(from, to) {
    if (this.busy) { this._show(from, to); return; }
    this.busy = true;
    this.canvas.style.display = 'block';
    const ctx = this.ctx; const W = this.canvas.width, H = this.canvas.height;
    let f = 0; const T = 42;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = `rgba(0,0,0,${Math.sin((f/T)*Math.PI)})`;
      ctx.fillRect(0,0,W,H);
      if (f===21) this._show(from, to);
      if (++f>=T){ this.canvas.style.display='none'; this.busy=false; return; }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
};

// ── Hub Canvas: star field + nebulae ───────────────────
const HubCanvas = {
  canvas: null, ctx: null,
  stars: [], animId: null,
  t: 0,
  enabled: false,

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this._loop();
  },

  stop() {
    this.enabled = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    window._HubAnimId = null;
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  init() {
    this.canvas = $('hub-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    this._genStars();
    window.addEventListener('resize', () => { this._resize(); this._genStars(); });
    this.start();
  },

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  _genStars() {
    const n = Math.floor(window.innerWidth * window.innerHeight / 2000);
    this.stars = Array.from({length:n}, () => ({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      r: 0.25 + Math.random()*1.8,
      a: 0.18 + Math.random()*0.82,
      spd: 0.4 + Math.random()*1.2,
      ph: Math.random()*Math.PI*2,
      col: Math.random()>.88 ? '#b8d8ff' : (Math.random()>.75 ? '#ffddb8' : '#ffffff')
    }));
  },

  _drawNebula(cx, cy, r, color) {
    const g = this.ctx.createRadialGradient(cx,cy,0,cx,cy,r*2.8);
    g.addColorStop(0, color+'2a');
    g.addColorStop(0.5, color+'0f');
    g.addColorStop(1, 'transparent');
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(cx,cy,r*2.8,0,Math.PI*2);
    this.ctx.fill();
  },

  _loop() {
    if (!this.enabled) return;

    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    this.t += 0.008;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0,0,W,H);

    $$('.cluster').forEach(el => {
      if (!el.id) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top  + rect.height/2;
      const color = getComputedStyle(el).getPropertyValue('--cc').trim() || '#9b4dca';
      this._drawNebula(cx, cy, 85, color);
    });

    const pos = $$('.cluster').map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });

    ctx.save();
    ctx.strokeStyle = 'rgba(155,77,202,0.04)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < pos.length-1; i++) {
      ctx.beginPath();
      ctx.moveTo(pos[i].x, pos[i].y);
      ctx.lineTo(pos[i+1].x, pos[i+1].y);
      ctx.stroke();
    }
    ctx.restore();

    this.stars.forEach(s => {
      const tw = 0.55 + 0.45 * Math.sin(this.t * s.spd + s.ph);
      ctx.save();
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = s.col;
      if (s.r > 1.3) { ctx.shadowColor = s.col; ctx.shadowBlur = 4; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });

    if (Math.random() > 0.997) {
      this._shootingStar = {
        x: Math.random()*W*0.8, y: Math.random()*H*0.3,
        vx: 6+Math.random()*6, vy: 2+Math.random()*3,
        life: 0, maxLife: 20+Math.random()*15
      };
    }

    if (this._shootingStar) {
      const ss = this._shootingStar;
      ss.x += ss.vx; ss.y += ss.vy; ss.life++;
      const a = Math.max(0, 1 - ss.life/ss.maxLife);
      if (a > 0.01) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${a*0.8})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx*3, ss.y - ss.vy*3);
        ctx.stroke();
        ctx.restore();
      } else {
        this._shootingStar = null;
      }
    }

    if (!this.enabled) return;
    this.animId = requestAnimationFrame(() => this.loop());
  }
};

// ── Particle System ─────────────────────────────────────
const Particles = {
  canvas: null, ctx: null,
  pts: [], type: 'stars', color: '#9b4dca',
  animId: null, t: 0,
  enabled: false,

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this._loop();
  },

  stop(clear = true) {
    this.enabled = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    window._ParticlesAnimId = null;
    if (clear) {
      this.pts = [];
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  },

  init() {
    this.canvas = $('global-particle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  setPage(el) {
    this.type  = el.dataset.particles || 'stars';
    this.color = el.dataset.accent   || '#9b4dca';
    this.pts   = [];
    for (let i=0;i<55;i++) this._spawn();
  },

  _spawn() {
    const W=this.canvas.width, H=this.canvas.height;
    const c=this.color;
    const base = { life:0, maxLife:100+Math.random()*120, alpha:0 };

    switch(this.type) {
      case 'embers':
        this.pts.push({...base, x:Math.random()*W, y:H+5,
          vx:(Math.random()-.5)*.8, vy:-(0.6+Math.random()*1.8),
          sz:1+Math.random()*2.8, col: Math.random()>.5?'#ff6a00':'#c41e3a', maxLife:60+Math.random()*80});
        break;
      case 'mist':
        this.pts.push({...base, x:Math.random()*W, y:H*.3+Math.random()*H*.7,
          vx:(Math.random()-.5)*.25, vy:-(0.08+Math.random()*.25),
          sz:28+Math.random()*45, col:'rgba(85,107,47,0.06)', isMist:true, maxLife:220+Math.random()*180});
        break;
      case 'dark-mist':
        this.pts.push({...base, x:Math.random()*W, y:H*.3+Math.random()*H*.7,
          vx:(Math.random()-.5)*.25, vy:-(0.08+Math.random()*.2),
          sz:24+Math.random()*40, col:'rgba(45,90,39,0.07)', isMist:true, maxLife:200+Math.random()*150});
        break;
      case 'cosmic':
        this.pts.push({...base, x:Math.random()*W, y:Math.random()*H,
          vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
          sz:.5+Math.random()*2, col:Math.random()>.5?'#9b4dca':'#ffffff', maxLife:160+Math.random()*160});
        break;
      case 'golden':
        this.pts.push({...base, x:Math.random()*W, y:H+5,
          vx:(Math.random()-.5)*.6, vy:-(0.4+Math.random()*1.3),
          sz:1+Math.random()*2, col:Math.random()>.5?'#d4a574':'#ffe090', maxLife:80+Math.random()*80});
        break;
      case 'petals':
        this.pts.push({...base, x:Math.random()*W, y:-8,
          vx:(Math.random()-.5)*1, vy:0.5+Math.random()*.9,
          sz:3+Math.random()*4, col:Math.random()>.5?'#e8a0bf':'#ffcce8',
          rot:Math.random()*Math.PI*2, rSpd:(Math.random()-.5)*.06, isPetal:true, maxLife:180+Math.random()*180});
        break;
      case 'fireflies':
        this.pts.push({...base, x:Math.random()*W, y:H*.35+Math.random()*H*.65,
          vx:(Math.random()-.5)*.35, vy:-(0.04+Math.random()*.28),
          sz:2+Math.random()*3, col:'#ffe060', isGlow:true, glowPh:Math.random()*Math.PI*2,
          maxLife:200+Math.random()*200});
        break;
      case 'energy':
        this.pts.push({...base, x:Math.random()*W, y:Math.random()*H,
          vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*2,
          sz:.7+Math.random()*2, col:'#1e90ff', maxLife:60+Math.random()*60});
        break;
      case 'fire':
        this.pts.push({...base, x:Math.random()*W, y:H+5,
          vx:(Math.random()-.5)*1, vy:-(0.7+Math.random()*2.2),
          sz:1.5+Math.random()*3, col:Math.random()>.5?'#ff4500':'#ff8c00', maxLife:55+Math.random()*55});
        break;
      case 'hexagons':
      case 'blue-motes':
        this.pts.push({...base, x:Math.random()*W, y:Math.random()*H,
          vx:(Math.random()-.5)*.5, vy:-(0.12+Math.random()*.45),
          sz:.8+Math.random()*2, col:c, maxLife:130+Math.random()*130});
        break;
      default: // stars
        this.pts.push({...base, x:Math.random()*W, y:Math.random()*H,
          vx:0, vy:0, sz:.4+Math.random()*1.5, col:'#ffffff',
          maxLife:220+Math.random()*220, twinkle:true, twPh:Math.random()*Math.PI*2});
        break;
    }
  },

  _loop() {
    if (!this.enabled) return;

    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    this.t += 0.016;

    ctx.clearRect(0,0,W,H);

    while (this.pts.length < 55) this._spawn();

    this.pts = this.pts.filter(p => {
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      p.life++;
      if (p.rot !== undefined) p.rot += p.rSpd;

      const lr = p.life / p.maxLife;
      let a = lr < 0.18 ? lr / 0.18 : lr > 0.78 ? (1 - lr) / 0.22 : 1;

      if (p.isGlow) {
        const g = Math.sin(this.t * 2 + p.glowPh);
        a *= 0.35 + 0.65 * (g * 0.5 + 0.5);
      }
      if (p.twinkle) a *= 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + p.twPh));
      if (a < 0.01 || p.life >= p.maxLife) return false;
      if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) return false;

      ctx.save();
      ctx.globalAlpha = a * 0.72;

      if (p.isMist) {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);
        ctx.fill();
      } else if (p.isPetal) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.ellipse(0,0,p.sz,p.sz/2.2,0,0,Math.PI*2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.col;
        if (p.isGlow) {
          ctx.shadowColor = p.col;
          ctx.shadowBlur = p.sz * 4;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      return true;
    });

    if (!this.enabled) return;
    window._ParticlesAnimId = this.animId = requestAnimationFrame(() => this._loop());
  }
};

// ── Cursor System ──────────────────────────────────────
const CursorSystem = {
  setAccent(color) {
    if (window._CursorEngine) window._CursorEngine.setAccent(color);
  },
  init() {}
};

/* ============================================================
   CursorEngine 
   ============================================================ */
(function CursorEngineV6() {

  const blade = document.getElementById('cursor-blade');
  const canvas = document.getElementById('cursor-fx-canvas');
  if (!blade || !canvas) return;
  const ctx = canvas.getContext('2d');

  /* helpers */
  const _lerp  = (a, b, t) => a + (b - a) * t;
  const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const _rand  = (lo, hi) => lo + Math.random() * (hi - lo);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOutQuad = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

  /* purple palette */
  const P = {
    deep:   '#2a0845',
    mid:    '#7b2fbe',
    bright: '#b06aff',
    light:  '#d4aaff',
    white:  '#f0e6ff',
    glow:   '#9040dd',
  };

  /* state */
  let mx = -200, my = -200, px = -200, py = -200;
  let vx = 0, vy = 0, speed = 0;
  let isHover = false;
  let _navPending = false;

  /* trail points — smooth ribbon */
  const trail = [];       // {x, y, age}
  const MAX_TRAIL = 40;
  const TRAIL_LIFE = 0.55; // seconds

  /* slashes (click) */
  const slashes = [];

  /* sparks */
  const sparks = [];

  const HOVER_SEL = [
    'button','a','.cluster','.back-btn','.letter-btn',
    '.sub-nav-btn','.photo-placeholder','.video-placeholder',
    '.easter-egg-btn','.modal-close'
  ].join(',');

  const resize = () => { 
    canvas.width = window.innerWidth || window.innerWidth;
    canvas.height = window.innerHeight || window.innerHeight;
  };
  
  resize();
  window.addEventListener('resize', resize);

  /* mouse tracking */
  document.addEventListener('mousemove', e => {
    px = mx; py = my;
    mx = e.clientX; my = e.clientY;
    vx = mx - px; vy = my - py;
    speed = Math.hypot(vx, vy);

    if (!blade._vis) { blade.style.opacity = '1'; blade._vis = true; }

    /* add trail point */
    if (speed > 1.2) {
      trail.push({ x: mx, y: my, age: 0 });
      if (trail.length > MAX_TRAIL) trail.shift();
    }

    /* sparks on fast movement */
    const overInteractive = !!e.target.closest('.photo-placeholder, .video-placeholder');
    if (speed > 14 && !overInteractive) {
      const n = Math.min(Math.ceil(speed / 20), 3);
      const angle = Math.atan2(vy, vx);
      for (let i = 0; i < n; i++) {
        const a = angle + Math.PI + _rand(-0.8, 0.8);
        const spd = _rand(1.5, 3.5 + speed * 0.06);
        sparks.push({
          x: mx, y: my,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - _rand(0.4, 1.5),
          size: _rand(0.5, 1.8), alpha: _rand(0.6, 1.0),
          color: Math.random() > 0.5 ? P.bright : Math.random() > 0.4 ? P.light : '#ffffff',
          life: 1.0, decay: _rand(0.03, 0.065),
        });
      }
    }
  });

  document.addEventListener('mouseleave', () => { blade.style.opacity = '0'; blade._vis = false; });
  document.addEventListener('mouseenter', () => { blade.style.opacity = '1'; blade._vis = true; });

  document.addEventListener('mouseover', e => {
    if (e.target.closest(HOVER_SEL)) { isHover = true; blade.style.transform = 'translate(-50%,-50%) scale(1.5)'; }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(HOVER_SEL)) { isHover = false; blade.style.transform = 'translate(-50%,-50%) scale(1)'; }
  });

  document.addEventListener('mousedown', e => {
  blade.classList.add('press');
  if (e.target.closest('.video-card')) return;  // ← добавь эту строку
  setTimeout(() => {
    if (!_navPending) spawnSlash(e.clientX, e.clientY);
  }, 80);
});

  document.addEventListener('mouseup', () => {
    blade.classList.remove('press');  // ← вот так должно быть
  });

  /* ══ SLASH on click ══ */
  function spawnSlash(x, y) {
    const angle = speed > 3 ? Math.atan2(vy, vx) : _rand(-0.8, -0.15);
    const len = _rand(90, 150);
    const pts = [];
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const off = i === 0 || i === N ? 0 : (Math.random() - 0.5) * 12;
      pts.push({ t, off });
    }
    /* impact sparks */
    for (let i = 0; i < 20; i++) {
      const a = _rand(0, Math.PI * 2);
      const spd = _rand(2.5, 9);
      sparks.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - _rand(0.5, 2.5),
        size: _rand(0.5, 2.4), alpha: _rand(0.7, 1.0),
        color: Math.random() > 0.35 ? P.bright : Math.random() > 0.5 ? '#fff' : P.light,
        life: 1.0, decay: _rand(0.02, 0.055),
      });
    }
    slashes.push({ x, y, angle, len, pts, life: 1.0, decay: 0.016, isNav: false });
  }

  /* ══ NAV SLASH (page transition) ══ */
  function spawnNavSlash(x, y, callback) {

    for (let i = slashes.length - 1; i >= 0; i--) {
    if (!slashes[i].isNav) slashes.splice(i, 1);
  }
    _navPending = true;          // ← поднять флаг
    setTimeout(() => _navPending = false, 200);  // ← сбросить после
    slashes.forEach((sl, i) => { if (!sl.isNav) slashes.splice(i, 1); });
    setTimeout(() => {
      for (let i = slashes.length - 1; i >= 0; i--) {
        if (!slashes[i].isNav) slashes.splice(i, 1);
      }
    }, 100);
    const angle = speed > 1 ? Math.atan2(vy, vx) : _rand(-0.6, -0.1);  // диагональ экрана
    const len = Math.hypot(innerWidth, innerHeight) * 0.6;  // с запасом за края
    const pts = [];
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const off = i === 0 || i === N ? 0 : (Math.random() - 0.5) * (innerHeight * 0.08);
      pts.push({ t, off });
    }
    /* big impact sparks */
    for (let i = 0; i < 30; i++) {
      const a = _rand(0, Math.PI * 2);
      const spd = _rand(3, 11);
      sparks.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - _rand(0.5, 3),
        size: _rand(0.7, 3.0), alpha: _rand(0.7, 1.0),
        color: Math.random() > 0.35 ? P.bright : '#fff',
        life: 1.0, decay: _rand(0.013, 0.035),
      });
    }
    slashes.push({
      x, y, angle, len, pts,
      life: 1.0, decay: 0.0, isNav: true,
      phase: 0, timer: 0, callback, expand: 0,
      progress: 0,
    });
  }

  /* ══ DRAW SLASH ══ */
    function drawSlash(sl, W, H) {
    const C = Math.cos(sl.angle), S = Math.sin(sl.angle);
    const PC = S, PS = -C;

    const ex = sl.isNav ? sl.expand : 1;   // ← сначала ex
    const progress = (sl.isNav && sl.phase <= 1) ? sl.progress : 1;
    const hw = sl.isNav
      ? (sl.len / 2) * (sl.phase === 0 ? sl.progress : 1)
      : sl.len / 2;

    /* flash on impact */
    const showFlash = sl.isNav ? (sl.phase === 0 && sl.timer < 8) : (sl.life > 0.82);
    if (showFlash) {
      const ft = sl.isNav ? (1 - sl.timer / 8) : ((sl.life - 0.82) / 0.18);
      ctx.save();
      ctx.globalAlpha = ft * 0.65;
      const fg = ctx.createRadialGradient(sl.x, sl.y, 0, sl.x, sl.y, 80);
      fg.addColorStop(0,   'rgba(230,200,255,0.95)');
      fg.addColorStop(0.12,'rgba(180,100,255,0.75)');
      fg.addColorStop(0.4, 'rgba(120,50,200,0.25)');
      fg.addColorStop(1,   'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(sl.x, sl.y, 80, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* tear width */
    let tearW;
    if (sl.isNav) {
      tearW = 100 * ex;
    } else {
      const openT = sl.life > 0.7 ? easeOutCubic((1 - sl.life) / 0.3) : 1;
      const closeT = sl.life <= 0.7 ? sl.life / 0.7 : 1;
      tearW = openT * closeT * 10;
    }
    if (tearW < 0.15) return;

    ctx.save();
    ctx.globalAlpha = sl.isNav ? 1 : _clamp(sl.life * 1.5, 0, 0.95);

    /* build jagged path */
    const path = new Path2D();
    const tx1 = sl.x - C * hw, ty1 = sl.y - S * hw;
    const tx2 = sl.x + C * hw, ty2 = sl.y + S * hw;
    const visPts = (sl.isNav && sl.phase <= 1)
      ? sl.pts.filter(p => Math.abs(p.t - 0.5) <= progress * 0.52)
      : sl.pts;
    path.moveTo(tx1, ty1);
    visPts.forEach(p => {
      const ppx = sl.x + C * (p.t - 0.5) * sl.len;
      const ppy = sl.y + S * (p.t - 0.5) * sl.len;
      const taper = Math.sin(p.t * Math.PI);  // ← добавить
      const w = (tearW * 0.55 + p.off * (sl.isNav ? 1 : sl.life) * 0.3) * taper;  // ← * taper
      path.lineTo(ppx + PC * w, ppy + PS * w);
    });
    path.lineTo(tx2, ty2);
    visPts.slice().reverse().forEach(p => {
      const ppx = sl.x + C * (p.t - 0.5) * sl.len;
      const ppy = sl.y + S * (p.t - 0.5) * sl.len;
      const taper = Math.sin(p.t * Math.PI);  // ← добавить
      const w = (tearW * 0.45 + p.off * (sl.isNav ? 1 : sl.life) * 0.25) * taper;  // ← * taper
      path.lineTo(ppx - PC * w, ppy - PS * w);
    });
    path.closePath();

    /* void fill */
    ctx.fillStyle = 'rgba(0,0,0,0.97)';
    ctx.fill(path);

    /* inner purple glow */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ig = ctx.createLinearGradient(
      sl.x + PC * tearW, sl.y + PS * tearW,
      sl.x - PC * tearW, sl.y - PS * tearW
    );
    ig.addColorStop(0,   'rgba(170,80,255,0.55)');
    ig.addColorStop(0.3, 'rgba(90,25,160,0.12)');
    ig.addColorStop(0.7, 'rgba(90,25,160,0.12)');
    ig.addColorStop(1,   'rgba(170,80,255,0.55)');
    ctx.fillStyle = ig;
    ctx.fill(path);
    ctx.restore();

    /* glowing edge */
    ctx.strokeStyle = `rgba(190,110,255,${sl.isNav ? 0.92 : 0.85 * sl.life})`;
    ctx.lineWidth = sl.isNav ? 2.2 : 1.6;
    ctx.shadowColor = P.bright;
    ctx.shadowBlur = sl.isNav ? 22 + ex * 5 : 16;
    ctx.stroke(path);
    ctx.restore();
  }

  /* ══ RENDER LOOP ══ */
  const dt = 1 / 60;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    /* position cursor */
    blade.style.transform = `translate(${mx}px, ${my}px)`;

    /* ── TRAIL (smooth glowing ribbon) ── */
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += dt;
      if (trail[i].age > TRAIL_LIFE) { trail.splice(i, 1); }
    }
    if (trail.length > 2) {
      /* draw trail with fading alpha per segment */
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 0;

      /* outer glow */
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i-1], p1 = trail[i];
        const a = _clamp(1 - p1.age / TRAIL_LIFE, 0, 1);
        if (a < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = P.light;
        ctx.lineWidth = 3 * a;
        ctx.stroke();
      }
      ctx.restore();  // ← проверь что это есть
    }

    /* ── SPARKS ── */
    /* ── SPARKS ── */
    const overGrid = !!document.querySelector('.photo-placeholder:hover, .video-placeholder:hover');

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.97;
      p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      if (overGrid) continue;
      const a2 = p.alpha * p.life * p.life;
      ctx.globalAlpha = a2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* ── SLASHES ── */
    for (let i = slashes.length - 1; i >= 0; i--) {
      const sl = slashes[i];

      if (!sl.isNav) {
        sl.life -= sl.decay;
        if (sl.life <= 0) { slashes.splice(i, 1); continue; }
      }

      drawSlash(sl, W, H);

      /* Nav transition phases (~0.9s total) */
      if (sl.isNav) {
        sl.timer++;

        if (sl.phase === 0) {
          const t = _clamp(sl.timer / 18, 0, 1);
          sl.progress = easeInOutQuad(t);  // нарастает от 0 до 1 за 18 кадров
          sl.expand = 0.4;
          if (sl.timer > 18) { sl.phase = 1; sl.timer = 0; }

        } else if (sl.phase === 1) {
          // Пауза — линия стоит неподвижно
          sl.expand = 0.4;
          if (sl.timer > 6) { sl.phase = 2; sl.timer = 0; }

        } else if (sl.phase === 2) {
          // Плавное раскрытие — expand считается ПРЯМО из ease, без lerp
          const t = _clamp(sl.timer / 65, 0, 1);
          const ease = easeInOutQuad(t);
          sl.expand = 0.4 + ease * (40 - 0.4);   // ← вот исправление
          sl.len = _lerp(sl.len, Math.max(W, H) * 3, 0.05);

          ctx.save();
          const grd = ctx.createRadialGradient(sl.x, sl.y, 0, sl.x, sl.y, Math.max(W, H) * 0.6);
          grd.addColorStop(0,   `rgba(12,4,25,${ease * 0.35})`);
          grd.addColorStop(0.3, `rgba(6,2,14,${ease * 0.8})`);
          grd.addColorStop(1,   `rgba(0,0,0,${ease * 0.99})`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();

          if (sl.timer === 32 && sl.callback) {
            sl.callback();
            sl.callback = null;
          }
          if (sl.timer > 65) { sl.phase = 3; sl.timer = 0; }

        } else if (sl.phase === 3) {
          const t = _clamp(sl.timer / 12, 0, 1);
          const ease = t * t;
          sl.life = Math.max(0, 1 - ease);
          ctx.save();
          ctx.globalAlpha = 1 - ease;
          ctx.fillStyle = 'rgba(0,0,0,0.97)';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          if (ease >= 1) { slashes.splice(i, 1); continue; }
        }
      }
    }

    requestAnimationFrame(render);
  }

  render();

  window._CursorEngine = {
    setAccent() {},
    spawnNavSlash,
  };

})();


// ── Holographic Photo Effect ───────────────────────────
const HoloEffect = {
  init() {
    document.addEventListener('mousemove', e => {
      const card = e.target.closest('.photo-placeholder, .video-placeholder');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top)  / rect.height;
      const rx = (my - 0.5) * -14;
      const ry = (mx - 0.5) *  14;
      const angle = Math.atan2(my-0.5, mx-0.5) * (180/Math.PI) + 90;
      card.style.setProperty('--rx', rx+'deg');
      card.style.setProperty('--ry', ry+'deg');
      card.style.setProperty('--holo-angle', angle+'deg');
    }, { passive: true });
  }
};

// ── CRT Glitch timer ───────────────────────────────────
const CRTGlitch = {
  init() {
    setInterval(() => {
      const page = document.querySelector('.page.active');
      if (!page || page.dataset.crt !== 'true') return;
      if (Math.random() > 0.88) {
        page.classList.add('crt-glitch-anim');
        setTimeout(() => page.classList.remove('crt-glitch-anim'), 140);
      }
    }, 2000);
  }
};

// ── Scroll / Intersection Reveal ──────────────────────
const RevealObserver = {
  io: null,
  init() {
    this.io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.08 });
    this.refresh(document);
  },
  refresh(root) {
    (root.querySelectorAll ? root.querySelectorAll('.reveal') : $$('.reveal'))
      .forEach(el => this.io.observe(el));
  }
};

// ── Character Parallax ─────────────────────────────────
const Parallax = {
  init() {
    document.addEventListener('mousemove', e => {
      const page = document.querySelector('.page.active');
      if (!page || page.id === 'page-hub') return;
      const dx = (e.clientX/window.innerWidth  - 0.5);
      const dy = (e.clientY/window.innerHeight - 0.5);
      page.querySelectorAll('.char-img').forEach(img => {
        const isCenter = img.classList.contains('char-center');
        const tx = dx * -2.2;
        const ty = dy * -1.8;
        img.style.transform = isCenter
          ? `translateX(calc(-50% + ${tx}%)) translateY(${ty}%)`
          : `translateX(${tx}%) translateY(${ty}%)`;
      });
      // ← луна двигается медленнее — ощущение что она дальше
      const moon = page.querySelector('.moon-silhouette');
      if (moon) {
        const tx = dx * -1.2;
        const ty = dy * -1.0;
        moon.style.transform = `translateX(${tx}%) translateY(${ty}%)`;
      }
    });
  }
};

// ── Navigation Wiring ──────────────────────────────────
const Nav = {
  init() {
    // Clusters
    $$('.cluster').forEach(el => {
      el.addEventListener('click', (e) => {
        const pg = el.dataset.page;
        if (pg) {
          handleSoulEaterAudio(pg);
          handleStardewAudio(pg);
          Router.navigate(pg, el, e.clientX, e.clientY);
        }
      });
    });

    // Letter button (hub bottom)
    $$('[data-page="letter"]').forEach(el => {
      el.addEventListener('click', (e) => Router.navigate('letter', null, e.clientX, e.clientY));
    });

    // Back buttons
    $$('.back-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const target = el.dataset.page || 'hub';
        Router.navigate(target, null, e.clientX, e.clientY);
      });
    });

    // Sub-nav buttons
    $$('.sub-nav-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const sp = el.dataset.subpage;
        if (!sp) return;
        Router.navigate(sp, null, e.clientX, e.clientY);
        // update active states in this nav row
        const nav = el.closest('.sub-nav');
        if (nav) {
          nav.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
          el.classList.add('active');
        }
        const destPage = $('page-' + sp);
        if (destPage) {
          destPage.querySelectorAll('.sub-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.subpage === sp);
          });
        }
      });
    });

    // Easter egg — Lulux
    const trigger = $('lulux-trigger');
    const modal   = $('lulux-modal');
    const close   = $('lulux-close');
    if (trigger) trigger.addEventListener('click', () => { modal.style.display='flex'; });
    if (close)   close.addEventListener('click',   () => { modal.style.display='none'; });
    if (modal)   modal.addEventListener('click', e => { if(e.target===modal) modal.style.display='none'; });
  }
};

// ── Touch Support ──────────────────────────────────────
const Touch = {
  init() {
    document.addEventListener('touchmove', e => {
      const t = e.touches[0];
      mouseX = t.clientX; mouseY = t.clientY;
      const cg = $('cursor-blade');
      if (cg) { cg.style.left = t.clientX + 'px'; cg.style.top = t.clientY + 'px'; }
    }, { passive:true });

    $$('.cluster').forEach(el => {
      let lastTap = 0;
      el.addEventListener('touchend', e => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTap < 380) {
          el.click();
        }
        lastTap = now;
      });
    });
  }
};

const EGG_MEMES = {
  eva:    './memes-eva/meme-sindzi.jpg',
  aska:  './memes-eva/meme-aska.jpg',
  misato: './memes-eva/meme-misato.jpg',
  kaoru: './memes-eva/meme-kaoru.jpg',
  rei_1:    './memes-eva/meme-rei_1.jpg',
  rei_2:    './memes-eva/meme-rei_2.jpg'
};

function initEasterEggs() {
  const modal = document.getElementById('egg-modal');
  const img = document.getElementById('egg-modal-img');
  const closeBtn = document.getElementById('egg-modal-close');

  document.querySelectorAll('.egg-classified').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const key = el.dataset.egg;
      img.src = EGG_MEMES[key];
      modal.classList.add('open');
    });
  });

  function closeModal() {
    modal.classList.remove('open');
    setTimeout(() => img.src = '', 300);
  }
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}


function makeStitch(container, left, top, rotate, delay) {
  const el = document.createElement('div');
  el.className = 'stitch';

  const w   = 16 + Math.random() * 16;
  const h   = 2  + Math.random() * 2;
  const tip = 20 + Math.random() * 20;

  el.style.cssText = `
    left: ${left};
    top: ${top};
    width: ${w.toFixed(1)}px;
    height: ${h.toFixed(1)}px;
    transform: translate(-50%, -50%) rotate(${rotate}deg);
    clip-path: polygon(
      ${tip}% 0%,
      ${100 - tip}% 0%,
      100% 50%,
      ${100 - tip}% 100%,
      ${tip}% 100%,
      0% 50%
    );
    opacity: ${(0.6 + Math.random() * 0.35).toFixed(2)};
    animation-delay: ${delay}s;
  `;
  container.appendChild(el);
}

function initSteinStitches() {
  const main  = document.getElementById('stitches-main');
  const diag  = document.getElementById('stitches-main2');
  const small = document.getElementById('stitches-small');
  if (!main || !diag) return;

  // ── ВЕРТИКАЛЬНЫЙ ШОВ ──────────────────────────────────
  // .scar-main: left 60%, top -4%, width 14px, height 108%
  // transform: rotate(-4deg) skewY(-2deg)
  // стяжки перпендикулярны → rotate(-4 + 90) = rotate(86deg)
  Object.assign(main.style, {
    position:        'absolute',
    left:            'calc(60% - 14px)',
    top:             '-4%',
    width:           '14px',
    height:          '108%',
    transform:       'rotate(-4deg) skewY(-2deg)',
    transformOrigin: 'center',
    pointerEvents:   'none',
    zIndex:          '0'
  });

  for (let i = 0; i < 11; i++) {
    const el = document.createElement('div');
    el.className = 'stitch';
    const t   = (i + 0.5) / 11;
    const rot = 86 + (Math.random() - 0.5) * 5; // ~90° к шраму
    el.style.cssText = `
      left: 50%;
      top: ${(t * 100).toFixed(1)}%;
      transform: translate(-50%, -50%) rotate(${rot}deg);
      opacity: ${(0.75 + Math.random() * 0.2).toFixed(2)};
      animation-delay: ${(i * 0.1).toFixed(2)}s;
    `;
    main.appendChild(el);
  }

  // ── ДИАГОНАЛЬНЫЙ ШОВ ──────────────────────────────────
  // .scar-bg-3: left 38%, top 20%, width 10px, height 120%
  // transform: rotate(78deg) skewY(-3deg)
  // стяжки перпендикулярны → rotate(78 + 90) = rotate(168deg)
  Object.assign(diag.style, {
    position:        'absolute',
    left:            'calc(38% - 5px)',
    top:             'calc(20% - 10px)',
    width:           '10px',
    height:          '120%',
    transform:       'rotate(78deg) skewY(-3deg)',
    transformOrigin: 'center',
    pointerEvents:   'none',
    zIndex:          '0'
  });

  for (let i = 0; i < 11; i++) {
    const el = document.createElement('div');
    el.className = 'stitch';
    const t   = (i + 0.5) / 11;
    const rot = 168 + (Math.random() - 0.5) * 5;
    el.style.cssText = `
      left: 50%;
      top: ${(t * 100).toFixed(1)}%;
      transform: translate(-50%, -50%) rotate(${rot}deg);
      opacity: ${(0.55 + Math.random() * 0.3).toFixed(2)};
      animation-delay: ${(i * 0.12).toFixed(2)}s;
    `;
    diag.appendChild(el);
  }

  // ── МЕЛКИЕ (без стяжек, просто пустой контейнер) ──────
  if (small) {
    Object.assign(small.style, { position: 'absolute', pointerEvents: 'none' });
  }
}
// ── Soul Eater Fog (FULL VERSION) ─────────────────────────────────────
const SoulEaterFog = {
  _instances: {},

  init() {
    ['page-soul-eater'].forEach(id => {
      const page = document.getElementById(id);
      if (page) this._setup(page, id);
    });
  },

  _setup(page, id) {
    if (this._instances[id]) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'soul-fog-canvas';
    canvas.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;

    page.style.position = 'relative';
    page.style.overflow = 'hidden';

    const contentPanel = page.querySelector('.section-content');
    if (contentPanel) {
      contentPanel.style.position = 'relative';
      contentPanel.style.zIndex = '2';
      page.insertBefore(canvas, contentPanel);
    } else {
      page.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    const isSoul = id === 'page-soul-eater';
    const COL = isSoul
      ? { r: 90, g: 8, b: 14 }
      : { r: 20, g: 55, b: 15 };

    let W = 0, H = 0;
    let mx = -999, my = -999;
    let smx = -999, smy = -999;
    let t = 0;
    let running = false;
    let animId = null;

    const REPEL = 200;
    const FORCE = 3.2;
    const SPRING = 0.06;

    const particles = Array.from({ length: 38 }, () => ({
      bx: Math.random(),
      by: 0.3 + Math.random() * 0.7,
      ox: 0,
      oy: 0,
      r: 120 + Math.random() * 220,
      a: 0.18 + Math.random() * 0.28,
      vx: (Math.random() - 0.5) * 0.00018,
      ph: Math.random() * Math.PI * 2,
      aph: Math.random() * Math.PI * 2
    }));

    const resize = () => {
      const rect = page.getBoundingClientRect();
      W = canvas.width = Math.max(1, rect.width);
      H = canvas.height = Math.max(1, rect.height);
    };

    const onMouseMove = e => {
      const rect = page.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    };

    const onMouseLeave = () => {
      mx = -999;
      my = -999;
    };

    function loop() {
      if (!running) return;

      t++;
      if (smx < 0) {
        smx = mx;
        smy = my;
      }

      smx += (mx - smx) * 0.12;
      smy += (my - smy) * 0.12;

      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        p.bx += p.vx;
        if (p.bx > 1.2) p.bx = -0.2;
        if (p.bx < -0.2) p.bx = 1.2;

        const bpx = p.bx * W + Math.sin(t * 0.0008 + p.ph) * 22;
        const bpy = p.by * H + Math.sin(t * 0.0006 + p.aph) * 14;

        const dx = (bpx + p.ox) - smx;
        const dy = (bpy + p.oy) - smy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < REPEL) {
          const s = (1 - dist / REPEL) * FORCE;
          p.ox += (dx / dist) * s;
          p.oy += (dy / dist) * s;
        }

        p.ox *= (1 - SPRING);
        p.oy *= (1 - SPRING);

        const fx = bpx + p.ox;
        const fy = bpy + p.oy;

        ctx.save();
        ctx.shadowBlur = 28;
        ctx.shadowColor = `rgba(${COL.r},${COL.g},${COL.b},0.8)`;
        ctx.shadowBlur = 0;

        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, p.r);
        g.addColorStop(0, `rgba(${COL.r},${COL.g},${COL.b},${p.a})`);
        g.addColorStop(0.5, `rgba(${COL.r},${COL.g},${COL.b},${p.a * 0.4})`);
        g.addColorStop(1, `rgba(0,0,0,0)`);

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fx, fy, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const bot = ctx.createLinearGradient(0, H * 0.55, 0, H);
      bot.addColorStop(0, `rgba(${COL.r},${COL.g},${COL.b},0)`);
      bot.addColorStop(0.5, `rgba(${COL.r},${COL.g},${COL.b},0.22)`);
      bot.addColorStop(1, `rgba(${COL.r},${COL.g},${COL.b},0.12)`);
      ctx.fillStyle = bot;
      ctx.fillRect(0, 0, W, H);

      if (smx > 0 && smy > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        const hole = ctx.createRadialGradient(smx, smy, 0, smx, smy, REPEL * 0.9);
        hole.addColorStop(0, 'rgba(0,0,0,0.55)');
        hole.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hole;
        ctx.beginPath();
        ctx.arc(smx, smy, REPEL * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      const vig = ctx.createRadialGradient(
        W * 0.5, H * 0.5, H * 0.2,
        W * 0.5, H * 0.5, H * 0.85
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(loop);
    }

    const start = () => {
      if (running) return;
      requestAnimationFrame(() => {
        resize();
        running = true;
        loop();
      });
    };

    const stop = () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      ctx.clearRect(0, 0, W, H);
    };

    const syncState = () => {
      const active = page.classList.contains('active');
      if (active) start();
      else stop();
    };

    const observer = new MutationObserver(syncState);
    observer.observe(page, {
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('resize', resize);
    page.addEventListener('mousemove', onMouseMove);
    page.addEventListener('mouseleave', onMouseLeave);

    syncState();

    this._instances[id] = {
      canvas,
      start,
      stop,
      destroy: () => {
        stop();
        observer.disconnect();
        window.removeEventListener('resize', resize);
        page.removeEventListener('mousemove', onMouseMove);
        page.removeEventListener('mouseleave', onMouseLeave);
        canvas.remove();
      }
    };
  }
};

function initKidAurora() {
  const canvas = document.getElementById('kidAurora');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const bands = [
    { speed: 0.0004, amp: 0.18, freq: 2.1, color: [140, 80, 255],  alpha: 0.13 },
    { speed: 0.0006, amp: 0.14, freq: 3.2, color: [100, 50, 220],  alpha: 0.10 },
    { speed: 0.0003, amp: 0.22, freq: 1.8, color: [180, 100, 255], alpha: 0.08 },
    { speed: 0.0007, amp: 0.12, freq: 4.0, color: [80,  40, 180],  alpha: 0.09 },
    { speed: 0.0005, amp: 0.16, freq: 2.6, color: [200, 130, 255], alpha: 0.07 },
  ];

  let t = 0;

  function draw() {
    if (!running || document.hidden) return;
    animId = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    t++;

    bands.forEach((b, bi) => {
      const points = 80;
      const baseY  = H * (0.2 + bi * 0.15);

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * W;
        const wave =
          Math.sin(i * b.freq * 0.08 + t * b.speed * 60) * H * b.amp +
          Math.sin(i * b.freq * 0.04 + t * b.speed * 40 + bi) * H * b.amp * 0.5;
        const y = baseY + wave;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, baseY - H * b.amp, 0, baseY + H * b.amp * 2);
      const [r, g, bl] = b.color;
      grad.addColorStop(0,   `rgba(${r},${g},${bl},${b.alpha})`);
      grad.addColorStop(0.4, `rgba(${r},${g},${bl},${b.alpha * 0.6})`);
      grad.addColorStop(1,   `rgba(${r},${g},${bl},0)`);

      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  let running = false;
  let animId = null;
  const section = document.getElementById('page-soul-eater-kid');

  if (section) {
    const obs = new MutationObserver(() => {
      const active = section.classList.contains('active');
      if (active && !running)  { running = true;  draw(); }
      if (!active && running)  { running = false; cancelAnimationFrame(animId); ctx.clearRect(0, 0, W, H); }
    });
    obs.observe(section, { attributes: true, attributeFilter: ['class'] });
    if (section.classList.contains('active')) { running = true; draw(); }
  }
}

(function() {
  function setup() {
    const section = document.getElementById('page-maid');
    if (!section) return;
    const canvas = section.querySelector('.maid-petals-canvas');
    if (!canvas) return;

    function resize() {
      canvas.width  = section.offsetWidth  || window.innerWidth;
      canvas.height = section.offsetHeight || window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');

    const petals = Array.from({ length: 55 }, () => ({
      x:       Math.random() * (canvas.width  || 800),
      y:       Math.random() * (canvas.height || 600),
      w:       8 + Math.random() * 14,
      h:       4 + Math.random() * 7,
      rot:     Math.random() * Math.PI * 2,
      rotSpd:  (Math.random() - 0.5) * 0.035,
      vx:      (Math.random() - 0.5) * 0.7,
      vy:      0.3 + Math.random() * 0.9,
      alpha:   0.10 + Math.random() * 0.28,
      warm:    Math.random() > 0.4,
      sway:    Math.random() * Math.PI * 2,
      swaySpd: 0.008 + Math.random() * 0.012,
    }));

    let running = false;
    let animId  = null;

    function draw() {
      if (!running || document.hidden) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      petals.forEach(p => {
        p.sway += p.swaySpd;
        p.x    += p.vx + Math.sin(p.sway) * 0.55;
        p.y    += p.vy;
        p.rot  += p.rotSpd;

        if (p.y > H + 20) {
          p.y = -20;
          p.x = Math.random() * W;
        }
        if (p.x < -20) p.x = W + 10;
        if (p.x > W + 20) p.x = -10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.warm
          ? `rgba(212,165,116,${p.alpha})`
          : `rgba(230,185,145,${p.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    }

    const obs = new MutationObserver(() => {
      const active = section.classList.contains('active');
      if (active && !running) {
        running = true;
        draw();
      }
      if (!active && running) {
        running = false;
        cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    obs.observe(section, { attributes: true, attributeFilter: ['class'] });

    if (section.classList.contains('active')) { running = true; draw(); }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', setup)
    : setup();
})();

(function() {
  function setup() {
    const section = document.getElementById('page-manhwa-iske');
    if (!section) return;
    const canvas = section.querySelector('.iske-canvas');
    if (!canvas) return;

    function resize() {
      canvas.width  = section.offsetWidth  || window.innerWidth;
      canvas.height = section.offsetHeight || window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');

    // лепестки цветов — падают справа
    const petals = Array.from({ length: 40 }, (_, i) => ({
      x:      0.55 + Math.random() * 0.5,   // только правая половина
      y:      Math.random(),
      w:      4 + Math.random() * 7,
      h:      2.5 + Math.random() * 4,
      rot:    Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.04,
      vx:     -0.0002 - Math.random() * 0.0004,
      vy:      0.0004 + Math.random() * 0.0008,
      sway:    Math.random() * Math.PI * 2,
      swaySpd: 0.01 + Math.random() * 0.015,
      alpha:   0.25 + Math.random() * 0.45,
      // оттенки фиолетового/лавандового
      col: [
        [255, 36, 0],
        [207, 16, 16],
        [158, 0, 0],
        [107, 0, 0],
        [255, 107, 107],
      ][Math.floor(Math.random() * 5)],
    }));

    // чернильные брызги — мелкие статичные точки с мерцанием
    const inkDots = Array.from({ length: 18 }, () => ({
      x:     0.55 + Math.random() * 0.42,
      y:     0.05 + Math.random() * 0.9,
      r:     0.5 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.35,
      ph:    Math.random() * Math.PI * 2,
      phSpd: 0.008 + Math.random() * 0.018,
      col:   [139, 92, 246],
    }));

    let t = 0;
    let running = false;
    let animId  = null;

    function draw() {
      if (!running || document.hidden) return; // ← ВОТ ЭТА СТРОКА
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // лепестки
      petals.forEach(p => {
        p.sway += p.swaySpd;
        p.x    += p.vx + Math.sin(p.sway) * 0.0003;
        p.y    += p.vy;
        p.rot  += p.rotSpd;

        if (p.y > 1.05) { p.y = -0.05; p.x = 0.55 + Math.random() * 0.45; }
        if (p.x < -0.05) p.x = 1.0;

        ctx.save();
        ctx.translate(p.x * W, p.y * H);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        // лепесток — эллипс с небольшим градиентом
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.w);
        g.addColorStop(0,   `rgba(${p.col},${p.alpha * 1.2})`);
        g.addColorStop(0.6, `rgba(${p.col},${p.alpha * 0.8})`);
        g.addColorStop(1,   `rgba(${p.col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // чернильные точки
      inkDots.forEach(d => {
        d.ph += d.phSpd;
        const a = d.alpha * (0.4 + 0.6 * Math.sin(d.ph));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowColor = `rgba(${d.col},0.9)`;
        ctx.shadowBlur  = d.r * 5;
        ctx.fillStyle   = `rgba(${d.col},1)`;
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    }

    const obs = new MutationObserver(() => {
      const active = section.classList.contains('active');
      if (active && !running) { resize(); running = true; draw(); }
      if (!active && running) {
        running = false;
        cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    obs.observe(section, { attributes: true, attributeFilter: ['class'] });

    if (section.classList.contains('active')) { running = true; draw(); }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', setup)
    : setup();
})();


(function() {
  function setup() {
    const section = document.getElementById('page-manhwa-shore');
    if (!section) return;
    const canvas = section.querySelector('.shore-rain-canvas');
    if (!canvas) return;

    function resize() {
      canvas.width  = section.offsetWidth  || window.innerWidth;
      canvas.height = section.offsetHeight || window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');

    const drops = Array.from({ length: 120 }, () => ({
      x:     Math.random(),
      y:     Math.random(),
      len:   8  + Math.random() * 18,
      speed: 0.006 + Math.random() * 0.010,
      alpha: 0.06 + Math.random() * 0.22,
      width: 0.4 + Math.random() * 0.8,
      angle: 0.18 + Math.random() * 0.08, // небольшой наклон вправо
    }));

    // редкие крупные капли с рябью на воде
    const splashes = Array.from({ length: 12 }, () => ({
      x:     Math.random(),
      y:     0.72 + Math.random() * 0.22,
      r:     0,
      maxR:  4 + Math.random() * 8,
      alpha: 0,
      timer: Math.random() * 60,
      delay: 18 + Math.floor(Math.random() * 40),
    }));

    let running = false;
    let animId  = null;

    function draw() {
      if (!running || document.hidden) return; // ← ВОТ ЭТА СТРОКА
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // дождь
      drops.forEach(d => {
        d.y += d.speed;
        if (d.y > 1.05) {
          d.y = -0.05 - Math.random() * 0.1;
          d.x = Math.random();
        }

        const x1 = d.x * W;
        const y1 = d.y * H;
        const x2 = x1 + Math.sin(d.angle) * d.len;
        const y2 = y1 + Math.cos(d.angle) * d.len;

        ctx.save();
        ctx.globalAlpha = d.alpha;
        ctx.strokeStyle = `rgba(147,210,240,1)`;
        ctx.lineWidth   = d.width;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      });

      // рябь от капель
      splashes.forEach(s => {
        s.timer--;
        if (s.timer <= 0) {
          s.r     = 0;
          s.alpha = 0.5;
          s.timer = s.delay;
          s.x     = 0.05 + Math.random() * 0.9;
        }
        if (s.r < s.maxR) {
          s.r     += 0.4;
          s.alpha *= 0.92;
        }
        if (s.r > 0) {
          ctx.save();
          ctx.globalAlpha = s.alpha * 0.6;
          ctx.strokeStyle = 'rgba(147,210,240,0.8)';
          ctx.lineWidth   = 0.6;
          ctx.beginPath();
          ctx.ellipse(s.x * W, s.y * H, s.r * 2, s.r * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(draw);
    }

    const obs = new MutationObserver(() => {
      const active = section.classList.contains('active');
      if (active && !running)  { resize(); running = true; draw(); }
      if (!active && running)  {
        running = false;
        cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    obs.observe(section, { attributes: true, attributeFilter: ['class'] });

    if (section.classList.contains('active')) { running = true; draw(); }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', setup)
    : setup();
})();
(function() {
  function setup() {
    const section = document.getElementById('page-jjk-toji');
    if (!section) return;
    const canvas = section.querySelector('.toji-slash-canvas');
    if (!canvas) return;

    function resize() {
      canvas.width  = section.offsetWidth  || window.innerWidth;
      canvas.height = section.offsetHeight || window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');

    // шаблоны разрезов — координаты в долях экрана
    const SLASH_TEMPLATES = [
      // главный — длинный диагональный сверху-слева вниз-вправо
      { x1:0.08, y1:0.05, x2:0.72, y2:0.88, w:2.2, gap: [180,320] },
      // короткий острый — поперечный
      { x1:0.55, y1:0.12, x2:0.92, y2:0.42, w:1.4, gap: [240,400] },
      // снизу — восходящий
      { x1:0.10, y1:0.78, x2:0.58, y2:0.30, w:1.0, gap: [300,480] },
      // тонкий акцент справа
      { x1:0.70, y1:0.60, x2:0.98, y2:0.95, w:0.7, gap: [200,360] },
    ];

    // активные разрезы
    const slashes = SLASH_TEMPLATES.map((t, i) => ({
      ...t,
      phase:    'idle',   // idle | draw | hold | fade
      progress: 0,        // 0..1 draw progress
      alpha:    0,
      timer:    i * 55,   // стартовая задержка
      holdTime: 0,
    }));

    let running = false;
    let animId  = null;

    function drawSlash(s, W, H) {
      const x1 = s.x1 * W, y1 = s.y1 * H;
      const x2 = s.x2 * W, y2 = s.y2 * H;

      // текущий конец линии по progress
      const cx = x1 + (x2 - x1) * s.progress;
      const cy = y1 + (y2 - y1) * s.progress;

      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx*dx + dy*dy);
      const nx = -dy / len, ny = dx / len; // нормаль

      ctx.save();
      ctx.globalAlpha = s.alpha;

      // — основной разрез —
      const g = ctx.createLinearGradient(x1, y1, cx, cy);
      g.addColorStop(0,   'rgba(80,160,70,0)');
      g.addColorStop(0.1, `rgba(100,200,80,${s.alpha})`);
      g.addColorStop(0.5, `rgba(140,230,100,${s.alpha})`);
      g.addColorStop(0.9, `rgba(80,180,60,${s.alpha})`);
      g.addColorStop(1,   'rgba(60,140,50,0)');

      ctx.strokeStyle = g;
      ctx.lineWidth   = s.w * 1.8;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      // — свечение вокруг —
      ctx.globalAlpha = s.alpha * 0.35;
      ctx.strokeStyle = 'rgba(120,220,90,1)';
      ctx.lineWidth   = s.w * 6;
      ctx.filter      = 'blur(4px)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.filter = 'none';

      // — яркий белый центр —
      ctx.globalAlpha = s.alpha * 0.7;
      ctx.strokeStyle = 'rgba(220,255,200,1)';
      ctx.lineWidth   = s.w * 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      // — вспышка на конце (кончик клинка) —
      if (s.phase === 'draw' && s.progress < 0.98) {
        ctx.globalAlpha = s.alpha * 0.9;
        const tipG = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.w * 8);
        tipG.addColorStop(0,   'rgba(200,255,180,0.9)');
        tipG.addColorStop(0.4, 'rgba(100,220,80,0.5)');
        tipG.addColorStop(1,   'rgba(60,140,50,0)');
        ctx.fillStyle = tipG;
        ctx.beginPath();
        ctx.arc(cx, cy, s.w * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // — осколки вдоль разреза — маленькие засечки —
      if (s.progress > 0.3) {
        ctx.globalAlpha = s.alpha * 0.4;
        ctx.strokeStyle = 'rgba(160,240,120,1)';
        ctx.lineWidth   = 0.6;
        const steps = Math.floor(s.progress * 8);
        for (let i = 1; i <= steps; i++) {
          const t   = i / 9;
          const px  = x1 + (cx - x1) * t;
          const py  = y1 + (cy - y1) * t;
          const sz  = (2 + Math.random() * 4) * (i % 2 === 0 ? 1 : -1);
          ctx.beginPath();
          ctx.moveTo(px + nx * sz * 0.5, py + ny * sz * 0.5);
          ctx.lineTo(px + nx * sz * 3,   py + ny * sz * 3);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    function tick() {
      if (!running) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      slashes.forEach(s => {
        if (s.phase === 'idle') {
          s.timer--;
          if (s.timer <= 0) {
            s.phase    = 'draw';
            s.progress = 0;
            s.alpha    = 0.92;
          }
        } else if (s.phase === 'draw') {
          s.progress += 0.038;
          if (s.progress >= 1) {
            s.progress = 1;
            s.phase    = 'hold';
            s.holdTime = 40 + Math.floor(Math.random() * 30);
          }
          drawSlash(s, W, H);
        } else if (s.phase === 'hold') {
          s.holdTime--;
          drawSlash(s, W, H);
          if (s.holdTime <= 0) s.phase = 'fade';
        } else if (s.phase === 'fade') {
          s.alpha -= 0.018;
          if (s.alpha <= 0) {
            s.alpha    = 0;
            s.phase    = 'idle';
            s.timer    = s.gap[0] + Math.floor(Math.random() * (s.gap[1] - s.gap[0]));
            s.progress = 0;
          } else {
            drawSlash(s, W, H);
          }
        }
      });

      animId = requestAnimationFrame(tick);
    }

    const obs = new MutationObserver(() => {
      const active = section.classList.contains('active');
      if (active && !running)  { resize(); running = true; tick(); }
      if (!active && running)  {
        running = false;
        cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    obs.observe(section, { attributes: true, attributeFilter: ['class'] });

    if (section.classList.contains('active')) { running = true; tick(); }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', setup)
    : setup();
})();

function initVideoModal() {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('video-modal-player');
  const closeBtn = document.getElementById('video-modal-close');

  if (!modal || !player || !closeBtn) return;

  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      const src = card.dataset.video;
      player.src = src;
      modal.classList.add('open');
      player.play();
    });
  });

  function closeModal() {
    modal.classList.remove('open');
    player.pause();
    player.src = '';
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Transitions.init();
  HubCanvas.init();
  Particles.init();
  CursorSystem.init();
  HoloEffect.init();
  CRTGlitch.init();
  RevealObserver.init();
  Parallax.init();
  Nav.init();
  Touch.init();
  initEasterEggs();
  initSteinStitches();
  SoulEaterFog.init();
  initKidAurora();
  initVideoModal();

  const hub = $('page-hub');
  hub.classList.add('active');
  Particles.type = 'stars';
  Particles.color = '#9b4dca';

  // ── Пауза всего при скрытой вкладке ──────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      HubCanvas.stop();
      Particles.stop(false);
      if (soulEaterAudio && !soulEaterAudio.paused) soulEaterAudio.pause();
      if (stardewAudio && !stardewAudio.paused) stardewAudio.pause();
      Object.values(SoulEaterFog.instances).forEach(i => i.stop());

      // ✅ ДОБАВЬ ЭТО — останавливает все остальные canvas-анимации страниц
      if (window._kidAuroraId)   cancelAnimationFrame(window._kidAuroraId);
      if (window._rainAnimId)    cancelAnimationFrame(window._rainAnimId);
      if (window._tojiSlashId)   cancelAnimationFrame(window._tojiSlashId);

    } else {
      if (currentPage === 'hub') HubCanvas.start();
      else {
        const ap = document.querySelector('.page.active');
        if (ap) { Particles.setPage(ap); Particles.start(); }
      }
      if (soulEaterAudio?.currentTime > 0) soulEaterAudio.play().catch(() => {});
      if (stardewAudio?.currentTime > 0) stardewAudio.play().catch(() => {});
      Object.values(SoulEaterFog.instances).forEach(i => i.start());
    }
  });
  // ─────────────────────────────────────────────────────

}); // ← закрывающая скобка DOMContentLoaded

