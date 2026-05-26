// ============================================================
//  KURBAN BAYRAMI - SLOW GROWING CANDY → EXPLOSION → TEXT
//  Layout: Candy 80% screen / Text 20% background
//  Three.js r134 + GSAP 3
// ============================================================

/* ---- helpers ---- */
const $  = id => document.getElementById(id);
const rand    = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b));
const TAU = Math.PI * 2;

// Timing constants (all SLOW)
const GROW_DURATION   = 2.0;   // seconds to grow from tiny to full
const HOLD_DURATION   = 1.0;   // seconds to strain before exploding
const RESET_DELAY     = 3000;  // ms after explosion before restarting

/* ============================================================
   1. STAR FIELD
============================================================ */
function buildStarField() {
  const sf = $('star-field');
  for (let i = 0; i < 160; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = rand(1, 3);
    s.style.cssText = `
      width:${sz}px;height:${sz}px;
      left:${rand(0,100)}%;top:${rand(0,100)}%;
      --dur:${rand(3,8)}s;--delay:${rand(0,7)}s;
      --base-op:${rand(0.25,0.7)};
    `;
    sf.appendChild(s);
  }
}

/* ============================================================
   2. THREE.JS SETUP
============================================================ */
const canvas = $('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020814, 0.02);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 0, 22);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---- Lights ---- */
scene.add(new THREE.AmbientLight(0x223355, 0.6));

const keyLight = new THREE.DirectionalLight(0xFFE8C0, 2.8);
keyLight.position.set(6, 10, 8);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x0088FF, 1.0);
rimLight.position.set(-8, -2, -6);
scene.add(rimLight);

const pinkPt = new THREE.PointLight(0xFF44CC, 4, 40);
pinkPt.position.set(4, 5, 8);
scene.add(pinkPt);

const goldPt = new THREE.PointLight(0xFFAA00, 3, 35);
goldPt.position.set(-4, 3, 6);
scene.add(goldPt);

/* ============================================================
   3. BACKGROUND DUST PARTICLES
============================================================ */
(function makeDust() {
  const geo = new THREE.BufferGeometry();
  const count = 500;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = rand(-40, 40);
    pos[i*3+1] = rand(-25, 25);
    pos[i*3+2] = rand(-30, 0);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xFFD700, size: 0.07,
    transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(pts);
  // slow rotation in render loop
  window._dustPts = pts;
})();

/* ============================================================
   4.  LOLLIPOP BUILDER
   Built once, reused each cycle (just rescaled)
============================================================ */
const CANDY_COLORS = [0xFF2266, 0xFF6600, 0xFFD700, 0x00DDFF, 0xFF44CC, 0x44FF88, 0xFF8800];

const lollipopGroup = new THREE.Group();
scene.add(lollipopGroup);
lollipopGroup.scale.setScalar(0);   // starts invisible

// --- Glass core sphere ---
const coreGeo = new THREE.SphereGeometry(3.2, 64, 64);
const coreMat = new THREE.MeshPhysicalMaterial({
  color: 0xFF1155,
  metalness: 0.0, roughness: 0.04,
  transmission: 0.55, thickness: 3.0,
  clearcoat: 1.0, clearcoatRoughness: 0.05,
  ior: 1.45, transparent: true, opacity: 0.9,
});
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
coreMesh.castShadow = true;
lollipopGroup.add(coreMesh);

