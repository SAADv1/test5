// غرفة المحاكاة ثلاثية الأبعاد: بيئة موضوعية خاصة بكل درس، محاكاة مركزية، ستة أكشاك معروضات، وشاشة تفتيش
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeMaterials, panelTexture, wrapText, latexPlain, rbox, lathe, mesh, FONT, Arrow } from './kit.js';
import { WalkControls } from './controls.js';
import { buildEnvironment } from './environments.js';
import { Orbits, Satellite, Disk, Torque, Seesaw, Impulse, Collision, Work, Lever, Forms, Ramp, Thermal, Phase } from './sims_more.js';
import { solve, texMap, fill, rich, tex, evalExpr, paramPlain, plainNum } from '../fmt.js';
import { TEACHER } from '../config.js';
import { quizHTML, wireQuiz, ideasHTML, mythsHTML, labHTML } from '../teach.js';

const SIMS = { orbits: Orbits, satellite: Satellite, disk: Disk, torque: Torque, seesaw: Seesaw, impulse: Impulse, collision: Collision, work: Work, lever: Lever, forms: Forms, ramp: Ramp, thermal: Thermal, phase: Phase };
const KIND = { problem: 'مسألة محلولة', explorer: 'مستكشف تفاعلي', history: 'لوحة تاريخية', quiz: 'اختبار ومراجعة' };
const ENV_NAMES = { '1-1': 'المرصد الفلكي', '1-2': 'محطة الفضاء المدارية', '2-1': 'قاعة الدوران', '2-2': 'الورشة الهندسية', '2-3': 'معرض العمارة والتوازن', '3-1': 'الملعب التقني', '3-2': 'نفق التصادم', '4-1': 'المستودع اللوجستي', '4-2': 'قاعة الآلات', '5-1': 'جناح الطاقة', '5-2': 'قاعة الأفعوانية', '6-1': 'المختبر الحراري', '6-2': 'مختبر البخار' };

export class Room {
  constructor(el, L, { onExit, onHome, onInspect }) {
    // كشك «محطة المراجعة» يُضاف إلى معروضات كل قاعة
    const quizEx = { id: `${L.code}-quiz`, kind: 'quiz', title: 'محطة المراجعة: اختبر فهمك', tag: 'مراجعة',
      body: `${(L.quiz || []).length} أسئلة سريعة مع تفسير كل إجابة، وأهم أفكار الدرس، والأخطاء الشائعة.` };
    if ((L.quiz || []).length) L = { ...L, exhibits: [...L.exhibits, quizEx] };
    try { this.present = localStorage.getItem('room-present') === '1'; } catch { this.present = false; }
    this.el = el; this.L = L; this.code = L.code; this.onExit = onExit; this.onHome = onHome; this.onInspectCb = onInspect;
    this.isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    // الأجهزة اللمسية (جوال وأيباد) تستخدم الجودة المتوازنة لضمان السلاسة
    // جودة عالية على كل الأجهزة (كمبيوتر وجوال وأيباد)؛ تُخفَّض فقط للأجهزة ضعيفة الذاكرة
    this.quality = { high: (navigator.deviceMemory ?? 8) >= 3, bloom: true };
    // وضع الاختبار السريع (?fast): دقة منخفضة دون ظلال أو توهج — لتسريع الاختبارات الآلية فقط
    this.fast = new URLSearchParams(location.search).has('fast');
    this.thumb = new URLSearchParams(location.search).has('thumb'); // لقطات المعاينة لصفحة المعرض
    this.quality.bloom = false; // بلا توهج: يزيل السطوع حول الأضواء والشاشات
    if (this.fast) Object.assign(this.quality, { high: false, bloom: false });
    this.color = L.chapter.color;
    this.ready = this.init();
  }

