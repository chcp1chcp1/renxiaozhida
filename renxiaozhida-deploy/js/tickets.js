// 电影票 3D 空间：16 张真实票券在三维空间中的六镜头滚动动画
// 镜头：01 进入空间 → 02 发现票券 → 03 穿越空间 → 04 票券涌入 → 05 空间收束 → 06 等待放映
// 调试：tickets.html?p=0.5 固定进度截图模式
import * as THREE from "../lib/three.module.js";

/* ---------- 票券清单与镜头调度 ----------
 * file    素材文件（assets/tickets/，已抠除白底透明背景）
 * ratio   原始宽高比（w/h），保证不变形
 * width   世界单位宽度（近大远小的基础尺寸）
 * layer   near / mid / far —— 决定漂浮幅度
 * keys    镜头关键帧 [进度p, x, y, z, rz(弧度)]，相机在 z=8
 * tilt    恒定的轻微俯仰/侧倾 [rx, ry]，让票券不完全正对相机
 *
 * 调度原则：16 张票全部拥有"远处登场 → 接近 → 主角时刻 → 离场/隐退"的完整轨迹，
 * 主角时刻错峰分布，同一时刻仅 2~4 张票处于近景，其余在中远景形成层次。
 * 结尾仅 02/07/12 三张退至远景留守，中央留白等待放映机。
 */
