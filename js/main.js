// 场景管理器：统一调度场景的进入与退出
import { storyState, setState } from "./state.js?v=20261111i";
import { createDesktopScene } from "./scenes/desktop.js?v=20261111i";
import { createStoryScene } from "./scenes/story.js?v=20261111i";
import { createReelLogScene } from "./scenes/reellog.js?v=20261111i";
import { createSearchScene } from "./scenes/search.js?v=20261111i";
import { createTapeScene } from "./scenes/tape.js?v=20261111i";

const app = document.getElementById("app");
const scenes = {};
let current = null;

function register(name, scene) {
  scenes[name] = scene;
  app.appendChild(scene.el);
}

function showScene(name) {
  if (current === name) return;
  const prev = scenes[current];
  const next = scenes[name];
  if (prev) { prev.exit(); prev.el.classList.remove("active"); }
  if (next) {
    next.el.classList.add("active");
    next.enter();
  }
  current = name;
  setState({ currentScene: name });
}

register("desktop", createDesktopScene({
  onEnterStory: () => showScene("story"),
  onEnterReellog: () => showScene("reellog"),
  onEnterSearch: () => showScene("search"),
  onEnterTape: () => showScene("tape")
}));
register("story", createStoryScene({
  onExitToDesktop: () => showScene("desktop"),
  onFinish: () => showScene("desktop")   // 丰收过曝后回到电影放映（桌面）
}));
register("reellog", createReelLogScene({
  onBack: () => showScene("desktop")
}));
register("search", createSearchScene({
  onBack: () => showScene("desktop")
}));
register("tape", createTapeScene({
  onBack: () => showScene("desktop")
}));

// 调试模式：?debug=1 显示图标热区轮廓；?scene=xxx 直达场景；&solo=1 单场景文档流（供检查工具测量）
const params = new URLSearchParams(location.search);
if (params.get("debug") === "1") {
  document.body.classList.add("debug");
}

const startScene = params.get("scene");
showScene(scenes[startScene] ? startScene : "desktop");

if (params.get("solo") === "1") {
  document.body.classList.add("rl-solo");
  Object.entries(scenes).forEach(([name, s]) => {
    if (name !== startScene) s.el.style.display = "none";
  });
}