  /* ─── الواجهة ─── */
  buildDOM() {
    const L = this.L;
    this.el.style.setProperty('--c', this.color);
    this.el.innerHTML = `
      <canvas class="room-cv" aria-label="غرفة محاكاة ${L.title}"></canvas>
      <header class="hud-top">
        <button class="hud-btn" data-act="exit" aria-label="العودة إلى البطاقة"><span>→</span><em>البطاقة</em></button>
        <div class="hud-title"><b>${L.code}</b><div><strong>${L.title}</strong><small>${ENV_NAMES[L.code] || ''} · ${TEACHER}</small></div></div>
        <div class="hud-right"><button class="hud-btn" data-act="present" aria-pressed="false" title="وضع العرض: خط أكبر وكشف الخطوات تدريجياً (→ ← أو مسافة)"><span>▣</span><em>عرض</em></button>
        <button class="hud-btn" data-act="home" aria-label="الصفحة الرئيسية"><span>✦</span><em>الرئيسية</em></button></div>
      </header>
      <aside class="readout" aria-live="off"><div class="ro-head">قراءات المحاكاة <i class="live"></i></div><dl></dl>
        <div class="ro-graph-wrap"><canvas class="ro-graph" width="460" height="150"></canvas><ul class="ro-series"></ul></div>
        <ul class="legend"></ul></aside>
      <div class="simbar" role="toolbar" aria-label="التحكم بالمحاكاة">
        <button data-sb="play" aria-label="إيقاف مؤقت / تشغيل" title="إيقاف/تشغيل (مسافة)"><span class="ic-pause">❚❚</span><span class="ic-play">▶</span></button>
        <div class="sb-speed" role="group" aria-label="سرعة المحاكاة">${[0.25, 0.5, 1, 2].map((v) => `<button data-speed="${v}" aria-pressed="${v === 1}">${v === 0.25 ? '¼' : v === 0.5 ? '½' : v}×</button>`).join('')}</div>
        <button data-sb="reset" aria-label="إعادة التشغيل" title="إعادة التشغيل">↺</button>
        <button data-sb="vec" aria-pressed="true" title="إظهار/إخفاء المتجهات"><span>⇗</span><em>المتجهات</em></button>
        <button data-sb="trail" aria-pressed="true" title="إظهار/إخفاء أثر الحركة"><span>⋯</span><em>الأثر</em></button>
      </div>
      <div class="prompt" hidden></div>
      <nav class="ex-dock" aria-label="المعروضات">
        <button class="dock-toggle" aria-expanded="false">المعروضات <b>${L.exhibits.length + 1}</b></button>
        <div class="dock-list" hidden></div>
      </nav>
      <p class="help">${this.isTouch
        ? 'المس يسار الشاشة واسحب للتحرك · اسحب يميناً للنظر · اقرص للتقريب · المس معروضاً للتفتيش'
        : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> للحركة · اسحب بالماوس للنظر · انقر معروضاً أو اضغط <kbd>E</kbd> للتفتيش'}</p>
      <aside class="inspect" hidden role="dialog" aria-modal="false" aria-label="شاشة التفتيش"></aside>`;
    this.cv = this.el.querySelector('.room-cv');
    this.el.querySelector('[data-act="exit"]').onclick = () => this.onExit();
    this.el.querySelector('[data-act="home"]').onclick = () => this.onHome();
    const pb = this.el.querySelector('[data-act="present"]');
    const setPresent = (on) => {
      this.present = on; this.el.classList.toggle('present', on); pb.setAttribute('aria-pressed', String(on));
      try { localStorage.setItem('room-present', on ? '1' : '0'); } catch {}
      if (this.inspecting) { const st = this.panel.scrollTop; this.inspecting === 'stage' ? this.renderStage() : this.renderExhibit(this.L.exhibits.find((e) => e.id === this.inspecting)); this.panel.scrollTop = st; }
      setTimeout(() => this.updateOffset(), 50);
    };
    pb.onclick = () => setPresent(!this.present); setPresent(this.present);
    const dock = this.el.querySelector('.dock-list'), tog = this.el.querySelector('.dock-toggle');
    const items = [{ id: 'stage', title: L.sim.title, kind: 'sim' }, ...L.exhibits];
    dock.innerHTML = items.map((e, i) => `<button data-id="${e.id}"><i>${i === 0 ? '◎' : i}</i><span>${e.title}</span><small>${e.kind === 'sim' ? 'المحاكاة الرئيسية' : KIND[e.kind]}</small></button>`).join('');
    tog.onclick = () => { const open = dock.hidden; dock.hidden = !open; tog.setAttribute('aria-expanded', String(open)); };
    dock.querySelectorAll('button').forEach((b) => (b.onclick = () => { dock.hidden = true; tog.setAttribute('aria-expanded', 'false'); this.inspect(b.dataset.id); }));
    this.panel = this.el.querySelector('.inspect'); this.promptEl = this.el.querySelector('.prompt');
    this.readoutEl = this.el.querySelector('.readout dl');
    this.el.querySelector('.ro-head').onclick = () => this.el.querySelector('.readout').classList.toggle('open');
    // شريط التحكم بالمحاكاة
    this.paused = false; this.speed = 1; this.series = []; this.gT = 0; Arrow.hidden = false;
    const bar = this.el.querySelector('.simbar');
    bar.querySelector('[data-sb="play"]').onclick = () => this.togglePause();
    const speeds = [...bar.querySelectorAll('[data-speed]')];
    speeds.forEach((b, i) => (b.onclick = () => {
      // على الشاشات الصغيرة يظهر زر السرعة الحالية فقط: الضغط عليه ينتقل للسرعة التالية
      if (b.getAttribute('aria-pressed') === 'true' && innerWidth <= 380) b = speeds[(i + 1) % speeds.length];
      this.speed = +b.dataset.speed; speeds.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    bar.querySelector('[data-sb="reset"]').onclick = () => { this.sim.clearTrails(); this.sim.onParam?.('reset'); this.series = []; };
    bar.querySelector('[data-sb="vec"]').onclick = (e) => { Arrow.hidden = !Arrow.hidden; e.currentTarget.setAttribute('aria-pressed', String(!Arrow.hidden)); };
    bar.querySelector('[data-sb="trail"]').onclick = (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; this.sim.setTrails(on); e.currentTarget.setAttribute('aria-pressed', String(on)); };
    this.graphCv = this.el.querySelector('.ro-graph');
  }

  togglePause() { this.paused = !this.paused; this.el.querySelector('.simbar').classList.toggle('paused', this.paused); }

  /** رسم بياني حي لأهم كميات المحاكاة */
  sampleGraph(dt) {
    const g = this.sim.graph?.(); const wrap = this.el.querySelector('.ro-graph-wrap');
    if (!g) { wrap.hidden = true; return; } wrap.hidden = false;
    if (!this.paused) {
      this.gT += dt; if (this.gT < 0.08) return; this.gT = 0;
      if (this.series.length !== g.length) this.series = g.map((x) => ({ ...x, v: [] }));
      g.forEach((x, i) => { const sr = this.series[i]; sr.v.push(x.value); if (sr.v.length > 140) sr.v.shift(); sr.value = x.value; });
    }
    const cv = this.graphCv, c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    let lo = Infinity, hi = -Infinity; this.series.forEach((sr) => sr.v.forEach((v) => { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if (!isFinite(lo)) return; if (hi - lo < 1e-6) { hi += 1; lo -= 1; } const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(0, k * H / 4); c.lineTo(W, k * H / 4); c.stroke(); }
    if (lo < 0 && hi > 0) { const y0 = H - ((0 - lo) / (hi - lo)) * H; c.strokeStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(0, y0); c.lineTo(W, y0); c.stroke(); }
    this.series.forEach((sr) => { c.strokeStyle = sr.color; c.lineWidth = 3; c.shadowColor = sr.color; c.shadowBlur = 6; c.beginPath();
      sr.v.forEach((v, i) => { const x = (i / 139) * W, y = H - ((v - lo) / (hi - lo)) * H; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.shadowBlur = 0; });
    this.gL = (this.gL || 0) + 1;
    if (this.gL % 6 === 0) this.el.querySelector('.ro-series').innerHTML = this.series.map((sr) => `<li><i style="--k:${sr.color}"></i>${sr.label}<b>${plainNum(sr.value)}</b></li>`).join('');
  }

  async init() {
    this.buildDOM();
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, powerPreference: 'high-performance' });
    this.maxPR = this.fast ? 0.5 : Math.min(devicePixelRatio || 1, 2); this.pr = this.maxPR;
    this.minPR = this.fast ? 0.5 : Math.min(this.maxPR, this.isTouch ? 1.25 : 1);
    r.setPixelRatio(this.pr);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = !this.fast; r.shadowMap.type = THREE.PCFShadowMap;
    const scene = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.05, 400);
    this.mats = makeMaterials(this.quality);

    // البيئة الموضوعية للدرس
    const env = this.env = buildEnvironment(this.code, { scene, mats: this.mats, quality: this.quality, color: this.color, L: this.L });
    scene.background = new THREE.Color(env.bg); if (env.fog) scene.fog = new THREE.Fog(env.bg, env.fog[0], env.fog[1]);
    scene.environmentIntensity = (env.envI ?? 0.5) * 0.8; r.toneMappingExposure = (env.exposure ?? 1) * 0.8;
    // إضاءة أهدأ: تخفيف شدة كل مصادر الضوء في البيئة
    const spots = []; scene.traverse((o) => { if (o.isSpotLight) spots.push(o); else if (o.isLight) o.intensity *= o.isHemisphereLight ? 0.85 : 0.65; });
    spots.forEach((l) => { l.parent.remove(l); l.target?.parent?.remove(l.target); }); // الأضواء المسلطة كانت تصنع بقعاً لامعة على الأرضيات
    this.stage = env.stage.clone(); this.daisTop = env.dais.top;
    this.buildTitle(); this.buildPlaques();

    const Sim = SIMS[this.L.sim.type];
    this.sim = new Sim({ mats: this.mats, quality: this.quality, scene }, this.L.sim.params);
    this.sim.root.position.add(this.stage); scene.add(this.sim.root);
    this.buildExhibits();
    this.renderLegend();

    // التحكم: طبقة إدخال موحّدة فوق المشهد
    this.controls = new WalkControls(this.camera, this.el, { onTap: (x, y) => this.tap(x, y), isTouch: this.isTouch });
    this.el.insertBefore(this.controls.layer, this.el.querySelector('.hud-top'));
    this.controls.bounds = env.bounds;
    const dz = env.dais;
    this.controls.colliders = [
      dz.rect ? { rect: [this.stage.x - 3.95, this.stage.x + 3.95, this.stage.z - 2.15, this.stage.z + 2.15] } : { x: this.stage.x, z: this.stage.z, r: dz.radius },
      ...this.exhibitObjs.map((o) => ({ x: o.group.position.x, z: o.group.position.z, r: 0.75 })),
      ...(env.colliders || []),
    ];
    this.camera.position.copy(env.spawn);
    this.controls.fov = this.camera.fov = this.baseFov(this.el.clientWidth, this.el.clientHeight);
    if (this.isPortrait()) this.camera.position.lerp(new THREE.Vector3(this.stage.x, 1.65, env.spawn.z + 0.8), 0.6);
    this.controls.lookAt(new THREE.Vector3(this.stage.x, 1.2, this.stage.z));

    // التوهّج (Bloom) لإضاءات LED والشاشات
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(scene, this.camera));
    const [bs, br, bt] = env.bloom || [0.5, 0.4, 0.85];
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), bs * 0.55, br * 0.8, bt + 0.1);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());

    this._key = (e) => {
      if (e.code === 'KeyE' && !this.inspecting && this.nearest) this.inspect(this.nearest.id);
      if (e.code === 'Escape' && this.inspecting) this.closeInspect();
      const typing = e.target.closest?.('input,textarea,select');
      if (this.present && !typing) {
        if (['PageDown', 'ArrowDown', 'ArrowLeft', 'Space', 'Enter'].includes(e.code)) { if (e.code === 'Enter' && e.target.closest?.('button')) return; e.preventDefault(); return this.presentNext(); }
        if (['PageUp', 'ArrowUp', 'ArrowRight'].includes(e.code)) { e.preventDefault(); return this.presentPrev(); }
      }
      if (e.code === 'Space' && !e.target.closest?.('input,button,textarea')) { e.preventDefault(); this.togglePause(); }
    };
    addEventListener('keydown', this._key);
    this._resize = () => this.resize(); addEventListener('resize', this._resize); addEventListener('orientationchange', this._resize); this.resize();
    this.last = performance.now(); this.elapsed = 0; this.running = true; this.ftimes = []; this.roT = 0;
    const loop = () => { if (!this.running) return; this.raf = requestAnimationFrame(loop); this.frame(); };
    if (this.thumb) { this.el.classList.add('thumb'); this.frames = 0; }
    loop();
  }

