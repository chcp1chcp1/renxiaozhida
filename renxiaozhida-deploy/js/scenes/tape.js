// 磁带场景：拍摄幕后 · 一份回忆整理稿
// 磁带 → 档案纸铺平 → 逐行手写显现 + 铅笔划线 + 页边批注 + 可拖放的水彩墨迹

import { createInkBleed } from "../ink.js?v=20261111i";

// 口述记录原文（用户提供，不得改写增删）
const LINES = [
  { t: "穿过岁月的时空，如今已过古稀的何建华，对五十多年前参与拍摄电影《人小志大》的场景仍记忆犹新。" },
  { t: "“我当年只有19岁，在影片中演田间广播员。”", u: true, n: "注：19岁 · 田间广播员" },
  { t: "影片持续拍摄了四个多月，1958年11月7日正式开拍，1959年3月15日杀青。", u: true },
  { t: "当时她一个月工资只有30.8元，拍电影不仅没有报酬，每月还要交12元的伙食费。", u: true, n: "注：报酬 0 元" },
  { t: "除了拍戏，她还要教沈英江等5个孩子背台词，并给他们补习因拍电影落下的文化课。" },
  { t: "“当时拍电影的条件非常艰苦，不管是导演、摄影师，还是演职人员，睡的全部是稻草地铺，难得吃餐带鱼。”", u: true, n: "注：稻草地铺" },
  { t: "摄制组进场时已是深秋初冬，田间地头一片枯黄，夏戏冬拍，难度很大。", n: "注：夏戏冬拍" },
  { t: "有人扛着冬青松柏，有人拎着颜料桶，有人拿着竹扫帚，随时随地给大自然“化妆”。" },
  { t: "拍晚稻收割时田里有“鸡脚冰”，小演员下田拍戏有困难，附近十几户农户不计报酬，自觉烧了热水来浇田化冰冻。", u: true, n: "注：鸡脚冰" },
  { t: "外景所需的抗旱水车、打稻机、手推车等道具，都由联络员郑梓翔组织当地筹措，用完后农民再搬回家，没有租金与报酬。" }
];

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