// --- Colour swirl rings ---
for (let i = 0; i < 8; i++) {
  const t = i / 8;
  const geo = new THREE.TorusGeometry(2.8 - t * 0.4, 0.20, 16, 100);
  const mat = new THREE.MeshPhysicalMaterial({
    color: CANDY_COLORS[i % CANDY_COLORS.length],
    metalness: 0.25, roughness: 0.08,
    clearcoat: 1.0, clearcoatRoughness: 0.05
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI / 2 + t * Math.PI * 0.6;
  m.rotation.y = t * Math.PI * 1.2;
  lollipopGroup.add(m);
}

// --- Outer glassy shell ---
const outerMesh = new THREE.Mesh(
  new THREE.SphereGeometry(3.45, 48, 48),
  new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF, metalness: 0, roughness: 0,
    transmission: 0.9, thickness: 0.4,
    clearcoat: 1.0, clearcoatRoughness: 0.0,
    ior: 1.5, transparent: true, opacity: 0.3,
    side: THREE.FrontSide, depthWrite: false
  })
);
lollipopGroup.add(outerMesh);

// --- Stick ---
const stickMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.20, 0.28, 8, 24),
  new THREE.MeshPhysicalMaterial({ color: 0xFFF0C0, metalness: 0.1, roughness: 0.3, clearcoat: 0.9 })
);
stickMesh.position.y = -5.5;
lollipopGroup.add(stickMesh);

// Spiral on stick
for (let i = 0; i < 20; i++) {
  const ang = (i / 20) * TAU * 3.5;
  const sGeo = new THREE.TorusGeometry(0.24, 0.065, 8, 22, 0.7);
  const sMat = new THREE.MeshPhysicalMaterial({ color: CANDY_COLORS[i % CANDY_COLORS.length], clearcoat: 1 });
  const sM = new THREE.Mesh(sGeo, sMat);
  sM.position.y = -2.8 - i * 0.4;
  sM.rotation.z = ang;
  stickMesh.add(sM);
}

// --- Glow sprite ---
const glowCv = document.createElement('canvas');
glowCv.width = glowCv.height = 256;
const gctx = glowCv.getContext('2d');
const gg = gctx.createRadialGradient(128,128,0,128,128,128);
gg.addColorStop(0,   'rgba(255,80,180,0.95)');
gg.addColorStop(0.4, 'rgba(255,40,120,0.45)');
gg.addColorStop(1,   'rgba(255,0,100,0)');
gctx.fillStyle = gg; gctx.fillRect(0,0,256,256);
const glowSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCv), blending: THREE.AdditiveBlending, depthWrite: false })
);
glowSprite.scale.set(16, 16, 1);
lollipopGroup.add(glowSprite);

/* ============================================================
   5. EXPLOSION FRAGMENTS
============================================================ */
let fragments = [];
const fragGroup = new THREE.Group();
scene.add(fragGroup);

function buildFragments() {
  fragGroup.clear(); fragments = [];
  const fColors = [...CANDY_COLORS, 0xFFFFFF, 0xAA66FF];
  const shapes  = ['sphere','box','tetra','ico'];

  for (let i = 0; i < 70; i++) {
    const st = shapes[randInt(0, shapes.length)];
    const s  = rand(0.12, 0.6);
    let geo;
    if (st==='sphere') geo = new THREE.SphereGeometry(s, 10, 10);
    else if (st==='box') geo = new THREE.BoxGeometry(s,s,s);
    else if (st==='tetra') geo = new THREE.TetrahedronGeometry(s*1.3);
    else geo = new THREE.IcosahedronGeometry(s, 0);

    const mat = new THREE.MeshPhysicalMaterial({
      color: fColors[randInt(0, fColors.length)],
      metalness: 0.3, roughness: 0.1, clearcoat: 1.0,
      emissive: fColors[randInt(0, fColors.length)], emissiveIntensity: 0.6,
      transparent: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(0);
    fragGroup.add(mesh);

    const spd = rand(6, 20);
    const th = rand(0, TAU), ph = rand(0, Math.PI);
    fragments.push({
      mesh, mat,
      vx: spd * Math.sin(ph) * Math.cos(th),
      vy: spd * Math.sin(ph) * Math.sin(th),
      vz: spd * Math.cos(ph),
      rx: rand(-5,5), ry: rand(-5,5), rz: rand(-5,5),
      life: 0, maxLife: rand(1.8, 3.8), active: false
    });
  }
}
buildFragments();

/* ---- ring waves ---- */
let rings = [];
function spawnRings() {
  const rColors = [0xFF2266, 0x00DDFF, 0xFFD700, 0xFF44CC, 0x44FF88, 0xFF8800];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: rColors[i % rColors.length],
      transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.07, 16, 100), mat);
    mesh.rotation.x = rand(0, Math.PI);
    mesh.rotation.y = rand(0, Math.PI);
    scene.add(mesh);
    rings.push({ mesh, mat, t: 0, delay: i * 0.1, maxT: 2.5 });
  }
}