const TICKETS = [
  // ===== 近景票券（5 张，会掠过镜头）=====
  { file: "ticket-01.png", ratio: 1.564, width: 4.6, layer: "near", tilt: [0.06, -0.10], // 主角票：镜头01 单独登场
    keys: [
      [0.00,  0.4,  0.1, -34,  0.06], [0.10,  0.0,  0.15, -6.0, -0.03],
      [0.24, -0.5,  0.25, -4.5, 0.02], [0.38, -1.4, -0.1,  -1.0, -0.08],
      [0.50,  0.8,  0.3,  3.6, 0.10], [0.60,  5.5,  1.0,   7.5,  0.20],
      [0.70, 11.0,  1.6, 10.5, 0.26], [1.00, 16.0,  2.4,  13.0,  0.30]
    ]},
  { file: "ticket-04.png", ratio: 0.455, width: 2.7, layer: "near", tilt: [-0.08, 0.12], // 竖版优待券：自上方旋入坠落
    keys: [
      [0.00, -3.0,  7.0, -34, -0.30], [0.20, -2.8,  6.2, -20, -0.26],
      [0.34, -1.6,  3.6,  -9, -0.16], [0.46, -0.2,  1.0,  -3, -0.05],
      [0.58,  0.6, -1.6,  2.5, 0.10], [0.68,  1.2, -5.5,  7.0,  0.20],
      [0.78,  1.8, -10.5, 11.0, 0.28], [1.00,  2.4, -14.0, 13.0, 0.34]
    ]},
  { file: "ticket-05.png", ratio: 2.438, width: 5.1, layer: "near", tilt: [0.05, 0.08], // 宽幅橙条票：低位左→右横穿
    keys: [
      [0.00, -17.0, 1.6, -32,  0.05], [0.24, -12.0, 1.3, -16,  0.04],
      [0.38,  -6.5, 0.7,  -6,  0.00], [0.50,  -1.5, 0.2,  1.0, -0.06],
      [0.60,   3.5, -0.5, 6.0, -0.14], [0.70, 10.5, -1.2, 10.0, -0.22],
      [1.00,  17.0, -1.8, 13.0, -0.28]
    ]},
  { file: "ticket-08.png", ratio: 2.039, width: 4.6, layer: "near", tilt: [-0.06, -0.09], // 红色票：右下→右上斜向掠过
    keys: [
      [0.00, 14.0, -4.0, -36, -0.15], [0.26, 10.5, -3.0, -18, -0.12],
      [0.40,  6.0, -1.6,  -8, -0.07], [0.52,  2.6,  0.2, -2.5, -0.02],
      [0.62,  1.8,  1.6,  2.8, 0.08], [0.72,  4.5,  4.8,  8.0,  0.18],
      [0.82,  9.0,  8.5, 11.0, 0.26], [1.00, 13.0, 11.0, 13.0,  0.30]
    ]},
  { file: "ticket-11.png", ratio: 2.220, width: 4.9, layer: "near", tilt: [0.07, 0.06], // 儿童票根：底部右→左横穿
    keys: [
      [0.00,  7.0, -6.0, -34,  0.10], [0.36,  6.2, -5.2, -20,  0.08],
      [0.50,  4.6, -3.4, -10,  0.04], [0.60,  2.0, -1.6,  -3, -0.02],
      [0.70, -1.8, -0.4,  3.0, -0.12], [0.80, -7.0, 0.4,   8.5, -0.22],
      [0.90, -12.5, 1.0, 11.5, -0.28], [1.00, -16.0, 1.4, 13.0, -0.32]
    ]},

  // ===== 中景票券（6 张，各自有清晰的主角时刻）=====
  { file: "ticket-03.png", ratio: 1.947, width: 3.3, layer: "mid", tilt: [0.04, -0.06], // 左侧：早出登场，高潮二次冲刺掠过
    keys: [
      [0.00, -10.5, 3.6, -46,  0.08], [0.10, -9.0, 3.3, -32,  0.06],
      [0.22,  -7.2, 2.8, -16,  0.03], [0.32, -6.2, 2.5,  -7,  0.00],
      [0.44,  -6.6, 2.7, -8.5, -0.03], [0.56, -5.0, 2.0, -1.0, -0.08],
      [0.66,  -2.2, 1.6,  4.5, -0.14], [0.78, -8.0, 1.0,  9.5, -0.20],
      [1.00, -14.0, 0.2, 12.5, -0.24]
    ]},
  { file: "ticket-06.png", ratio: 2.239, width: 3.4, layer: "mid", tilt: [-0.05, 0.07], // 右侧：与 03 对称，稍后冲刺
    keys: [
      [0.00, 11.0, -0.4, -44, -0.06], [0.12,  9.4, -0.2, -30, -0.05],
      [0.26,  7.6,  0.1, -15, -0.02], [0.36,  6.6,  0.3,  -7,  0.01],
      [0.48,  7.0,  0.5, -8.5, 0.04], [0.60,  5.2,  0.8, -1.5, 0.08],
      [0.70,  3.4,  1.6,  4.0, 0.14], [0.82,  9.0,  3.0,  9.5, 0.20],
      [1.00, 14.5,  4.0, 12.5, 0.24]
    ]},
  { file: "ticket-09.png", ratio: 1.916, width: 3.2, layer: "mid", tilt: [0.06, 0.05], // 左下：高潮前的主角，随后退入雾中
    keys: [
      [0.00, -8.5, -4.0, -44, -0.05], [0.14, -7.2, -3.5, -30, -0.04],
      [0.28, -5.8, -2.9, -16, -0.01], [0.40, -5.0, -2.6,  -9,  0.02],
      [0.50, -4.4, -2.3, -5.0, 0.04], [0.62, -4.9, -2.5, -6.5, 0.06],
      [0.76, -7.5, -3.8, -16,  0.10], [1.00, -11.5, -5.5, -32, 0.14]
    ]},
  { file: "ticket-10.png", ratio: 1.449, width: 3.1, layer: "mid", tilt: [-0.04, -0.08], // 顶部中央：高潮前主角，随后向上飞出
    keys: [
      [0.00, 3.6, 5.4, -48,  0.12], [0.14, 3.3, 4.9, -34,  0.10],
      [0.28, 3.0, 4.3, -19,  0.06], [0.38, 2.7, 3.9,  -9,  0.03],
      [0.46, 2.5, 3.6, -5.5, 0.01], [0.58, 2.8, 4.0, -7.0, -0.02],
      [0.70, 2.2, 5.2, -1.0, -0.06], [0.82, 1.6, 9.0,  5.0, -0.10],
      [1.00, 1.2, 14.0, 10.0, -0.12]
    ]},
  { file: "ticket-13.png", ratio: 1.754, width: 3.3, layer: "mid", tilt: [0.05, -0.05], // 右下：高潮中主角，从右下角掠过离场
    keys: [
      [0.00, 9.5, -4.4, -45,  0.07], [0.12, 8.2, -4.0, -31,  0.06],
      [0.26, 6.6, -3.4, -17,  0.03], [0.40, 5.8, -3.0, -9.5, 0.01],
      [0.54, 5.2, -2.7, -5.0, -0.01], [0.66, 5.7, -3.0, -6.5, -0.04],
      [0.78, 7.0, -3.4, -0.5, -0.08], [0.90, 9.5, -4.2,  6.0, -0.14],
      [1.00, 14.0, -5.5, 11.0, -0.18]
    ]},
  { file: "ticket-15.png", ratio: 1.648, width: 3.2, layer: "mid", tilt: [-0.06, 0.06], // 左中：高潮末主角，随后退入雾中
    keys: [
      [0.00, -11.5, 0.3, -47, -0.09], [0.14, -9.8, 0.4, -33, -0.07],
      [0.28,  -8.0, 0.5, -18, -0.04], [0.44, -6.9, 0.6, -10, -0.01],
      [0.58,  -6.2, 0.7, -5.5, 0.02], [0.70, -6.7, 0.5, -7.5, 0.05],
      [0.84,  -9.0, 0.0, -17,  0.08], [1.00, -12.5, -1.0, -32, 0.12]
    ]},

  // ===== 远景票券（5 张，同样拥有接近镜头的主角时刻）=====
  { file: "ticket-02.png", ratio: 1.563, width: 2.3, layer: "far", tilt: [0.03, -0.04], // 左上：后段主角，最终留守远景
    keys: [
      [0.00, -6.2, 3.9, -50,  0.05], [0.20, -5.8, 3.6, -40,  0.04],
      [0.45, -5.3, 3.3, -30,  0.02], [0.62, -5.0, 3.1, -22,  0.00],
      [0.76, -4.4, 2.8, -10, -0.02], [0.88, -5.4, 3.4, -22, -0.04],
      [1.00, -6.2, 3.8, -34, -0.05]
    ]},
  { file: "ticket-07.png", ratio: 2.077, width: 2.4, layer: "far", tilt: [-0.03, 0.05], // 右上：后段主角，最终留守远景
    keys: [
      [0.00, 7.2, 2.7, -52, -0.04], [0.22, 6.8, 2.5, -42, -0.03],
      [0.48, 6.3, 2.3, -32, -0.01], [0.64, 6.0, 2.2, -24,  0.00],
      [0.78, 5.4, 2.0, -11,  0.02], [0.90, 6.2, 4.4, -26,  0.04],
      [1.00, 6.8, 5.4, -34,  0.05]
    ]},
  { file: "ticket-12.png", ratio: 1.658, width: 2.3, layer: "far", tilt: [0.04, 0.03], // 底部中央：最后的主角，最终留守远景
    keys: [
      [0.00, 0.6, -4.3, -48,  0.02], [0.20, 0.5, -4.0, -38,  0.02],
      [0.46, 0.3, -3.7, -28,  0.01], [0.66, 0.1, -3.5, -20,  0.00],
      [0.82, -0.2, -3.2, -9.5, -0.01], [0.92, 0.2, -3.8, -22, 0.01],
      [1.00, 0.5, -4.2, -33,  0.02]
    ]},
  { file: "ticket-14.png", ratio: 2.078, width: 2.4, layer: "far", tilt: [-0.04, -0.05], // 右侧：后段主角，向右离场
    keys: [
      [0.00,  8.8, -3.5, -49, -0.06], [0.20,  8.2, -3.2, -38, -0.05],
      [0.44,  7.5, -2.9, -26, -0.03], [0.62,  7.0, -2.7, -16, -0.01],
      [0.76,  6.4, -2.4, -7.5, 0.02], [0.88,  8.2, -3.4, -7.0, -0.02],
      [0.94, 24.0, -6.0, -14, -0.06], [1.00, 24.0, -6.0, -14, -0.06]
    ]},
  { file: "ticket-16.png", ratio: 1.676, width: 2.3, layer: "far", tilt: [0.05, 0.04], // 顶部：收尾主角，向上离场
    keys: [
      [0.00, 5.6, 4.7, -51,  0.08], [0.18, 5.3, 4.4, -41,  0.07],
      [0.42, 4.9, 4.1, -30,  0.05], [0.64, 4.6, 3.8, -20,  0.03],
      [0.80, 4.0, 3.4,  -8,  0.00], [0.92, 4.8, 5.5,  -4, -0.03],
      [1.00, 5.5, 14.0, 2.0, -0.06]
    ]}
];

