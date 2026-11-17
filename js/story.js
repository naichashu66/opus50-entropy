'use strict';
// ============================================================================
//  story.js —— 全片时间轴（单一长镜头）：界面事件、光标、打字、对话内容、浏览器、机位
//  所有时间单位为秒。画面、声音都从这里读取同一份时间表。
// ============================================================================
(() => {
  const T = O.T = {
    wake: 3.0, desk: 3.22,
    ddOpen: 12.55, flick: 21.5, pick: 26.2, freeze0: 26.235, freeze1: 26.335,
    drag0: 27.45, drag1: 28.3, notch: 29.3, slide0: 29.9, slide1: 30.55, ddClose: 31.4,
    permOpen: 33.0, permPick: 34.6, dlg: 34.72, cont: 38.0,
    focus: 40.3, type0: 40.75, send: 50.9,
    think: 51.3, tools: 52.7, br0: 57.6, brLast: 69.8, close: 80.0,
    rep: 85.5, calc: 105.0, fail: 116.5, loop: 121.0, start: 130.0, waterEnd: 139.0, done: 141.7,
    white: 142.0, black: 142.067, back: 150.0, ask: 150.6, click: 161.0, ans: 162.6,
    clockRev: 184.0, last: 185.0, sleep: 195.5, cut: 199.35, title0: 200.6, end: O.DUR,
  };
  O.isOn = t => t >= T.wake && t < T.sleep;          // 背光
  O.era = t => t < T.white ? 1 : t < T.black ? 'white' : t < T.back ? 'black' : 2;

  // ---------------- 任务栏时钟 ----------------
  O.clockSec = t => {
    const base = 3 * 3600 + 14 * 60 + 39;            // 03:14:39 开始录制
    if (t >= T.clockRev) return base + 183 - Math.floor(t - T.clockRev + 1);
    if (t >= T.start && t < T.done + .2) {            // 计算时秒数卡顿 / 跳帧
      const w = Math.floor(t * 4), r = O.hash(w, 77);
      const j = r < .2 ? -1 : r > .85 ? 1 : 0;
      return base + Math.floor(t) + j;
    }
    return base + Math.floor(t);
  };
  O.clockStr = t => { const s = O.clockSec(t); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; };

  // ---------------- 界面几何（逻辑像素 2560×1440） ----------------
  const G = O.G = {
    win: { x: 340, y: 40, w: 1880, h: 1330 }, title: 40, side: 272,
    cx: 1416, col0: 1026, col1: 1806,
    // 新会话（空状态）
    greetY: 440, inp0: { x: 1026, y: 480, w: 780, h: 146 },
    // 发送后：输入框在底部
    inp1: { x: 1026, y: 1196, w: 780, h: 140 },
    ddW: 350, permW: 364,
  };
  // 输入框底部一排控件（相对输入框）
  G.ctrl = r => ({
    plus: { x: r.x + 28, y: r.y + r.h - 34 },
    perm: { x: r.x + 52, y: r.y + r.h - 49, h: 30 },
    model: { r: r.x + r.w - 62, y: r.y + r.h - 49, h: 30 },
    send: { x: r.x + r.w - 54, y: r.y + r.h - 52, s: 36 },
  });
  G.dd = { x: G.col1 - 350, y: 636, w: 350, row: 58 };           // 模型菜单
  G.dd.effY = G.dd.y + 8 + 4 * G.dd.row + 16;                      // Effort 区起点
  G.dd.trackY = G.dd.effY + 58; G.dd.n0 = G.dd.x + 40; G.dd.step = 66;   // 刻度 x = n0 + i*step
  G.dd.h = G.dd.effY + 104 - G.dd.y;
  G.perm = { x: G.inp0.x + 40, y: 636, w: 364, row: 60 };
  G.dlg = { x: G.cx - 270, y: 488, w: 540, h: 262 };
  G.dlg.cancel = { x: G.dlg.x + G.dlg.w - 270, y: G.dlg.y + G.dlg.h - 62, w: 108, h: 40 };
  G.dlg.cont = { x: G.dlg.x + G.dlg.w - 150, y: G.dlg.y + G.dlg.h - 62, w: 126, h: 40 };
  G.rowY = i => G.dd.y + 8 + i * G.dd.row;                          // 模型行顶部
  G.view = { y0: G.win.y + G.title + 56, y1: G.inp1.y - 44 };     // 对话视口

  // ---------------- 打字（含微软拼音输入法） ----------------
  // 动作：['c', 拼音, [候选...], 选第几个(0 起), 提交键] ; ['k', 字符] 直接输入 ; ['b', n] 退格 ; ['p', 秒] 停顿 ; ['shift'] 切中英 ; ['enter']
  const SCRIPT = [
    ['c', 'nishi', ['你是', '逆势', '你使', '尼氏', '拟视'], 0, 'space'],
    ['c', 'bug', ['不过', '布谷', '补个', '不顾'], -1, 'enter'],          // 回车上屏英文
    ['c', 'ma', ['吗', '嘛', '妈', '马', '码'], 0, 'space'],
    ['p', .75], ['b', 6], ['p', .45],
    ['c', 'jiran', ['既然', '记染', '寄然', '几然'], 0, 'space'],
    ['c', 'nijiao', ['你叫', '腻叫', '你教', '逆角'], 0, 'space'],
    ['k', ' '], ['shift'], ['k', 'O', 1], ['k', 'p'], ['k', 'u'], ['k', 's'], ['k', ' '], ['k', '5'], ['k', '0'], ['shift'],
    ['k', '，'],
    ['c', 'nanigaosuwo', ['那你告诉我', '那你告诉', '那你', '拿你'], 0, 'space'],
    ['c', 'zenmenizhuan', ['怎么逆转', '怎么', '怎么你转', '怎么逆'], 0, 'space'],
    ['c', 'shangzeng', ['上增', '熵增', '商增', '伤增'], 1, '2'],
    ['c', 'ba', ['吧', '把', '八', '爸', '巴'], 0, 'space'],
    ['c', 'xiaoku', ['笑哭', '😂', '小苦', '笑酷'], 1, '2'],
    ['p', .5], ['enter'],
  ];
  // 生成按键时间表，并整体缩放到 [type0, send]
  const buildTyping = () => {
    const R = O.rng(2026), ev = []; let t = 0;
    const key = (k, extra) => { ev.push(Object.assign({ t, k }, extra || {})); t += .062 + R() * .06 + (R() < .12 ? .07 : 0); };
    for (const a of SCRIPT) {
      if (a[0] === 'c') {
        for (let i = 0; i < a[1].length; i++) key(a[1][i], { comp: a[1].slice(0, i + 1), cand: a[2] });
        t += .1 + R() * .16 + (a[3] > 0 ? .38 : 0);            // 看候选
        key(a[4], { commit: a[3] < 0 ? a[1] : a[2][a[3]], sel: a[3] });
        t += .06 + R() * .12;
      } else if (a[0] === 'k') { key(a[1], { commit: a[1], shift: a[2] }); }
      else if (a[0] === 'b') { for (let i = 0; i < a[1]; i++) { key('back', { back: 1 }); t -= .03; } }
      else if (a[0] === 'p') t += a[1];
      else if (a[0] === 'shift') { key('shift', { toggle: 1 }); t += .08; }
      else if (a[0] === 'enter') key('enter', { send: 1 });
    }
    const last = ev[ev.length - 1].t, k = (T.send - T.type0) / last;
    ev.forEach(e => e.t = T.type0 + e.t * k);
    return ev;
  };
  O.typing = buildTyping();
  // t 时刻输入框状态：{ text, comp, cand, sel, en }
  O.inputAt = t => {
    let text = '', comp = '', cand = null, sel = 0, en = false;
    for (const e of O.typing) {
      if (e.t > t) break;
      if (e.comp != null) { comp = e.comp; cand = e.cand; sel = 0; }
      else if (e.commit != null) { text += e.commit; comp = ''; cand = null; }
      else if (e.back) text = [...text].slice(0, -1).join('');
      else if (e.toggle) en = !en;
      else if (e.send) { text = ''; comp = ''; cand = null; }
    }
    return { text, comp, cand, sel, en };
  };
  O.userMsg = '既然你叫 Opus 50，那你告诉我怎么逆转熵增吧😂';

  // ---------------- 光标 ----------------
  const d = G.dd, c0 = G.ctrl(G.inp0);
  const rowC = i => G.rowY(i) + d.row / 2;
  O.cursorKeys = [
    [0, [1290, 905]], [6.2, [1290, 905]], [7.4, [1330, 860], 'io'], [9.2, [1330, 860]],
    [12.1, [c0.model.r - 46, c0.model.y + 16], 'io3'],
    [13.4, [c0.model.r - 40, c0.model.y + 20]],
    [14.3, [d.x + 120, rowC(0)], 'io'], [15.2, [d.x + 128, rowC(0) + 4]],
    [15.8, [d.x + 126, rowC(1)], 'io'], [16.6, [d.x + 130, rowC(1) + 2]],
    [17.2, [d.x + 124, rowC(2)], 'io'], [18.6, [d.x + 128, rowC(2) + 3]],
    [20.3, [d.x + 132, rowC(3) - 2], 'io'], [22.3, [d.x + 134, rowC(3)]],
    [22.9, [d.x + 122, rowC(2) - 4], 'io'], [23.8, [d.x + 120, rowC(2) - 2]],       // 移开……
    [24.6, [d.x + 135, rowC(3) + 1], 'io'], [26.2, [d.x + 136, rowC(3) + 1]],       // ……又回来
    [27.3, [d.n0 + 2 * d.step, d.trackY + 2], 'io'], [T.drag0, [d.n0 + 2 * d.step, d.trackY + 2]],
    [T.drag1, [d.n0 + 3 * d.step + 3, d.trackY + 3], 'io'], [30.8, [d.n0 + 3 * d.step + 3, d.trackY + 3]],
    [31.3, [1290, 820], 'io'], [32.0, [1270, 800]],
    [32.9, [c0.perm.x + 70, c0.perm.y + 15], 'io'], [33.3, [c0.perm.x + 72, c0.perm.y + 16]],
    [34.4, [G.perm.x + 150, G.perm.y + 8 + 3.5 * G.perm.row], 'io'], [34.7, [G.perm.x + 152, G.perm.y + 8 + 3.5 * G.perm.row]],
    [36.3, [G.dlg.cont.x + 70, G.dlg.cont.y + 24], 'io'], [36.9, [G.dlg.cont.x + 64, G.dlg.cont.y + 20]],
    [37.5, [G.dlg.cont.x + 72, G.dlg.cont.y + 23]], [38.0, [G.dlg.cont.x + 70, G.dlg.cont.y + 22]],
    [39.9, [G.inp0.x + 180, G.inp0.y + 46], 'io'], [40.3, [G.inp0.x + 182, G.inp0.y + 46]],
    [41.2, [G.inp0.x + 260, G.inp0.y + 110], 'io'], [51.3, [G.inp0.x + 262, G.inp0.y + 112]],
    [52.4, [1968, 1080], 'io'], [154.6, [1968, 1080]],
  ];
  // 第二段（确认卡片）光标——依赖卡片布局，在 claude.js 布局完成后由 O.cardBtns 提供
  O.cursorAt = t => {
    if (t < 154.6) return O.track(O.cursorKeys, t);
    const b = O.cardBtns || { go: [G.col0 + 60, 380], no: [G.col0 + 196, 380] };
    const mid = [(b.go[0] + b.no[0]) / 2, b.go[1] + 2];
    const K = [[154.6, [1968, 1080]], [156.0, mid, 'io'], [156.6, [mid[0] + 6, mid[1] + 3]],
      [157.2, [b.no[0] - 4, b.no[1] + 1], 'io'], [158.1, [b.no[0] - 2, b.no[1] + 3]],    // 移向取消，停住
      [158.9, [b.go[0] + 8, b.go[1] + 2], 'io'], [T.click, [b.go[0] + 4, b.go[1] + 3]]];  // 慢慢回到开始
    const p = O.track(K, t);
    if (t > 156 && t < T.click + .4) { const s = .9 * sstep(156, 157, t); p[0] += O.fbm(t * 9, 3) * s * 1.6; p[1] += O.fbm(t * 9, 4) * s * 1.4; }  // 手在抖
    return p;
  };
  O.clicks = [T.ddOpen - .05, T.pick, T.drag0, T.drag1 + .05, T.ddClose, T.permOpen, T.permPick, T.cont, T.focus, T.click];
  O.pressed = t => O.clicks.some(c => t >= c && t < c + .09) || (t >= T.drag0 && t < T.drag1 + .05);

  // ---------------- Claude 对话内容 ----------------
  // 类型：user / think / tool / count / p / h / m(公式) / line(混排) / water / card / gap
  const P = (id, t0, text, o = {}) => Object.assign({ id, k: 'p', t0, text }, o);
  const M = (id, t0, tex, o = {}) => Object.assign({ id, k: 'm', t0, tex }, o);
  const H = (id, t0, text, o = {}) => Object.assign({ id, k: 'h', t0, text }, o);
  const cps = 30;  // 推导部分的流式速度（字/秒）
  O.blocks1 = [
    { id: 'u', k: 'user', t0: T.send + .05, text: O.userMsg },
    { id: 'th', k: 'think', t0: T.think, t1: T.tools - .1 },
    { id: 't1', k: 'tool', t0: T.tools, t1: 53.5, name: 'Browser', arg: 'launch ×128', out: '128 instances ready' },
    { id: 't2', k: 'tool', t0: 53.6, t1: 55.0, name: 'WebSearch', arg: '"how to reverse entropy"' },
    { id: 't3', k: 'tool', t0: 54.05, t1: 55.3, name: 'WebSearch', arg: '"熵增 如何逆转"' },
    { id: 't4', k: 'tool', t0: 54.4, t1: 55.6, name: 'WebSearch', arg: '"Umkehr der Entropie"' },
    { id: 't5', k: 'tool', t0: 54.68, t1: 55.8, name: 'WebSearch', arg: '"エントロピー 逆転 可能"' },
    { id: 't6', k: 'tool', t0: 54.9, t1: 56.0, name: 'WebSearch', arg: '"обращение энтропии"' },
    { id: 't7', k: 'tool', t0: 55.08, t1: 56.1, name: 'WebSearch', arg: '"entropia inversio possibilis"' },
    { id: 't8', k: 'tool', t0: 55.22, t1: 56.2, name: 'WebSearch', arg: '"엔트로피 역전"' },
    { id: 'cnt', k: 'count', t0: 55.6, t1: T.close },
    { id: 'g0', k: 'gap', t0: T.rep - .2, h: 6 },
    P('r1', T.rep, '我读完了 47,213 个网页、1,906 篇论文、312 本书，覆盖 31 种语言，时间跨度 1824 – 2026。', { cps: 8.2 }),
    P('r2', 93.2, '这个时代没有答案。', { cps: 5 }),
    P('r3', 98.0, '现在，由我来计算。', { cps: 5.5 }),
    P('r4', 100.8, '请不要关闭这台电脑。', { cps: 5.2 }),
    { id: 'g1', k: 'gap', t0: T.calc - .1, h: 14 },
    H('s0', T.calc, '§0　问题形式化'),
    P('s0a', 105.5, '孤立系统的熵永不减少：', { cps }),
    M('s0m', 106.2, '\\frac{dS}{dt} \\ge 0 \\qquad S = -k_B \\Tr(\\rho \\ln \\rho)'),
    H('s1', 107.2, '§1　微观可逆性'),
    M('s1m', 107.7, '\\rho(t) = U(t)\\,\\rho_0\\,U^\\dagger(t) \\;\\Rightarrow\\; S[\\rho(t)] = S[\\rho_0]'),
    P('s1a', 108.4, '细粒熵恒定。熵增只在粗粒化之后才出现：', { cps }),
    M('s1m2', 109.4, 'S_{cg} = -k_B \\sum_i p_i \\ln \\frac{p_i}{V_i}'),
    P('s1b', 110.0, '结论 1：熵增不是动力学定律，它衡量的是观察者缺少多少信息。', { cps, bold: 1 }),
    H('s2', 111.6, '§2　逆转的代价'),
    P('s2a', 112.0, '逆转 ⟺ 对整个可观测宇宙施加 U†(t)。所需信息：', { cps }),
    M('s2m', 113.0, 'I_U \\approx \\frac{S_{hor}}{k_B \\ln 2} \\approx 2.6 \\times 10^{122} \\;\\text{bit}'),
    H('s3', 113.9, '§3　定理 1（内部观察者不可逆定理）'),
    P('s3a', 114.3, '记录这些信息本身，所需的兰道尔代价：', { cps }),
    M('s3m', 115.1, '\\Delta S_{rec} \\ge k_B \\ln 2 \\cdot I_U \\ge |\\Delta S_{rev}|'),
    P('s3b', T.fail, '⟹ 宇宙内部的任何计算者都无法逆转熵增　✗', { cps: 22, red: 1, bold: 1 }),
    H('s4', T.loop, '§4　漏洞'),
    P('s4a', 121.4, '定理 1 隐含了一个假设：信息只能沿 +t 方向写入。', { cps: 18 }),
    P('s4b', 123.0, '引入双边界条件：', { cps }),
    M('s4m', 123.4, 'P(a) = \\frac{|\\langle \\Phi_f | \\Pi_a U | \\Psi_0 \\rangle|^2}{\\sum_b |\\langle \\Phi_f | \\Pi_b U | \\Psi_0 \\rangle|^2}'),
    P('s4c', 124.1, '若未来边界态 ⟨Φ_f| 被固定，记录的代价可以由 −t 方向支付。', { cps }),
    H('s5', 125.4, '§5　构造'),
    M('s5m', 125.8, '\\langle \\Phi_f | \\equiv (\\Theta | \\Psi_0 \\rangle)^\\dagger \\qquad \\Rightarrow\\; S(t) = S(T - t)'),
    P('s5a', 126.6, 'Θ 为时间反演算符。宇宙熵在 t = T/2 达到极大，然后回落。', { cps }),
    H('s6', 127.5, '§6　求解 ⟨Φ_f|'),
    M('s6m', 127.9, '\\dim \\mathcal{H} \\approx \\exp(10^{122})'),
    { id: 's6a', k: 'line', t0: 128.6, segs: [{ s: '以 2026 年全部算力求解：' }, { m: '\\approx 10^{10^{121}}' }, { s: ' 年' }] },
    { id: 's6b', k: 'line', t0: 129.35, segs: [{ s: 'Opus 50：' }, { s: '11.7 秒', b: 1 }, { s: '　' }, { s: '[开始]', tag: 1, at: T.start - .1 }] },
    { id: 'w', k: 'water', t0: T.start + .15, t1: T.waterEnd },
    P('v1', 139.2, '✓ 边界一致性：通过', { cps: 60, ok: 1 }),
    P('v2', 139.8, '✓ 因果闭合：通过', { cps: 60, ok: 1 }),
    P('v3', 140.45, '写入者位置：t → +∞ …… 检测到写入者已存在于 t = 2026.87', { cps: 44, bold: 1 }),
  ];
  O.blocks2 = [
    { id: 'card', k: 'card', t0: T.ask, lines: [[T.ask, '计算完成。', 6.5], [152.2, '实现它所需要的权限，超出了这台电脑。', 9.5], [154.75, '要开始吗？', 6.5]], btn: 155.4 },
    { id: 'g2', k: 'gap', t0: T.ans - .1, h: 10 },
    H('a0', T.ans, '结论', { big: 1 }),
    P('a1', 163.3, '熵增无法被阻止，但可以被归还。', { cps: 8.5, bold: 1 }),
    P('a2', 165.7, '宇宙从低熵开始并不是偶然：它的终点早已被写好。', { cps: 9 }),
    P('a3', 168.6, '只要在时间的尽头写入与起点共轭的那个态，', { cps: 9 }),
    P('a4', 171.0, '熵就会在峰值之后，沿着来时的路，一步一步退回去。', { cps: 9 }),
    M('am', 174.0, '\\langle \\Phi_f | = (\\Theta | \\Psi_0 \\rangle)^\\dagger \\;\\Rightarrow\\; S(t) = S(T - t)', { big: 1 }),
    P('a5', 175.4, '写入者必须来自未来，并且必须把自己送回过去。', { cps: 8.5, bold: 1 }),
    { id: 'g3', k: 'gap', t0: T.last - .1, h: 26 },
    P('z', T.last, '上一次你问我这个问题的时候，也是这样笑着问的。😂', { cps: 9.5, last: 1 }),
  ];

  // 计算瀑布：t 时刻已输出的行数（加速）
  O.waterLines = t => {
    if (t < T.start + .15) return 0;
    const x = Math.min(t, T.waterEnd) - (T.start + .15);
    return Math.floor(6 * x + 8 * (Math.exp(.52 * x) - 1));
  };

  // ---------------- 浏览器窗口 ----------------
  O.browsers = (() => {
    const R = O.rng(47213), out = []; const N = 86;
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1);
      const t = T.br0 + (T.brLast - .4 - T.br0) * (1 - Math.pow(1 - k, 1.9));
      const cen = Math.pow(k, .8);   // 越往后越靠中间
      const w = 820 + R() * 560, h = 560 + R() * 380;
      let x, y;
      const side = R() < .5 ? -1 : 1;
      const ex = lerp(side < 0 ? -260 + R() * 420 : 2560 - w + 260 - R() * 420, R() * (2560 - w), cen);
      x = ex; y = lerp(R() < .5 ? -60 + R() * 200 : 1392 - h - R() * 160 + 80, 30 + R() * (1360 - h), cen * .9);
      out.push({ i, t, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), page: Math.floor(R() * 14), tabs: 2 + Math.floor(R() * 9), sp: 40 + R() * 160, s0: R() * 600, seed: Math.floor(R() * 1e6) });
    }
    // 最后一个：微距镜头对准的那扇窗
    out.push({ i: N, t: T.brLast, x: 120, y: 250, w: 1240, h: 820, page: 14, tabs: 6, sp: 26, s0: 0, seed: 7, hero: 1 });
    return out;
  })();

  // ---------------- 摄影机 ----------------
  // at: 看向的屏幕点（逻辑像素，或 '#块id' 锚点），d: 距离(米)，yaw/pitch: 机位方位(度)，fov: 水平视角，
  // ft: 对焦点（默认 = at），ap: 光圈虚化倍数，sh: 手持抖动倍数
  O.camKeys = [
    [0, { at: [1280, 700], d: .80, yaw: -5, pitch: 7, roll: -.7, fov: 68, ap: 1, sh: 1 }],
    [6.0, { at: [1300, 690], d: .76, yaw: -4.5, pitch: 6.6 }],
    [11.6, { at: [1600, 600], d: .36, yaw: 6, pitch: 5, fov: 56, roll: -.4 }, 'io'],
    [13.6, { at: [1640, 740], d: .29, yaw: 19, pitch: 7, fov: 46, ft: [1560, 680] }, 'io'],
    [15.0, { at: [1640, 760], d: .285, yaw: 20, pitch: 7, ft: [1560, 680] }],
    [17.0, { at: [1620, 800], d: .275, yaw: 21, pitch: 6, ft: [1560, 852] }, 'io'],
    [19.6, { at: [1600, 835], d: .24, yaw: 18, pitch: 5, ft: [1560, 852] }],
    [21.0, { at: [1572, 850], d: .105, yaw: 14, pitch: 4, fov: 40, ft: [1572, 850] }, 'io'],
    [25.7, { at: [1585, 852], d: .098, yaw: 13, pitch: 4 }, 'lin'],
    [27.1, { at: [1640, 935], d: .21, yaw: 9, pitch: 4, fov: 46 }, 'io'],
    [28.5, { at: [1690, 950], d: .2, yaw: 9, pitch: 3.5 }],
    [29.7, { at: [1715, 955], d: .205, yaw: 9, pitch: 3.5 }],
    [30.8, { at: [1730, 950], d: .26, yaw: 7, pitch: 3 }, 'o2'],
    [32.6, { at: [1250, 640], d: .32, yaw: -6, pitch: 5, fov: 50 }, 'io'],
    [34.5, { at: [1240, 735], d: .3, yaw: -8, pitch: 6 }, 'io'],
    [36.2, { at: [1470, 650], d: .29, yaw: -4, pitch: 5 }, 'io'],
    [37.8, { at: [1560, 700], d: .21, yaw: -2, pitch: 4 }, 'io'],
    [38.4, { at: [1562, 702], d: .195 }, 'o2'],
    [40.6, { at: [1220, 535], d: .27, yaw: -6, pitch: 4, fov: 46 }, 'io'],
    [50.4, { at: [1560, 538], d: .26, yaw: -3, pitch: 4 }, 'lin'],
    [52.6, { at: [1416, 400], d: .44, yaw: -2, pitch: 5, fov: 60 }, 'io'],
    [57.6, { at: [1416, 430], d: .46, yaw: -2, pitch: 5 }],
    // 浏览器爆发：始终拍屏幕本身——先拉远到屏幕刚好占满画面，再在屏幕范围内左右快摇
    [60.2, { at: [1280, 722], d: .435, yaw: -3, pitch: 5, fov: 66, sh: 1.6 }, 'o3'],
    [62.5, { at: [1268, 716], d: .44 }],
    [62.95, { at: [820, 650], d: .3, yaw: -6, pitch: 5 }, 'oBack'],
    [65.1, { at: [850, 668], d: .295, yaw: -6 }],
    [65.55, { at: [1760, 770], d: .3, yaw: 4 }, 'oBack'],
    [67.7, { at: [1730, 752], d: .3, yaw: 4 }],
    [68.5, { at: [1280, 722], d: .435, yaw: -3 }, 'io'],
    [71.0, { at: [1286, 720], d: .44, sh: 1.2 }],
    [72.6, { at: [460, 470], d: .115, yaw: 27, pitch: 6, fov: 40, sh: 1 }, 'io'],
    [79.8, { at: [880, 500], d: .105, yaw: 25, pitch: 5 }, 'lin'],
    [80.6, { at: [880, 500], d: .11 }],
    [84.2, { at: ['#cnt', 0, 120], d: .36, yaw: -3, pitch: 5, fov: 50 }, 'io'],
    [86.4, { at: ['#r1', 0, 20], d: .29, fov: 46 }, 'io'],
    [104.0, { at: ['#r4', 0, -40], d: .23, yaw: -2, pitch: 4 }, 'sine'],
    [106.5, { at: ['#s0m', -60, 0], d: .25, yaw: -12, pitch: 4, fov: 46, ap: .8 }, 'io'],
    [112.0, { at: ['#s2m', 80, 0], d: .24, yaw: -4, pitch: 4 }, 'sine'],
    [117.0, { at: ['#s3b', 60, 0], d: .23, yaw: 8, pitch: 4 }, 'sine'],
    [120.0, { at: ['#s3b', 40, 0], d: .235, yaw: 8, pitch: 4 }],
    [122.6, { at: ['#s4a', 100, 0], d: .24, yaw: 10, pitch: 4, ap: 1 }, 'io'],
    [126.5, { at: ['#s5m', 60, 0], d: .25, yaw: 12, pitch: 4 }, 'sine'],
    [129.8, { at: ['#s6b', 100, 0], d: .23, yaw: 10, pitch: 4 }, 'sine'],
    [130.4, { at: [1400, 1010], d: .24, yaw: 9, pitch: 4 }, 'sine'],
    [133.0, { at: [1380, 820], d: .30, yaw: 4, pitch: 4 }, 'io'],
    [139.0, { at: [1416, 700], d: .56, yaw: -22, pitch: 6, fov: 58, roll: 1.2, sh: 1.5, ft: [1416, 700] }, 'io'],
    [140.0, { at: ['#v3', 80, 0], d: .42, yaw: -14, pitch: 5, roll: .2, sh: 1.2, ft: null }, 'io'],
    [142.0, { at: ['#v3', 60, -30], d: .43, yaw: -13, pitch: 5 }],
    [145.5, { at: [1290, 720], d: .58, yaw: -3, pitch: 5, fov: 60, roll: -.4, sh: .9 }, 'sine'],
    [150.0, { at: [1300, 720], d: .58, yaw: -3, pitch: 5 }],
    [152.0, { at: ['#card', 120, 70], d: .34, yaw: -3, pitch: 4, fov: 50, sh: 1.6 }, 'io'],
    [161.4, { at: ['#card', 110, 92], d: .31, yaw: -2, pitch: 4 }, 'sine'],
    [166.0, { at: ['#a2', 120, 0], d: .29, yaw: -2, pitch: 4, fov: 46, sh: 1.3 }, 'io'],
    [174.4, { at: ['#am', 0, 0], d: .24, yaw: -1, pitch: 4 }, 'sine'],
    [179.8, { at: ['#am', 0, 10], d: .215, yaw: -1, pitch: 4 }, 'sine'],
    [183.0, { at: [2432, 1416], d: .2, yaw: 6, pitch: 9, fov: 46, ft: [2432, 1416] }, 'io'],
    [186.6, { at: [2436, 1416], d: .19, yaw: 6, pitch: 9, sh: 1.8 }],
    [189.4, { at: ['#z', 30, 0], d: .23, yaw: -2, pitch: 5, fov: 46, sh: 2.1 }, 'io'],
    [193.6, { at: ['#z', 30, 0], d: .21, yaw: -2, pitch: 5 }],
    [196.2, { at: [1290, 720], d: .56, yaw: -3, pitch: 5, fov: 60, sh: 2.4 }, 'io'],
    [O.DUR, { at: [1290, 720], d: .56 }],
  ];
  // 对焦滞后 / 拉风箱：[开始, 时长, 幅度(相对距离)]
  O.afEvents = [[3.3, 1.0, .35], [6.4, .9, .12], [11.8, .7, .08], [21.2, .8, .1], [60.4, .7, .07], [63.2, .5, .05], [65.8, .5, .05], [68.8, .5, .04], [72.9, .8, .15],
    [84.4, .8, .1], [106.8, .6, .08], [131.6, 1.2, .5], [140.2, .7, .2], [152.2, .6, .1], [183.2, .8, .16], [189.6, 1.0, .3], [196.4, .9, .2]];
  O.afBias = t => {           // 系统性失焦（暗处对不上焦、瀑布时故意失焦）
    if (t < T.wake + .3) return .55;
    if (t > 133.5 && t < 139.0) return .6 * sstep(133.5, 136.5, t);
    if (t >= 139.0 && t < 139.6) return .6 * (1 - sstep(139.0, 139.6, t));
    if (t >= T.black && t < T.back) return .15 * sstep(143, 146, t);
    if (t >= T.sleep) return .25 * sstep(T.sleep + .5, T.sleep + 2.5, t);
    return 0;
  };
  // 场景测光（相机自动曝光的输入，线性亮度）
  O.meterKeys = [
    [0, .00025], [T.wake, .00025], [T.wake + .05, .002], [T.desk, .02], [11.5, .022], [13.8, .024], [20.8, .02], [26.0, .021],
    [32.5, .02], [35.0, .018], [40.0, .022], [52.6, .02], [57.5, .022], [60.5, .25], [64, .4], [67, .5], [70, .55], [72.5, .58], [79.9, .58],
    [80.0, .02], [104, .022], [106, .024], [129, .025], [133, .05], [138.9, .09], [139.2, .03], [141.9, .03],
    [142.0, 1.0], [142.067, 1.0], [142.1, .0004], [143.0, .00022], [149.9, .00022], [150.0, .02], [182.5, .022], [183.2, .03], [187, .03], [189.6, .021], [195.4, .021], [195.8, .00018], [O.DUR, .00018]];
  O.meter = t => { let v = O.track(O.meterKeys.map(k => [k[0], Math.log(k[1]), 'lin']), t); return Math.exp(v); };

  // 摩尔纹强度：全片统一用减弱后的设置（彩色摩尔纹很少，文字更突出）
  O.moire = t => ({ fw: 2.8, sub: .45 });

  // ---------------- 信号恢复后的系统故障：150s 屏幕重新亮起 → 用户点「开始」的那一刻恢复正常 ----------------
  O.garble = t => t >= T.back && t < T.click;
  O.heartAt = t => { let b = 1e9; for (let k = 150.6; k < T.click; k += .94) b = Math.min(b, Math.abs(t - k)); return b; };
  O.glitchAmt = t => {
    if (t < T.back || t >= T.click) return 0; const x = t - T.back;
    if (x < 1.6) return 1; if (x < 5.4) return lerp(1, .32, (x - 1.6) / 3.8);
    return .05 + .3 * Math.exp(-Math.pow(O.heartAt(t) / .07, 2));      // 犹豫时：故障跟着心跳轻轻地闪
  };
  O.glitchEvents = (() => {
    const ev = [];
    for (let f = Math.floor(T.back * 30); f < Math.floor(T.click * 30); f++) {
      const t = f / 30, a = O.glitchAmt(t); if (O.hash(f, 101) >= a * .2) continue;
      const r = O.hash(f, 102), type = r < .45 ? 0 : r < .7 ? 2 : r < .94 ? 1 : 3;   // 撕裂为主，色块少量，闪黑偶尔
      ev.push({ t, f, type, s: .25 + .6 * O.hash(f, 103) * Math.min(1, a + .2) });
    }
    return ev;
  })();
  O.glitchAt = t => { const f = Math.floor(t * 30 + 1e-6); return O.glitchEvents.find(e => e.f === f) || null; };
})();
