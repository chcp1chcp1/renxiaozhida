// 纸面水彩墨迹引擎（WebGL2 流体渗色）
// 速度场（笔尖注入 + 径向扩散 + 衰减）驱动染料平流，
// 染料以"透射率"形式存储（白=纸，逐 splat multiply 累积），
// 黄/粉/紫多色叠乘自然交融成水池；低分辨率模拟自带柔边。
// 无 WebGL2 时自动隐藏画布，纸面照常可用。

const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// 公共片元头：全屏三角形覆盖，含值噪声
const HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uTexel;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

const ADV_VEL = HEAD + `
uniform sampler2D uVel;
uniform float uDecay;
void main() {
  vec2 v = texture(uVel, vUv).xy;
  vec2 b = 0.25 * (texture(uVel, vUv + vec2(uTexel.x, 0.0)).xy
                 + texture(uVel, vUv - vec2(uTexel.x, 0.0)).xy
                 + texture(uVel, vUv + vec2(0.0, uTexel.y)).xy
                 + texture(uVel, vUv - vec2(0.0, uTexel.y)).xy);
  v = mix(v, b, 0.3) * uDecay;
  outColor = vec4(v, 0.0, 1.0);
}`;

const ADV_DYE = HEAD + `
uniform sampler2D uDye;
uniform sampler2D uVel;
uniform float uDt;
uniform float uTime;
uniform float uKeep;
void main() {
  vec2 v = texture(uVel, vUv).xy;
  // 细微摆动让洇开的边缘不规则、像水在纸纤维里走（uv/秒）
  vec2 wob = vec2(sin(vUv.y * 96.0 + uTime * 1.4), cos(vUv.x * 84.0 - uTime * 1.1)) * 0.012;
  vec2 coord = vUv - (v + wob) * uDt;
  vec4 c = texture(uDye, coord);
  vec4 b = 0.25 * (texture(uDye, coord + vec2(uTexel.x, 0.0))
                 + texture(uDye, coord - vec2(uTexel.x, 0.0))
                 + texture(uDye, coord + vec2(0.0, uTexel.y))
                 + texture(uDye, coord - vec2(0.0, uTexel.y)));
  c = mix(c, b, 0.07);                       // 渗色扩散
  c.rgb = mix(vec3(1.0), c.rgb, uKeep);      // 极缓褪向纸色
  outColor = c;
}`;

const SPLAT_DYE = HEAD + `
uniform sampler2D uTex;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
uniform vec3 uColor;
uniform float uSeed;
void main() {
  vec2 p = (vUv - uPoint) * vec2(uAspect, 1.0);
  float n = noise(p * (2.2 / uRadius) + uSeed);          // 不规则墨缘
  float d = length(p) / (uRadius * (0.7 + 0.6 * n));
  float f = exp(-d * d * 3.5);
  vec3 base = texture(uTex, vUv).rgb;
  base *= mix(vec3(1.0), uColor, clamp(f * uStrength, 0.0, 1.0)); // 减色叠染
  outColor = vec4(base, 1.0);
}`;

const SPLAT_VEL = HEAD + `
uniform sampler2D uTex;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
uniform vec2 uDir;
uniform float uRadial;
void main() {
  vec2 p = (vUv - uPoint) * vec2(uAspect, 1.0);
  float d = length(p) / uRadius;
  float f = exp(-d * d * 3.0);
  vec2 v = texture(uTex, vUv).xy;
  if (uRadial > 0.5) {
    vec2 dir = p / max(length(p), 1e-5);
    v += dir * uStrength * f;                 // 径向外推 = 墨滴落纸的晕开
  } else {
    v += uDir * f * uStrength;                // 顺笔方向的流动
  }
  outColor = vec4(v, 0.0, 1.0);
}`;

const DISPLAY = HEAD + `
uniform sampler2D uDye;
uniform vec2 uSize;
void main() {
  vec4 c = texture(uDye, vUv);
  float g = noise(vUv * uSize / 2.6);          // 颜料颗粒沉淀
  c.rgb *= 0.968 + 0.052 * g;
  outColor = vec4(c.rgb, 1.0);
}`;

