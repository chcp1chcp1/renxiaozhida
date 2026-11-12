// 电脑桌面场景：新邮件提示 + 英江邀请信 + 同意进入故事
// 图标为独立透明底黏土 PNG（640×512 统一画布，内容等面积归一化），
// 原图蓝屏上的旧烤入图标已彻底抹除，无任何叠加/残留。

const ICONS = [
  // 2026-11-11 图标资源重建：统一手工黏土风格四图标（胶片盘/磁带/搜索列表/信封），
  // imgBox = [left, top, width]（stage 百分比，画布高 = width×512/640 自动），
  // click / labelPos 保持原布局与交互不变。
  { key: "reellog", label: "ReelLog", type: "img", src: "assets/ui/icon-reellog.png?v=20261111i",
    click: [38.0, 19.6, 17.2, 19.0], imgBox: [39.2, 22.25, 12.8],  labelPos: [44.5, 39.2] },
  { key: "tape",    label: "Tape",    type: "img", src: "assets/ui/icon-tape.png?v=20261111i",
    click: [51.8, 19.6, 14.8, 19.0], imgBox: [52.65, 22.25, 12.8], labelPos: [58.3, 39.2] },
  { key: "search",  label: "Search",  type: "img", src: "assets/ui/icon-search.png?v=20261111i",
    click: [39.9, 45.8, 8.7, 14.2],  imgBox: [37.95, 44.1, 12.8],  labelPos: [44.6, 61.2] },
  { key: "mail",    label: "Mail",    type: "img", src: "assets/ui/icon-mail.png?v=20261111i",
    click: [54.8, 43.7, 11.9, 16.3], imgBox: [53.25, 44.1, 12.8],  labelPos: [58.7, 61.2] }
];

// 英江邀请信原文（用户提供，不得改动措辞）
const YINGJIANG_LETTER = `
  <div class="letter">
    <div class="letter-meta">
      <span>来自 · 崇德县第五小学 英江</span>
      <span>邀请信</span>
    </div>
    <p>你好！</p>
    <p>我是崇德县第五小学的学生英江。</p>
    <p>我们想种一块试验田，种出满满的水稻！</p>
    <p>你愿意和我们一起吗？</p>
    <p class="letter-sign">—— 英江</p>
  </div>`;

