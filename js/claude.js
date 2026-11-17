'use strict';
// ============================================================================
//  claude.js —— Claude 桌面端窗口（深色主题）：侧栏、空状态、输入框、菜单、对话流
// ============================================================================
(() => {
  const T = O.T, G = O.G;
  const C = O.CL = {
    bg: '#262624', side: '#1f1e1d', bar: '#1f1e1d', line: '#3a3936', text: '#f2f0e8', t2: '#c3c1b8', t3: '#8e8c85', t4: '#6b6a64',
    inp: '#30302e', inpLine: '#4a4945', menu: '#2f2e2c', hover: '#3d3c39', acc: '#d97757', accDeep: '#c4633f',
    bubble: '#3a3936', red: '#ef5a52', green: '#62c08f', tool: '#2b2a28',
  };
  const UI = '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", sans-serif';
  const UID = '"Segoe UI Variable Display", "Segoe UI", "Microsoft YaHei UI", sans-serif';
  const SERIF = 'Cambria, "Opus Serif", serif';      // Opus Serif = 打包的 Noto Serif SC（见 index.html）
  const MONO = '"Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace';
  O.FONT = { UI, UID, SERIF, MONO };

  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  // 乱码：把 UTF-8 字节当 GBK 解码（中文用户最熟悉的那种乱码），解不出的字节用「锟斤拷」
  const GBK = (() => { try { return new TextDecoder('gbk'); } catch (e) { return null; } })();
  const mojiCache = new Map();
  const moji = O.moji = s => { let r = mojiCache.get(s); if (r) return r; if (!GBK) r = s.replace(/[^\x00-\x7f]/g, '锟'); else { let k = 0; r = GBK.decode(new TextEncoder().encode(s)).replace(/�/g, () => '锟斤拷'[k++ % 3]); } mojiCache.set(s, r); return r; };
  O.rr = rr;
  const spark = O.spark = (c, x, y, r, rot = 0, col = C.acc) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col;
    const L = [1, .78, .95, .7, 1, .82, .9, .74, 1, .8, .92, .76];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, l = r * L[i];
      c.beginPath(); c.moveTo(Math.cos(a - .16) * r * .14, Math.sin(a - .16) * r * .14);
      c.lineTo(Math.cos(a - .045) * l, Math.sin(a - .045) * l); c.lineTo(Math.cos(a + .045) * l, Math.sin(a + .045) * l);
      c.lineTo(Math.cos(a + .16) * r * .14, Math.sin(a + .16) * r * .14); c.fill();
    }
    c.beginPath(); c.arc(0, 0, r * .2, 0, 7); c.fill(); c.restore();
  };
  const chevron = (c, x, y, s, col) => { c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - s, y - s / 2); c.lineTo(x, y + s / 2); c.lineTo(x + s, y - s / 2); c.stroke(); };
  const check = (c, x, y, s, col) => { c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x - s * .3, y + s * .7); c.lineTo(x + s, y - s * .7); c.stroke(); c.lineCap = 'butt'; };
  O.icons = { chevron, check };

  // ---------------- 文字换行（中日韩逐字，西文按词） ----------------
  const NOSTART = '，。、：；！？）」』》〉,.;:!?)]%…';
  const wrapCache = new Map();
  const wrap = (c, text, font, maxW) => {
    const key = font + '|' + maxW + '|' + text; let r = wrapCache.get(key); if (r) return r;
    c.font = font; const units = []; const chars = Array.from(text); let i = 0;
    while (i < chars.length) {
      const ch = chars[i];
      if (/[A-Za-z0-9_.,'"\-+=/()\[\]#@$×→←·|]/.test(ch)) { let w = ''; while (i < chars.length && /[A-Za-z0-9_.,'"\-+=/()\[\]#@$×→←·|]/.test(chars[i])) w += chars[i++]; while (i < chars.length && chars[i] === ' ') w += chars[i++]; units.push(w); }
      else { let w = ch; i++; while (i < chars.length && NOSTART.includes(chars[i])) w += chars[i++]; while (i < chars.length && chars[i] === ' ' && /[ -~]/.test(ch)) w += chars[i++]; units.push(w); }
    }
    const lines = []; let cur = '', cw = 0;
    for (const u of units) { const w = c.measureText(u).width; if (cw + w > maxW && cur) { lines.push(cur); cur = u.replace(/^ +/, ''); cw = c.measureText(cur).width; } else { cur += u; cw += w; } }
    if (cur) lines.push(cur); r = lines; wrapCache.set(key, r); return r;
  };
  O.wrap = wrap;

  // ---------------- 对话布局 ----------------
  const COLW = G.col1 - G.col0;
  const F = { p: `17px ${SERIF}`, pb: `600 17px ${SERIF}`, h: `600 18px ${SERIF}`, hb: `600 21px ${SERIF}`, user: `16px ${UI}`, tool: `13.5px ${MONO}`, small: `13px ${UI}`, card: `18px ${SERIF}`, water: `12.5px ${MONO}` };
  const LH = { p: 31, h: 34, user: 26, water: 20.5, card: 32 };
  const meas = document.createElement('canvas').getContext('2d');
  O.countAt = t => { const k = clamp((t - 55.6) / (T.close - .6 - 55.6)); return Math.min(47213, Math.round(47213 * Math.pow(k, 1.75) + (k > 0 && k < 1 ? O.hash(Math.floor(t * 30), 9) * 37 : 0))); };

  // 返回 { items:[{b,y,h,...}], H }  —— y 为内容坐标
  function layout(blocks, t) {
    const items = []; let y = 0;
    for (const b of blocks) {
      const vis = t >= b.t0; let h = 0, mb = 0, extra = {};
      switch (b.k) {
        case 'user': { const lines = wrap(meas, b.text, F.user, 540); let w = 0; meas.font = F.user; for (const l of lines) w = Math.max(w, meas.measureText(l).width); extra = { lines, bw: w + 36 }; h = vis ? lines.length * LH.user + 24 : 0; mb = vis ? 30 : 0; break; }
        case 'think': h = vis ? 28 : 0; mb = vis ? 10 : 0; break;
        case 'tool': h = vis ? (b.out && t >= b.t1 ? 50 : 28) : 0; mb = vis ? 4 : 0; break;
        case 'count': h = vis ? 30 : 0; mb = vis ? 8 : 0; break;
        case 'gap': h = vis ? b.h : 0; break;
        case 'p': {
          const font = b.bold ? F.pb : F.p, lines = wrap(meas, b.text, font, COLW); const n = vis ? Math.floor((t - b.t0) * (b.cps || 30)) + 1 : 0;
          let cnt = 0, shown = 0; for (const l of lines) { if (cnt < n) shown++; cnt += Array.from(l).length; }
          extra = { lines, n, font, total: cnt }; h = shown * LH.p; mb = vis ? 12 : 0; break;
        }
        case 'h': h = vis ? (b.big ? 40 : LH.h) : 0; mb = vis ? 6 : 0; if (vis) y += 10; break;
        case 'm': { const box = O.TeX.layout(meas, b.tex, b.big ? 25 : 20); extra = { box }; h = vis ? box.a + box.d + 22 : 0; mb = vis ? 8 : 0; break; }
        case 'line': h = vis ? LH.p + 6 : 0; mb = vis ? 8 : 0; break;
        case 'water': { const n = t >= b.t0 ? O.waterLines(t) : 0; extra = { n }; h = n * LH.water + (n ? 10 : 0); mb = n ? 10 : 0; break; }
        case 'card': {
          const ls = b.lines.map(l => ({ t0: l[0], text: l[1], cps: l[2], w: wrap(meas, l[1], F.card, COLW - 60) }));
          let lh = 0; for (const l of ls) if (t >= l.t0) lh += l.w.length * LH.card + 10;
          extra = { ls }; h = vis ? 36 + lh + (t >= b.btn ? 66 : 0) : 0; mb = vis ? 16 : 0; break;
        }
      }
      items.push(Object.assign({ b, y, h, vis }, extra)); y += h + mb;
    }
    return { items, H: y };
  }
  const VIEWH = G.view.y1 - G.view.y0;
  const scrollOf = H => Math.max(0, H + 30 - VIEWH);
  const blocksOf = era => era === 2 ? O.blocks2 : O.blocks1;
  // 锚点：返回屏幕逻辑坐标 [x,y]
  O.anchor = (id, t) => {
    const inB2 = O.blocks2.some(b => b.id === id), tt = inB2 ? Math.max(t, T.back) : Math.min(t, T.white - .001);
    if (!inB2 && tt < T.send) return [G.cx, 400];
    const L = layout(inB2 ? O.blocks2 : O.blocks1, tt), sc = scrollOf(L.H);
    const it = L.items.find(i => i.b.id === id); if (!it) return [G.cx, 600];
    let w = COLW; if (it.lines) { meas.font = it.font || F.p; w = Math.min(COLW, Math.max(...it.lines.map(l => meas.measureText(l).width))); }
    if (it.box) w = it.box.w;
    const x = it.b.k === 'm' ? G.cx : G.col0 + w / 2;
    return [x, G.view.y0 + 20 + it.y - sc + Math.max(it.h, 28) / 2];
  };

  // ---------------- 绘制 ----------------
  function drawTranscript(c, t, era) {
    const blocks = blocksOf(era), L = layout(blocks, t), sc = scrollOf(L.H), top = G.view.y0 + 20 - sc;
    c.save(); c.beginPath(); c.rect(G.win.x + G.side, G.view.y0, G.win.w - G.side, VIEWH); c.clip();
    const fast = era === 1 ? clamp((O.waterLines(t + 1 / 30) - O.waterLines(t)) * LH.water / 30) : 0;   // 滚动太快 → 残影
    for (const it of L.items) {
      if (!it.vis && it.b.k !== 'water') continue;
      const y = top + it.y; if (y > G.view.y1 + 40 || y + it.h < G.view.y0 - 60) continue;
      drawBlock(c, it, t, y, fast);
    }
    // 生成中的火花
    const gen = era === 1 ? (t >= T.think && t < T.white) : ((t >= T.ask && t < 177.9) || (t >= T.last && t < 187.8));
    if (gen) { const y = top + L.H + 6; if (y < G.view.y1 - 10) spark(c, G.col0 + 12, y + 8, 11, t * 1.3 + Math.sin(t * 3) * .4, C.acc); }
    c.restore();
    // 顶部渐隐
    const g = c.createLinearGradient(0, G.view.y0, 0, G.view.y0 + 30); g.addColorStop(0, C.bg); g.addColorStop(1, 'rgba(38,38,36,0)');
    c.fillStyle = g; c.fillRect(G.win.x + G.side, G.view.y0, G.win.w - G.side, 30);
    return L;
  }
  function revealText(c, lines, n, x, y, lh, col) {
    let cnt = 0;
    for (let i = 0; i < lines.length; i++) {
      const arr = Array.from(lines[i]); if (cnt >= n) break;
      const k = Math.min(arr.length, n - cnt); c.fillStyle = col; c.fillText(arr.slice(0, k).join(''), x, y + i * lh);
      cnt += arr.length;
    }
  }
  function spinner(c, x, y, r, t, col) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, t * 7, t * 7 + 4.2); c.stroke(); }
  function drawBlock(c, it, t, y, fast) {
    const b = it.b; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    switch (b.k) {
      case 'user': {
        const x = G.col1 - it.bw; c.fillStyle = C.bubble; rr(c, x, y, it.bw, it.h, 18); c.fill();
        c.font = F.user; c.fillStyle = C.text; it.lines.forEach((l, i) => c.fillText(l, x + 18, y + 30 + i * LH.user)); break;
      }
      case 'think': {
        const done = t >= b.t1, sec = Math.max(1, Math.round((Math.min(t, b.t1) - b.t0)));
        c.font = F.small;
        if (!done) { const sh = (t * .8) % 1; const g = c.createLinearGradient(G.col0 + 26 + sh * 200 - 60, 0, G.col0 + 26 + sh * 200 + 60, 0); g.addColorStop(0, C.t3); g.addColorStop(.5, C.text); g.addColorStop(1, C.t3); c.fillStyle = g; c.fillText('Thinking…', G.col0 + 30, y + 19); spark(c, G.col0 + 10, y + 14, 8, t * 2, C.acc); }
        else { c.fillStyle = C.t3; c.fillText(`Thought for ${sec}s`, G.col0, y + 19); chevron(c, G.col0 + 108, y + 13, 4, C.t3); }
        break;
      }
      case 'tool': {
        const done = t >= b.t1, a = clamp((t - b.t0) / .12);
        c.globalAlpha = a; c.font = F.tool;
        if (done) { c.fillStyle = C.green; c.beginPath(); c.arc(G.col0 + 6, y + 13, 4, 0, 7); c.fill(); } else spinner(c, G.col0 + 6, y + 13, 5, t, C.t3);
        c.fillStyle = C.t2; c.font = `600 13.5px ${MONO}`; c.fillText(b.name, G.col0 + 22, y + 18);
        const nw = c.measureText(b.name).width; c.font = F.tool; c.fillStyle = C.t3; c.fillText(b.arg, G.col0 + 30 + nw, y + 18);
        if (b.out && done) { c.fillStyle = C.t4; c.fillText('⎿  ' + b.out, G.col0 + 22, y + 42); }
        c.globalAlpha = 1; break;
      }
      case 'count': {
        const done = t >= b.t1; c.font = F.tool;
        if (!done) {
          spinner(c, G.col0 + 6, y + 14, 5, t, C.acc); const n = O.countAt(t);
          c.fillStyle = C.t2; c.font = `600 13.5px ${MONO}`; c.fillText('Reading', G.col0 + 22, y + 19);
          c.font = F.tool; c.fillStyle = C.t3; const langs = Math.min(31, 3 + Math.floor((t - b.t0) * 1.6));
          c.fillText(`${O.fmt(n)} pages · ${langs} languages · ${Math.min(86, Math.max(0, Math.floor((t - T.br0) * 7.3)))} windows`, G.col0 + 90, y + 19);
        } else {
          c.fillStyle = C.green; c.beginPath(); c.arc(G.col0 + 6, y + 14, 4, 0, 7); c.fill();
          c.fillStyle = C.t2; c.font = `600 13.5px ${MONO}`; c.fillText('Read', G.col0 + 22, y + 19);
          c.font = F.tool; c.fillStyle = C.t3; c.fillText('47,213 pages · 1,906 papers · 312 books · 31 languages', G.col0 + 66, y + 19);
        }
        break;
      }
      case 'p': {
        c.font = it.font; const col = b.red ? C.red : b.ok ? C.green : b.last ? '#ebe8df' : C.text;
        revealText(c, it.lines, it.n, G.col0, y + 22, LH.p, col);
        if (b.red && it.n >= it.total) { const k = clamp((t - b.t0 - it.total / b.cps) / .3); if (k < 1) { c.globalAlpha = 1 - k; c.fillStyle = 'rgba(239,90,82,.25)'; c.fillRect(G.col0 - 6, y, COLW, it.h); c.globalAlpha = 1; } }
        break;
      }
      case 'h': { c.font = b.big ? F.hb : F.h; c.fillStyle = C.text; const n = Math.floor((t - b.t0) * 60) + 1; c.fillText(Array.from(b.text).slice(0, n).join(''), G.col0, y + (b.big ? 30 : 25)); break; }
      case 'm': {
        const a = clamp((t - b.t0) / .18); c.globalAlpha = a; c.fillStyle = C.text;
        O.TeX.draw(c, it.box, G.cx - it.box.w / 2, y + 11 + it.box.a); c.globalAlpha = 1; break;
      }
      case 'line': {
        let x = G.col0; const k = clamp((t - b.t0) / .4); c.globalAlpha = 1;
        b.segs.forEach((s, i) => {
          if (i / b.segs.length > k) return;
          if (s.at && t < s.at) return;
          if (s.m) { const box = O.TeX.layout(c, s.m, 18); c.fillStyle = C.text; O.TeX.draw(c, box, x + 4, y + 23); x += box.w + 8; return; }
          c.font = s.b ? F.pb : F.p; const w = c.measureText(s.s).width;
          if (s.tag) { const pulse = .5 + .5 * Math.sin((t - s.at) * 9); c.fillStyle = `rgba(217,119,87,${.25 + .25 * pulse})`; rr(c, x - 4, y + 2, w + 8, 28, 6); c.fill(); c.fillStyle = '#ffb59a'; }
          else c.fillStyle = s.b ? '#fff' : C.text;
          c.fillText(s.s, x, y + 23); x += w;
        });
        break;
      }
      case 'water': drawWater(c, it, t, y, fast); break;
      case 'card': drawCard(c, it, t, y); break;
    }
  }

  // ---------------- 计算瀑布 ----------------
  const GLY = 'αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩ∂∇∮∫∑∏√∞≈≠≡≤≥⊗⊕†ℏ⟨⟩∈∀∃ЖЩЯЮЭБДЛ אבגדהוזחטיכלמנ ابتثجحخدذ 熵逆界态写入观察者未来过去时间零ㄅㄆ ᚠᚢᚦᚨᚱ';
  const G2 = Array.from(GLY);
  const hex = (r, n) => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(r() * 256).toString(16).padStart(2, '0') + ' '; return s; };
  function waterLine(i) {
    const r = O.rng(i * 7919 + 13), k = r();
    const it = String(i + 1).padStart(9, '0');
    const res = Math.exp(-i / 900) * (0.6 + r() * .8);
    if (k < .34) return `iter ${it}   ‖r‖ = ${res.toExponential(6)}   ⟨Φ|Φ⟩ = ${(1 - res * .01).toFixed(12)}   λ = ${(r() * 2 - 1).toFixed(9)}`;
    if (k < .5) return `  ψ[${Math.floor(r() * 1e8)}] = ${(r() * 2 - 1).toFixed(10)} ${r() < .5 ? '+' : '−'} ${(r()).toFixed(10)}i    ∂S/∂τ = ${(-r() * 1e-3).toExponential(4)}`;
    if (k < .64) return '  ' + hex(r, 28);
    if (k < .76) return `  ⟨Φ_f| Π_${Math.floor(r() * 9999)} U(τ=${(r() * 1e3).toFixed(3)}) |Ψ₀⟩ → ${(r()).toFixed(14)}`;
    if (k < .88) { let s = '  '; for (let j = 0; j < 44; j++) s += G2[Math.floor(r() * G2.length)]; return s; }
    return `  [ ${(r() * 2 - 1).toFixed(4)}  ${(r() * 2 - 1).toFixed(4)}  ${(r() * 2 - 1).toFixed(4)}  ${(r() * 2 - 1).toFixed(4)}  ${(r() * 2 - 1).toFixed(4)}  ${(r() * 2 - 1).toFixed(4)} ]`;
  }
  function drawWater(c, it, t, y, fast) {
    const n = it.n; if (!n) return;
    const i0 = Math.max(0, Math.floor((G.view.y0 - 40 - y) / LH.water)), i1 = Math.min(n, Math.ceil((G.view.y1 + 20 - y) / LH.water));
    c.font = F.water;
    const ghosts = fast > .02 ? 4 : 1;
    for (let g = 0; g < ghosts; g++) {
      const off = g * fast * 26; c.globalAlpha = ghosts > 1 ? (g === 0 ? .55 : .3) : 1;
      for (let i = i0; i < i1; i++) {
        const r = O.hash(i, 5); c.fillStyle = r < .05 ? C.acc : r < .1 ? '#9fd3ff' : (i > n - 3 ? C.text : C.t2);
        c.fillText(waterLine(i), G.col0, y + 16 + i * LH.water + off);
      }
    }
    c.globalAlpha = 1;
  }

  // ---------------- 确认卡片 ----------------
  function drawCard(c, it, t, y) {
    const b = it.b, x = G.col0, w = COLW; const hh = it.h;
    c.fillStyle = '#2d2c2a'; rr(c, x, y, w, hh, 14); c.fill(); c.strokeStyle = '#46453f'; c.lineWidth = 1; rr(c, x + .5, y + .5, w - 1, hh - 1, 14); c.stroke();
    let yy = y + 30; c.font = F.card;
    const SPAN = [3.4, 2.6, 1.2], ge = O.glitchAt(t);
    it.ls.forEach((l, li) => {
      if (t < l.t0) return; const n = Math.floor((t - l.t0) * l.cps) + 1;
      if (t >= T.click) { revealText(c, l.w, n, x + 30, yy + 14, LH.card, C.text); yy += l.w.length * LH.card + 10; return; }
      // 逐字从乱码"修复"成中文
      const all = Array.from(l.text), M = Array.from(moji(l.text)), m = M.length;
      let k0 = 0;
      l.w.forEach((wl, wi) => {
        const cs = Array.from(wl); let s = '';
        cs.forEach((ch, j) => {
          const k = k0 + j; if (k >= n) return;
          let ok = t >= l.t0 + k / l.cps + .45 + O.hash(k + li * 97, 55) * SPAN[li];
          if (ok && ge && ge.s > .55 && ge.type < 2 && t < 156.2 && O.hash(k + ge.f * 7, 56) < .35) ok = false;
          s += ok ? ch : M.slice(Math.floor(k * m / all.length), Math.floor((k + 1) * m / all.length)).join('') || '锟';
        });
        c.fillStyle = C.text; c.fillText(s, x + 30, yy + 14 + wi * LH.card); k0 += cs.length;
      });
      yy += l.w.length * LH.card + 10;
    });
    if (t >= b.btn) {
      const a = clamp((t - b.btn) / .25), by = yy + 10; c.globalAlpha = a;
      const go = { x: x + 30, y: by, w: 124, h: 44 }, no = { x: x + 168, y: by, w: 124, h: 44 };
      O.cardBtns = { go: [go.x + go.w / 2, go.y + go.h / 2], no: [no.x + no.w / 2, no.y + no.h / 2] };
      const cur = O.curNow || [0, 0], over = r => cur[0] >= r.x && cur[0] <= r.x + r.w && cur[1] >= r.y && cur[1] <= r.y + r.h;
      if (t < T.click + .25) {
        const pressGo = t >= T.click && t < T.click + .12;
        c.fillStyle = pressGo ? '#b8553a' : over(go) ? '#e3866a' : C.acc; rr(c, go.x, go.y, go.w, go.h, 10); c.fill();
        c.fillStyle = '#fff'; c.font = `600 16px ${UI}`; c.textAlign = 'center'; c.fillText('开始', go.x + go.w / 2, go.y + 28);
        c.fillStyle = over(no) ? '#45443f' : '#383733'; rr(c, no.x, no.y, no.w, no.h, 10); c.fill(); c.strokeStyle = '#55544e'; rr(c, no.x + .5, no.y + .5, no.w - 1, no.h - 1, 10); c.stroke();
        c.fillStyle = C.t2; c.fillText('取消', no.x + no.w / 2, no.y + 28); c.textAlign = 'left';
      } else {
        c.fillStyle = C.t3; c.font = `14px ${UI}`; check(c, go.x + 8, go.y + 22, 6, C.green); c.fillText('已选择：开始', go.x + 24, go.y + 27);
      }
      c.globalAlpha = 1;
    } else if (!O.cardBtns) O.cardBtns = { go: [x + 92, yy + 32], no: [x + 230, yy + 32] };
  }

  // ---------------- 输入框 ----------------
  function drawInput(c, t, r, sent) {
    c.fillStyle = C.inp; rr(c, r.x, r.y, r.w, r.h, 18); c.fill();
    c.strokeStyle = C.inpLine; c.lineWidth = 1; rr(c, r.x + .5, r.y + .5, r.w - 1, r.h - 1, 18); c.stroke();
    const st = sent ? { text: '', comp: '', cand: null } : O.inputAt(t);
    const focused = t >= T.focus; c.font = `17px ${UI}`; c.textBaseline = 'alphabetic';
    const tx = r.x + 22, ty = r.y + 40;
    let caretX = tx;
    if (!st.text && !st.comp) { c.fillStyle = C.t3; c.fillText(sent ? (O.garble(t) ? moji('Reply to Opus 50…') : 'Reply to Opus 50…') : 'How can I help you tonight?', tx, ty); }
    else {
      c.fillStyle = C.text; c.fillText(st.text, tx, ty); caretX = tx + c.measureText(st.text).width;
      if (st.comp) {
        const py = st.comp.replace(/(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/g, "'$1").replace(/^'/, '').replace(/'(?=[aeiouv])/g, '');
        const w = c.measureText(py).width; c.fillStyle = C.text; c.fillText(py, caretX, ty);
        c.strokeStyle = C.t2; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(caretX, ty + 5); c.lineTo(caretX + w, ty + 5); c.stroke(); c.setLineDash([]);
        drawIME(c, caretX - 6, ty + 18, st.cand);
        caretX += w;
      }
    }
    if (focused && (Math.floor((t - T.focus) * 1.9) % 2 === 0 || (st.text && !sent))) { c.fillStyle = C.text; c.fillRect(caretX + 1, ty - 17, 1.5, 22); }
    // 底部控件
    const k = G.ctrl(r);
    c.strokeStyle = '#5a5954'; c.lineWidth = 1.2; c.beginPath(); c.arc(k.plus.x, k.plus.y, 15, 0, 7); c.stroke();
    c.strokeStyle = C.t2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(k.plus.x - 6, k.plus.y); c.lineTo(k.plus.x + 6, k.plus.y); c.moveTo(k.plus.x, k.plus.y - 6); c.lineTo(k.plus.x, k.plus.y + 6); c.stroke();
    // 权限
    const byp = t >= T.cont + .06; c.font = `13.5px ${UI}`;
    const pl = byp ? 'Bypass permissions' : 'Ask permissions', pw = c.measureText(pl).width + 52;
    const permOver = !sent && t >= 32.6 && t < T.permOpen + .05;
    c.fillStyle = byp ? 'rgba(239,90,82,.14)' : permOver || (t >= T.permOpen && t < T.permPick) ? '#3d3c39' : 'rgba(0,0,0,0)'; rr(c, k.perm.x, k.perm.y, pw, k.perm.h, 8); c.fill();
    if (byp) { c.fillStyle = C.red; c.beginPath(); c.moveTo(k.perm.x + 17, k.perm.y + 8); c.lineTo(k.perm.x + 24, k.perm.y + 22); c.lineTo(k.perm.x + 10, k.perm.y + 22); c.closePath(); c.fill(); c.fillStyle = '#2b1a18'; c.fillRect(k.perm.x + 16.3, k.perm.y + 12, 1.6, 5); }
    else { c.strokeStyle = C.t2; c.lineWidth = 1.3; c.beginPath(); c.moveTo(k.perm.x + 17, k.perm.y + 7); c.lineTo(k.perm.x + 23, k.perm.y + 10); c.lineTo(k.perm.x + 22, k.perm.y + 18); c.lineTo(k.perm.x + 17, k.perm.y + 23); c.lineTo(k.perm.x + 12, k.perm.y + 18); c.lineTo(k.perm.x + 11, k.perm.y + 10); c.closePath(); c.stroke(); }
    c.fillStyle = byp ? C.red : C.t2; c.fillText(pl, k.perm.x + 31, k.perm.y + 20); chevron(c, k.perm.x + pw - 12, k.perm.y + 15, 3.5, byp ? C.red : C.t3);
    // 模型
    const ml = t >= T.pick ? 'Opus 50' : 'Opus 5.5'; c.font = `14px ${UI}`; const mw = c.measureText(ml).width + 30;
    const mOver = !sent && t >= 11.9 && t < T.ddClose;
    if (mOver) { c.fillStyle = '#3d3c39'; rr(c, k.model.r - mw, k.model.y, mw + 4, k.model.h, 8); c.fill(); }
    c.fillStyle = C.t2; c.fillText(ml, k.model.r - mw + 8, k.model.y + 20); chevron(c, k.model.r - 10, k.model.y + 14, 3.5, C.t3);
    // 发送
    const has = !sent && (st.text || st.comp);
    c.fillStyle = has ? C.acc : '#4a4945'; rr(c, k.send.x, k.send.y, k.send.s, k.send.s, 10); c.fill();
    c.strokeStyle = has ? '#fff' : '#8a8882'; c.lineWidth = 2; c.lineCap = 'round'; const sx = k.send.x + 18, sy = k.send.y + 18;
    c.beginPath(); c.moveTo(sx, sy + 8); c.lineTo(sx, sy - 8); c.moveTo(sx - 6, sy - 2); c.lineTo(sx, sy - 8); c.lineTo(sx + 6, sy - 2); c.stroke(); c.lineCap = 'butt';
  }
  function drawIME(c, x, y, cand) {
    if (!cand) return; c.font = `16px ${UI}`;
    const items = cand.map((s, i) => `${i + 1} ${s}`); const ws = items.map(s => c.measureText(s).width + 22); const W = ws.reduce((a, b) => a + b, 0) + 60;
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 4; c.fillStyle = '#2c2c2c'; rr(c, x, y, W, 42, 8); c.fill(); c.restore();
    c.strokeStyle = '#444'; rr(c, x + .5, y + .5, W - 1, 41, 8); c.stroke();
    let xx = x + 8;
    items.forEach((s, i) => { if (i === 0) { c.fillStyle = '#3a3a3a'; rr(c, xx - 2, y + 6, ws[i], 30, 5); c.fill(); c.fillStyle = '#4cc2ff'; rr(c, xx - 2, y + 13, 3, 16, 2); c.fill(); } c.fillStyle = i === 0 ? '#fff' : '#d0d0d0'; c.fillText(s, xx + 8, y + 27); xx += ws[i]; });
    c.fillStyle = '#9a9a9a'; c.font = `12px ${UI}`; c.fillText('‹ ›', xx + 8, y + 26);
  }

  // ---------------- 模型菜单 ----------------
  const MODELS = [['Opus 5.5', 'Most capable for ambitious work'], ['Sonnet 5.5', 'Smart, efficient model for everyday use'], ['Haiku 5.5', 'Fastest for quick answers'], ['Opus 50', 'model.opus50.description']];
  function knobPos(t) {
    const d = G.dd;
    if (t < T.drag0) return 2;
    if (t < T.drag1 + .05) { const cx = O.curNow ? O.curNow[0] : 0; return clamp((cx - d.n0) / d.step, 2, 3); }
    if (t < T.slide0) return 3;
    return 3 + E.io3(clamp((t - T.slide0) / (T.slide1 - T.slide0)));
  }
  function drawModelMenu(c, t) {
    const d = G.dd; if (t < T.ddOpen || t > T.ddClose + .12) return;
    const a = t < T.ddClose ? clamp((t - T.ddOpen) / .12) : 1 - clamp((t - T.ddClose) / .12), oy = (1 - a) * -6;
    c.save(); c.globalAlpha = a; c.translate(0, oy);
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 30; c.shadowOffsetY = 8; c.fillStyle = C.menu; rr(c, d.x, d.y, d.w, d.h, 14); c.fill(); c.restore();
    c.strokeStyle = '#47463f'; c.lineWidth = 1; rr(c, d.x + .5, d.y + .5, d.w - 1, d.h - 1, 14); c.stroke();
    const cur = O.curNow || [0, 0];
    MODELS.forEach((m, i) => {
      const y = G.rowY(i), odd = i === 3, ox = odd ? 1 : 0, oy2 = odd ? 1 : 0;
      const hov = cur[0] > d.x && cur[0] < d.x + d.w && cur[1] >= y && cur[1] < y + d.row;
      if (hov) { c.fillStyle = C.hover; rr(c, d.x + 6, y, d.w - 12, d.row - 2, 9); c.fill(); }
      c.font = `600 15px ${UI}`; c.fillStyle = C.text; c.fillText(m[0], d.x + 20 + ox, y + 25 + oy2);
      let desc = m[1];
      if (odd && ((t >= T.flick && t < T.flick + 2 / 30 + .001) || (t >= 25.1 && t < 25.1 + 1 / 30 + .001))) desc = '等你很久了';
      c.font = `13px ${UI}`; c.fillStyle = C.t3; c.fillText(desc, d.x + 20 + ox, y + 45 + oy2);
      const sel = (i === 0 && t < T.pick) || (i === 3 && t >= T.pick);
      if (sel) check(c, d.x + d.w - 30, y + d.row / 2 - 1, 6, C.acc);
    });
    // Effort
    const ey = d.effY; c.strokeStyle = C.line; c.beginPath(); c.moveTo(d.x + 14, ey - 8); c.lineTo(d.x + d.w - 14, ey - 8); c.stroke();
    c.font = `600 13.5px ${UI}`; c.fillStyle = C.t2; c.fillText('Effort', d.x + 20, ey + 22);
    const kp = knobPos(t); let val = ['Low', 'Medium', 'High', 'Max'][Math.round(Math.min(kp, 3))];
    if (t >= T.slide0) val = t < T.slide1 ? '' : (Math.floor(t * 30) % 23 === 0 ? 'M̸ax' : '—');
    c.font = `13.5px ${UI}`; c.fillStyle = kp > 2.5 ? C.acc : C.t2; c.textAlign = 'right'; c.fillText(val, d.x + d.w - 22, ey + 22); c.textAlign = 'left';
    const ny = d.trackY, x0 = d.n0, ext = sstep(T.notch, T.notch + .45, t), x3 = x0 + 3 * d.step, x4 = x0 + 4 * d.step;
    const xEnd = lerp(x3, x4, ext), kx = x0 + kp * d.step;
    c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = '#4b4a45'; c.beginPath(); c.moveTo(x0, ny); c.lineTo(xEnd, ny); c.stroke();
    c.strokeStyle = C.acc; c.beginPath(); c.moveTo(x0, ny); c.lineTo(kx, ny); c.stroke(); c.lineCap = 'butt';
    for (let i = 0; i < 5; i++) {
      if (i === 4 && ext <= 0) continue; const nx = x0 + i * d.step;
      c.globalAlpha = a * (i === 4 ? ext : 1); c.fillStyle = nx <= kx + .5 ? C.acc : '#6a6963'; c.beginPath(); c.arc(nx, ny, 3.2, 0, 7); c.fill(); c.globalAlpha = a;
      if (i < 4) { c.font = `12px ${UI}`; c.fillStyle = Math.round(kp) === i ? C.t2 : C.t4; c.textAlign = 'center'; c.fillText(['Low', 'Medium', 'High', 'Max'][i], nx, ny + 26); c.textAlign = 'left'; }
    }
    c.fillStyle = '#f4f2ea'; c.beginPath(); c.arc(kx, ny, 8.5, 0, 7); c.fill(); c.strokeStyle = C.acc; c.lineWidth = 2; c.beginPath(); c.arc(kx, ny, 8.5, 0, 7); c.stroke();
    c.restore();
  }
  // ---------------- 权限菜单 / 对话框 ----------------
  const PERMS = [['Ask permissions', 'Claude asks before each action'], ['Auto-accept edits', 'Edits files without asking'], ['Plan mode', 'Plans first, makes no changes'], ['Bypass permissions', 'Runs anything without asking']];
  function drawPermMenu(c, t) {
    if (t < T.permOpen || t > T.permPick + .1) return;
    const p = G.perm, a = t < T.permPick ? clamp((t - T.permOpen) / .12) : 1 - clamp((t - T.permPick) / .1), h = 8 * 2 + 4 * p.row;
    c.save(); c.globalAlpha = a; c.translate(0, (1 - a) * -6);
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 30; c.shadowOffsetY = 8; c.fillStyle = C.menu; rr(c, p.x, p.y, p.w, h, 14); c.fill(); c.restore();
    c.strokeStyle = '#47463f'; rr(c, p.x + .5, p.y + .5, p.w - 1, h - 1, 14); c.stroke();
    const cur = O.curNow || [0, 0];
    PERMS.forEach((m, i) => {
      const y = p.y + 8 + i * p.row, hov = cur[0] > p.x && cur[0] < p.x + p.w && cur[1] >= y && cur[1] < y + p.row;
      if (hov) { c.fillStyle = C.hover; rr(c, p.x + 6, y, p.w - 12, p.row - 2, 9); c.fill(); }
      c.font = `600 15px ${UI}`; c.fillStyle = i === 3 ? C.red : C.text; c.fillText(m[0], p.x + 20, y + 26);
      c.font = `13px ${UI}`; c.fillStyle = C.t3; c.fillText(m[1], p.x + 20, y + 46);
      if (i === 0) check(c, p.x + p.w - 30, y + p.row / 2 - 1, 6, C.acc);
    });
    c.restore();
  }
  function drawDialog(c, t) {
    if (t < T.dlg || t > T.cont + .14) return;
    const a = t < T.cont + .02 ? clamp((t - T.dlg) / .16) : 1 - clamp((t - T.cont - .02) / .12), d = G.dlg;
    c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,.5)'; rr(c, G.win.x, G.win.y, G.win.w, G.win.h, 8); c.fill();
    const s = .97 + .03 * E.o3(a); c.translate(d.x + d.w / 2, d.y + d.h / 2); c.scale(s, s); c.translate(-(d.x + d.w / 2), -(d.y + d.h / 2));
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 40; c.shadowOffsetY = 10; c.fillStyle = '#2b2a28'; rr(c, d.x, d.y, d.w, d.h, 16); c.fill(); c.restore();
    c.strokeStyle = '#4a4943'; rr(c, d.x + .5, d.y + .5, d.w - 1, d.h - 1, 16); c.stroke();
    c.fillStyle = C.red; c.beginPath(); c.moveTo(d.x + 44, d.y + 30); c.lineTo(d.x + 58, d.y + 56); c.lineTo(d.x + 30, d.y + 56); c.closePath(); c.fill();
    c.fillStyle = '#2b2a28'; c.fillRect(d.x + 43, d.y + 38, 2, 9); c.fillRect(d.x + 43, d.y + 49, 2, 2.5);
    c.font = `600 19px ${UI}`; c.fillStyle = C.text; c.fillText('Bypass all permissions?', d.x + 72, d.y + 50);
    c.font = `14.5px ${UI}`; c.fillStyle = C.t2;
    ['Opus 50 will be able to read, modify and run anything on this', 'computer — files, apps, network and system settings — without', 'asking you first.'].forEach((l, i) => c.fillText(l, d.x + 72, d.y + 88 + i * 23));
    const cur = O.curNow || [0, 0], over = r => cur[0] >= r.x && cur[0] <= r.x + r.w && cur[1] >= r.y && cur[1] <= r.y + r.h;
    const cb = d.cancel, ct = d.cont, pressed = t >= T.cont && t < T.cont + .1;
    c.fillStyle = over(cb) ? '#45443f' : '#383733'; rr(c, cb.x, cb.y, cb.w, cb.h, 9); c.fill(); c.strokeStyle = '#55544e'; rr(c, cb.x + .5, cb.y + .5, cb.w - 1, cb.h - 1, 9); c.stroke();
    c.fillStyle = pressed ? '#a8402f' : over(ct) ? '#e0574a' : '#cf4a3d'; rr(c, ct.x, ct.y, ct.w, ct.h, 9); c.fill();
    c.font = `600 15px ${UI}`; c.textAlign = 'center'; c.fillStyle = C.t2; c.fillText('Cancel', cb.x + cb.w / 2, cb.y + 26); c.fillStyle = '#fff'; c.fillText('Continue', ct.x + ct.w / 2, ct.y + 26); c.textAlign = 'left';
    c.restore();
  }

  // ---------------- 窗口框架 + 侧栏 ----------------
  const RECENTS = ['怎么逆转熵增', '整理照片按日期归档', '周报：Q4 进度', 'fix: 登录页闪退', '读书笔记·《时间的秩序》', 'React 表单校验', '给猫起名字', '京都旅行预算', '简历润色', 'Rust 生命周期报错', '毕业论文目录'];
  function drawFrame(c, t, sent) {
    const w = G.win;
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 50; c.shadowOffsetY = 14; c.fillStyle = C.bg; rr(c, w.x, w.y, w.w, w.h, 8); c.fill(); c.restore();
    c.save(); rr(c, w.x, w.y, w.w, w.h, 8); c.clip();
    c.fillStyle = C.side; c.fillRect(w.x, w.y, G.side, w.h); c.fillRect(w.x, w.y, w.w, G.title);
    c.strokeStyle = '#2f2e2c'; c.beginPath(); c.moveTo(w.x + G.side + .5, w.y + G.title); c.lineTo(w.x + G.side + .5, w.y + w.h); c.stroke();
    // 标题栏
    c.strokeStyle = C.t3; c.lineWidth = 1.2; const bx = w.x + w.w;
    c.beginPath(); c.moveTo(bx - 130, w.y + 20); c.lineTo(bx - 120, w.y + 20); c.stroke();
    c.strokeRect(bx - 79, w.y + 15, 10, 10);
    c.beginPath(); c.moveTo(bx - 28, w.y + 15); c.lineTo(bx - 18, w.y + 25); c.moveTo(bx - 18, w.y + 15); c.lineTo(bx - 28, w.y + 25); c.stroke();
    c.strokeStyle = C.t3; c.lineWidth = 1.4; c.strokeRect(w.x + 16, w.y + 12, 18, 15); c.beginPath(); c.moveTo(w.x + 22, w.y + 12); c.lineTo(w.x + 22, w.y + 27); c.stroke();
    c.font = `13px ${UI}`; c.fillStyle = C.t3; c.fillText('File   Edit   View   Help', w.x + 54, w.y + 25);
    // 侧栏
    c.font = `500 23px ${SERIF}`; c.fillStyle = C.text; c.fillText('Claude', w.x + 22, w.y + 88);
    const ny = w.y + 116;
    c.fillStyle = 'rgba(217,119,87,.16)'; c.beginPath(); c.arc(w.x + 34, ny + 18, 13, 0, 7); c.fill();
    c.strokeStyle = C.acc; c.lineWidth = 1.8; c.beginPath(); c.moveTo(w.x + 28, ny + 18); c.lineTo(w.x + 40, ny + 18); c.moveTo(w.x + 34, ny + 12); c.lineTo(w.x + 34, ny + 24); c.stroke();
    c.font = `600 14.5px ${UI}`; c.fillStyle = C.acc; c.fillText('New session', w.x + 56, ny + 23);
    [['Chat', 0], ['Code', 1], ['Projects', 0]].forEach(([n, s], i) => {
      const yy = ny + 52 + i * 38; if (s) { c.fillStyle = '#2f2e2b'; rr(c, w.x + 10, yy, G.side - 20, 32, 8); c.fill(); }
      c.font = `14.5px ${UI}`; c.fillStyle = s ? C.text : C.t2; c.fillText(n, w.x + 46, yy + 21);
      c.strokeStyle = s ? C.t2 : C.t3; c.lineWidth = 1.3; c.strokeRect(w.x + 22, yy + 9, 14, 13);
    });
    c.font = `600 12px ${UI}`; c.fillStyle = C.t4; c.fillText('Recents', w.x + 22, ny + 196);
    const gb = O.garble(t), rec = (sent ? RECENTS : RECENTS.slice(1)).map(r => gb ? moji(r) : r);
    rec.forEach((r, i) => {
      const yy = ny + 210 + i * 34; if (sent && i === 0) { c.fillStyle = '#2f2e2b'; rr(c, w.x + 10, yy, G.side - 20, 30, 7); c.fill(); }
      c.font = `14px ${UI}`; c.fillStyle = sent && i === 0 ? C.text : C.t2; c.fillText(r, w.x + 22, yy + 20);
    });
    // 用户
    const uy = w.y + w.h - 58; c.strokeStyle = '#2f2e2c'; c.beginPath(); c.moveTo(w.x, uy - 8); c.lineTo(w.x + G.side, uy - 8); c.stroke();
    c.fillStyle = '#5b5a55'; c.beginPath(); c.arc(w.x + 36, uy + 22, 15, 0, 7); c.fill();
    c.font = `600 14px ${UI}`; c.fillStyle = C.text; c.textAlign = 'center'; c.fillText('Y', w.x + 36, uy + 27); c.textAlign = 'left';
    c.font = `14px ${UI}`; c.fillStyle = C.t2; c.fillText('Max plan', w.x + 62, uy + 27);
    // 主区标题
    if (sent) { const ttl = gb ? moji('怎么逆转熵增') : '怎么逆转熵增'; c.font = `14.5px ${UI}`; c.fillStyle = C.t2; c.fillText(ttl, w.x + G.side + 28, w.y + G.title + 34); chevron(c, w.x + G.side + 28 + c.measureText(ttl).width + 14, w.y + G.title + 29, 3.5, C.t3); }
    c.font = `13px ${MONO}`; c.fillStyle = C.t4; c.textAlign = 'right'; c.fillText('C:\\Users\\Y', w.x + w.w - 28, w.y + G.title + 34); c.textAlign = 'left';
  }

  // 状态行（输入框上方）
  function drawStatus(c, t, era) {
    let s = null, prog = -1;
    if (era === 1 && t >= T.think && t < T.white) {
      const el = Math.floor(t - T.think), tm = el >= 60 ? `${Math.floor(el / 60)}m ${el % 60}s` : `${el}s`;
      if (t < T.tools) s = 'Thinking…'; else if (t < T.close) s = 'Searching…'; else if (t < T.calc) s = 'Writing…'; else if (t < T.start) s = 'Deriving…';
      else { s = `求解 ⟨Φ_f|  ${(Math.min(t, T.done) - T.start).toFixed(1)}s / 11.7s`; prog = clamp((t - T.start) / (T.done - T.start)); }
      if (prog < 0) s += `  (${tm} · esc to interrupt)`;
    }
    if (era === 2 && ((t >= T.ask && t < 155.4) || (t > T.click && t < 177.9) || (t >= T.last && t < 187.8))) s = 'Writing…';
    if (!s) return;
    const y = G.inp1.y - 26; spark(c, G.col0 + 10, y - 5, 7, t * 2.2, C.acc);
    c.font = `13.5px ${MONO}`; c.fillStyle = prog >= 0 ? '#e8b4a0' : C.acc; c.fillText(s, G.col0 + 26, y);
    if (prog >= 0) {
      const x = G.col0 + 330, w = 300; c.fillStyle = '#3a3936'; rr(c, x, y - 10, w, 8, 4); c.fill(); c.fillStyle = C.acc; rr(c, x, y - 10, Math.max(4, w * prog), 8, 4); c.fill();
      c.fillStyle = C.t3; c.fillText(`${(prog * 2.6).toFixed(2)}×10¹²² / 2.6×10¹²²`, x + w + 14, y);
    }
  }

  // ---------------- 主入口 ----------------
  O.Claude = {
    draw(c, t) {
      const era = O.era(t); if (era === 'white' || era === 'black') return;
      const sent = t >= T.send;
      drawFrame(c, t, sent);
      if (!sent) {
        // 空状态
        c.font = `400 38px Georgia, ${SERIF}`; c.fillStyle = '#e9e7df'; const g = 'Burning the midnight oil?', gw = c.measureText(g).width;
        spark(c, G.cx - gw / 2 - 30, G.greetY - 13, 19, .3, C.acc); c.fillText(g, G.cx - gw / 2 + 4, G.greetY);
        drawInput(c, t, G.inp0, false);
        drawModelMenu(c, t); drawPermMenu(c, t);
      } else {
        const L = drawTranscript(c, t, era);
        drawStatus(c, t, era);
        drawInput(c, t, G.inp1, true);
      }
      c.restore();   // drawFrame 里的 clip
      if (!sent) drawDialog(c, t);
    },
  };
})();
