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
    if (from !== 'hub' && target !== 'hub' && target !== 'letter') {
      Transitions.glitch(prev, next);
      setTimeout(() => RevealObserver.refresh(next), 100);
      return;
    }
    currentPage  = target;

    // Update accent
    const accent = next.dataset.accent || '#9b4dca';
    pageAccent = accent;
    CursorSystem.setAccent(accent);
    Particles.setPage(next);

    // Use scythe slash transition when CursorEngine is available (desktop)
    const cx = clickX || (clusterEl ? clusterEl.getBoundingClientRect().left + clusterEl.getBoundingClientRect().width/2 : window.innerWidth/2);
    const cy = clickY || (clusterEl ? clusterEl.getBoundingClientRect().top + clusterEl.getBoundingClientRect().height/2 : window.innerHeight/2);

    if (window._CursorEngine && window._CursorEngine.spawnNavSlash) {
      // Nav slash handles everything: holds, expands, triggers page switch, fades
      window._CursorEngine.spawnNavSlash(cx, cy, () => {
        prev.classList.remove('active');
        next.classList.add('active');
        next.classList.add('page-entering');
        setTimeout(() => next.classList.remove('page-entering'), 2000);
        setTimeout(() => RevealObserver.refresh(next), 60);
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
    if (this.busy) { this._show(from, to); return; }
    this.busy = true;
    this.canvas.style.display = 'block';
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    let f = 0;
    const T = 55;
    const MID = Math.floor(T / 2);  // момент смены
    let swapped = false;

    const draw = () => {
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

  init() {
    this.canvas = $('hub-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    this._genStars();
    window.addEventListener('resize', () => { this._resize(); this._genStars(); });
    this._loop();
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
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    this.t += 0.008;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0,0,W,H);

    // nebulae behind clusters
    $$('.cluster').forEach(el => {
      if (!el.id) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top  + rect.height/2;
      const color = getComputedStyle(el).getPropertyValue('--cc').trim() || '#9b4dca';
      this._drawNebula(cx, cy, 85, color);
    });

    // subtle lines between clusters
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

    // twinkling stars
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

    // Shooting stars — occasional
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

    this.animId = requestAnimationFrame(() => this._loop());
  }
};

// ── Particle System ─────────────────────────────────────
const Particles = {
  canvas: null, ctx: null,
  pts: [], type: 'stars', color: '#9b4dca',
  animId: null, t: 0,

  init() {
    this.canvas = $('global-particle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
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
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    this.t += 0.016;

    ctx.clearRect(0,0,W,H);

    while (this.pts.length < 55) this._spawn();

    this.pts = this.pts.filter(p => {
      p.x += p.vx||0; p.y += p.vy||0; p.life++;
      if (p.rot !== undefined) p.rot += p.rSpd;

      const lr = p.life / p.maxLife;
      let a = lr<0.18 ? lr/0.18 : lr>0.78 ? (1-lr)/0.22 : 1;

      if (p.isGlow) {
        const g = Math.sin(this.t*2+p.glowPh);
        a *= 0.35 + 0.65*(g*.5+.5);
      }
      if (p.twinkle) a *= 0.4+0.6*Math.abs(Math.sin(this.t*1.5+p.twPh));
      if (a<0.01 || p.life>=p.maxLife) return false;
      if (p.x<-40||p.x>W+40||p.y<-40||p.y>H+40) return false;

      ctx.save();
      ctx.globalAlpha = a * 0.72;

      if (p.isMist) {
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.sz);
        g.addColorStop(0, p.col); g.addColorStop(1,'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill();
      } else if (p.isPetal) {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.ellipse(0,0,p.sz,p.sz/2.2,0,0,Math.PI*2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.col;
        if (p.sz>1.5 || p.isGlow) { ctx.shadowColor=p.col; ctx.shadowBlur=p.sz*(p.isGlow?4:2); }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill();
      }

      ctx.restore();
      return true;
    });

    this.animId = requestAnimationFrame(() => this._loop());
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

  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
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
    if (speed > 14) {
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
    if (!_navPending) spawnSlash(e.clientX, e.clientY);
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
    _navPending = true;          // ← поднять флаг
    setTimeout(() => _navPending = false, 100);  // ← сбросить после
    const angle = speed > 1 ? Math.atan2(vy, vx) : _rand(-0.6, -0.1);  // диагональ экрана
    const len = Math.hypot(innerWidth, innerHeight) * 2.2;  // с запасом за края
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
    });
  }

  /* ══ DRAW SLASH ══ */
    function drawSlash(sl, W, H) {
    const C = Math.cos(sl.angle), S = Math.sin(sl.angle);
    const PC = S, PS = -C;

    const ex = sl.isNav ? sl.expand : 1;   // ← сначала ex
    const hw = sl.isNav                    // ← потом hw
      ? (sl.len / 2) * ex
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
    path.moveTo(tx1, ty1);
    sl.pts.forEach(p => {
      const ppx = sl.x + C * (p.t - 0.5) * sl.len;
      const ppy = sl.y + S * (p.t - 0.5) * sl.len;
      const taper = Math.sin(p.t * Math.PI);  // ← добавить
      const w = (tearW * 0.55 + p.off * (sl.isNav ? 1 : sl.life) * 0.3) * taper;  // ← * taper
      path.lineTo(ppx + PC * w, ppy + PS * w);
    });
    path.lineTo(tx2, ty2);
    sl.pts.slice().reverse().forEach(p => {
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
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.97;
      p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      const a2 = p.alpha * p.life * p.life;
      ctx.save();
      ctx.globalAlpha = a2;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

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
          /* Phase 0: Hold slash (16 frames ~0.27s) */
          sl.expand = _lerp(sl.expand, 1, 0.14);
          if (sl.timer > 16) { sl.phase = 1; sl.timer = 0; }
        } else if (sl.phase === 1) {
          /* Phase 1: Expand + swallow (26 frames ~0.43s) */
          const t = _clamp(sl.timer / 26, 0, 1);
          const ease = easeInOutQuad(t);
          sl.expand = _lerp(1, 40, ease);
          sl.len = _lerp(sl.len, Math.max(W, H) * 3, ease * 0.08);

          /* dark vignette */
          ctx.save();
          const grd = ctx.createRadialGradient(sl.x, sl.y, 0, sl.x, sl.y, Math.max(W, H) * 0.6);
          grd.addColorStop(0,   `rgba(12,4,25,${ease * 0.35})`);
          grd.addColorStop(0.3, `rgba(6,2,14,${ease * 0.8})`);
          grd.addColorStop(1,   `rgba(0,0,0,${ease * 0.99})`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();

          if (sl.timer === 12 && sl.callback) {
            sl.callback();
            sl.callback = null;
          }
          if (sl.timer > 26) { sl.phase = 2; sl.timer = 0; }
        } else if (sl.phase === 2) {
          /* Phase 2: Fade out (12 frames ~0.2s) */
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
      const hovered = document.elementFromPoint(e.clientX, e.clientY);
      if (!hovered) return;
      const card = hovered.closest('.photo-placeholder, .video-placeholder');
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
    });
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
        if (pg) Router.navigate(pg, el, e.clientX, e.clientY);
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

// ── Bootstrap ──────────────────────────────────────────
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

  // Ensure hub page visible
  const hub = $('page-hub');
  hub.classList.add('active');
  // Hub has stars
  Particles.type = 'stars';
  Particles.color = '#9b4dca';
});
