// «المعادلة بالعربي»: يحوّل معادلة LaTeX إلى قراءة عربية (الرموز ← أسماؤها، الكسور ← قسمة، …)
// القاموس يُبنى من متغيرات المعروض نفسه ثم قاموس فيزيائي عام ثم متغيرات الدرس.

const GREEK = { '\\omega': 'ω', '\\theta': 'θ', '\\tau': 'τ', '\\alpha': 'α', '\\Delta': 'Δ', '\\pi': 'π', '\\Sigma': 'Σ', '\\sum': 'Σ', '\\mu': 'μ', '\\lambda': 'λ', '\\rho': 'ρ', '\\phi': 'φ' };
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = (s) => [...s].map((c) => SUP[c] ?? c).join('');

const BASE = {
  F: 'القوة', 'F_g': 'الوزن', 'F_N': 'القوة العمودية', 'F_e': 'القوة المسلّطة', 'F_r': 'قوة المقاومة', 'F_c': 'القوة المركزية', 'F_net': 'القوة المحصلة', 'F_محصلة': 'القوة المحصلة',
  G: 'ثابت الجذب الكوني', g: 'تسارع الجاذبية', m: 'الكتلة', M: 'الكتلة', 'm_E': 'كتلة الأرض', 'm_1': 'الكتلة الأولى', 'm_2': 'الكتلة الثانية', 'm_A': 'كتلة A', 'm_B': 'كتلة B',
  r: 'نصف القطر', 'r_E': 'نصف قطر الأرض', R: 'نصف القطر', v: 'السرعة', 'v_i': 'السرعة الابتدائية', 'v_f': 'السرعة النهائية', 'v_2': 'السرعة بعد التصادم', a: 'التسارع', 'a_c': 'التسارع المركزي',
  t: 'الزمن', 'Δt': 'الزمن', T: 'الزمن الدوري', d: 'الإزاحة', h: 'الارتفاع', s: 'طول القوس', W: 'الشغل', P: 'القدرة',
  KE: 'الطاقة الحركية', PE: 'طاقة الوضع', 'PE_e': 'الطاقة المرونية', E: 'الطاقة', 'E_0': 'الطاقة السكونية', 'E_1': 'الطاقة الابتدائية', 'E_2': 'الطاقة النهائية', 'ΔE': 'الطاقة المفقودة', 'ΔKE': 'التغير في الطاقة الحركية',
  p: 'الزخم', 'p_i': 'الزخم الابتدائي', 'p_f': 'الزخم النهائي', 'Δp': 'التغير في الزخم', 'p_x': 'الزخم الأفقي', 'p_y': 'الزخم الرأسي', J: 'الدفع',
  I: 'عزم القصور', L: 'الزخم الزاوي', 'τ': 'العزم', 'τ_net': 'محصلة العزم', 'α': 'التسارع الزاوي', 'ω': 'السرعة الزاوية', 'θ': 'الزاوية', 'Δθ': 'الإزاحة الزاوية', 'Δω': 'التغير في السرعة الزاوية', 'θ_c': 'زاوية الانقلاب',
  f: 'التردد', n: 'العدد', e: 'الكفاءة', MA: 'الفائدة الميكانيكية', IMA: 'الفائدة الميكانيكية المثالية', 'd_e': 'إزاحة القوة', 'd_r': 'إزاحة المقاومة', 'r_e': 'نصف قطر الجهد', 'r_r': 'نصف قطر المقاومة',
  'W_o': 'الشغل الناتج', 'W_i': 'الشغل المبذول', c: 'سرعة الضوء', k: 'المعامل', w: 'العرض',
  Q: 'كمية الحرارة', C: 'الحرارة النوعية', 'ΔT': 'التغير في درجة الحرارة', 'T_f': 'درجة الحرارة النهائية', 'T_K': 'درجة الحرارة بالكلفن', 'T_C': 'درجة الحرارة بالسلسيوس',
  'H_f': 'الحرارة الكامنة للانصهار', 'H_v': 'الحرارة الكامنة للتبخر', U: 'الطاقة الداخلية', 'ΔU': 'التغير في الطاقة الداخلية', 'ΔS': 'التغير في الإنتروبي', S: 'الإنتروبي',
  'Q_H': 'الحرارة الممتصة', 'Q_L': 'الحرارة الطاردة', 'T_H': 'درجة حرارة المستودع الساخن', 'T_L': 'درجة حرارة المستودع البارد',
};
const CH6 = { T: 'درجة الحرارة', 'T_A': 'درجة حرارة A', 'T_B': 'درجة حرارة B', 'C_A': 'الحرارة النوعية لـ A', 'C_B': 'الحرارة النوعية لـ B' };
const SUBW = { i: 'قبل', f: 'بعد', 0: 'الابتدائي', 1: '1', 2: '2', A: 'A', B: 'B', rot: 'الدورانية', net: 'المحصلة', max: 'العظمى' };

