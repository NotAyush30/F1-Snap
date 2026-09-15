/* Isolated progressive enhancement. No API, Router or AppState writes. */
const stage = document.getElementById("cinematic-stage");
const canvas = document.getElementById("cinematic-canvas");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const desktop = matchMedia("(min-width: 1101px)");
let controller = null,
  starting = false,
  failed = false;
const eligible = () =>
  desktop.matches &&
  !reduced.matches &&
  !navigator.connection?.saveData &&
  !(navigator.deviceMemory && navigator.deviceMemory < 4);
const onHome = () =>
  document.getElementById("page-home")?.classList.contains("active");
const facade = {
  resume() {
    if (controller) controller.resume();
    else boot();
  },
  pause() {
    controller?.pause();
  },
};
window.Cinematic3D = facade;
async function boot() {
  if (starting || failed || controller || !eligible() || !onHome()) return;
  starting = true;
  try {
    const probe = document.createElement("canvas");
    const context =
      probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
      probe.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    if (!context) {
      failed = true;
      return;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();
    const dependency = "three";
    const THREE = await import(/* @vite-ignore */ dependency);
    if (!eligible() || !onHome()) return;
    controller = createScene(THREE);
    controller.resume();
  } catch (_) {
    failed = true;
    document.body.classList.remove("cinematic-enabled");
    stage.style.display = "none";
  } finally {
    starting = false;
  }
}
function createScene(T) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const low = (navigator.hardwareConcurrency || 4) <= 4;
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 80);
  const car = new T.Group();
  scene.add(car);
  const paint = new T.MeshPhysicalMaterial({
    color: 0xa7191c,
    metalness: 0.35,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  });
  const carbon = new T.MeshStandardMaterial({
    color: 0x16191b,
    metalness: 0.25,
    roughness: 0.55,
  });
  const rubber = new T.MeshStandardMaterial({
    color: 0x181a1c,
    metalness: 0,
    roughness: 0.94,
  });
  const alloy = new T.MeshStandardMaterial({
    color: 0x777d82,
    metalness: 0.85,
    roughness: 0.32,
  });
  const dark = new T.MeshStandardMaterial({ color: 0x060708, roughness: 0.8 });
  const label = new T.MeshStandardMaterial({ color: 0xd6d7d0, roughness: 0.6 });
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    car.add(m);
    return m;
  }
  function box(w, h, d, mat, x, y, z) {
    return mesh(new T.BoxGeometry(w, h, d), mat, x, y, z);
  }
  function rod(a, b, r, mat) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      delta = end.clone().sub(start);
    const m = mesh(new T.CylinderGeometry(r, r, delta.length(), 8), mat);
    m.position.copy(start.add(end).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return m;
  }
  // Cross-section lofts give the existing procedural car continuous bodywork.
  function loft(sections, mat, xOffset = 0) {
    const positions = [],
      indices = [],
      n = 12;
    sections.forEach(([z, w, base, h]) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        positions.push(xOffset + Math.cos(a) * w, base + Math.sin(a) * h, z);
      }
    });
    for (let j = 0; j < sections.length - 1; j++)
      for (let i = 0; i < n; i++) {
        const a = j * n + i,
          b = j * n + ((i + 1) % n),
          c = a + n,
          d = b + n;
        indices.push(a, c, b, b, c, d);
      }
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i, i + 1);
      const b = (sections.length - 1) * n;
      indices.push(b, b + i + 1, b + i);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return mesh(g, mat);
  }
  // Nose points toward +Z. The car remains fixed for every camera chapter.
  loft(
    [
      [3.05, 0.1, 0.42, 0.09],
      [2.7, 0.15, 0.46, 0.1],
      [1.55, 0.25, 0.57, 0.18],
      [0.7, 0.39, 0.59, 0.27],
      [0, 0.4, 0.59, 0.29],
      [-0.8, 0.3, 0.57, 0.28],
      [-1.7, 0.14, 0.5, 0.16],
      [-2.25, 0.08, 0.38, 0.09],
    ],
    paint,
  );
  box(1.72, 0.06, 3.5, carbon, 0, 0.21, -0.28);
  for (const side of [-1, 1]) {
    loft(
      [
        [0.65, 0.19, 0.44, 0.13],
        [0.2, 0.35, 0.48, 0.22],
        [-0.65, 0.31, 0.42, 0.18],
        [-1.55, 0.13, 0.32, 0.09],
      ],
      paint,
      side * 0.55,
    );
    box(0.28, 0.12, 0.04, dark, side * 0.58, 0.48, 0.68);
    box(0.045, 0.11, 2.55, carbon, side * 0.89, 0.25, -0.35);
  }
  // Open cockpit, airbox, seat, halo and steering wheel.
  const cockpit = mesh(new T.SphereGeometry(1, 28, 14), dark, 0, 0.77, 0.25);
  cockpit.scale.set(0.3, 0.09, 0.48);
  const seat = mesh(new T.SphereGeometry(1, 20, 12), carbon, 0, 0.76, -0.02);
  seat.scale.set(0.18, 0.12, 0.18);
  loft(
    [
      [-0.1, 0.14, 0.94, 0.12],
      [-0.4, 0.2, 0.88, 0.29],
      [-0.8, 0.17, 0.7, 0.24],
      [-1.7, 0.07, 0.51, 0.08],
    ],
    paint,
  );
  mesh(new T.CircleGeometry(0.095, 20), dark, 0, 1.04, -0.05);
  const haloCurve = new T.CatmullRomCurve3([
    new T.Vector3(-0.33, 0.83, -0.12),
    new T.Vector3(-0.34, 1.02, 0.24),
    new T.Vector3(0, 1.02, 0.8),
    new T.Vector3(0.34, 1.02, 0.24),
    new T.Vector3(0.33, 0.83, -0.12),
  ]);
  mesh(new T.TubeGeometry(haloCurve, 36, 0.035, 8, false), carbon);
  rod([0, 0.7, 0.84], [0, 1.02, 0.8], 0.025, carbon);
  const steer = mesh(
    new T.TorusGeometry(0.115, 0.02, 8, 20),
    carbon,
    0,
    0.82,
    0.49,
  );
  steer.rotation.x = -0.5;
  // Layered aerofoils and endplates.
  for (let i = 0; i < 4; i++) {
    const wing = box(
      2.05 - i * 0.045,
      0.028,
      0.16,
      carbon,
      0,
      0.24 + i * 0.055,
      2.84 - i * 0.16,
    );
    wing.rotation.x = -0.12;
  }
  for (const side of [-1, 1]) {
    box(0.04, 0.29, 0.74, paint, side * 1.04, 0.34, 2.66);
    box(0.05, 0.42, 0.72, paint, side * 0.82, 1.05, -2.12);
    rod([side * 0.27, 0.4, -1.95], [side * 0.27, 1.1, -2.12], 0.035, carbon);
  }
  for (let i = 0; i < 3; i++) {
    const w = box(
      1.66,
      0.045,
      0.2,
      carbon,
      0,
      1.18 + i * 0.065,
      -2.03 - i * 0.15,
    );
    w.rotation.x = 0.2;
  }
  box(1.48, 0.04, 0.62, carbon, 0, 0.24, -2.03);
  for (let x = -0.6; x <= 0.61; x += 0.2) {
    const fin = box(0.025, 0.18, 0.7, carbon, x, 0.24, -2.08);
    fin.rotation.x = -0.18;
  }
  // Slick tires with sidewalls, wheel covers, hubs and double wishbones.
  for (const z of [1.9, -1.57])
    for (const side of [-1, 1]) {
      const x = side * 1.02,
        w = z < 0 ? 0.42 : 0.35;
      const tire = mesh(
        new T.CylinderGeometry(0.43, 0.43, w, 48, 1),
        rubber,
        x,
        0.44,
        z,
      );
      tire.rotation.z = Math.PI / 2;
      for (const face of [-1, 1]) {
        const ring = mesh(
          new T.TorusGeometry(0.345, 0.065, 10, 48),
          rubber,
          x + (face * w) / 2,
          0.44,
          z,
        );
        ring.rotation.y = Math.PI / 2;
        const cover = mesh(
          new T.CylinderGeometry(0.245, 0.245, 0.012, 32),
          carbon,
          x + face * (w / 2 + 0.01),
          0.44,
          z,
        );
        cover.rotation.z = Math.PI / 2;
        const rim = mesh(
          new T.TorusGeometry(0.238, 0.011, 8, 32),
          alloy,
          x + face * (w / 2 + 0.02),
          0.44,
          z,
        );
        rim.rotation.y = Math.PI / 2;
        const hub = mesh(
          new T.CylinderGeometry(0.046, 0.046, 0.025, 12),
          alloy,
          x + face * (w / 2 + 0.03),
          0.44,
          z,
        );
        hub.rotation.z = Math.PI / 2;
      }
      for (const h of [0.36, 0.57])
        for (const offset of [-0.35, 0.35])
          rod(
            [side * 0.27, h, z + offset],
            [side * 0.88, 0.44, z],
            0.018,
            carbon,
          );
      rod([side * 0.25, 0.65, z - 0.18], [side * 0.9, 0.37, z], 0.025, alloy);
    }
  for (const side of [-1, 1]) {
    rod([side * 0.28, 0.74, 0.61], [side * 0.51, 0.82, 0.64], 0.015, carbon);
    box(0.13, 0.07, 0.2, paint, side * 0.54, 0.83, 0.64);
  }
  box(0.12, 0.017, 0.6, label, 0, 0.57, 2.14);
  // Neutral studio lighting without bloom or post-processing dependencies.
  scene.add(new T.HemisphereLight(0xe6ecf1, 0x343538, 2));
  for (const [x, y, z, power] of [
    [-3, 6, 4, 5],
    [4, 3, -4, 4],
    [2, 5, 2, 2],
  ]) {
    const light = new T.DirectionalLight(0xffffff, power);
    light.position.set(x, y, z);
    scene.add(light);
  }
  // Soft contact shadow texture, generated locally; no asset request can block it.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext("2d");
  if (ctx) {
    ctx.scale(1, 2);
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, "rgba(0,0,0,.65)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(
      new T.PlaneGeometry(3.3, 6.8),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.005, 0.35);
    scene.add(shadow);
  }
  const cameraPath = new T.CatmullRomCurve3([
    new T.Vector3(5.8, 3.2, 8.6),
    new T.Vector3(7.2, 3.6, 4),
    new T.Vector3(8.2, 2.8, 0.2),
    new T.Vector3(6.6, 2.8, -6.2),
    new T.Vector3(1.8, 2.2, -9),
  ]);
  const targetPath = new T.CatmullRomCurve3([
    new T.Vector3(0, 0.45, 0.6),
    new T.Vector3(0, 0.65, 0.35),
    new T.Vector3(0, 0.5, 0),
    new T.Vector3(0, 0.45, -0.4),
    new T.Vector3(0, 0.4, -0.7),
  ]);
  const position = new T.Vector3(),
    target = new T.Vector3();
  let inView = true;
  let active = false,
    frame = 0,
    current = 0,
    desired = 0,
    lastTime = 0,
    slow = 0,
    samples = 0,
    scaled = false;
  const chapter = document.getElementById("camera-chapter"),
    progress = document.getElementById("camera-progress");
  function measure() {
    if (!active) return;
    const root = document.querySelector(".archive-seasons");
    if (!root) return;
    const rect = root.getBoundingClientRect();
    inView = rect.top < innerHeight && rect.top + rect.height > 80;
    stage.classList.toggle("archive-visible", inView);
    if (!inView) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      return;
    }
    const start = rect.top + scrollY - innerHeight * 0.3;
    const distance = Math.max(1, rect.height - innerHeight * 0.6);
    desired = Math.max(0, Math.min(1, (scrollY - start) / distance));
    request();
  }
  function resize() {
    if (!active) return;
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    // A full-archive canvas has a fixed pixel budget, unlike the former side panel.
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        scaled ? 0.8 : low ? 1 : 1.25,
        Math.sqrt(1500000 / (r.width * r.height)),
      ),
    );
    renderer.setSize(r.width, r.height, false);
    measure();
  }
  function request() {
    if (active && inView && !frame && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (!active || !inView || document.hidden) return;
    const dt = lastTime ? Math.min(now - lastTime, 64) : 16;
    lastTime = now;
    current += (desired - current) * (1 - Math.exp(-dt / 180));
    if (Math.abs(desired - current) < 0.0002) current = desired;
    cameraPath.getPoint(current, position);
    targetPath.getPoint(current, target);
    // Keep full car in frame for tall and short display proportions.
    position
      .sub(target)
      .multiplyScalar(Math.max(1, 0.82 / camera.aspect))
      .add(target);
    camera.position.copy(position);
    camera.lookAt(target);
    const before = performance.now();
    try {
      renderer.render(scene, camera);
    } catch (_) {
      fail();
      return;
    }
    const cost = performance.now() - before;
    if (cost > 32) slow++;
    samples++;
    if (samples >= 45) {
      if (slow > 30) {
        if (scaled) {
          fail();
          return;
        }
        renderer.setPixelRatio(0.8);
        scaled = true;
        resize();
      }
      samples = 0;
      slow = 0;
    }
    canvas.classList.add("ready");
    progress.style.transform = `scaleX(${current})`;
    const labels = [
      "01 / FRONT",
      "02 / COCKPIT",
      "03 / SIDE",
      "04 / REAR THREE-QUARTER",
      "05 / REAR",
    ];
    chapter.textContent = labels[Math.min(4, Math.round(current * 4))];
    if (current !== desired) request();
    else lastTime = 0;
  }
  function pause() {
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function resume() {
    if (!eligible() || !onHome() || failed) {
      pause();
      return;
    }
    document.body.classList.add("cinematic-enabled");
    stage.style.removeProperty("display");
    active = true;
    resize();
  }
  function fail() {
    failed = true;
    pause();
    document.body.classList.remove("cinematic-enabled");
    stage.style.display = "none";
    renderer.dispose();
  }
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail();
  });
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  new ResizeObserver(resize).observe(stage);
  new MutationObserver(measure).observe(document.getElementById("page-home"), {
    childList: true,
    subtree: true,
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    } else request();
  });
  return { resume, pause };
}
function preferenceChanged() {
  if (!eligible()) {
    controller?.pause();
    document.body.classList.remove("cinematic-enabled");
  } else facade.resume();
}
reduced.addEventListener("change", preferenceChanged);
desktop.addEventListener("change", preferenceChanged);
new MutationObserver(() => {
  if (onHome()) facade.resume();
  else facade.pause();
}).observe(document.getElementById("page-home"), {
  attributes: true,
  attributeFilter: ["class"],
});
if ("requestIdleCallback" in window)
  requestIdleCallback(() => boot(), { timeout: 1500 });
else setTimeout(boot, 200);
