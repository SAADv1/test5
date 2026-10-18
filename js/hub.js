// الواجهة التجريبية «معرض البيئات»: تجمع القاعات الثلاث عشرة في صفحة واحدة بمعاينات حقيقية
import { tex } from './fmt.js';
import { TEACHER } from './config.js';

export const ENVS = {
  '1-1': ['المرصد الفلكي', 'قبة نجوم دوّارة ونظام شمسي يرسم قوانين كبلر أمامك'],
  '1-2': ['محطة الفضاء المدارية', 'نافذة بانورامية على الأرض وقمر صناعي يدور في مداره'],
  '2-1': ['قاعة الدوران', 'حلقات سقف تدور بسرعات مختلفة وقرص يكشف العلاقة v = rω'],
  '2-2': ['الورشة الهندسية', 'تروس عملاقة وعجلة ومفتاح لقياس العزم وذراع القوة'],
  '2-3': ['معرض العمارة والتوازن', 'أقواس بيضاء ومنحوتة معلّقة متزنة وعارضة بثلاثة أوضاع'],
  '3-1': ['الملعب التقني', 'لوح قياس قوة ومنحنى القوة-الزمن على شاشة الملعب'],
  '3-2': ['نفق التصادم', 'أقواس ضوئية متتابعة وعربتان على مسار هوائي'],
  '4-1': ['المستودع اللوجستي', 'رفوف بضائع وحاوية تُسحب بحبل لقياس الشغل'],
  '4-2': ['قاعة الآلات', 'جدار تروس وبكرات وسلاسل ورافعة تكشف الفائدة الميكانيكية'],
  '5-1': ['جناح الطاقة', 'أعمدة طاقة متوهجة وبرج إسقاط ودولاب دوّار'],
  '5-2': ['قاعة الأفعوانية', 'شريط أفعواني معلّق ومسار تتبادل عليه الطاقة صورها'],
  '6-1': ['المختبر الحراري', 'نصف بارد ونصف ساخن، وحجرتان تتبادلان الحرارة'],
  '6-2': ['مختبر البخار', 'أنابيب وخزانات ضغط وبخار، وتحولات حالة الماء'],
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildHub(el, db, { onCard, onRoom, onSwitch, onFormulas }) {
  const lessons = db.order.map((code) => db.lesson(code));
  const total = lessons.reduce((a, L) => a + L.exhibits.filter((e) => e.kind === 'problem').length, 0);
  const nEx = lessons.reduce((a, L) => a + L.exhibits.length, 0), nFx = lessons.reduce((a, L) => a + L.formulas.length, 0), nQ = lessons.reduce((a, L) => a + L.quiz.length, 0);
  const mosaic = db.order.map((c) => `<span style="background-image:url(img/rooms/${c}.jpg)"></span>`).join('');

  el.innerHTML = `
  <div class="hub-scroll">
    <header class="hub-top">
      <div class="brand"><span class="brand-mark">✦</span><div><h1>متحف فيزياء 2</h1><p>نظام المسارات · ${TEACHER}</p></div></div>
      <div class="view-switch" role="tablist" aria-label="طريقة العرض">
        <button role="tab" aria-selected="true" data-ui="hub">معرض البيئات</button>
        <button role="tab" aria-selected="false" data-ui="timeline">الخط الزمني الكوني</button>
      </div>
    </header>

    <section class="hub-hero">
      <div class="hero-mosaic" aria-hidden="true">${mosaic}${mosaic}</div>
      <div class="hero-inner">
        <p class="hero-teacher"><span>إعداد وتقديم</span><b>${TEACHER}</b></p>
        <p class="hero-kicker">ثلاث عشرة قاعة · رحلة واحدة</p>
        <h2>تجوّل داخل الفيزياء، قاعةً بعد قاعة</h2>
        <p class="hero-sub">لكل درس بيئته الخاصة: مرصد ومحطة فضاء وورشة ونفق تصادم ومختبرات… ادخل، حرّك المتغيرات، وشاهد القوانين تعمل أمامك.</p>
        <div class="hero-stats">
          <div><b>6</b><span>فصول</span></div><div><b>${lessons.length}</b><span>قاعة</span></div>
          <div><b>${total}</b><span>مسألة محلولة</span></div><div><b>${nEx}</b><span>معروضاً</span></div><div><b>${nFx}</b><span>قانوناً مبسّطاً</span></div>
        </div>
        <div class="hero-btns"><button class="hero-cta" data-start>ابدأ من القاعة الأولى <i>←</i></button><button class="hero-cta alt" data-fx>لوحة القوانين <i>ƒ</i></button></div>
      </div>
    </section>

    <section class="teach-tools" aria-label="أدوات المعلم">
      <h3>أدوات الشرح داخل الصف</h3>
      <div class="tt-grid">
        <button class="tt" data-fx><i>ƒ</i><b>لوحة القوانين</b><span>${nFx} قانوناً بصياغة أسهل، مع حيل الحفظ ومثلث القانون التفاعلي ووضع «اختبر حفظك».</span></button>
        <button class="tt" data-tl><i>✦</i><b>جولة الخط الزمني</b><span>جولة تلقائية بين الفصول الستة ومحطات تاريخ الفيزياء — بداية مشوّقة للحصة.</span></button>
        <div class="tt"><i>▣</i><b>وضع العرض في القاعات</b><span>زر «عرض» داخل كل قاعة يكبّر الخط ويكشف خطوات الحل واحدة تلو الأخرى (→ أو مسافة).</span></div>
        <div class="tt"><i>?</i><b>اختبر فهمك</b><span>${nQ} سؤالاً في بطاقات الدروس وفي كشك خاص داخل كل قاعة، مع تفسير كل إجابة.</span></div>
      </div>
    </section>

    <nav class="hub-tabs" aria-label="الفصول">
      <button class="htab" data-ch="all" aria-pressed="true">كل القاعات</button>
      ${db.chapters.map((c) => `<button class="htab" data-ch="${c.id}" aria-pressed="false" style="--c:${c.color}"><i></i><b>${c.id}</b>${esc(c.title)}</button>`).join('')}
    </nav>

    <main class="hub-grid">
      ${db.chapters.map((c) => `
      <section class="hub-ch" data-ch="${c.id}" style="--c:${c.color}">
        <header class="ch-head"><span class="ch-num">${c.id}</span><div><small>الفصل ${c.id}</small><h3>${esc(c.title)}</h3></div><span class="ch-count">${c.lessons.length} قاعات</span></header>
        <div class="ch-cards">
          ${c.lessons.map((l) => { const L = lessons.find((x) => x.code === l.code); const [env, blurb] = ENVS[l.code] || ['', ''];
            return `
          <article class="env-card" data-code="${l.code}" tabindex="0" aria-label="${esc(env)} — ${esc(L.title)}">
            <div class="env-img" style="background-image:url(img/rooms/${l.code}.jpg)"><span class="env-code">${l.code}</span><span class="env-badge">${L.exhibits.length} معروضات</span></div>
            <div class="env-body">
              <p class="env-name">${esc(env)}<span class="env-teacher">${TEACHER}</span></p>
              <h4>${esc(L.title)}</h4>
              <p class="env-blurb">${esc(blurb)}</p>
              <div class="env-eq" dir="ltr">${tex(L.main.latex)}</div>
              <div class="env-actions"><button class="ghost" data-act="card">بطاقة الدرس</button><button class="ghost" data-act="fx">القوانين</button><button class="solid" data-act="room">ادخل القاعة <i>←</i></button></div>
            </div>
          </article>`; }).join('')}
        </div>
      </section>`).join('')}
    </main>
    <footer class="hub-foot">متحف فيزياء 2 · ${TEACHER} · المحتوى مطابق لمنهج نظام المسارات · السياق التاريخي من ويكيبيديا</footer>
  </div>`;

  // ارتفاع الترويسة الفعلي يحدد موضع شريط الفصول الثابت (يتكيف مع كل الشاشات)
  const top = el.querySelector('.hub-top');
  new ResizeObserver(() => el.style.setProperty('--hub-top', top.offsetHeight + 'px')).observe(top);

  // التبديل بين الواجهتين
  el.querySelectorAll('[data-ui]').forEach((b) => (b.onclick = () => onSwitch(b.dataset.ui)));
  el.querySelector('[data-start]').onclick = () => onRoom(db.order[0]);
  el.querySelectorAll('[data-fx]').forEach((b) => (b.onclick = () => onFormulas?.()));
  el.querySelector('[data-tl]').onclick = () => { onSwitch('timeline'); setTimeout(() => document.querySelector('#tlTour')?.click(), 600); };

  // الفلترة حسب الفصل بحركة سلسة
  const tabs = el.querySelectorAll('.htab'), groups = el.querySelectorAll('.hub-ch');
  tabs.forEach((t) => (t.onclick = () => {
    tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
    const ch = t.dataset.ch;
    groups.forEach((g) => {
      const show = ch === 'all' || g.dataset.ch === ch;
      if (show) { g.hidden = false; requestAnimationFrame(() => g.classList.remove('out')); }
      else { g.classList.add('out'); setTimeout(() => { if (g.classList.contains('out')) g.hidden = true; }, 260); }
    });
    const top = el.querySelector('.hub-tabs').offsetTop - 8;
    const sc = el.querySelector('.hub-scroll'); if (sc.scrollTop > top) sc.scrollTo({ top, behavior: 'smooth' });
  }));

  // البطاقات
  el.querySelectorAll('.env-card').forEach((card) => {
    const code = card.dataset.code;
    card.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (a?.dataset.act === 'room') onRoom(code); else if (a?.dataset.act === 'fx') onFormulas?.(+code[0]); else onCard(code); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') onCard(code); });
  });

  // ظهور تدريجي للبطاقات عند التمرير
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { root: el.querySelector('.hub-scroll'), threshold: 0.12 });
  el.querySelectorAll('.env-card').forEach((c, i) => { c.style.setProperty('--d', `${(i % 3) * 70}ms`); io.observe(c); });
}