// 漂浮幅度按层区分：近景摆动明显，远景克制
const DRIFT = {
  near: { pos: 0.14, rot: 0.030 },
  mid:  { pos: 0.10, rot: 0.022 },
  far:  { pos: 0.06, rot: 0.014 }
};

/* ---------- 场景基础 ---------- */
const BG = 0xd4c9a8; // 暖纸色，雾色与背景 canvas 底色一致
const container = document.getElementById("stage3d");

let renderer;
try {
  // alpha:true —— WebGL 画布透明，露出下方的粒子背景 canvas
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (err) {
  // 极少数环境 WebGL 不可用：给出提示而不是白屏
  const tip = document.querySelector(".tk-loading span");
  if (tip) tip.textContent = "当前浏览器不支持 WebGL，无法进入票匣";
  throw err;
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 16, 44); // 远处票券隐入暖色雾气，形成纵深

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 0, 8);

/* ---------- 灯光：纸面明暗是立体感的关键 ---------- */
scene.add(new THREE.HemisphereLight(0xfff4d6, 0x8a7f68, 0.95));
const keyLight = new THREE.DirectionalLight(0xfff0d0, 1.25);
keyLight.position.set(-6, 8, 10);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xffd9a0, 0.55, 60);
rimLight.position.set(8, -4, 6);
scene.add(rimLight);