// 磁带 SVG（纯内联，无图片）
const CASSETTE_SVG = `
<svg viewBox="0 0 260 164" role="img" aria-label="老式磁带">
  <rect x="2" y="2" width="256" height="160" rx="14" fill="#3a3128" stroke="#241d15" stroke-width="3"/>
  <rect x="14" y="14" width="232" height="60" rx="6" fill="#e8dcc2"/>
  <text x="130" y="40" text-anchor="middle" font-family="Courier New, monospace" font-size="15" letter-spacing="3" fill="#5a4a32">拍摄幕后 · 1959</text>
  <text x="130" y="60" text-anchor="middle" font-family="Courier New, monospace" font-size="10" letter-spacing="2" fill="#8a7a5e">SIDE A — 60 MIN</text>
  <rect x="30" y="86" width="200" height="52" rx="8" fill="#241d15"/>
  <path d="M78 112 L182 112 L168 132 L92 132 Z" fill="#151009"/>
  <g class="reel">
    <circle cx="78" cy="112" r="24" fill="#efe4cd" stroke="#241d15" stroke-width="3"/>
    <circle cx="78" cy="112" r="7" fill="#3a3128"/>
    <path d="M78 90 L78 134 M56 112 L100 112 M63 97 L93 127 M93 97 L63 127" stroke="#3a3128" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g class="reel">
    <circle cx="182" cy="112" r="24" fill="#efe4cd" stroke="#241d15" stroke-width="3"/>
    <circle cx="182" cy="112" r="7" fill="#3a3128"/>
    <path d="M182 90 L182 134 M160 112 L204 112 M167 97 L197 127 M197 97 L167 127" stroke="#3a3128" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;

// 铅笔划线 SVG：略带抖动的曲线
const UNDERLINE_PATH = "M1 5 Q 9 3.4, 18 5.2 T 37 4.8 T 55 5.6 T 73 4.6 T 90 5.4 T 99 5";

/* ---------- Web Audio 合成（无音频文件） ---------- */
let actx = null;
function ensureAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  } catch (e) { actx = null; }
}
function noiseBurst(dur, gainVal, freq, type = "bandpass") {
  if (!actx) return;
  try {
    const len = Math.max(1, Math.floor(actx.sampleRate * dur));
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const filter = actx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(gainVal, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(actx.destination);
    src.start();
    src.stop(actx.currentTime + dur + 0.02);
  } catch (e) { /* 音频失败不阻塞 */ }
}
const shashSound = () => noiseBurst(1.15, 0.1, 2800, "highpass");   // 拉带沙沙声
const clickSound = () => noiseBurst(0.028, 0.045, 5200);             // 打字咔哒声

export function createTapeScene({ onBack }) {
  const el = document.createElement("section");
  el.id = "scene-tape";
  el.className = "scene";

  el.innerHTML = `
    <button class="tp-back" type="button">← 返回</button>
    <div class="tp-stage">
      <div class="tp-intro">
        <div class="tp-envelope">
          <button class="tp-cassette" type="button" aria-label="播放磁带，聆听拍摄幕后">${CASSETTE_SVG}</button>
        </div>
        <p class="tp-hint">点 击 卡 带 · 倒 出 幕 后 故 事</p>
      </div>
      <div class="tp-paper" hidden>
        <div class="tp-staple s1" aria-hidden="true"></div>
        <div class="tp-staple s2" aria-hidden="true"></div>
        <header>
          <p class="tp-doc-no">档案编号 RXD-1959-001</p>
          <h2 class="tp-doc-title">《人小志大》拍摄幕后</h2>
          <p class="tp-doc-sub">何建华回忆整理 · 非正式采访，仅作幕后资料留存</p>
          <div class="tp-doc-rule"></div>
        </header>
        <div class="tp-lines"></div>
        <button class="tp-replay" type="button">倒带 · 重新播放</button>
      </div>
    </div>
  `;

  const backBtn = el.querySelector(".tp-back");
  const intro = el.querySelector(".tp-intro");
  const cassette = el.querySelector(".tp-cassette");
  const paper = el.querySelector(".tp-paper");
  const linesBox = el.querySelector(".tp-lines");
  const replayBtn = el.querySelector(".tp-replay");

  // 预建行 DOM（真实文本节点，可搜索可选中）
  const lineEls = LINES.map(cfg => {
    const line = document.createElement("div");
    line.className = "tp-line";
    let inner = `<p class="tp-text"><span class="tp-chars"></span>`;
    if (cfg.u) {
      inner += `<svg class="tp-underline" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="${UNDERLINE_PATH}"/></svg>`;
    }
    inner += `</p>`;
    if (cfg.n) inner += `<span class="tp-note">${cfg.n}</span>`;
    line.innerHTML = inner;
    linesBox.appendChild(line);
    return line;
  });

  let run = 0; // 作废旧播放流程
  let playing = false;

  /* ---------- 纸面墨迹：水彩渗色层 ----------
   * WebGL2 速度场 + 染料平流：落笔注入墨与径向外推，
   * 墨随笔势流动、在纸纤维里慢慢洇开；黄/粉/紫以减色法叠加交融。
   * 画布置于文字之下（multiply），指针按下即阻止默认行为，拖动不会选中文字。
   */
  const inkCanvas = document.createElement("canvas");
  inkCanvas.className = "tp-ink";
  inkCanvas.setAttribute("aria-hidden", "true");
  paper.insertBefore(inkCanvas, paper.firstChild);
  const ink = createInkBleed(inkCanvas);

  let inking = false;
  const toLocal = e => {
    const r = paper.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  paper.addEventListener("pointerdown", e => {
    if (paper.hidden || e.target.closest(".tp-replay, .tp-back")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();                       // 关键：阻止文字被框选
    inking = true;
    paper.classList.add("inking");
    try { paper.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    const [x, y] = toLocal(e);
    ink.down(x, y);
  });
  paper.addEventListener("pointermove", e => {
    if (!inking) return;
    e.preventDefault();
    const [x, y] = toLocal(e);
    ink.move(x, y);
  });
  const endInk = () => {
    if (!inking) return;
    inking = false;
    paper.classList.remove("inking");
    ink.up();
  };
  paper.addEventListener("pointerup", endInk);
  paper.addEventListener("pointercancel", endInk);
  paper.addEventListener("pointerleave", endInk);
  paper.addEventListener("dragstart", e => e.preventDefault());

  // 纸面尺寸随内容（逐行显现）变化，同步画布
  let ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => { if (!paper.hidden) ink.resize(); });
    ro.observe(paper);
  } else {
    window.addEventListener("resize", () => { if (!paper.hidden) ink.resize(); });
  }


  function drawUnderline(svg, instant) {
    const path = svg.querySelector("path");
    const len = path.getTotalLength();
    if (instant) { path.style.strokeDasharray = "none"; path.style.strokeDashoffset = "0"; return; }
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.getBoundingClientRect(); // 强制重排
    path.style.transition = "stroke-dashoffset .7s ease";
    path.style.strokeDashoffset = "0";
  }

  // 一次性完整渲染（reduced-motion / ?full=1）
  function renderFull() {
    run++;
    playing = false;
    intro.classList.add("gone");
    intro.style.display = "none";
    paper.hidden = false;
    paper.classList.add("open");
    ink.start();
    lineEls.forEach((line, i) => {
      line.classList.add("on");
      line.querySelector(".tp-chars").textContent = LINES[i].t;
      const svg = line.querySelector(".tp-underline");
      if (svg) drawUnderline(svg, true);
      const note = line.querySelector(".tp-note");
      if (note) note.classList.add("on");
    });
    replayBtn.classList.add("on");
  }

  async function typeLine(line, cfg, runId) {
    const chars = line.querySelector(".tp-chars");
    line.classList.add("on");
    const delay = cfg.t.length > 45 ? 24 : 52; // 长句略快、短句略慢
    for (let i = 0; i < cfg.t.length; i++) {
      if (runId !== run) return false;
      chars.textContent += cfg.t[i];
      if (i % 3 === 0) clickSound();
      if (i % 12 === 0) line.scrollIntoView({ block: "nearest", behavior: "smooth" });
      await wait(delay);
    }
    return true;
  }

  async function play() {
    if (playing) return;
    playing = true;
    run++;
    const runId = run;
    ensureAudio();

    if (REDUCED) { renderFull(); return; }

    // 1. 带盘旋转 + 沙沙声（约 1.1 秒）
    intro.classList.add("pulling");
    shashSound();
    await wait(1150);
    if (runId !== run) return;

    // 2. 磁带区淡出，档案纸铺平
    intro.classList.add("gone");
    await wait(420);
    if (runId !== run) return;
    intro.style.display = "none";
    paper.hidden = false;
    paper.getBoundingClientRect();
    paper.classList.add("open");
    ink.start();
    await wait(780);
    if (runId !== run) return;

    // 3. 逐行打印 → 划线 → 批注
    for (let i = 0; i < LINES.length; i++) {
      const cfg = LINES[i];
      const line = lineEls[i];
      line.scrollIntoView({ block: "nearest", behavior: "smooth" });
      if (!(await typeLine(line, cfg, runId))) return;
      const svg = line.querySelector(".tp-underline");
      if (svg) drawUnderline(svg, true); // 划线静态显示（描边动画卡顿，已去除）
      const note = line.querySelector(".tp-note");
      if (note) {
        await wait(120);
        if (runId !== run) return;
        note.classList.add("on");
      }
      await wait(180);
      if (runId !== run) return;
    }

    // 4. 全部打完：重播按钮
    replayBtn.classList.add("on");
    replayBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    playing = false;
  }

  function reset() {
    run++;
    playing = false;
    replayBtn.classList.remove("on");
    lineEls.forEach(line => {
      line.classList.remove("on");
      line.querySelector(".tp-chars").textContent = "";
      const path = line.querySelector(".tp-underline path");
      if (path) { path.style.transition = "none"; path.style.strokeDashoffset = "1"; }
      const note = line.querySelector(".tp-note");
      if (note) note.classList.remove("on");
    });
    paper.classList.remove("open");
    paper.hidden = true;
    ink.stop();
    ink.clear();
    intro.style.display = "";
    intro.classList.remove("pulling", "gone");
    el.scrollTo({ top: 0 });
  }

  cassette.addEventListener("click", play);
  replayBtn.addEventListener("click", reset);
  backBtn.addEventListener("click", () => { reset(); onBack(); });

  // 调试：?full=1 直接渲染完整档案（供截图检查）
  if (new URLSearchParams(location.search).has("full")) {
    setTimeout(renderFull, 300);
  }
  // 调试：?inkdemo=1 自动滴几滴墨并拖一道（供截图检查墨迹层）
  if (new URLSearchParams(location.search).has("inkdemo")) {
    setTimeout(() => {
      renderFull();
      setTimeout(() => {
        const w = paper.clientWidth, h = paper.clientHeight;
        const ev = (type, x, y) => paper.dispatchEvent(new PointerEvent(type, {
          clientX: paper.getBoundingClientRect().left + x,
          clientY: paper.getBoundingClientRect().top + y,
          pointerId: 1, bubbles: true
        }));
        ev("pointerdown", w * 0.25, h * 0.3);
        ev("pointermove", w * 0.45, h * 0.42);
        ev("pointermove", w * 0.62, h * 0.36);
        ev("pointerup", w * 0.62, h * 0.36);
        ev("pointerdown", w * 0.7, h * 0.62);
        ev("pointerup", w * 0.7, h * 0.62);
        ev("pointerdown", w * 0.3, h * 0.7);
        ev("pointermove", w * 0.5, h * 0.75);
        ev("pointerup", w * 0.5, h * 0.75);
        const pre = document.createElement("pre");
        pre.id = "tp-inkdiag";
        pre.textContent = JSON.stringify(ink.diag ? ink.diag() : { ok: ink.ok });
        document.body.appendChild(pre);
      }, 600);
    }, 300);
  }
  // 调试：?measure=1 输出关键元素宽度到 DOM
  if (new URLSearchParams(location.search).has("measure")) {
    setTimeout(() => {
      const m = {
        innerWidth: window.innerWidth,
        scene: el.getBoundingClientRect().width,
        stage: el.querySelector(".tp-stage").getBoundingClientRect().width,
        paper: paper.getBoundingClientRect().width,
        paperLeft: paper.getBoundingClientRect().left,
        paperRight: paper.getBoundingClientRect().right,
        line: el.querySelector(".tp-line").getBoundingClientRect().width
      };
      const pre = document.createElement("pre");
      pre.id = "tp-measure";
      pre.textContent = JSON.stringify(m);
      document.body.appendChild(pre);
    }, 900);
  }

  return {
    el,
    enter() {},
    exit() { reset(); }
  };
}
