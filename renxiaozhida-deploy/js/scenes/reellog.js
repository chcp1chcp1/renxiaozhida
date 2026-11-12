// ReelLog · 《人小志大》电影档案评分页
// 分割舞台布局：左固定海报 + 右滚动档案（信息 / 剧照 / 评分 / 评论）
// 评分与评论持久化于 localStorage，电影资料来自公开真实资料

const POSTER = "assets/reellog/poster.png";
const STILLS = [
  { src: "assets/reellog/still-01.jpg", mod: "tall",  alt: "《人小志大》剧照：师生合影" },
  { src: "assets/reellog/still-02.jpg", mod: "wide",  alt: "《人小志大》剧照" },
  { src: "assets/reellog/still-03.jpg", mod: "stack", alt: "《人小志大》剧照：草垛中的孩子" },
  { src: "assets/reellog/still-04.jpg", mod: "stack", alt: "《人小志大》剧照" },
  { src: "assets/reellog/still-05.jpg", mod: "wide",  alt: "《人小志大》剧照" },
  { src: "assets/reellog/still-06.jpg", mod: "stack", alt: "《人小志大》剧照" },
  { src: "assets/reellog/still-07.jpg", mod: "stack", alt: "《人小志大》剧照" }
];

// 真实电影资料（来源：猫眼 / 搜狗百科 / 《浙江电影史》公开记录）
const META = [
  ["导演", "史行 · 吴向之"],
  ["编剧", "黄解寄 · 钟甫平"],
  ["主演", "汤仲佑 · 何建华"],
  ["摄影", "郭向辉 · 陈琳"],
  ["类型", "剧情 · 儿童"],
  ["片长", "68 分钟"],
  ["上映", "1959 年 2 月"],
  ["出品", "浙江电影制片厂"],
  ["色彩", "黑白"]
];

const RATE_WORDS = ["", "很差", "较差", "还行", "推荐", "力荐"];