/* ---------- 微弯曲的票面几何：纸不是绝对平的 ---------- */
function curvedPlane(w, h) {
  const geo = new THREE.PlaneGeometry(w, h, 10, 10);
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i);
    // 沿长边轻微拱起 + 对角轻微扭曲
    const z = Math.sin((x / w + 0.5) * Math.PI) * 0.10
            + Math.sin((y / h + 0.5) * Math.PI) * 0.04;
    posAttr.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------- 加载票券纹理并建模 ---------- */
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
const tickets = [];

TICKETS.forEach((cfg, i) => {
  const tex = loader.load("assets/tickets/" + cfg.file, undefined, undefined,
    err => console.error("票券加载失败:", cfg.file, err));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;

  // MeshStandardMaterial + 三点灯光：纸面随角度产生真实明暗
  // alphaTest 处理抠图透明边：走不透明渲染队列，天然避免透明排序/遮挡错乱
  const mat = new THREE.MeshStandardMaterial({
    map: tex, side: THREE.DoubleSide, alphaTest: 0.45,
    roughness: 0.88, metalness: 0.0, fog: true
  });
  const mesh = new THREE.Mesh(curvedPlane(cfg.width, cfg.width / cfg.ratio), mat);
  scene.add(mesh);
  tickets.push({ cfg, mesh, phase: i * 1.37, speed: 0.5 + (i % 5) * 0.1 });
});

manager.onLoad = () => {
  document.querySelector(".tk-loading").classList.add("done");
  overlayHidden = true;
};

/* ---------- 关键帧求值：Hermite 曲线插值（速度连续，运动丝滑无段落顿感） ---------- */
const COMPONENTS = [[1, "x"], [2, "y"], [3, "z"], [4, "rz"]];

// 有限差分切线：取前后关键帧的斜率，端点自动降级为单侧
function keySlope(keys, i, c) {
  const i0 = Math.max(0, i - 1), i1 = Math.min(keys.length - 1, i + 1);
  const dp = keys[i1][0] - keys[i0][0];
  return dp > 0 ? (keys[i1][c] - keys[i0][c]) / dp : 0;
}

function evalKeys(keys, p, out) {
  const n = keys.length;
  if (p <= keys[0][0]) {
    out.x = keys[0][1]; out.y = keys[0][2]; out.z = keys[0][3]; out.rz = keys[0][4];
    return out;
  }
  if (p >= keys[n - 1][0]) {
    out.x = keys[n-1][1]; out.y = keys[n-1][2]; out.z = keys[n-1][3]; out.rz = keys[n-1][4];
    return out;
  }
  let i = 0;
  while (i < n - 2 && p > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  const h = b[0] - a[0];
  const t = (p - a[0]) / h;
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  for (const [c, name] of COMPONENTS) {
    const ma = keySlope(keys, i, c), mb = keySlope(keys, i + 1, c);
    out[name] = h00 * a[c] + h10 * h * ma + h01 * b[c] + h11 * h * mb;
  }
  return out;
}

/* ---------- 滚动进度：GSAP ScrollTrigger（scrub 平滑，支持反向） ---------- */
const params = new URLSearchParams(location.search);
const fixedP = params.has("p") ? Math.max(0, Math.min(1, parseFloat(params.get("p")))) : null;
if (fixedP !== null) renderer.setPixelRatio(1); // 截图模式：单倍像素，加速无头渲染

const proxy = { p: fixedP ?? 0 };
if (fixedP !== null) {
  document.body.classList.add("fixed-progress"); // 截图模式：隐藏滚动跑道
  document.body.classList.add("scrolled");
} else {
  gsap.registerPlugin(ScrollTrigger);
  gsap.to(proxy, {
    p: 1, ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.55 }
  });
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: self => document.body.classList.toggle("scrolled", self.progress > 0.015)
  });
}