// 黄 / 粉 / 紫（用户指定）；每次落笔微抖色相，避免每滴一模一样
const INK_COLORS = [
  [0.96, 0.78, 0.26],
  [0.91, 0.42, 0.54],
  [0.56, 0.35, 0.69]
];
const jitter = c => c.map(v => Math.min(1, v * (0.88 + Math.random() * 0.24)));

export function createInkBleed(canvas) {
  const dummy = {
    ok: false, down() {}, move() {}, up() {},
    start() { canvas.style.display = "none"; }, stop() {}, clear() {}, resize() {}
  };

  let gl;
  try {
    gl = canvas.getContext("webgl2", { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true });
  } catch (e) { gl = null; }
  if (!gl) return dummy;
  const extF = gl.getExtension("EXT_color_buffer_float");
  const texInternal = extF ? gl.RGBA16F : gl.RGBA8;
  const texType = extF ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[ink] shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(fs) {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const frag = compile(gl.FRAGMENT_SHADER, fs);
    if (!vs || !frag) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, frag);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn("[ink] link:", gl.getProgramInfoLog(p));
      return null;
    }
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      uniforms[name] = gl.getUniformLocation(p, name);
    }
    return { p, u: uniforms };
  }

  const progs = {};
  for (const [k, src] of Object.entries({ advVel: ADV_VEL, advDye: ADV_DYE, splatDye: SPLAT_DYE, splatVel: SPLAT_VEL, display: DISPLAY })) {
    progs[k] = program(src);
    if (!progs[k]) return dummy;
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  function createFBO(w, h) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, texInternal, w, h, 0, gl.RGBA, texType, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, texelX: 1 / w, texelY: 1 / h };
  }
  function doubleFBO(w, h) {
    let a = createFBO(w, h), b = createFBO(w, h);
    return {
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
      w, h
    };
  }

  const DYE_SCALE = 0.5, VEL_SCALE = 0.25;
  let dye = null, vel = null;
  let running = false, raf = 0, lastT = 0, simT = 0;
  let pending = [];      // 本帧待注入的 splat
  let stroking = false, lastPt = null, lastMoveT = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    dye = doubleFBO(Math.max(8, w * DYE_SCALE | 0), Math.max(8, h * DYE_SCALE | 0));
    vel = doubleFBO(Math.max(8, w * VEL_SCALE | 0), Math.max(8, h * VEL_SCALE | 0));
    clear();
  }
  function clear() {
    if (!dye) return;
    for (const f of [dye.read, dye.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
      gl.viewport(0, 0, f.w, f.h);
      gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT);   // 白 = 纸
    }
    for (const f of [vel.read, vel.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
      gl.viewport(0, 0, f.w, f.h);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  function use(prog, target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, target ? target.w : canvas.width, target ? target.h : canvas.height);
    gl.useProgram(prog.p);
    return prog.u;
  }
  function bindTex(loc, tex, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }
  function blit() { gl.drawArrays(gl.TRIANGLES, 0, 3); }

  function splatDye(ux, uy, radius, strength, color) {
    const u = use(progs.splatDye, dye.write);
    bindTex(progs.splatDye.u.uTex, dye.read.tex, 0);
    gl.uniform2f(u.uPoint, ux, uy);
    gl.uniform2f(u.uTexel, dye.read.texelX, dye.read.texelY);
    gl.uniform1f(u.uRadius, radius);
    gl.uniform1f(u.uStrength, strength);
    gl.uniform1f(u.uAspect, dye.w / dye.h);
    gl.uniform3f(u.uColor, color[0], color[1], color[2]);
    gl.uniform1f(u.uSeed, Math.random() * 100);
    blit(); dye.swap();
  }
  function splatVel(ux, uy, radius, dirX, dirY, strength, radial) {
    const u = use(progs.splatVel, vel.write);
    bindTex(progs.splatVel.u.uTex, vel.read.tex, 0);
    gl.uniform2f(u.uPoint, ux, uy);
    gl.uniform2f(u.uTexel, vel.read.texelX, vel.read.texelY);
    gl.uniform1f(u.uRadius, radius);   // uv 单位与分辨率无关
    gl.uniform1f(u.uStrength, strength);
    gl.uniform1f(u.uAspect, vel.w / vel.h);
    gl.uniform2f(u.uDir, dirX, dirY);
    gl.uniform1f(u.uRadial, radial ? 1 : 0);
    blit(); vel.swap();
  }

  const PICK = () => jitter(INK_COLORS[(Math.random() * INK_COLORS.length) | 0]);

  // 对外坐标：CSS 像素（相对画布左上角，y 向下）
  // 内部一律转为 WebGL uv（y 向上）：uy = 1 - y / 高
  function down(x, y) {
    if (!dye) return;
    stroking = true;
    lastPt = [x, y]; lastMoveT = performance.now();
    const ux = x / canvas.clientWidth, uy = 1 - y / canvas.clientHeight;
    splatVel(ux, uy, 0.045, 0, 0, 0.22, true);           // 径向晕开
    pending.push({ ux, uy, r: 0.038, s: 0.55, c: PICK() });
  }
  function move(x, y) {
    if (!stroking || !dye) return;
    const now = performance.now();
    const dt = Math.max(8, now - lastMoveT) / 1000;
    lastMoveT = now;
    const [lx, ly] = lastPt;
    const dx = x - lx, dy = y - ly;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) return;
    // 笔速 → 染料随流向漂移（uv 空间 y 向上，故取负）
    const uvx = dx / canvas.clientWidth, uvy = -dy / canvas.clientHeight;
    const speed = Math.min(1.4, Math.hypot(uvx, uvy) / dt);
    const nx = uvx / (Math.hypot(uvx, uvy) || 1), ny = uvy / (Math.hypot(uvx, uvy) || 1);
    const steps = Math.max(1, Math.min(8, (dist * DYE_SCALE / 6) | 0));
    for (let i = 1; i <= steps; i++) {
      const ux = (lx + dx * i / steps) / canvas.clientWidth;
      const uy = 1 - (ly + dy * i / steps) / canvas.clientHeight;
      const drag = Math.min(0.11, speed * 0.06);
      splatVel(ux, uy, 0.02, nx * drag, ny * drag, 1, false);
      pending.push({ ux, uy, r: 0.018 + Math.random() * 0.01, s: 0.30 + Math.random() * 0.1, c: PICK() });
      if (pending.length > 10) pending.shift();
    }
    lastPt = [x, y];
  }
  function up() { stroking = false; }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t; simT += dt;

    // 1. 速度场衰减扩散
    {
      const u = use(progs.advVel, vel.write);
      bindTex(progs.advVel.u.uVel, vel.read.tex, 0);
      gl.uniform2f(u.uTexel, vel.read.texelX, vel.read.texelY);
      gl.uniform1f(u.uDecay, Math.pow(0.015, dt));      // ~1.2s 内衰尽
      blit(); vel.swap();
    }
    // 2. 注入墨与流
    for (const s of pending) {
      splatDye(s.ux, s.uy, s.r, s.s, s.c);
    }
    pending.length = 0;
    // 3. 染料平流 + 渗色
    {
      const u = use(progs.advDye, dye.write);
      bindTex(progs.advDye.u.uDye, dye.read.tex, 0);
      bindTex(progs.advDye.u.uVel, vel.read.tex, 1);
      gl.uniform2f(u.uTexel, dye.read.texelX, dye.read.texelY);
      gl.uniform1f(u.uDt, dt);
      gl.uniform1f(u.uTime, simT);
      gl.uniform1f(u.uKeep, Math.pow(0.55, dt / 60));   // 约一分钟褪到 55%，纸上墨迹近乎常驻
      blit(); dye.swap();
    }
    // 4. 上屏
    {
      const u = use(progs.display, null);
      bindTex(progs.display.u.uDye, dye.read.tex, 0);
      gl.uniform2f(u.uTexel, dye.read.texelX, dye.read.texelY);
      gl.uniform2f(u.uSize, canvas.width, canvas.height);
      blit();
    }
    raf = requestAnimationFrame(frame);
  }

  return {
    ok: true,
    down, move, up,
    resize,
    clear,
    diag() {
      return {
        canvas: [canvas.width, canvas.height],
        css: [canvas.clientWidth, canvas.clientHeight],
        dye: dye ? [dye.w, dye.h] : null,
        running, pendingN: pending.length,
        glErr: gl.getError()
      };
    },
    start() {
      if (running) return;
      if (!dye) resize();
      running = true; lastT = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); }
  };
}