const LS = {
  rating: "reellog:myRating",
  aggregate: "reellog:aggregate",   // { sum, count }
  reviews: "reellog:reviews"        // [{ text, stars, ts }]
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4l-5.8 3-1.1-6.4L.4 9.4l6.5-.9z" stroke-linejoin="round"/></svg>`;

function fmtTime(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function createReelLogScene({ onBack }) {
  const el = document.createElement("section");
  el.id = "scene-reellog";
  el.className = "scene";

  // 剧照模块：tall / wide 单张，stack 两张叠一列
  const filmstripMods = [];
  let i = 0;
  while (i < STILLS.length) {
    if (STILLS[i].mod === "stack" && STILLS[i + 1]?.mod === "stack") {
      filmstripMods.push({ type: "stack", items: [STILLS[i], STILLS[i + 1]], idx: [i, i + 1] });
      i += 2;
    } else {
      filmstripMods.push({ type: STILLS[i].mod, items: [STILLS[i]], idx: [i] });
      i += 1;
    }
  }

  el.innerHTML = `
    <div class="rl-layout">
      <div class="rl-stage-panel">
        <button class="rl-poster-btn" aria-label="放大海报">
          <img src="${POSTER}" alt="《人小志大》电影海报：复古插画，英江与黄狗阿黄">
        </button>
        <span class="rl-poster-hint">海报 · 复古插画 — 点击放大</span>
      </div>
      <h1 class="rl-wordmark">人小志大<span class="rl-year">1959</span></h1>
      <p class="rl-wordmark-sub">浙江电影制片厂首部影片 · 剧情 / 儿童 · 68 分钟</p>
      <div class="rl-scroll">
        <div class="rl-inner">
          <nav class="rl-nav">
            <span class="rl-brand">ReelLog</span>
            <a href="#rl-info" data-scroll>信息</a>
            <a href="#rl-stills" data-scroll>剧照</a>
            <a href="#rl-ratings" data-scroll>评分</a>
            <a href="#rl-reviews" data-scroll>评论</a>
            <a href="#" class="rl-back">返回桌面</a>
          </nav>
          <div class="rl-lede">
            <p class="rl-anim">一九五九年，浙江电影制片厂的第一部电影。一群五年级的孩子，要种出一块属于自己的水稻试验田。</p>
            <a class="rl-cta rl-anim" href="#rl-ratings" data-scroll>为这部电影评分</a>
          </div>

          <section class="rl-section" id="rl-info">
            <h2 class="rl-anim">电影信息</h2>
            <dl class="rl-meta rl-anim">
              ${META.map(([k, v]) => `<div class="rl-meta-row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
            </dl>
            <p class="rl-anim">一九五八年春天，崇德县第五小学的孩子们想种一块水稻丰产试验田。没有土地，他们看上了老奶奶放鸭子的小水池；没有牛犁，他们让黄狗阿黄拉起了木犁；天旱无雨，他们造出了自己的灌溉工具。</p>
            <p class="rl-anim">这是浙江电影制片厂摄制的第一部电影，一群孩子在一块小小的试验田里，种出了大大的志气。</p>
          </section>

          <section class="rl-section" id="rl-stills">
            <h2 class="rl-anim">剧照</h2>
            <p class="rl-note rl-anim">黑白影像 · 一九五九 — 拖动浏览，点击放大</p>
            <div class="rl-filmstrip-wrap rl-anim">
              <div class="rl-filmstrip">
                ${filmstripMods.map(mod => mod.type === "stack" ? `
                  <div class="rl-mod rl-mod-stack"><figure>
                    ${mod.items.map((s, k) => `
                      <button class="rl-still-btn" data-idx="${mod.idx[k]}" aria-label="查看剧照 ${mod.idx[k] + 1}">
                        <img src="${s.src}" alt="${s.alt}" loading="lazy">
                      </button>`).join("")}
                  </figure></div>` : `
                  <div class="rl-mod rl-mod-${mod.type}">
                    <button class="rl-still-btn" data-idx="${mod.idx[0]}" aria-label="查看剧照 ${mod.idx[0] + 1}">
                      <img src="${mod.items[0].src}" alt="${mod.items[0].alt}" loading="lazy">
                    </button>
                  </div>`).join("")}
              </div>
            </div>
            <p class="rl-strip-hint">← 拖动胶片条，点击可放大</p>
          </section>

          <section class="rl-section rl-ratings-field" id="rl-ratings">
            <h2 class="rl-anim">观众评分</h2>
            <div class="rl-avg-row rl-anim">
              <span class="rl-avg">—</span>
              <span class="rl-avg-side">平均分<br><span class="rl-avg-count">暂无评分</span></span>
            </div>
            <div class="rl-stars rl-anim" role="radiogroup" aria-label="为本片评分">
              ${[1, 2, 3, 4, 5].map(n => `<button class="rl-star" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} 星">${STAR_SVG}</button>`).join("")}
            </div>
            <p class="rl-rate-label rl-anim">点击星星，为这部电影打分</p>
            <p class="rl-rate-count rl-anim"></p>
          </section>

          <section class="rl-section" id="rl-reviews">
            <h2 class="rl-anim">观众评论</h2>
            <div class="rl-composer rl-anim">
              <textarea placeholder="写下你看完《人小志大》的想法……" aria-label="评论输入框" maxlength="500"></textarea>
              <div class="rl-composer-row">
                <span class="rl-composer-hint">评论将保存在这台电脑上</span>
                <button class="rl-send" disabled>发送</button>
              </div>
            </div>
            <ul class="rl-review-list"></ul>
            <p class="rl-empty">还没有评论。写下第一条吧。</p>
          </section>

          <footer class="rl-footer">
            <p class="rl-word">ReelLog</p>
            <p>《人小志大》档案页 · 电影资料来自公开记录，海报与剧照由本站收藏者提供</p>
            <p>浙江电影制片厂 · 一九五九</p>
          </footer>
        </div>
      </div>
    </div>

    <div class="rl-lightbox" role="dialog" aria-modal="true" aria-label="图片预览">
      <button class="rl-lb-close" aria-label="关闭">×</button>
      <button class="rl-lb-arrow rl-lb-prev" aria-label="上一张">‹</button>
      <img alt="">
      <button class="rl-lb-arrow rl-lb-next" aria-label="下一张">›</button>
      <span class="rl-lb-counter"></span>
    </div>
  `;

  const scrollEl = el;   // 场景自身即滚动容器
  const lightbox = el.querySelector(".rl-lightbox");
  const lbImg = lightbox.querySelector("img");
  const lbCounter = lightbox.querySelector(".rl-lb-counter");
  const lbPrev = lightbox.querySelector(".rl-lb-prev");
  const lbNext = lightbox.querySelector(".rl-lb-next");
  const lbClose = lightbox.querySelector(".rl-lb-close");

  /* ---------- 导航 ---------- */
  el.querySelectorAll("[data-scroll]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      const target = el.querySelector(a.getAttribute("href"));
      if (!target) return;
      const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 20;
      el.scrollTo({ top, behavior: "smooth" });
    });
  });
  el.querySelector(".rl-back").addEventListener("click", e => { e.preventDefault(); onBack(); });

  /* ---------- 灯箱：海报 / 剧照 ---------- */
  let lbMode = null;    // "poster" | "stills"
  let lbIdx = 0;
  let lastFocus = null;

  function openLightbox(mode, idx = 0) {
    lbMode = mode;
    lbIdx = idx;
    lastFocus = document.activeElement;
    renderLightbox();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }
  function renderLightbox() {
    if (lbMode === "poster") {
      lbImg.src = POSTER;
      lbImg.alt = "《人小志大》电影海报（放大）";
      lbCounter.textContent = "";
      lbPrev.style.display = lbNext.style.display = "none";
    } else {
      const s = STILLS[lbIdx];
      lbImg.src = s.src;
      lbImg.alt = s.alt;
      lbCounter.textContent = String(lbIdx + 1).padStart(2, "0") + " / " + String(STILLS.length).padStart(2, "0");
      lbPrev.style.display = lbNext.style.display = "";
    }
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    lbMode = null;
    if (lastFocus) lastFocus.focus();
  }
  function step(d) {
    if (lbMode !== "stills") return;
    lbIdx = (lbIdx + d + STILLS.length) % STILLS.length;
    renderLightbox();
  }

  el.querySelector(".rl-poster-btn").addEventListener("click", () => openLightbox("poster"));
  el.querySelectorAll(".rl-still-btn").forEach(btn =>
    btn.addEventListener("click", () => openLightbox("stills", Number(btn.dataset.idx)))
  );
  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", () => step(-1));
  lbNext.addEventListener("click", () => step(1));
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  /* ---------- 剧照胶片条：拖拽滚动 ---------- */
  const strip = el.querySelector(".rl-filmstrip");
  let dragging = false, dragX = 0, dragScroll = 0, moved = 0;
  strip.addEventListener("pointerdown", e => {
    dragging = true; moved = 0;
    dragX = e.clientX; dragScroll = strip.scrollLeft;
    strip.classList.add("dragging");
  });
  strip.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    moved = Math.max(moved, Math.abs(dx));
    strip.scrollLeft = dragScroll - dx;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(evt =>
    strip.addEventListener(evt, () => { dragging = false; strip.classList.remove("dragging"); })
  );
  // 拖拽后抑制误触点击
  strip.addEventListener("click", e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } }, true);

  /* ---------- 评分 ---------- */
  const starEls = [...el.querySelectorAll(".rl-star")];
  const avgEl = el.querySelector(".rl-avg");
  const avgCountEl = el.querySelector(".rl-avg-count");
  const rateLabel = el.querySelector(".rl-rate-label");
  const rateCount = el.querySelector(".rl-rate-count");
  let myRating = load(LS.rating, 0);
  let aggregate = load(LS.aggregate, { sum: 0, count: 0 });

  function paintStars(n) {
    starEls.forEach((s, k) => {
      s.classList.toggle("lit", k < n);
      s.setAttribute("aria-checked", String(k + 1 === myRating));
    });
  }
  function renderRating() {
    if (aggregate.count > 0) {
      avgEl.textContent = (aggregate.sum / aggregate.count).toFixed(1);
      avgCountEl.textContent = `${aggregate.count} 人评分`;
    } else {
      avgEl.textContent = "—";
      avgCountEl.textContent = "暂无评分";
    }
    paintStars(myRating);
    if (myRating > 0) {
      rateLabel.innerHTML = `我的评分：<span class="rl-rate-word">${RATE_WORDS[myRating]}</span>（${myRating} 星，可重新评分）`;
    } else {
      rateLabel.textContent = "点击星星，为这部电影打分";
    }
    rateCount.textContent = "";
  }
  starEls.forEach((s, k) => {
    const n = k + 1;
    s.addEventListener("mouseenter", () => {
      paintStars(n);
      rateLabel.innerHTML = `${n} 星 · <span class="rl-rate-word">${RATE_WORDS[n]}</span>`;
    });
    s.addEventListener("mouseleave", () => renderRating());
    s.addEventListener("click", () => {
      if (myRating > 0) aggregate.sum = aggregate.sum - myRating + n;
      else { aggregate.sum += n; aggregate.count += 1; }
      myRating = n;
      save(LS.rating, myRating);
      save(LS.aggregate, aggregate);
      renderRating();
    });
  });
  renderRating();

  /* ---------- 评论 ---------- */
  const textarea = el.querySelector(".rl-composer textarea");
  const sendBtn = el.querySelector(".rl-send");
  const listEl = el.querySelector(".rl-review-list");
  const emptyEl = el.querySelector(".rl-empty");
  let reviews = load(LS.reviews, []);

  function starRow(n) {
    if (!n) return `<span class="rl-review-stars rl-review-none">未评分</span>`;
    const one = k => `<svg class="rl-mini-star${k < n ? " lit" : ""}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4l-5.8 3-1.1-6.4L.4 9.4l6.5-.9z" stroke-linejoin="round"/></svg>`;
    return `<span class="rl-review-stars">${[0, 1, 2, 3, 4].map(one).join("")}</span>`;
  }
  function renderReviews() {
    listEl.innerHTML = reviews.map(r => `
      <li class="rl-review">
        <div class="rl-review-head">${starRow(r.stars)}<span class="rl-review-time">${fmtTime(r.ts)}</span></div>
        <p class="rl-review-text"></p>
      </li>`).join("");
    // 文本用 textContent 注入，防 XSS
    [...listEl.querySelectorAll(".rl-review-text")].forEach((p, k) => { p.textContent = reviews[k].text; });
    emptyEl.style.display = reviews.length ? "none" : "";
  }
  textarea.addEventListener("input", () => { sendBtn.disabled = !textarea.value.trim(); });
  sendBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text) return;
    reviews.unshift({ text, stars: myRating || 0, ts: Date.now() });
    save(LS.reviews, reviews);
    textarea.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "已发送";
    setTimeout(() => { sendBtn.textContent = "发送"; }, 1200);
    renderReviews();
  });
  renderReviews();

  /* ---------- 入场动画 & 标志性字标缩放 ---------- */
  const animEls = [...el.querySelectorAll(".rl-anim")];
  const io = new IntersectionObserver(entries => {
    entries.forEach((entry, k) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = (k * 70) + "ms";
        entry.target.classList.add("rl-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  animEls.forEach(a => io.observe(a));

  const wordmark = el.querySelector(".rl-wordmark");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function onScroll() {
    if (reduceMotion) return;
    const solo = document.body.classList.contains("rl-solo");
    const top = solo ? window.scrollY : scrollEl.scrollTop;
    const p = Math.min(1, top / 600);
    wordmark.style.transform = `scale(${1 - p * 0.07})`;
  }
  scrollEl.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    el,
    enter() { scrollEl.scrollTop = 0; onScroll(); },
    exit() { closeLightbox(); }
  };
}
