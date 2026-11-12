// 搜索场景：极简界面，中央搜索栏 → 点击后出现"〈人小志大〉在线观看" → 进入电影票 3D 空间
export function createSearchScene({ onBack }) {
  const el = document.createElement("section");
  el.id = "scene-search";
  el.className = "scene";

  el.innerHTML = `
    <button class="search-back" type="button" aria-label="返回桌面">
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M10 2 L4 8 L10 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      返回
    </button>
    <div class="search-wrap">
      <div class="search-bar">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="7" fill="none" stroke="#6f675c" stroke-width="2"/>
          <path d="M16 16 L22 22" stroke="#6f675c" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
        <input type="text" placeholder="搜索" aria-label="搜索" autocomplete="off" spellcheck="false">
      </div>
      <button class="search-result" type="button">
        <span class="sr-title">《人小志大》在线观看</span>
        <span class="sr-sub">1959 · 浙江电影制片厂 · 黑白</span>
      </button>
    </div>
  `;

  const input = el.querySelector(".search-bar input");
  const result = el.querySelector(".search-result");
  let revealed = false;
  let timer = null;

  // 点击/聚焦搜索栏 → 稍作"检索"停顿后浮现唯一结果
  function reveal() {
    if (revealed) return;
    revealed = true;
    el.classList.add("searching");
    timer = setTimeout(() => {
      el.classList.remove("searching");
      el.classList.add("found");
    }, 550);
  }
  input.addEventListener("focus", reveal);
  input.addEventListener("input", reveal);

  // 点击结果 → 进入电影票 3D 空间
  result.addEventListener("click", () => {
    el.classList.add("leaving");
    setTimeout(() => { window.location.href = "tickets.html"; }, 380);
  });

  el.querySelector(".search-back").addEventListener("click", onBack);

  return {
    el,
    enter() {
      input.value = "";
      revealed = false;
      clearTimeout(timer);
      el.classList.remove("searching", "found", "leaving");
    },
    exit() { input.blur(); }
  };
}
