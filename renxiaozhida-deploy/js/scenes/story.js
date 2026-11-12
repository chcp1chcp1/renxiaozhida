// 故事场景：四幕剧情交互引擎
// 依据用户提供的剧情设计（SCENE 01-04）：图片切换 + 文字层 + 简洁选择
// 原则：不用 CSS 形状拼画面；分支最终回归主线；白色闪光转场

import { storyState, setState } from "../state.js";

const BG = {
  pond: "assets/backgrounds/pond.png",
  pondReclaimed: "assets/backgrounds/pond-reclaimed.png",
  dogPlow: "assets/backgrounds/dog-plow.png",
  drought: "assets/backgrounds/drought-field.png",
  harvest: "assets/backgrounds/harvest-field.png"
};
const PROP = {
  bucket: "assets/props/bucket-cut.png",       // 抠图透明版
  pump: "assets/props/pump-tool-cut.png"       // 抠图透明版
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function createStoryScene({ onExitToDesktop, onFinish }) {
  const el = document.createElement("section");
  el.id = "scene-story";
  el.className = "scene";

  el.innerHTML = `
    <div class="story-stage">
      <img class="story-img img-a" draggable="false" alt="">
      <img class="story-img img-b" draggable="false" alt="">
      <div class="prop-layer"></div>
      <div class="flash"></div>
    </div>
    <button class="btn-exit">返回桌面</button>
    <div class="story-ui">
      <div class="story-lines"></div>
      <div class="story-choices"></div>
    </div>
  `;

  const imgA = el.querySelector(".img-a");
  const imgB = el.querySelector(".img-b");
  const propLayer = el.querySelector(".prop-layer");
  const flash = el.querySelector(".flash");
  const linesBox = el.querySelector(".story-lines");
  const choicesBox = el.querySelector(".story-choices");

  let currentImg = imgA;
  let busy = false;

  // —— 基础能力 ——
  async function showBg(src, fadeDur = 1400) {
    const incoming = currentImg === imgA ? imgB : imgA;
    incoming.src = src;
    await new Promise(r => {
      incoming.onload = r;
      if (incoming.complete && incoming.naturalWidth) r();
    });
    incoming.style.transitionDuration = fadeDur + "ms";
    incoming.classList.add("visible");
    currentImg.style.transitionDuration = fadeDur + "ms";
    currentImg.classList.remove("visible");
    currentImg = incoming;
    await sleep(fadeDur);
  }

  async function showLines(lines, gap = 900) {
    for (const text of lines) {
      const p = document.createElement("p");
      p.textContent = text;
      p.className = "story-line";
      linesBox.appendChild(p);
      requestAnimationFrame(() => p.classList.add("in"));
      await sleep(gap);
    }
  }

  function clearLines() {
    linesBox.querySelectorAll(".story-line").forEach(p => {
      p.classList.remove("in");
      setTimeout(() => p.remove(), 500);
    });
  }

  function showChoices(question, options) {
    return new Promise(resolve => {
      const q = document.createElement("p");
      q.textContent = question;
      q.className = "story-line question";
      linesBox.appendChild(q);
      requestAnimationFrame(() => q.classList.add("in"));
      options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "btn-clay choice-btn";
        btn.textContent = `${i === 0 ? "A" : "B"} · ${opt.label}`;
        btn.addEventListener("click", () => {
          choicesBox.innerHTML = "";
          q.remove();
          resolve(opt);
        }, { once: true });
        choicesBox.appendChild(btn);
        setTimeout(() => btn.classList.add("in"), 150 + i * 120);
      });
    });
  }

  function showProp(src, cls) {
    const img = document.createElement("img");
    img.src = src;
    img.className = "prop-img " + (cls || "");
    img.draggable = false;
    propLayer.appendChild(img);
    requestAnimationFrame(() => img.classList.add("in"));
    return img;
  }

  // 土地"恢复生机"：提高饱和度与亮度（简单渐变，不做复杂模拟）
  function reviveField(strength) {
    [imgA, imgB].forEach(img => {
      img.style.filter = `saturate(${1 + strength}) brightness(${1 + strength * 0.06})`;
    });
  }

  // 白色过曝转场
  async function whiteFlash() {
    flash.classList.add("exposing");
    await sleep(1600);
    flash.classList.add("full");
    await sleep(700);
  }

  // —— 四幕剧情 ——
  async function scene01Land() {
    await showBg(BG.pond, 800);
    await showLines([
      "所有土地都已经被开垦。",
      "只剩下老奶奶放鸭子的小水池。",
      "我们能把它改造成试验田吗？"
    ]);
    while (true) {
      const opt = await showChoices("你会怎么做？", [
        { label: "填池造田", value: "reclaim" },
        { label: "放弃这块土地", value: "giveup" }
      ]);
      if (opt.value === "reclaim") {
        setState({ pondDecision: "reclaim" });
        clearLines();
        // 水池渐渐变成泥土，鸭子离开，土地可以耕种（双图渐变）
        await sleep(400);
        showLines(["小水池渐渐被泥土覆盖。", "鸭子离开了，土地可以耕种了。"], 1200);
        await showBg(BG.pondReclaimed, 2200);
        await sleep(800);
        return;
      }
      // 放弃：停留，重新选择
      clearLines();
      await showLines(["可是，我们已经没有其他土地了。"], 600);
      await sleep(1200);
      clearLines();
      await sleep(400);
    }
  }

  async function scene02Dog() {
    clearLines();
    await showBg(BG.dogPlow, 1200);
    await showLines([
      "土地需要耕地，但面积太小，用不了牛。",
      "英江决定让大狗阿黄试试。",
      "阿黄拉不动木犁。",
      "森阳责怪英江没有训练好狗。",
      "英江生气地离开了。"
    ], 800);
    while (true) {
      const opt = await showChoices("你要怎么做？", [
        { label: "责怪英江", value: "blame" },
        { label: "想办法让英江回来", value: "letter" }
      ]);
      if (opt.value === "blame") {
        clearLines();
        await showLines(["木犁停在原地。", "大黄狗独自留在田里。", "大家仍然没有解决问题。"], 800);
        await sleep(1400);
        clearLines();
        await sleep(400);
        continue;
      }
      // 写信给英江：信件逐渐展开
      clearLines();
      await showLines(["我们给英江写一封信。"], 600);
      const letter = document.createElement("div");
      letter.className = "story-letter";
      letter.innerHTML = `<div class="letter">
        <p>英江：</p>
        <p>是我们不对。田里的稻苗还在等你。</p>
        <p>我们希望你回来。</p>
        <p class="letter-sign">—— 大家一起</p>
      </div>`;
      el.appendChild(letter);
      await sleep(80);
      letter.classList.add("unfold");
      await sleep(2400);
      letter.classList.remove("unfold");
      await sleep(500);
      letter.remove();
      return;
    }
  }

  async function scene03Irrigation() {
    clearLines();
    await showBg(BG.drought, 1200);
    await showLines(["天旱无雨。", "稻田需要水。"], 900);
    const opt = await showChoices("你会选择哪种办法？", [
      { label: "一桶一桶地运水", value: "manual" },
      { label: "创造灌溉工具", value: "efficient" }
    ]);
    clearLines();

    if (opt.value === "manual") {
      setState({ irrigationDecision: "manual" });
      // 一桶水出现 → 倾倒 → 稻苗恢复部分生机
      const bucket = showProp(PROP.bucket, "prop-bucket");
      await sleep(900);
      bucket.classList.add("tilt");
      await sleep(800);
      reviveField(0.35);
      await showLines(["水浇在稻苗上，稻苗恢复了一些生机。", "仅靠人力，无法解决所有问题。"], 1000);
      await sleep(1600);
      bucket.classList.remove("in");
      setTimeout(() => bucket.remove(), 700);
    } else {
      setState({ irrigationDecision: "efficient" });
      // 灌溉工具出现在画面正中 → 点击工具 → 稻苗逐渐恢复
      const pump = showProp(PROP.pump, "prop-pump");
      await sleep(900);
      await showLines(["一台黏土灌溉工具做好了。", "点击工具，让它开始工作吧。"], 700);
      await new Promise(resolve => {
        pump.classList.add("clickable");
        pump.addEventListener("click", () => {
          pump.classList.remove("clickable");
          resolve();
        }, { once: true });
      });
      pump.classList.add("working");
      await sleep(900);
      reviveField(0.6);
      await showLines(["水流进入了稻田，稻苗渐渐恢复生机。"], 800);
      await sleep(1600);
      pump.classList.remove("in");
      setTimeout(() => pump.remove(), 700);
    }

    // 两种选择汇合
    setState({ irrigationCompleted: true, riceStage: "recovering" });
    await showLines(["大家一起想办法，终于解决了灌溉问题。"], 600);
    await sleep(1600);
  }

  async function scene04Harvest() {
    clearLines();
    await showBg(BG.harvest, 1200);
    await showLines(["日子一天天过去。", "稻穗渐渐饱满……"], 900);

    // 点击稻穗触发丰收
    const hotspot = document.createElement("button");
    hotspot.className = "ear-hotspot";
    hotspot.setAttribute("aria-label", "点击稻穗");
    el.appendChild(hotspot);
    await new Promise(resolve => {
      hotspot.addEventListener("click", resolve, { once: true });
    });
    hotspot.remove();

    // 稻田逐渐成熟：金黄暖调渐变（不做色相偏移，避免偏色）
    [imgA, imgB].forEach(img => {
      img.style.transition = "filter 2.6s ease, opacity 1.4s ease";
      img.style.filter = "saturate(1.32) brightness(1.07) sepia(.14)";
    });
    await showLines(["稻穗变成了金黄色。", "稻田成熟了。"], 1200);
    await sleep(2000);
    clearLines();
    await showLines(["收获了。"], 600);
    await sleep(1400);

    // 过曝白色闪光 → 回到电影放映（桌面）
    await whiteFlash();
    onFinish();
    await sleep(400);
    flash.classList.remove("exposing", "full");
    resetSceneState();
    started = false;   // 允许再次进入时重新播放
  }

  function resetSceneState() {
    busy = false;
    [imgA, imgB].forEach(img => {
      img.style.filter = "none";
      img.style.transition = "";
    });
    propLayer.innerHTML = "";
    linesBox.innerHTML = "";
    choicesBox.innerHTML = "";
  }

  let started = false;
  let runToken = 0;   // 离开场景即作废旧剧情链，避免异步错乱

  return {
    el,
    async enter() {
      if (started || busy) return;
      const token = ++runToken;
      const alive = () => token === runToken;
      started = true;
      busy = true;
      await sleep(500);
      if (!alive()) return;
      await scene01Land(); if (!alive()) return;
      await scene02Dog(); if (!alive()) return;
      await scene03Irrigation(); if (!alive()) return;
      await scene04Harvest();
      console.log("[story] finished, state =", { ...storyState });
    },
    exit() {
      runToken++;
      choicesBox.innerHTML = "";
    }
  };
}
