'use strict';
// ============================================================================
//  browser.js —— 浏览器窗口与网页（全部原创文本，预渲染到离屏画布）
// ============================================================================
(() => {
  const { UI, SERIF, MONO } = O.FONT;
  const PW = 1240, PH = 2000, S = O.LS;
  const KEYS = ['entropy', 'Entropy', 'Entropie', 'entropie', '熵', 'エントロピー', 'энтропи', 'Энтропи', '엔트로피', 'entropia'];
  const TX = {
    en: [
      'In thermodynamics, entropy is a measure of how many microscopic arrangements correspond to the same macroscopic state. For an isolated system the second law says that entropy never decreases: it grows, or in an idealised reversible process it stays exactly constant.',
      'The tension between time-symmetric microscopic laws and the one-way growth of entropy is usually called Loschmidt\'s paradox. The standard resolution appeals to a special initial condition: the early universe was in a state of extraordinarily low entropy, and everything since has been running downhill.',
      'A local decrease of entropy is always possible, provided a larger increase happens somewhere else. Refrigerators, living cells and growing crystals all lower their own entropy while exporting heat, and therefore entropy, to their surroundings.',
      'Maxwell\'s demon, a tiny gatekeeper sorting fast molecules from slow ones, appeared to break the second law. The loophole closed when it was shown that erasing the demon\'s memory costs at least k ln 2 of entropy per bit. Information, it turns out, is physical.',
      'Whether entropy could ever be reversed on a cosmic scale remains an open question. Recurrence arguments say a finite closed system will eventually wander back near its starting state, but the waiting time dwarfs the age of the universe by a margin that has no useful name.',
      'No known physical process can reverse the growth of entropy of the universe as a whole. Every proposal examined so far either borrows order from an external reservoir or ignores the entropy cost of the information needed to steer the reversal.',
    ],
    zh: [
      '熵是描述系统无序程度的物理量。根据热力学第二定律，孤立系统的熵永远不会自发减少，只会增加，或在理想的可逆过程中保持不变。',
      '从微观上看，物理定律对时间几乎是对称的，可宏观世界却只朝一个方向演化：杯子会摔碎，却从不会自己复原。这就是所谓的“时间之箭”。',
      '局部的熵减是可能的，冰箱、晶体和生命都在做这件事，但代价是向外界排出更多的熵。整体来看，账本永远是亏的。',
      '有人认为宇宙最终会走向“热寂”：所有能量均匀分布，不再有任何可以利用的差异，也不再有任何事情会发生。',
      '至于如何逆转整个宇宙的熵增，目前没有任何已知的方法。所有提出过的方案，要么偷偷借用了外部的有序，要么忽略了信息本身的代价。',
    ],
    de: ['Die Entropie ist eine grundlegende thermodynamische Zustandsgröße. Nach dem zweiten Hauptsatz kann sie in einem abgeschlossenen System niemals abnehmen; sie wächst oder bleibt im idealen reversiblen Fall konstant.', 'Ob eine Umkehr der Entropie im kosmischen Maßstab überhaupt möglich ist, gilt bis heute als ungeklärt. Alle bekannten Vorschläge verschieben die Unordnung nur an einen anderen Ort.', 'Lokal kann die Entropie sinken, etwa in einem Kühlschrank oder in einem lebenden Organismus, doch stets auf Kosten einer größeren Zunahme in der Umgebung.'],
    ja: ['エントロピーとは、系の乱雑さを表す量である。熱力学第二法則によれば、孤立系のエントロピーは決して減少しない。', 'では、宇宙全体のエントロピーを逆転させることはできるのだろうか。結論から言えば、現在の物理学ではその方法は知られていない。', '局所的にエントロピーを下げることは可能だが、その代償として周囲により多くのエントロピーを捨てなければならない。'],
    ru: ['Энтропия — мера беспорядка физической системы. Согласно второму началу термодинамики, в замкнутой системе энтропия не убывает.', 'Вопрос о том, можно ли обратить рост энтропии во всей Вселенной, остаётся открытым. Ни один из известных механизмов не даёт положительного ответа.', 'Локальное уменьшение энтропии возможно — так работают холодильники и живые клетки, — но лишь ценой её роста в окружающей среде.'],
    ko: ['엔트로피는 계의 무질서도를 나타내는 물리량이다. 열역학 제2법칙에 따르면 고립계의 엔트로피는 결코 감소하지 않는다.', '우주 전체의 엔트로피를 되돌리는 방법은 아직 알려져 있지 않다.'],
  };
  const pages = []; O.pages = pages;
  const mk = () => { const cv = document.createElement('canvas'); cv.width = PW * S; cv.height = PH * S; const c = cv.getContext('2d'); c.scale(S, S); return { cv, c, hits: [] }; };
  // 带关键词记录的段落
  function para(P, text, x, y, w, font, lh, col) {
    const c = P.c; const lines = O.wrap(c, text, font, w); c.font = font; c.fillStyle = col;
    lines.forEach((l, i) => {
      const yy = y + i * lh; c.fillText(l, x, yy);
      for (const k of KEYS) { let p = l.indexOf(k); while (p >= 0) { const x0 = c.measureText(l.slice(0, p)).width, ww = c.measureText(k).width; P.hits.push({ x: x + x0 - 1, y: yy - lh * .72, w: ww + 2, h: lh * .92 }); p = l.indexOf(k, p + k.length); } }
    });
    return y + lines.length * lh;
  }
  const fill = (P, col) => { P.c.fillStyle = col; P.c.fillRect(0, 0, PW, PH); };
  function search(q, lang, results) {
    const P = mk(), c = P.c; fill(P, '#fff');
    c.fillStyle = '#fff'; c.fillRect(0, 0, PW, 90); c.strokeStyle = '#e4e6ea'; c.beginPath(); c.moveTo(0, 90); c.lineTo(PW, 90); c.stroke();
    c.font = `600 26px ${UI}`; c.fillStyle = '#5f6368'; c.fillText('◐ search', 28, 56);
    O.rr(c, 190, 22, 640, 46, 23); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#dfe1e5'; c.stroke();
    c.font = `17px ${UI}`; c.fillStyle = '#202124'; c.fillText(q, 214, 52);
    c.font = `14px ${UI}`; ['All', 'Images', 'News', 'Scholar', 'Books'].forEach((s, i) => { c.fillStyle = i === 0 ? '#1a73e8' : '#5f6368'; c.fillText(s, 190 + i * 86, 118); });
    c.fillStyle = '#70757a'; c.font = `13.5px ${UI}`; c.fillText(`About ${O.fmt(1200000 + Math.floor(q.length * 91377))} results (0.${30 + q.length % 60} seconds)`, 190, 160);
    let y = 200; const R = O.rng(q.length * 31);
    for (let k = 0; k < 14; k++) {
      const r = results[k % results.length];
      c.font = `13px ${UI}`; c.fillStyle = '#202124'; c.fillText(r[1], 190, y);
      c.font = `21px ${UI}`; c.fillStyle = '#1a0dab'; c.fillText(r[0], 190, y + 30);
      y = para(P, r[2] || TX[lang][k % TX[lang].length].slice(0, 140) + '…', 190, y + 58, 650, `15px ${UI}`, 23, '#4d5156') + 30;
    }
    return P;
  }
  function wiki(title, lang, sub) {
    const P = mk(), c = P.c; fill(P, '#fff');
    c.fillStyle = '#f8f9fa'; c.fillRect(0, 0, PW, 70); c.strokeStyle = '#a2a9b1'; c.beginPath(); c.moveTo(0, 70); c.lineTo(PW, 70); c.stroke();
    c.font = `600 18px ${SERIF}`; c.fillStyle = '#202122'; c.fillText(lang === 'zh' ? '百科全书' : lang === 'de' ? 'Enzyklopädie' : lang === 'ru' ? 'Энциклопедия' : 'Encyclopedia', 30, 44);
    O.rr(c, 330, 18, 420, 36, 4); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#a2a9b1'; c.stroke(); c.font = `15px ${UI}`; c.fillStyle = '#72777d'; c.fillText(lang === 'zh' ? '搜索' : 'Search', 344, 42);
    c.font = `34px ${SERIF}`; c.fillStyle = '#000'; c.fillText(title, 40, 132); c.fillStyle = '#a2a9b1'; c.fillRect(40, 146, PW - 80, 1);
    c.font = `14px ${UI}`; c.fillStyle = '#54595d'; c.fillText(sub, 40, 172);
    // 信息框
    c.fillStyle = '#f8f9fa'; c.fillRect(PW - 360, 200, 320, 380); c.strokeStyle = '#a2a9b1'; c.strokeRect(PW - 360, 200, 320, 380);
    c.font = `600 15px ${UI}`; c.fillStyle = '#000'; c.fillText(title, PW - 340, 230);
    const box = O.TeX.layout(c, 'S = k_B \\ln \\Omega', 26); c.fillStyle = '#000'; O.TeX.draw(c, box, PW - 200 - box.w / 2, 300);
    c.font = `13px ${UI}`; c.fillStyle = '#202122'; ['Common symbols: S', 'SI unit: J/K', 'In SI base units: kg⋅m²⋅s⁻²⋅K⁻¹', 'Derivations from other quantities', 'dS = δQ_rev / T'].forEach((s, i) => c.fillText(s, PW - 340, 360 + i * 32));
    let y = 220; const T = TX[lang];
    for (let k = 0; k < 18; k++) {
      if (k % 4 === 3) { c.font = `26px ${SERIF}`; c.fillStyle = '#000'; c.fillText(['History', 'Statistical mechanics', 'The arrow of time', 'Information theory', 'Cosmology'][k % 5], 40, y + 20); c.fillStyle = '#a2a9b1'; c.fillRect(40, y + 30, PW - 440, 1); y += 64; }
      y = para(P, T[k % T.length], 40, y, k < 8 ? PW - 440 : PW - 80, `16px ${SERIF}`, 26, '#202122') + 18;
    }
    return P;
  }
  function paper() {
    const P = mk(), c = P.c; fill(P, '#525659');
    for (let pg = 0; pg < 3; pg++) {
      const y0 = 30 + pg * 660; c.fillStyle = '#fff'; c.fillRect(150, y0, 940, 630);
      if (pg === 0) {
        c.font = `600 22px ${SERIF}`; c.fillStyle = '#111'; c.textAlign = 'center'; c.fillText('On the Impossibility of Global Entropy Reversal', 620, y0 + 60);
        c.font = `14px ${SERIF}`; c.fillText('A. Hallberg · M. Okonkwo · R. Ishida', 620, y0 + 88); c.textAlign = 'left';
        c.font = `600 13px ${SERIF}`; c.fillText('Abstract', 200, y0 + 128);
      }
      for (let col = 0; col < 2; col++) {
        let y = y0 + (pg === 0 ? 150 : 60);
        for (let k = 0; k < 4; k++) { y = para(P, TX.en[(k + col * 2 + pg) % 6], 200 + col * 440, y, 400, `12.5px ${SERIF}`, 17.5, '#222') + 10; if (k === 1) { const b = O.TeX.layout(c, '\\Delta S_{tot} = \\Delta S_{sys} + \\Delta S_{env} \\ge 0', 15); c.fillStyle = '#111'; O.TeX.draw(c, b, 200 + col * 440 + 200 - b.w / 2, y + 16); y += 34; } }
      }
    }
    return P;
  }
  function oldbook() {
    const P = mk(), c = P.c; const g = c.createLinearGradient(0, 0, PW, 0); g.addColorStop(0, '#cdbb92'); g.addColorStop(.5, '#e2d4ad'); g.addColorStop(1, '#c9b68a'); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    const R = O.rng(1865); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(90,60,20,${R() * .08})`; c.beginPath(); c.arc(R() * PW, R() * PH, R() * 6, 0, 7); c.fill(); }
    c.fillStyle = '#2b2014'; c.font = `italic 30px "Palatino Linotype", ${SERIF}`; c.textAlign = 'center'; c.fillText('Abhandlungen über die mechanische Wärmetheorie', PW / 2, 110);
    c.font = `20px "Palatino Linotype", ${SERIF}`; c.fillText('— 1865 —', PW / 2, 150); c.textAlign = 'left';
    c.font = `600 24px "Palatino Linotype", ${SERIF}`; c.fillText('Die Energie der Welt ist constant.', 160, 230); c.fillText('Die Entropie der Welt strebt einem Maximum zu.', 160, 268);
    let y = 330; for (let k = 0; k < 20; k++) y = para(P, TX.de[k % 3] + ' ' + TX.de[(k + 1) % 3], 160, y, PW - 320, `19px "Palatino Linotype", ${SERIF}`, 30, 'rgba(40,28,14,.9)') + 22;
    return P;
  }
  function qa(title, lang, answers, dark) {
    const P = mk(), c = P.c; fill(P, dark ? '#1b1b1d' : '#f6f6f6');
    c.fillStyle = dark ? '#262629' : '#fff'; c.fillRect(0, 0, PW, 64); c.font = `600 20px ${UI}`; c.fillStyle = dark ? '#e7e7e7' : '#222'; c.fillText(lang === 'zh' ? '问答社区' : lang === 'ja' ? 'ブログ' : 'Physics Q&A', 30, 40);
    c.font = `600 28px ${UI}`; c.fillStyle = dark ? '#fff' : '#111'; O.wrap(c, title, `600 28px ${UI}`, PW - 120).forEach((l, i) => c.fillText(l, 60, 126 + i * 38));
    c.font = `13px ${UI}`; c.fillStyle = '#888'; c.fillText(lang === 'zh' ? '关注者 12,408 · 被浏览 3,902,117' : 'Asked 7 years ago · Viewed 412k times', 60, 190);
    let y = 240;
    for (let k = 0; k < 9; k++) {
      c.fillStyle = dark ? '#232326' : '#fff'; const top = y; const a = answers[k % answers.length];
      const lines = O.wrap(c, a, `16px ${UI}`, PW - 220).length; c.fillRect(40, top - 10, PW - 80, lines * 26 + 90);
      c.fillStyle = '#c7c7c7'; c.beginPath(); c.arc(84, top + 24, 16, 0, 7); c.fill();
      c.font = `600 14px ${UI}`; c.fillStyle = dark ? '#ddd' : '#333'; c.fillText(['qubit_cat', 'Dr. L. Fenwick', '无尽的夏', 'hydrogen_atom', 'thermo_nerd', '量子猫', 'k_ln2', 'Ana P.', 'ψ'][k], 112, top + 29);
      c.font = `600 15px ${UI}`; c.fillStyle = '#8a8a8a'; c.fillText(`▲ ${(900 / (k + 1)) | 0}`, PW - 160, top + 29);
      y = para(P, a, 80, top + 66, PW - 220, `16px ${UI}`, 26, dark ? '#d2d2d2' : '#2a2a2a') + 40;
    }
    return P;
  }
  function code() {
    const P = mk(), c = P.c; fill(P, '#0d1117');
    c.fillStyle = '#161b22'; c.fillRect(0, 0, PW, 60); c.font = `600 16px ${UI}`; c.fillStyle = '#e6edf3'; c.fillText('lwang / entropy-reversal-sim  ·  sim/reverse.py', 24, 37);
    const src = ['import numpy as np', '', '# Attempt: run a 2D gas backwards by flipping all velocities.', '# Works for ~40 steps, then floating point noise wins. Every time.', '', 'def step(x, v, dt):', '    x = x + v * dt', '    hit = (x < 0) | (x > 1)', '    v[hit] *= -1', '    return np.clip(x, 0, 1), v', '', 'def entropy(x, bins=32):', '    h, _ = np.histogramdd(x, bins=bins)', '    p = h[h > 0] / h.sum()', '    return -(p * np.log(p)).sum()', '', 'x, v = init_low_entropy(n=200_000)', 'for i in range(4000):', '    x, v = step(x, v, 1e-3)', 'v = -v   # "reverse time"', 'for i in range(4000):', '    x, v = step(x, v, 1e-3)', '    S.append(entropy(x))', '', '# TODO: S goes down for a while... then back up.', '# FIXME: is this even possible in principle?', '# ANSWER (2026-03): no. see issue #12'];
    c.font = `15px ${MONO}`;
    for (let k = 0; k < 3; k++) src.forEach((l, i) => { const y = 100 + (k * src.length + i) * 24; c.fillStyle = '#6e7681'; c.fillText(String(k * src.length + i + 1).padStart(3), 20, y); c.fillStyle = l.startsWith('#') || l.includes('# ') ? '#8b949e' : /def |import|for |return/.test(l) ? '#ff7b72' : '#e6edf3'; c.fillText(l, 70, y); if (l.toLowerCase().includes('entropy')) { const p = l.indexOf('entropy'); const x0 = c.measureText(l.slice(0, p)).width; P.hits.push({ x: 70 + x0, y: y - 17, w: c.measureText('entropy').width, h: 22 }); } });
    return P;
  }
  const RES_EN = [['Can entropy be reversed? - Physics Q&A', 'physics.qa › questions › 41077'], ['Second law of thermodynamics - Encyclopedia', 'encyclopedia.org › wiki › Second_law'], ['Why does entropy always increase? | Science Explained', 'sciexplained.net › entropy'], ['Is it possible to reverse entropy? : askscience', 'forum.example › askscience'], ['Entropy and the arrow of time (PDF)', 'arxiv-mirror.org › pdf › 1704.0233'], ['Maxwell\'s demon and the cost of information', 'nature-review.com › articles'], ['Poincaré recurrence explained simply', 'mathblog.io › recurrence']];
  const RES_ZH = [['熵增定律真的不可逆吗？ - 问答社区', 'wenda.cn › question › 3305'], ['熵 - 百科全书', 'baike.org › 熵'], ['为什么熵总是增加？一篇讲清楚', 'kepu.net › article'], ['如何逆转熵增：所有尝试都失败了', 'zhuanlan.cn › p › 88231'], ['时间之箭与热寂', 'wuli.edu.cn › lecture']];
  O.Pages = {
    PW, PH,
    init() {
      pages.length = 0;
      pages.push(search('how to reverse entropy', 'en', RES_EN));                               // 0
      pages.push(search('熵增 如何逆转', 'zh', RES_ZH));                                        // 1
      pages.push(wiki('Second law of thermodynamics', 'en', 'From the free encyclopedia'));     // 2
      pages.push(wiki('熵', 'zh', '自由的百科全书'));                                           // 3
      pages.push(wiki('Entropie', 'de', 'Aus der freien Enzyklopädie'));                      // 4
      pages.push(paper());                                                                     // 5
      pages.push(qa('Can entropy ever be reversed on a cosmic scale?', 'en', ['Short answer: no. Long answer: you can lower entropy in one place, but only by raising it more somewhere else. The bookkeeping always closes against you.', 'Every proposal I have seen either smuggles in an external reservoir or quietly ignores the entropy cost of the information you would need. Landauer is undefeated.', 'This gets asked about once a month. The honest answer is that nobody knows how, and most of us suspect there is no how.', 'If entropy could be reversed globally, the low-entropy past would stop being special, and then we would have to explain why we remember the past and not the future.'])); // 6
      pages.push(qa('熵增定律真的不可逆吗？有没有任何办法能让整个宇宙的熵减少？', 'zh', ['不可逆。至少在我们目前知道的物理里，不可逆。局部可以减，整体一定增。', '建议题主先看看麦克斯韦妖和兰道尔原理，看完你会发现，连“知道”本身都要付出熵的代价。', '这个问题如果真有答案，诺贝尔奖都不够发。', '换个角度：我们之所以能感受到时间流逝，正是因为熵在增加。逆转熵增，等于让时间倒流。'])); // 7
      pages.push(qa('エントロピーは逆転できるのか？', 'ja', TX.ja, true));                       // 8
      pages.push(wiki('Энтропия', 'ru', 'Материал из свободной энциклопедии'));               // 9
      pages.push(code());                                                                       // 10
      pages.push(oldbook());                                                                    // 11
      pages.push(search('Umkehr der Entropie möglich', 'de', RES_EN));                          // 12
      pages.push(qa('엔트로피를 거꾸로 돌릴 수 있을까?', 'ko', TX.ko));                          // 13
      pages.push(wiki('Entropy', 'en', 'From the free encyclopedia'));                          // 14 hero
    },
  };
  const URL = ['search.example/?q=how+to+reverse+entropy', 'search.example/?q=熵增+如何逆转', 'encyclopedia.org/wiki/Second_law_of_thermodynamics', 'baike.org/wiki/熵', 'de.encyclopedia.org/wiki/Entropie', 'arxiv-mirror.org/pdf/1704.02331', 'physics.qa/questions/41077', 'wenda.cn/question/3305', 'blog.jp/entropy-gyakuten', 'ru.encyclopedia.org/wiki/Энтропия', 'code.example/lwang/entropy-reversal-sim', 'archive.example/details/clausius1865', 'search.example/?q=Umkehr+der+Entropie', 'qna.kr/entropy', 'encyclopedia.org/wiki/Entropy'];
  const TITLE = ['how to reverse entropy - Search', '熵增 如何逆转 - 搜索', 'Second law of thermodynamics', '熵 - 百科全书', 'Entropie – Enzyklopädie', 'On the Impossibility of Global…', 'Can entropy ever be reversed…', '熵增定律真的不可逆吗？', 'エントロピーは逆転できるのか', 'Энтропия — Энциклопедия', 'entropy-reversal-sim', 'Abhandlungen über die mechan…', 'Umkehr der Entropie - Suche', '엔트로피를 거꾸로', 'Entropy - Encyclopedia'];
  const FAV = ['#4285f4', '#ea4335', '#333', '#333', '#333', '#b31b1b', '#f48024', '#0066ff', '#55c500', '#333', '#8b949e', '#8a6d3b', '#4285f4', '#03c75a', '#333'];

  // ---------------- 窗口绘制 ----------------
  O.drawBrowser = (c, w, t, hl) => {
    const a = clamp((t - w.t) / .16); if (a <= 0) return;
    const sc = .94 + .06 * E.o3(a), cx = w.x + w.w / 2, cy = w.y + w.h / 2;
    c.save(); c.globalAlpha = a; c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 36; c.shadowOffsetY = 10; c.fillStyle = '#dfe2e6'; O.rr(c, w.x, w.y, w.w, w.h, 8); c.fill(); c.restore();
    c.save(); O.rr(c, w.x, w.y, w.w, w.h, 8); c.clip();
    // 标签栏
    c.fillStyle = '#dee1e6'; c.fillRect(w.x, w.y, w.w, 40);
    const n = w.tabs, tw = Math.min(230, (w.w - 190) / n);
    for (let i = 0; i < n; i++) {
      const x = w.x + 10 + i * tw, act = i === n - 1, pg = (w.page + i * 5) % 15;
      if (act) { c.fillStyle = '#fff'; O.rr(c, x, w.y + 6, tw, 40, 9); c.fill(); }
      else if (i < n - 2) { c.fillStyle = '#b9bcc2'; c.fillRect(x + tw - 1, w.y + 14, 1, 16); }
      c.fillStyle = FAV[act ? w.page : pg]; c.beginPath(); c.arc(x + 18, w.y + 24, 7, 0, 7); c.fill();
      c.font = `12.5px ${UI}`; c.fillStyle = act ? '#202124' : '#45474a'; c.save(); c.beginPath(); c.rect(x + 30, w.y + 8, tw - 42, 30); c.clip(); c.fillText(TITLE[act ? w.page : pg], x + 32, w.y + 28); c.restore();
    }
    c.strokeStyle = '#5f6368'; c.lineWidth = 1.2; const bx = w.x + w.w;
    c.beginPath(); c.moveTo(bx - 128, w.y + 20); c.lineTo(bx - 118, w.y + 20); c.stroke(); c.strokeRect(bx - 79, w.y + 15, 10, 10);
    c.beginPath(); c.moveTo(bx - 28, w.y + 15); c.lineTo(bx - 18, w.y + 25); c.moveTo(bx - 18, w.y + 15); c.lineTo(bx - 28, w.y + 25); c.stroke();
    // 工具栏
    c.fillStyle = '#fff'; c.fillRect(w.x, w.y + 40, w.w, 44);
    c.strokeStyle = '#5f6368'; c.lineWidth = 1.6; const ty = w.y + 62;
    c.beginPath(); c.moveTo(w.x + 26, ty); c.lineTo(w.x + 16, ty); c.moveTo(w.x + 20, ty - 5); c.lineTo(w.x + 15, ty); c.lineTo(w.x + 20, ty + 5); c.stroke();
    c.strokeStyle = '#bdc1c6'; c.beginPath(); c.moveTo(w.x + 46, ty); c.lineTo(w.x + 56, ty); c.moveTo(w.x + 52, ty - 5); c.lineTo(w.x + 57, ty); c.lineTo(w.x + 52, ty + 5); c.stroke();
    c.strokeStyle = '#5f6368'; c.beginPath(); c.arc(w.x + 84, ty, 6, -2.4, 2.2); c.stroke();
    c.fillStyle = '#f1f3f4'; O.rr(c, w.x + 108, w.y + 47, w.w - 170, 30, 15); c.fill();
    c.font = `13.5px ${UI}`; c.fillStyle = '#202124'; c.save(); c.beginPath(); c.rect(w.x + 130, w.y + 47, w.w - 210, 30); c.clip(); c.fillText(URL[w.page], w.x + 136, w.y + 67); c.restore();
    c.fillStyle = '#5f6368'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(w.x + w.w - 30, w.y + 54 + i * 7, 1.6, 0, 7); c.fill(); }
    c.fillStyle = '#e8eaed'; c.fillRect(w.x, w.y + 84, w.w, 1);
    // 页面
    const P = pages[w.page], ch = w.h - 85, cw = w.w;
    const maxS = PH - ch - 10, s = Math.max(0, ((w.s0 + Math.max(0, t - w.t - .3) * w.sp) % (maxS * 2)));
    const sy = s > maxS ? 2 * maxS - s : s;
    c.fillStyle = '#fff'; c.fillRect(w.x, w.y + 85, cw, ch);
    const vw = Math.min(cw, PW);
    c.drawImage(P.cv, 0, sy * O.LS, vw * O.LS, ch * O.LS, w.x, w.y + 85, vw, ch);
    // 查找高亮
    if (hl > 0) {
      c.save(); c.beginPath(); c.rect(w.x, w.y + 85, cw, ch); c.clip(); c.globalCompositeOperation = 'multiply';
      let k = 0; const cur = Math.floor(t * 9 + w.i * 3);
      for (const h of P.hits) {
        const y = h.y - sy + w.y + 85; if (y < w.y + 60 || y > w.y + w.h) continue;
        c.fillStyle = (k++ % 7) === cur % 7 ? `rgba(255,150,40,${hl})` : `rgba(255,236,60,${hl})`; c.fillRect(w.x + h.x, y, h.w, h.h);
      }
      c.restore();
      if (w.hero) {
        const fx = w.x + w.w - 380, fy = w.y + 92; c.fillStyle = '#fff'; O.rr(c, fx, fy, 360, 44, 8); c.fill(); c.strokeStyle = '#dadce0'; c.stroke();
        c.font = `14px ${UI}`; c.fillStyle = '#202124'; c.fillText('entropy', fx + 16, fy + 28); c.fillStyle = '#5f6368';
        c.fillText(`${(Math.floor(t * 9) % P.hits.length) + 1}/${P.hits.length}`, fx + 230, fy + 28); c.fillText('⌃  ⌄  ✕', fx + 290, fy + 28);
      }
    }
    c.restore(); c.restore();
  };
})();
