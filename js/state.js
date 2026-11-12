// 剧情全局状态（与 docs/STORY_FLOW.md 第四节一致）
const listeners = new Set();

export const storyState = {
  currentScene: "desktop",
  pondDecision: null,        // preserve / reclaim
  irrigationDecision: null,  // manual / efficient
  irrigationCompleted: false,
  riceStage: "drought",      // drought / recovering / growing / mature
  ending: null
};

export function setState(patch) {
  Object.assign(storyState, patch);
  listeners.forEach(fn => fn(storyState));
}

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