  /* ─── لوحة العنوان واللوحات الجدارية ─── */
  buildTitle() {
    const t = this.env.title; const L = this.L;
    const tex = panelTexture(2048, 880, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d111c'); gr.addColorStop(1, '#151a28'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = this.color; g.fillRect(0, h - 10, w, 10);
      g.textAlign = 'center'; g.fillStyle = this.color; g.font = `600 52px ${FONT}`; g.fillText(`${L.code} · الفصل ${L.chapter.id} · ${L.chapter.title}`, w / 2, 70);
      g.fillStyle = '#f4f1ea'; g.font = `700 118px Amiri, ${FONT}`; g.fillText(L.title, w / 2, 150, w - 120);
      g.direction = 'ltr'; g.font = 'italic 500 150px "Times New Roman", serif'; g.fillStyle = '#ffffff'; g.fillText(latexPlain(L.main.latex), w / 2, 420, w - 160);
      g.direction = 'rtl'; g.font = `500 50px ${FONT}`; g.fillStyle = '#a6aecb'; g.fillText(L.main.label, w / 2, 660);
      g.fillStyle = this.color; g.font = `600 46px ${FONT}`; g.fillText(TEACHER, w / 2, 760);
    });
    const g = new THREE.Group(); g.position.copy(t.pos); g.rotation.y = t.ry;
    const frame = mesh(rbox(t.w + 0.16, t.h + 0.16, 0.08, 0.04), this.mats.graphite, false);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(t.w, t.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.92, 0.92, 0.92) }));
    face.position.z = 0.045;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.1, 0.025, 0.02), this.mats.led(this.color, 2.4)); edge.position.set(0, -t.h / 2 - 0.1, 0.05);
    g.add(frame, face, edge); this.scene.add(g);
  }

  buildPlaques() {
    const fx = (this.L.formulas || []).filter((f) => f.latex.length < 60);
    const list = fx.length ? fx : this.L.related.map((e) => ({ name: e.label, latex: e.latex, simple: '' }));
    (this.env.plaques || []).slice(0, list.length).forEach((p, i) => {
      const e = list[i];
      const pt = panelTexture(1024, 400, (g, w, h) => {
        g.fillStyle = '#0d111c'; g.fillRect(0, 0, w, h); g.fillStyle = this.color; g.fillRect(w - 10, 0, 10, h);
        g.textAlign = 'center'; g.fillStyle = this.color; g.font = `600 40px ${FONT}`; g.fillText(e.name, w / 2, 44);
        g.direction = 'ltr'; g.fillStyle = '#ffffff'; g.font = 'italic 500 84px "Times New Roman", serif'; g.fillText(latexPlain(e.latex), w / 2, 160, w - 80);
        if (e.simple) { g.direction = 'rtl'; g.fillStyle = '#c9cfe3'; g.font = `500 34px ${FONT}`; wrapText(g, e.simple, w - 100).slice(0, 2).forEach((ln, k) => g.fillText(ln, w / 2, 290 + k * 46)); }
      });
      const grp = new THREE.Group(); grp.position.set(p.x, p.y, p.z); grp.rotation.y = p.ry;
      const back = mesh(rbox(2.24, 0.95, 0.05, 0.03), this.mats.graphite, false);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.82), new THREE.MeshBasicMaterial({ map: pt, toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) })); face.position.z = 0.03;
      grp.add(back, face); this.scene.add(grp);
    });
  }

  /* ─── أكشاك المعروضات (تصميم عصري) ─── */
  exhibitPanel(ex, i) {
    const vals = ex.params?.length ? Object.fromEntries(ex.params.map((p) => [p.key, p.value])) : {};
    let text = ex.kind === 'history' || ex.kind === 'quiz' ? ex.body : '';
    if (ex.kind !== 'history' && ex.kind !== 'quiz') {
      const map = {}; for (const p of ex.params) map[p.key] = paramPlain(p, vals[p.key]);
      text = ex.statement.replace(/\[\[(\w+)\]\]/g, (_, k) => map[k] ?? '…').replace(/\$([^$]+)\$/g, (_, m) => latexPlain(m));
    }
    return panelTexture(1024, 720, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#111626'); gr.addColorStop(1, '#0a0d17'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.fillStyle = this.color; g.fillRect(w - 12, 0, 12, h);
      g.textAlign = 'right'; g.fillStyle = this.color; g.font = `600 34px ${FONT}`; g.fillText(`${String(i + 1).padStart(2, '0')} · ${KIND[ex.kind]} · ${ex.tag}`, w - 48, 44);
      g.fillStyle = '#ffffff'; g.font = `700 70px Amiri, ${FONT}`;
      const tl = wrapText(g, ex.title, w - 96); tl.slice(0, 2).forEach((ln, k) => g.fillText(ln, w - 48, 100 + k * 78));
      const y0 = 100 + Math.min(2, tl.length) * 78 + 20;
      g.fillStyle = '#b9c0d8'; g.font = `400 33px ${FONT}`;
      wrapText(g, text, w - 96).slice(0, 6).forEach((ln, k) => g.fillText(ln, w - 48, y0 + k * 50));
      g.strokeStyle = this.color; g.lineWidth = 3; g.beginPath(); g.roundRect(48, h - 100, 330, 62, 31); g.stroke();
      g.fillStyle = this.color; g.font = `700 31px ${FONT}`; g.textAlign = 'center'; g.fillText(this.isTouch ? 'المس للتفتيش' : 'انقر للتفتيش', 213, h - 85);
    });
  }

  /** مواضع إضافية للأكشاك: منتصف كل كشكين متجاورين على الجدار نفسه (مع تجنّب اللوحات الجدارية) */
  allSlots(n) {
    const base = this.env.slots; if (n <= base.length) return base;
    const out = [...base]; const S = this.stage; const plaques = this.env.plaques || [];
    for (const [d0, d1] of [[3.2, 6.2], [6.2, 9.5]]) for (let i = 0; i < base.length && out.length < n; i++) for (let j = i + 1; j < base.length && out.length < n; j++) {
      const a = base[i], b = base[j]; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < d0 || d > d1) continue;
      const c = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, ry: a.ry };
      if (Math.abs(a.ry - b.ry) > 1e-3) c.ry = Math.atan2(S.x - c.x, S.z - c.z);
      for (const p of plaques) if (Math.sign(p.x) === Math.sign(c.x) && Math.abs(p.z - c.z) < 1.2 && (p.y ?? 2) < 3.2) c.z += (c.z >= p.z ? 1 : -1) * (1.25 - Math.abs(p.z - c.z));
      if (out.every((o) => Math.hypot(o.x - c.x, o.z - c.z) > 1.6)) out.push(c);
    }
    return out;
  }

  buildExhibits() {
    const M = this.mats, col = this.color;
    const baseGeo = rbox(0.62, 1.0, 0.42, 0.08, 4), screenGeo = rbox(1.14, 0.82, 0.05, 0.03, 3), footGeo = lathe([[0, 0], [0.5, 0], [0.52, 0.02], [0.46, 0.05], [0, 0.05]], 48);
    const slots = this.allSlots(this.L.exhibits.length);
    this.exhibitObjs = this.L.exhibits.map((ex, i) => {
      const s = slots[i % slots.length];
      const grp = new THREE.Group(); grp.position.set(s.x, 0, s.z); grp.rotation.y = s.ry;
      const foot = mesh(footGeo, M.chrome);
      const base = mesh(baseGeo, M.graphite); base.position.y = 0.55;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.012), M.led(col, 2.2)); strip.position.set(0, 0.55, 0.215);
      const head = new THREE.Group(); head.position.set(0, 1.42, 0.02); head.rotation.x = -0.42;
      const bezel = mesh(screenGeo, M.graphite);
      const tex = this.exhibitPanel(ex, i);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.76), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) })); face.position.z = 0.027;
      const neck = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12), M.chrome); neck.position.set(0, 1.17, 0);
      head.add(bezel, face);
      const gem = new THREE.Mesh(ex.kind === 'history' ? new THREE.TorusGeometry(0.08, 0.025, 12, 40) : ex.kind === 'explorer' ? new THREE.OctahedronGeometry(0.1) : ex.kind === 'quiz' ? new THREE.TorusKnotGeometry(0.06, 0.02, 64, 8) : new THREE.IcosahedronGeometry(0.1, 0),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.3 }));
      gem.position.set(0, 2.05, 0);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.6, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012;
      grp.add(foot, base, strip, neck, head, gem, ring);
      grp.traverse((o) => { o.userData.pick = ex.id; });
      this.scene.add(grp);
      return { id: ex.id, ex, group: grp, gem, ring };
    });
    this.pickables = [this.daisTop, ...this.exhibitObjs.map((o) => o.group)];
  }

  renderLegend() {
    this.el.querySelector('.legend').innerHTML = this.sim.legend.map(([c, l]) => `<li><i style="--k:${c}"></i>${l}</li>`).join('');
  }

  /* ─── الالتقاط ─── */
  raycast(x, y) {
    const rc = new THREE.Raycaster(); const r = this.cv.getBoundingClientRect();
    rc.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), this.camera);
    const hit = rc.intersectObjects(this.pickables, true)[0];
    return hit && hit.distance < 16 ? hit.object.userData.pick : null;
  }

  tap(x, y) {
    if (this.inspecting) return;
    const id = this.raycast(x, y);
    if (id) this.inspect(id);
  }

  /* ─── التفتيش ─── */
  inspect(id) {
    const ex = id === 'stage' ? null : this.L.exhibits.find((e) => e.id === id);
    if (id !== 'stage' && !ex) return;
    if (!this.inspecting) this.savedPose = { pos: this.camera.position.clone(), yaw: this.controls.yaw, pitch: this.controls.pitch, fov: this.controls.fov };
    this.inspecting = id; this.controls.setEnabled(false);
    this.el.classList.add('inspecting');
    this.sim.reset();
    if (ex) this.renderExhibit(ex); else this.renderStage();
    this.panel.hidden = false; this.panel.scrollTop = 0;
    requestAnimationFrame(() => this.panel.classList.add('open'));
    // الكاميرا تنتقل لتؤطّر المحاكاة بينما تبقى اللوحة ظاهرة
    const pt = this.isPortrait();
    const S = this.stage; const pose = { pos: new THREE.Vector3(S.x, pt ? 2.95 : 2.5, S.z + (pt ? 6.6 : 4.6)), look: new THREE.Vector3(S.x, 1.25, S.z - 0.2) };
    this.tweenCam(pose.pos, pose.look, this.baseFov(this.el.clientWidth, this.el.clientHeight) + (pt ? 0 : 0));
    this.updateOffset();
    this.onInspectCb?.(id);
  }

  closeInspect() {
    if (!this.inspecting) return;
    this.inspecting = null; this.panel.classList.remove('open'); this.el.classList.remove('inspecting');
    setTimeout(() => { if (!this.inspecting) { this.panel.hidden = true; this.panel.innerHTML = ''; } }, 320);
    const s = this.savedPose;
    if (s) { const look = new THREE.Vector3(s.pos.x - Math.sin(s.yaw) * Math.cos(s.pitch), s.pos.y + Math.sin(s.pitch), s.pos.z - Math.cos(s.yaw) * Math.cos(s.pitch)); this.tweenCam(s.pos, look, s.fov, () => this.controls.setEnabled(true)); }
    else this.controls.setEnabled(true);
    this.updateOffset(); this.onInspectCb?.(null);
  }

  tweenCam(pos, look, fov, done) {
    const c = this.controls; const from = { pos: this.camera.position.clone(), yaw: c.yaw, pitch: c.pitch, fov: c.fov };
    const d = pos.clone().sub(look); const yaw = Math.atan2(d.x, d.z); const pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    let dy = yaw - from.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.tween = { t: 0, dur: 0.9, from, to: { pos: pos.clone(), yaw: from.yaw + dy, pitch, fov }, done };
  }

  isPortrait() { return this.el.clientHeight > this.el.clientWidth; }
  /** لوحة التفتيش جانبية في الشاشات العريضة والوضع الأفقي، وسفلية في الجوال الطولي (تطابق CSS) */
  sidePanel() { const w = this.el.clientWidth, h = this.el.clientHeight; return w > 820 || w > h; }

  navItems() { return ['stage', ...this.L.exhibits.map((e) => e.id)]; }

  /* ─── وضع العرض: التالي = خطوة الحل التالية ثم المعروض التالي ─── */
  presentNext() {
    if (!this.inspecting) return this.inspect('stage');
    const steps = this.panel.querySelectorAll('.steps li');
    if (steps.length && this.revealed < steps.length) { this.revealed++; this.applyReveal(true); return; }
    const items = this.navItems(); const i = items.indexOf(this.inspecting); if (items[i + 1]) this.inspect(items[i + 1]);
  }
  presentPrev() {
    if (!this.inspecting) return;
    const items = this.navItems(); const i = items.indexOf(this.inspecting); if (i > 0) this.inspect(items[i - 1]);
  }
  applyReveal(scroll = false) {
    if (!this.panel) return;
    const steps = [...this.panel.querySelectorAll('.steps li')]; const on = this.present;
    steps.forEach((li, k) => li.classList.toggle('hid', on && k >= this.revealed));
    const ans = this.panel.querySelector('.answer'); if (ans) ans.classList.toggle('hid', on && this.revealed < steps.length);
    const btn = this.panel.querySelector('[data-reveal-next]');
    if (btn) { btn.hidden = !on; btn.textContent = this.revealed < steps.length ? `اكشف الخطوة ${this.revealed + 1} من ${steps.length} ◂` : 'المعروض التالي ◂'; }
    if (scroll && on) (steps[this.revealed - 1] || ans)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  panelHead(tag, title, kindLabel) {
    const items = this.navItems(); const i = items.indexOf(this.inspecting);
    return `<div class="ip-head">
      <div class="ip-meta"><span class="ip-tag">${tag}</span><span class="ip-kind">${kindLabel}</span></div>
      <div class="ip-nav">
        <button data-nav="${items[i - 1] || ''}" ${i > 0 ? '' : 'disabled'} aria-label="السابق">→</button>
        <button data-nav="${items[i + 1] || ''}" ${i < items.length - 1 ? '' : 'disabled'} aria-label="التالي">←</button>
        <button data-close aria-label="إغلاق">✕</button>
      </div></div><h2 class="ip-title">${title}</h2>`;
  }

  wirePanel() {
    this.panel.querySelector('[data-close]').onclick = () => this.closeInspect();
    this.panel.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => b.dataset.nav && this.inspect(b.dataset.nav)));
    this.panel.querySelector('.ip-grip')?.addEventListener('click', () => this.panel.classList.toggle('collapsed'));
  }

  renderStage() {
    const sim = this.L.sim; const defs = sim.params;
    const names = defs.mode?.names; const cur = Math.round(this.sim.p.mode || 0);
    const shown = Object.entries(defs).filter(([k, d]) => (names ? k !== 'mode' : true) && (!d.modes || d.modes.includes(cur)));
    const scenes = names ? `<section class="ip-sec"><h3>المشهد</h3><div class="scenes">${names.map((n, i) => `<button data-scene="${i}" class="${i === cur ? 'on' : ''}">${n}</button>`).join('')}</div></section>` : '';
    this.panel.innerHTML = `<div class="ip-grip" aria-hidden="true"></div>${this.panelHead('المحاكاة الرئيسية', sim.title, 'تحكّم مباشر')}
      <p class="ip-statement">${sim.desc}</p>${scenes}
      <section class="ip-sec"><h3>معايير المحاكاة</h3><div class="sliders">${shown.map(([k, d]) => {
        const step = (d.max - d.min) <= 1.01 ? 0.01 : (d.max - d.min) <= 20 ? 0.05 : 1; const v = this.sim.target[k] ?? d.value;
        return `<label class="sl"><span class="sl-top"><span>${d.label}</span><output data-o="${k}">${plainNum(v)} ${d.unit}</output></span>
          <input type="range" min="${d.min}" max="${d.max}" step="${step}" value="${v}" data-k="${k}"></label>`; }).join('')}</div></section>
      <section class="ip-sec"><h3>دليل المتجهات</h3><ul class="legend big">${this.sim.legend.map(([c, l]) => `<li><i style="--k:${c}"></i>${l}</li>`).join('')}</ul></section>`;
    this.wirePanel();
    this.panel.querySelectorAll('input[type=range]').forEach((inp) => (inp.oninput = () => {
      const k = inp.dataset.k, d = defs[k];
      this.panel.querySelector(`[data-o="${k}"]`).textContent = `${plainNum(+inp.value)} ${d.unit}`;
      this.sim.set({ [k]: +inp.value });
    }));
    this.panel.querySelectorAll('[data-scene]').forEach((b) => (b.onclick = () => { this.sim.set({ mode: +b.dataset.scene }); const st = this.panel.scrollTop; this.renderStage(); this.renderLegend(); this.panel.scrollTop = st; }));
  }

  renderExhibit(ex) {
    this.revealed = 0;
    if (ex.kind === 'quiz') {
      this.panel.innerHTML = `<div class="ip-grip" aria-hidden="true"></div>${this.panelHead(ex.tag, ex.title, KIND.quiz)}
        <p class="ip-statement">أجب ثم اضغط الخيار لترى التفسير؛ يمكن للمعلم عرض الأسئلة على الصف كاملاً.</p>
        <section class="ip-sec"><h3>اختبر فهمك</h3>${quizHTML(this.L)}</section>
        <section class="ip-sec"><h3>أهم الأفكار</h3>${ideasHTML(this.L)}</section>
        <section class="ip-sec"><h3>أخطاء شائعة وهل تعلم؟</h3>${mythsHTML(this.L)}</section>
        <section class="ip-sec"><h3>تجربة صفية</h3>${labHTML(this.L)}</section>`;
      this.wirePanel(); wireQuiz(this.panel); return;
    }
    if (ex.kind === 'history') {
      this.panel.innerHTML = `<div class="ip-grip" aria-hidden="true"></div>${this.panelHead(ex.tag, ex.title, KIND.history)}
        <p class="ip-statement">${ex.body}</p>
        <section class="ip-sec"><h3>محطات زمنية</h3><ol class="events">${ex.events.map(([y, t]) => `<li><b>${y}</b><span>${t}</span></li>`).join('')}</ol></section>
        <p class="ip-source">المصدر: ويكيبيديا — للسياق التاريخي فقط</p>`;
      this.wirePanel(); return;
    }
    const raw = Object.fromEntries(ex.params.map((p) => [p.key, p.value]));
    this.panel.innerHTML = `<div class="ip-grip" aria-hidden="true"></div>${this.panelHead(ex.tag, ex.title, KIND[ex.kind])}
      <p class="ip-statement" data-stmt></p>
      <section class="ip-sec"><h3>غيّر المتغيرات <button class="reset" data-rand title="تمرين جديد للطلاب بالقانون نفسه">🎲 أرقام جديدة</button><button class="reset" data-reset>إعادة الضبط</button></h3>
        <div class="sliders">${ex.params.map((p) => `<label class="sl"><span class="sl-top"><span>${p.label} <span class="m">${tex(p.sym)}</span></span><output data-o="${p.key}"></output></span>
          <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" data-k="${p.key}" aria-label="${p.label}"></label>`).join('')}</div></section>
      <div class="answer"><span>الناتج</span><div class="ans-val" data-ans dir="ltr"></div></div>
      <section class="ip-sec"><h3>الحل خطوة بخطوة</h3><ol class="steps" data-steps></ol><button class="reveal-next" data-reveal-next hidden></button></section>
      <p class="insight">💡 ${ex.insight || ''}</p>
      <p class="live-note"><i class="live"></i> المحاكاة في المنتصف تتغير لحظياً مع كل تحريك</p>`;
    this.wirePanel();
    const update = () => {
      const vals = solve(ex, raw); const map = texMap(ex, raw, vals);
      this.panel.querySelector('[data-stmt]').innerHTML = rich(fill(ex.statement, map));
      ex.params.forEach((p) => (this.panel.querySelector(`[data-o="${p.key}"]`).textContent = `${paramPlain(p, raw[p.key])} ${p.unit}`));
      const a = ex.answer; const ar = /[\u0600-\u06FF]/.test(a.unit || '');
      this.panel.querySelector('[data-ans]').innerHTML = tex(`${a.sym} = ${map[a.key]}${a.unit && !ar ? `\\;\\text{${a.unit.replace('%', '\\%')}}` : ''}`, true) + (ar ? `<span class="ans-unit">${a.unit}</span>` : '');
      this.panel.querySelector('[data-steps]').innerHTML = ex.steps.map((s, i) => `<li style="--i:${i}"><span class="st-n">${i + 1}</span><div><p>${s.t}</p><div class="st-eq" dir="ltr">${tex(fill(s.l, map), true)}</div></div></li>`).join('');
      const bind = {}; for (const [k, expr] of Object.entries(ex.bind || {})) { try { bind[k] = evalExpr(expr, vals); } catch {} }
      this.sim.set(bind);
      this.applyReveal();
    };
    this.panel.querySelector('[data-reveal-next]').onclick = () => this.presentNext();
    let pending = false;
    this.panel.querySelectorAll('input[type=range]').forEach((inp) => (inp.oninput = () => {
      raw[inp.dataset.k] = +inp.value;
      if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; update(); }); }
    }));
    this.panel.querySelector('[data-rand]').onclick = (e) => {
      e.preventDefault();
      ex.params.forEach((p) => {
        const n = Math.round((p.max - p.min) / p.step); const k = Math.round(n * (0.15 + Math.random() * 0.7));
        const v = +(p.min + k * p.step).toFixed(6); raw[p.key] = v; this.panel.querySelector(`[data-k="${p.key}"]`).value = v;
      });
      this.revealed = 0; update();
    };
    this.panel.querySelector('[data-reset]').onclick = (e) => {
      e.preventDefault(); ex.params.forEach((p) => { raw[p.key] = p.value; this.panel.querySelector(`[data-k="${p.key}"]`).value = p.value; }); update();
    };
    update();
  }

  /* ─── الحلقة ─── */
  /** زاوية رؤية مناسبة لنسبة أبعاد الشاشة (طولي، مربع تقريباً، عريض) */
  baseFov(w, h) { const a = w / h; return a < 0.62 ? 80 : a < 0.85 ? 74 : a < 1.25 ? 68 : a > 2.1 ? 56 : 62; }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    // عند تدوير الجهاز أو تغيير حجم النافذة: تُضبط زاوية الرؤية تلقائياً
    const sh = `${w > h}|${Math.round(w / 200)}`;
    if (this.controls && !this.inspecting && sh !== this.lastShape) { const f = this.baseFov(w, h); if (this.lastShape) { this.controls.fov = f; } this.lastShape = sh; }
    this.renderer.setSize(w, h, false); this.composer?.setPixelRatio(this.pr); this.composer?.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.updateOffset();
  }

  updateOffset() {
    const w = this.el.clientWidth, h = this.el.clientHeight; const c = this.camera;
    if (!this.inspecting) { c.clearViewOffset(); return; }
    if (this.sidePanel()) { const pw = w > 820 ? Math.min(460, w * 0.42) : Math.min(420, w * 0.52); c.setViewOffset(w, h, pw / 2, 0, w, h); }
    else { const ph = h * 0.56; c.setViewOffset(w, h, 0, ph / 2 - 30, w, h); }
  }

  frame() {
    const now = performance.now(); const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.elapsed += dt;
    if (this.tween) {
      const tw = this.tween; tw.t0 ??= now; tw.t = (now - tw.t0) / 1000 / tw.dur; const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.from.pos, tw.to.pos, k);
      this.controls.yaw = tw.from.yaw + (tw.to.yaw - tw.from.yaw) * k; this.controls.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * k;
      this.controls.fov = tw.from.fov + (tw.to.fov - tw.from.fov) * k;
      if (tw.t >= 1) { this.tween = null; tw.done?.(); }
      this.camera.rotation.set(this.controls.pitch, this.controls.yaw, 0, 'YXZ'); this.camera.fov = this.controls.fov; this.camera.updateProjectionMatrix();
    } else this.controls.update(dt);
    this.sim.tick(this.paused ? 0 : Math.min(dt, 0.05) * this.speed);
    this.sampleGraph(dt);
    const t = this.elapsed;
    this.env.update(dt, t);
    let best = null, bd = 2.6; const cp = this.camera.position;
    for (const o of this.exhibitObjs) {
      o.gem.rotation.y += dt * 0.9; o.gem.position.y = 2.05 + Math.sin(t * 1.5 + o.group.position.z) * 0.05;
      const d = Math.hypot(cp.x - o.group.position.x, cp.z - o.group.position.z);
      if (d < bd) { bd = d; best = o; }
    }
    let hoverId = null; const c = this.controls;
    if (!this.isTouch && c.hoverX != null && !this.inspecting && !c.pointers.size) { this.hoverT = (this.hoverT || 0) + dt; if (this.hoverT > 0.1) { this.hoverT = 0; this.hoverId = this.raycast(c.hoverX, c.hoverY); } hoverId = this.hoverId; }
    c.layer.style.cursor = hoverId ? 'pointer' : c.pointers.size ? 'grabbing' : 'grab';
    for (const o of this.exhibitObjs) { const on = o === best || o.id === hoverId; o.ring.material.opacity += ((on ? 0.95 : 0.25) - o.ring.material.opacity) * (1 - Math.exp(-dt * 8)); }
    if (best !== this.nearest) {
      this.nearest = best;
      if (best && !this.inspecting) { this.promptEl.hidden = false; this.promptEl.innerHTML = `<b>${best.ex.title}</b><span>${this.isTouch ? 'المس المعروض للتفتيش' : 'اضغط <kbd>E</kbd> أو انقر للتفتيش'}</span>`; }
      else this.promptEl.hidden = true;
    }
    if (this.inspecting) this.promptEl.hidden = true;
    this.roT += dt;
    if (this.roT > 0.2) { this.roT = 0; this.readoutEl.innerHTML = this.sim.readout().map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join(''); }
    if (this.quality.bloom) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this.adapt(dt);
    if (this.thumb && ++this.frames === 40) window.__thumbReady = true;
  }

  /** الحفاظ على السلاسة: يُطفأ التوهج أولاً ثم تُخفض دقة العرض إذا انخفض معدل الإطارات */
  adapt(dt) {
    if (this.fast) return;
    this.ftimes.push(dt); if (this.ftimes.length < 90) return;
    const avg = this.ftimes.reduce((a, b) => a + b, 0) / this.ftimes.length; this.ftimes = []; this.fps = 1 / avg;
    // تُخفض الدقة قليلاً فقط إذا هبط الأداء بوضوح (أقل من 26 إطاراً)، ولا تنزل تحت حد يحفظ الوضوح
    if (avg > 1 / 26 && this.pr > this.minPR) { this.pr = Math.max(this.minPR, this.pr - 0.25); this.renderer.setPixelRatio(this.pr); this.resize(); }
    else if (avg < 1 / 50 && this.pr < this.maxPR) { this.pr = Math.min(this.maxPR, this.pr + 0.25); this.renderer.setPixelRatio(this.pr); this.resize(); }
  }

  dispose() {
    this.running = false; cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this._key); removeEventListener('resize', this._resize); removeEventListener('orientationchange', this._resize);
    this.controls?.dispose();
    this.scene?.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { mm.map?.dispose?.(); mm.emissiveMap?.dispose?.(); mm.dispose?.(); }); });
    this.composer?.dispose?.(); this.renderer?.dispose(); this.renderer?.forceContextLoss?.();
  }
}