/* ---- sparkle trails ---- */
let sparkles = [];
function spawnSparkles() {
  const sColors = [0xFFD700, 0xFF66CC, 0x00FFEE, 0xFFFFFF, 0xFF6600];
  for (let i = 0; i < 90; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: sColors[randInt(0, sColors.length)],
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(rand(0.06,0.22), 6, 6), mat);
    mesh.scale.setScalar(0);
    scene.add(mesh);
    const spd = rand(10, 26);
    const th = rand(0, TAU), ph = rand(0, Math.PI);
    sparkles.push({
      mesh, mat,
      vx: spd * Math.sin(ph) * Math.cos(th),
      vy: spd * Math.sin(ph) * Math.sin(th),
      vz: spd * Math.cos(ph),
      life: 0, maxLife: rand(0.8, 2.2),
      delay: rand(0, 0.35), active: false
    });
  }
}

/* ============================================================
   6. CSS BURST
============================================================ */
function cssBurst(cx, cy) {
  const emojis = ['🍬','🍭','✨','⭐','🎊','🎉','💫','🌟','🍫','🎈','🌙','☪️','🎆','🎇'];
  const colors  = ['#FF2266','#FF6600','#FFD700','#00DDFF','#FF44CC','#44FF88','#FF8800','#AA44FF'];

  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'candy-burst-particle';
    const size  = rand(8, 30);
    const angle = rand(0, TAU);
    const dist  = rand(80, 480);
    const dur   = rand(0.8, 2.2);
    const delay = rand(0, 0.5);
    el.style.cssText = `
      left:${cx}px;top:${cy}px;
      width:${size}px;height:${size}px;
      background:${colors[randInt(0,colors.length)]};
      box-shadow:0 0 ${size}px ${colors[randInt(0,colors.length)]};
      --tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;
      --dur:${dur}s;--delay:${delay}s;
      --rot:${rand(180,720)}deg;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur+delay)*1000+300);
  }

  for (let i = 0; i < 35; i++) {
    const el = document.createElement('div');
    el.className = 'candy-star';
    el.textContent = emojis[randInt(0, emojis.length)];
    const angle = rand(0, TAU);
    const dist  = rand(60, 400);
    const dur   = rand(1.0, 2.5);
    const delay = rand(0, 0.6);
    el.style.cssText = `
      left:${cx}px;top:${cy}px;
      --tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;
      --dur:${dur}s;--delay:${delay}s;
      --rot:${rand(-540,540)}deg;
      --size:${rand(22,55)}px;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur+delay)*1000+300);
  }

  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div');
    el.className = 'glow-ring';
    el.style.cssText = `
      left:${cx}px;top:${cy}px;
      width:60px;height:60px;
      --color:${colors[randInt(0,colors.length)]};
      --dur:1.5s;--delay:${i*0.18}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

/* ============================================================
   7. FLOATING EMOJIS
============================================================ */
function startFloatingEmojis() {
  const container = $('float-emojis');
  const items = ['☪','🌙','✨','🎊','🍬','🍭','💫','⭐','🌟','🎉','🤲','🕌'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'float-emoji';
    el.textContent = items[i % items.length];
    const dur   = rand(9, 18);
    const delay = rand(0, 14);
    const left  = rand(2, 95);
    const drift = rand(-70, 70);
    el.style.cssText = `left:${left}%;--dur:${dur}s;--delay:${delay}s;--drift:${drift}px;`;
    container.appendChild(el);
  }
}

/* ============================================================
   8. CANDY GROWTH CYCLE
============================================================ */
let cycleRunning = false;
let elapsedTotal = 0;
let growProgress  = 0;   // 0 → 1 over GROW_DURATION seconds
let holdProgress  = 0;   // 0 → 1 over HOLD_DURATION
let phase = 'idle';      // idle | growing | holding | exploding | resetting
let exploded = false;

function startCycle() {
  cycleRunning = true;
  phase = 'growing';
  exploded = false;
  growProgress = 0;
  holdProgress = 0;
  lollipopGroup.position.set(0, -1, 0);
  lollipopGroup.scale.setScalar(0);
  lollipopGroup.rotation.set(0, 0, 0);

  // Reset fragments & sparkles
  fragments.forEach(f => {
    f.life = 0; f.active = false;
    f.mesh.position.set(0, 0, 0);
    f.mesh.scale.setScalar(0);
  });
  sparkles.forEach(s => {
    s.life = 0; s.active = false;
    s.mesh.position.set(0, 0, 0);
    s.mesh.scale.setScalar(0);
  });
  rings.forEach(r => { scene.remove(r.mesh); });
  rings = [];

  // Hide explosion text
  const eTxt = $('explosion-text');
  eTxt.classList.remove('show', 'fade-out');
  eTxt.style.opacity = '0';
}

function triggerExplosion() {
  if (exploded) return;
  exploded = true;
  phase = 'exploding';

  // CSS burst at screen center
  cssBurst(window.innerWidth/2, window.innerHeight/2);

  // 3D burst
  spawnRings();
  spawnSparkles();
  fragments.forEach(f => { f.active = true; f.mesh.scale.setScalar(1); });
  sparkles.forEach(s => { s.active = true; });

  // Candy vanish
  gsap.to(lollipopGroup.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.2, ease: 'power4.out',
    onComplete: () => {
      gsap.to(lollipopGroup.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power4.in' });
    }
  });

  // Light flash
  gsap.to(pinkPt, { intensity: 25, duration: 0.1, yoyo: true, repeat: 6 });
  gsap.to(goldPt, { intensity: 20, duration: 0.12, yoyo: true, repeat: 6 });

  // Camera shake
  const tl = gsap.timeline();
  for (let i = 0; i < 12; i++) {
    tl.to(camera.position, { x: rand(-0.7,0.7), y: rand(-0.4,0.4), duration: 0.07, ease: 'none' });
  }
  tl.to(camera.position, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });

  // Show explosion text after short delay
  setTimeout(() => {
    const eTxt = $('explosion-text');
    eTxt.classList.add('show');
  }, 500);

  // Reset after RESET_DELAY
  setTimeout(() => {
    const eTxt = $('explosion-text');
    eTxt.classList.add('fade-out');
    setTimeout(() => startCycle(), 1200);
  }, RESET_DELAY);
}

/* ============================================================
   9. RENDER LOOP
============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsedTotal += dt;

  // Dust rotation (very slow)
  if (window._dustPts) {
    window._dustPts.rotation.y += dt * 0.015;
    window._dustPts.rotation.x += dt * 0.004;
  }

  // Pulsing lights
  pinkPt.intensity = 4 + Math.sin(elapsedTotal * 1.2) * 2;
  goldPt.intensity = 3 + Math.cos(elapsedTotal * 0.9) * 1.5;

  // ---- GROWTH PHASE ----
  if (phase === 'growing') {
    growProgress += dt / GROW_DURATION;
    if (growProgress >= 1) { growProgress = 1; phase = 'holding'; }

    // easeInOutCubic for organic feel
    const t = growProgress < 0.5
      ? 4 * growProgress * growProgress * growProgress
      : 1 - Math.pow(-2 * growProgress + 2, 3) / 2;

    const maxScale = 1.0;
    lollipopGroup.scale.setScalar(t * maxScale);

    // Slow gentle spin as it grows
    lollipopGroup.rotation.y += dt * (0.15 + t * 0.4);
    lollipopGroup.rotation.x = Math.sin(elapsedTotal * 0.25) * 0.08 * t;

    // Slight wobble as it gets bigger
    const wobble = Math.sin(elapsedTotal * 1.5) * 0.03 * t;
    lollipopGroup.rotation.z = wobble;

    // Float up slowly as it grows
    lollipopGroup.position.y = -2 + t * 2.0;
  }

  // ---- HOLDING PHASE (strain + intense shake, building to explosion) ----
  if (phase === 'holding') {
    holdProgress += dt / HOLD_DURATION;

    // Scale from 1.0 up to 1.25 as it strains
    const strain = 1.0 + holdProgress * 0.25;
    // Rapid trembling shake increases over time
    const shakeAmt = holdProgress * 0.12;
    const shake = Math.sin(elapsedTotal * 28) * shakeAmt;
    lollipopGroup.scale.setScalar(strain + Math.abs(shake) * 0.05);
    lollipopGroup.position.x = shake;
    lollipopGroup.position.z = Math.cos(elapsedTotal * 22) * shakeAmt * 0.5;

    // Speed up rotation as it strains
    lollipopGroup.rotation.y += dt * (0.5 + holdProgress * 3);

    if (holdProgress >= 1) triggerExplosion();
  }

  // ---- FRAGMENT PHYSICS ----
  fragments.forEach(f => {
    if (!f.active) return;
    f.life += dt;
    if (f.life > f.maxLife) { f.active = false; f.mesh.scale.setScalar(0); return; }
    const t = f.life / f.maxLife;
    f.mesh.position.x += f.vx * dt * (1 - t * 0.4);
    f.mesh.position.y += (f.vy - 9.8 * f.life) * dt;
    f.mesh.position.z += f.vz * dt * (1 - t * 0.4);
    f.mesh.rotation.x += f.rx * dt;
    f.mesh.rotation.y += f.ry * dt;
    f.mesh.rotation.z += f.rz * dt;
    const sc = Math.max(0, 1 - t);
    f.mesh.scale.setScalar(sc);
    f.mat.opacity = sc;
  });

  // ---- SPARKLE PHYSICS ----
  sparkles.forEach(s => {
    if (!s.active) return;
    s.life += dt;
    if (s.life < s.delay) return;
    const lt = (s.life - s.delay) / s.maxLife;
    if (lt >= 1) { s.mesh.scale.setScalar(0); return; }
    s.mesh.position.x += s.vx * dt * (1 - lt * 0.5);
    s.mesh.position.y += (s.vy - 5 * (s.life - s.delay)) * dt;
    s.mesh.position.z += s.vz * dt * (1 - lt * 0.5);
    const sc = Math.max(0, 1 - lt);
    s.mesh.scale.setScalar(sc);
    s.mat.opacity = sc;
  });

  // ---- RING WAVES ----
  rings.forEach(r => {
    r.t += dt;
    const lt = Math.max(0, r.t - r.delay) / r.maxT;
    if (lt >= 1) return;
    r.mesh.scale.setScalar(lt * 22);
    r.mat.opacity = Math.max(0, 1 - lt);
  });

  renderer.render(scene, camera);
}

/* ============================================================
   10. BOOT
============================================================ */
window.addEventListener('load', () => {
  buildStarField();
  startFloatingEmojis();
  animate();

  // Show background title immediately (subtle)
  setTimeout(() => { $('bg-title').classList.add('visible'); }, 800);

  // Hide loader, start cycle
  setTimeout(() => {
    $('loader').classList.add('hidden');
    setTimeout(() => startCycle(), 500);
  }, 1600);
});