/* ---------- 鼠标轻微视差（克制，不影响滚动主逻辑） ---------- */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", e => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
});

/* ---------- 放映机：滚动末段登场，点击放映 ---------- */
const projector = document.querySelector(".tk-projector");
const projHint = document.querySelector(".tk-proj-hint");
const videoModal = document.querySelector(".tk-video-modal");
const videoEl = videoModal.querySelector("video");
const videoNote = document.querySelector(".tk-video-note");

videoEl.addEventListener("error", () => {
  videoNote.textContent = "影片文件尚未就位：请将视频放入 assets/video/film.mp4";
});

projector.addEventListener("click", () => {
  videoModal.classList.add("open");
  videoEl.play().catch(() => {}); // 无文件时静默失败，提示已就位
});
function closeVideo() {
  videoModal.classList.remove("open");
  videoEl.pause();
}
videoModal.addEventListener("click", e => { if (e.target === videoModal) closeVideo(); });
videoModal.querySelector(".tk-video-close").addEventListener("click", closeVideo);
window.addEventListener("keydown", e => { if (e.key === "Escape") closeVideo(); });

// 登场曲线：p 0.84→0.95 淡入升起，1.0 后保持稳定
function updateProjector(p) {
  const t = Math.max(0, Math.min(1, (p - 0.84) / 0.11));
  const ease = t * t * (3 - 2 * t);
  projector.style.opacity = ease.toFixed(3);
  projector.style.transform =
    `translate(-50%, -50%) translateY(${(1 - ease) * 26}px) scale(${0.94 + ease * 0.06})`;
  projector.classList.toggle("ready", t >= 0.85);
  projHint.style.opacity = t >= 0.95 ? "1" : "0";
}

/* ---------- 动画循环 ---------- */
const clock = new THREE.Clock();
const pos = {};
let overlayHidden = false;
let stillFrames = 0; // 截图模式：画面稳定后停帧，避免空转
function animate() {
  if (fixedP !== null && overlayHidden && ++stillFrames > 30) return; // 停帧
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const p = proxy.p;

  tickets.forEach(({ cfg, mesh, phase, speed }) => {
    evalKeys(cfg.keys, p, pos);
    const drift = DRIFT[cfg.layer];
    // 缓慢漂浮 + 细微旋转，各票相位/频率不同
    mesh.position.set(
      pos.x + Math.sin(t * speed + phase) * drift.pos,
      pos.y + Math.sin(t * speed * 0.8 + phase * 1.7) * drift.pos * 0.8,
      pos.z
    );
    mesh.rotation.set(
      cfg.tilt[0] + Math.sin(t * speed * 0.5 + phase) * drift.rot,
      cfg.tilt[1] + Math.cos(t * speed * 0.45 + phase * 2.1) * drift.rot,
      pos.rz + Math.sin(t * speed * 0.6 + phase * 0.9) * drift.rot
    );
  });

  // 相机轻微视差
  mouse.x += (mouse.tx * 0.45 - mouse.x) * 0.04;
  mouse.y += (-mouse.ty * 0.28 - mouse.y) * 0.04;
  camera.position.set(mouse.x, mouse.y, 8);
  camera.lookAt(mouse.x * 0.4, mouse.y * 0.4, -6);

  updateProjector(p);
  renderer.render(scene, camera);

  // 首帧渲染成功即隐藏加载遮罩（纹理未就绪的票券随后自然显现）
  if (!overlayHidden) {
    overlayHidden = true;
    document.querySelector(".tk-loading").classList.add("done");
  }
}

/* ---------- 自适应 ---------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动渲染循环（不等纹理全部就绪，场景先跑起来）
animate();