export function createDesktopScene({ onEnterStory, onEnterReellog, onEnterSearch, onEnterTape }) {
  const el = document.createElement("section");
  el.id = "scene-desktop";
  el.className = "scene";

  el.innerHTML = `
    <div class="stage">
      <img class="computer-img" src="assets/ui/clay-computer.png?v=20261111i" alt="黏土电脑桌面" draggable="false">
    </div>
    <div class="modal-mask">
      <div class="clay-window">
        <div class="win-title"><span></span><button class="win-close" aria-label="关闭">✕</button></div>
        <div class="win-body"></div>
      </div>
    </div>
  `;

  // 白光转场层挂在 body 上，保证场景切换时仍覆盖全屏
  const transitionEl = document.createElement("div");
  transitionEl.className = "enter-transition white";
  document.body.appendChild(transitionEl);

  const stage = el.querySelector(".stage");
  const mask = el.querySelector(".modal-mask");
  const winTitle = el.querySelector(".win-title span");
  const winBody = el.querySelector(".win-body");

  let mailAgreed = false;
  let mailViewed = false;

  // 生成图标精灵层（可缩放）与热区
  const sprites = {};
  const hotspots = {};
  ICONS.forEach(icon => {
    const [il, it, iw] = icon.imgBox;
    const sprite = document.createElement("div");
    sprite.className = "icon-sprite is-img";
    Object.assign(sprite.style, { left: il + "%", top: it + "%", width: iw + "%" });
    sprite.innerHTML = `<img src="${icon.src}" alt="" draggable="false">`;
    stage.appendChild(sprite);
    sprites[icon.key] = sprite;

    // 统一文字标签：四个图标同款字体/颜色/大小，独立于图案，避免遮挡
    const lb = document.createElement("span");
    lb.className = "icon-label";
    lb.textContent = icon.label;
    lb.style.left = icon.labelPos[0] + "%";
    lb.style.top = icon.labelPos[1] + "%";
    stage.appendChild(lb);

    const [cl, ct, cw, ch] = icon.click;
    const hs = document.createElement("div");
    hs.className = "hotspot";
    hs.dataset.key = icon.key;
    hs.setAttribute("role", "button");
    hs.setAttribute("aria-label", icon.label);
    Object.assign(hs.style, {
      left: cl + "%", top: ct + "%",
      width: cw + "%", height: ch + "%"
    });
    stage.appendChild(hs);
    hotspots[icon.key] = hs;
  });

  // 新邮件提示：邮件图标角标 + 顶部气泡
  const badge = document.createElement("div");
  badge.className = "mail-badge";
  badge.textContent = "1";
  stage.appendChild(badge);

  setTimeout(() => {
    if (!mailViewed) {
      sprites.mail.classList.add("notify");
    }
  }, 1200);

  function dismissMailNotify() {
    mailViewed = true;
    sprites.mail.classList.remove("notify");
    badge.remove();
  }

  // 调试：?mail=1 直接打开邮件弹窗
  if (new URLSearchParams(location.search).has("mail")) {
    setTimeout(() => openMail(), 400);
  }

  // 悬停放大 / 按压压扁（黏土 squash & stretch）
  ICONS.forEach(icon => {
    const hs = hotspots[icon.key];
    const sprite = sprites[icon.key];
    hs.addEventListener("mouseenter", () => { if (!el.dataset.busy) sprite.classList.add("hover"); });
    hs.addEventListener("mouseleave", () => sprite.classList.remove("hover", "pressing"));
  });

  // 按压反馈：图标压扁 + 热区凹痕 + 整机晃动
  el.addEventListener("pointerdown", e => {
    const hs = e.target.closest(".hotspot");
    if (!hs || el.dataset.busy) return;
    hs.classList.add("pressing");
    sprites[hs.dataset.key]?.classList.add("pressing");
    stage.classList.add("pressing");
  });
  ["pointerup", "pointercancel"].forEach(evt =>
    el.addEventListener(evt, () => {
      el.querySelectorAll(".hotspot.pressing").forEach(h => h.classList.remove("pressing"));
      el.querySelectorAll(".icon-sprite.pressing").forEach(s => s.classList.remove("pressing"));
      stage.classList.remove("pressing");
    })
  );

  // 点击分发
  el.addEventListener("click", e => {
    const hs = e.target.closest(".hotspot");
    if (!hs || el.dataset.busy) return;
    const key = hs.dataset.key;
    if (key === "mail") {
      dismissMailNotify();
      openMail();
    } else if (key === "reellog") {
      enterReellog();
    } else if (key === "search") {
      onEnterSearch();
    } else if (key === "tape") {
      onEnterTape();
    }
  });

  // 邮件模块：英江邀请信 + 同意按钮
  function openMail() {
    winTitle.textContent = "英江的来信";
    winBody.innerHTML = YINGJIANG_LETTER + (mailAgreed
      ? `<div class="mail-actions"><span class="win-note">已答复英江</span><button class="btn-mail mail-continue">继续故事</button></div>`
      : `<div class="mail-actions"><button class="btn-mail mail-agree">同意</button></div>`);
    mask.classList.add("open");

    const agreeBtn = winBody.querySelector(".mail-agree");
    if (agreeBtn) agreeBtn.addEventListener("click", () => {
      mailAgreed = true;
      enterStory();
    });
    const continueBtn = winBody.querySelector(".mail-continue");
    if (continueBtn) continueBtn.addEventListener("click", enterStory);
  }



  function closeModal() { mask.classList.remove("open"); }
  el.querySelector(".win-close").addEventListener("click", closeModal);
  mask.addEventListener("click", e => { if (e.target === mask) closeModal(); });

  // 同意后：白光亮起 → 全屏变白 → 渐显故事场景
  function enterStory() {
    if (el.dataset.busy) return;
    el.dataset.busy = "1";
    closeModal();
    sprites.mail.classList.add("glow");

    transitionEl.style.setProperty("--ox", "50%");
    transitionEl.style.setProperty("--oy", "50%");
    setTimeout(() => transitionEl.classList.add("expanding"), 150);   // 白光扩散
    setTimeout(() => onEnterStory(), 850);                            // 全白时切入故事
    setTimeout(() => transitionEl.classList.add("fading"), 1500);     // 白幕渐显故事
    setTimeout(() => {
      transitionEl.classList.remove("expanding", "fading");
      sprites.mail.classList.remove("glow");
      delete el.dataset.busy;
    }, 2500);
  }

  // 点击 ReelLog：暗场淡入 → 切入电影评分页 → 淡出
  const rlTransition = document.createElement("div");
  rlTransition.className = "rl-fade-transition";
  document.body.appendChild(rlTransition);

  function enterReellog() {
    if (el.dataset.busy) return;
    el.dataset.busy = "1";
    closeModal();
    rlTransition.classList.add("on");
    setTimeout(() => onEnterReellog(), 420);
    setTimeout(() => rlTransition.classList.remove("on"), 900);
    setTimeout(() => { delete el.dataset.busy; }, 1400);
  }

  return {
    el,
    enter() { closeModal(); },
    exit() {}
  };
}