/** مفتاح موحّد لرمز LaTeX: m_{A1} → m_A1 ، \Delta t → Δt */
export function symKey(sym) {
  let s = String(sym).replace(/\\text\{([^}]*)\}|\\mathrm\{([^}]*)\}/g, (_, a, b) => a ?? b);
  for (const [k, v] of Object.entries(GREEK)) s = s.split(k).join(v);
  return s.replace(/[{}\s\\]/g, '').replace(/,.*$/, '');
}

/** قاموس المعروض: متغيراته أولاً ثم القاموس العام ثم متغيرات الدرس */
export function buildDict(ex, L) {
  const d = { ...BASE, ...(L.chapter?.id === 6 ? CH6 : {}) };
  for (const v of L.vars || []) { const parts = String(v.symbol).split(','); for (const part of parts) { const k = symKey(part.replace(/\\;/g, '')); if (k && (parts.length === 1 || !d[k])) d[k] = v.meaning.split(' = ')[0].split('(')[0].trim(); } }
  for (const p of ex.params || []) d[symKey(p.sym)] = p.label;
  return d;
}

function lookup(key, dict) {
  if (dict[key]) return dict[key];
  const [b, sub] = key.split('_');
  if (sub != null && dict[b]) return SUBW[sub] && SUBW[sub].length > 1 ? `${dict[b]} ${SUBW[sub]}` : `${dict[b]} ${sub}`;
  if (!sub && b.length > 1 && !b.startsWith('Δ') && [...b].every((c) => dict[c])) return [...b].map((c) => dict[c]).join(' × ');
  return null;
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** يعيد HTML للقراءة العربية، أو '' إن لم تحوِ المعادلة رموزاً معروفة */
export function arabicEq(src, dict) {
  let s = String(src);
  s = s.replace(/\\qquad/g, ' ⟨،⟩ ');
  s = s.replace(/\\left|\\right|\\displaystyle/g, '').replace(/\\(?:q?quad|[,;:!])/g, ' ').replace(/\\%/g, '%');
  s = s.replace(/_\{\\text\{([^{}]*)\}\}/g, '_{$1}');
  s = s.replace(/_\{([^{}]*)\}/g, (_, a) => '_' + a.replace(/[\s,]/g, ''));
  // الأعداد العلمية
  s = s.replace(/(\d+(?:\.\d+)?)\s*\\times\s*10\^\{(-?\d+)\}/g, (_, a, b) => `⟪${a}×10${sup(b)}⟫`);
  s = s.replace(/\\text\{([^{}]*)\}|\\mathrm\{([^{}]*)\}/g, (_, a, b) => { const t = (a ?? b).trim(); return /[؀-ۿ]/.test(t) ? `⟨${t}⟩` : t ? `⟬${t}⟭` : ''; });
  s = s.replace(/\\tfrac12|\\tfrac\{1\}\{2\}|\\dfrac\{1\}\{2\}/g, '½').replace(/\^\\circ/g, '°').replace(/\\circ/g, '°');
  s = s.replace(/\\(?:times|cdot)/g, ' × ').replace(/\\div/g, ' ÷ ').replace(/\\Rightarrow/g, ' ⇐ ').replace(/\\approx/g, ' ≈ ').replace(/\\rightarrow|\\to/g, ' ⇐ ').replace(/\\cdots/g, ' … ');
  s = s.replace(/\\sin/g, ' جا').replace(/\\cos/g, ' جتا').replace(/\\tan/g, ' ظا');
  s = s.replace(/\\infty/g, '∞');
  for (const [k, v] of Object.entries(GREEK)) s = s.split(k).join(v);
  s = s.replace(/\^\{?(-?\d+)\}?/g, (_, e) => sup(e));
  // الكسور والجذور من الداخل إلى الخارج
  const wrap = (x) => { x = x.trim(); return /^⟪[^⟫]*⟫$/.test(x) || /^[\d.]+$/.test(x) || /^Δ?\s*[A-Za-zωθταΣμλρφ]{1,3}(?:_[\w\u0600-\u06FF]+)?[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*$/.test(x) || /^\([^()]*\)[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*$/.test(x) ? x : `(${x})`; };
  for (let k = 0; k < 8; k++) {
    const before = s;
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => `${wrap(a)} ÷ ${wrap(b)}`);
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_, a) => `√(${a.trim()})`);
    if (s === before) break;
  }
  s = s.replace(/[{}]/g, '').replace(/\\/g, '');

  // التقسيم إلى رموز
  const toks = []; const re = /⟪[^⟫]*⟫|⟬[^⟭]*⟭|⟨[^⟩]*⟩|(Δ\s*)?([A-Za-zωθταΣμλρφ]{1,3})(?:_([A-Za-z0-9؀-ۿ]+))?|\d+(?:\.\d+)?|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+|[=+−\-×÷⇐≈…()√½°%π∞/]|جا|جتا|ظا/g;
  let m; let named = 0;
  while ((m = re.exec(s))) {
    const t = m[0];
    if (t.startsWith('⟪')) toks.push({ k: 'num', v: t.slice(1, -1) });
    else if (t.startsWith('⟬')) toks.push({ k: 'unit', v: t.slice(1, -1) });
    else if (t.startsWith('⟨')) toks.push({ k: 'word', v: t.slice(1, -1) });
    else if (m[2]) {
      const key = (m[1] ? 'Δ' : '') + m[2] + (m[3] ? '_' + m[3] : ''); const name = lookup(key, dict);
      if (name) { toks.push({ k: 'name', v: name }); named++; } else toks.push({ k: 'num', v: key.replace('_', '') });
    } else if (/^\d/.test(t) || t === 'π' || t === '½') toks.push({ k: 'num', v: t });
    else if (/^[⁰-⁹⁻¹²³]+$/.test(t)) { const last = toks[toks.length - 1]; if (last) last.sup = (last.sup || '') + t; }
    else if (t === '(' || t === ')') toks.push({ k: t });
    else if (['جا', 'جتا', 'ظا', '√'].includes(t)) toks.push({ k: 'fn', v: t });
    else if (t === '°' || t === '%') { const last = toks[toks.length - 1]; if (last) last.post = (last.post || '') + t; }
    else toks.push({ k: 'op', v: t === '-' ? '−' : t });
  }
  if (!named) return '';
  // ضرب ضمني بين المتجاورات
  const isEnd = (t) => ['name', 'num', ')'].includes(t.k);
  const isStart = (t) => ['name', 'num', '(', 'fn'].includes(t.k);
  const out = [];
  toks.forEach((t, i) => { const p = toks[i - 1]; if (p && isEnd(p) && isStart(t)) out.push({ k: 'op', v: '×' }); out.push(t); });
  // دمج الأقواس الرقمية الخالصة في مقطع واحد يُقرأ من اليسار
  const merged = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.k === '(') {
      let j = i + 1; const inner = [];
      while (j < out.length && out[j].k !== ')' && out[j].k !== '(') inner.push(out[j++]);
      if (j < out.length && out[j].k === ')' && inner.length === 1 && inner[0].k === 'num' && !out[j].sup) { merged.push(inner[0]); i = j; continue; }
      if (j < out.length && out[j].k === ')' && inner.length && inner.every((x) => x.k === 'num' || (x.k === 'op' && x.v !== '='))) {
        merged.push({ k: 'num', v: `(${inner.map((x) => x.v + (x.sup || '') + (x.post || '')).join('')})`, sup: out[j].sup, post: out[j].post }); i = j; continue;
      }
    }
    merged.push(t);
  }
  const html = merged.map((t) => {
    const tail = (t.sup || '') + (t.post || '');
    if (t.k === 'name') return `<b>${esc(t.v)}</b>${tail}`;
    if (t.k === 'word') return ` ${esc(t.v)}${tail} `;
    if (t.k === 'unit') return ` <bdi dir="ltr">${esc(t.v + tail)}</bdi>`;
    if (t.k === 'num') return `<bdi dir="ltr">${esc(t.v + tail)}</bdi>`;
    if (t.k === '(' || t.k === ')') return t.k + tail;
    if (t.k === 'fn') return (t.v === '√' ? 'الجذر التربيعي لـ' : t.v) + tail + ' ';
    return t.v === '/' ? '/' : ` ${t.v} `;
  }).join('').replace(/\s+/g, ' ').replace(/ ،/g, '،').trim();
  return html;
}
