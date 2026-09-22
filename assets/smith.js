/* THE SMITH - a rigged humanoid (Mixamo skeleton, three.js Xbot) posed by code, rendered as a dark
   figure rim-lit by the forge. Matt (2026-09-22): "a strong man hammering an anvil", style A =
   "painterly/realistic silhouette (dark figure, muscle, rim-lit by the forge)".

   Timing chart (one cycle = 1.6s), from the animation references (anticipation long, strike 3 frames,
   impact hold, slow recover):        0.00-0.10 settle on anvil | 0.10-0.58 wind-up (ease out, hangs at
   the top) | 0.58-0.66 strike (ease in, fast) | 0.66-0.72 impact hold + recoil | 0.72-1.00 recover.
   The whole body works: spine bends back on the wind-up and drives forward on the strike, knees dip on
   impact, the head follows the hammer, the off hand holds the tongs on the billet. */
(function () {
  const host = document.getElementById("smith3d"); if (!host || !window.THREE) return;
  const W = () => host.clientWidth, H = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W(), H()); renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0a0b0e, .085);   // the floor and the anvil's far side sink into the dark
  const camera = new THREE.PerspectiveCamera(28, W() / H(), .1, 50);
  function frame() { const asp = W() / H(); const d = Math.max(4.2, 2.6 / (2 * Math.tan(camera.fov * Math.PI / 360) * asp)); camera.position.set(0.55 + d * .52, 1.15 + d * .11, d * .86); camera.lookAt(0.55, 1.08, 0); }
  frame();

  // light: the forge. one hot point light low at the anvil (rim + underlight), a faint cool sky, nothing else
  const forge = new THREE.PointLight(0xff7a2a, 5.5, 6, 2); forge.position.set(0.95, 1.25, 0.5); forge.castShadow = true; forge.shadow.mapSize.set(1024, 1024); scene.add(forge);
  const ember = new THREE.PointLight(0xffb347, 1.2, 5, 2); ember.position.set(1.0, 1.15, -0.2); scene.add(ember);
  const sky = new THREE.HemisphereLight(0x2a3a55, 0x05060a, .12); scene.add(sky);
  const back = new THREE.SpotLight(0x6fb3ff, 2.4, 20, .55, .7); back.position.set(-2.5, 3.6, -3.2); back.target.position.set(0.3, 1.2, 0); scene.add(back, back.target);
  const kick = new THREE.PointLight(0xff6a1a, 1.4, 6, 2); kick.position.set(1.4, .35, -1.2); scene.add(kick);

  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: .42, metalness: .25 });
  // the Xbot skin comes out mirrored (its bind matrices flip the winding), so the figure's faces are BackSide
  const skin = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: .46, metalness: .28, skinning: true, side: THREE.BackSide });   // skinning: r128 needs it or the bones do nothing
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: .35, metalness: .9 });
  const hot = new THREE.MeshStandardMaterial({ color: 0xff5a12, emissive: 0xff6a1a, emissiveIntensity: 2.2, roughness: .6 });

  // floor (black: no horizon line, the page's dark continues) + anvil
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const anvil = new THREE.Group(); anvil.position.set(1.05, 0, 0);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, .62, 14), dark); stump.position.y = .31; anvil.add(stump);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.9, .22, .32), steel); body.position.y = .84; anvil.add(body);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .26), steel); waist.position.y = .69; anvil.add(waist);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(.11, .5, 12), steel); horn.rotation.z = Math.PI / 2; horn.position.set(-.68, .86, 0); anvil.add(horn);
  const billet = new THREE.Mesh(new THREE.BoxGeometry(.42, .05, .07), hot); billet.position.set(.02, .975, 0); anvil.add(billet);
  anvil.traverse(o => { o.castShadow = true; o.receiveShadow = true; }); scene.add(anvil);
  // a soft pool of forge light on the ground (a sprite, additive) so the anvil does not float in black
  const pc = document.createElement("canvas"); pc.width = pc.height = 256; const px = pc.getContext("2d");
  const pg = px.createRadialGradient(128, 128, 0, 128, 128, 128); pg.addColorStop(0, "rgba(255,120,40,.55)"); pg.addColorStop(.5, "rgba(255,90,20,.18)"); pg.addColorStop(1, "rgba(255,80,20,0)"); px.fillStyle = pg; px.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0.9, .005, .1); scene.add(pool);

  // sparks
  const N = 90; const sp = new Float32Array(N * 3), sv = new Float32Array(N * 3), sl = new Float32Array(N);
  const sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(sp, 3)),
    new THREE.PointsMaterial({ color: 0xffb347, size: .035, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(sparks); for (let i = 0; i < N; i++) sl[i] = 0;
  const flash = new THREE.PointLight(0xfff1c4, 0, 4, 2); flash.position.set(1.05, 1.1, .1); scene.add(flash);
  function burst() { let k = 0; for (let i = 0; i < N && k < 34; i++) if (sl[i] <= 0) { sl[i] = .35 + Math.random() * .45; sp[i * 3] = 1.05; sp[i * 3 + 1] = 1.0; sp[i * 3 + 2] = 0; const a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 2.4; sv[i * 3] = Math.cos(a) * s; sv[i * 3 + 1] = 2.2 + Math.random() * 2.6; sv[i * 3 + 2] = Math.sin(a) * s * .6; k++; } flash.intensity = 6; }

  // the figure
  const B = {}; let hammer, tongs, ready = false; const loader = new THREE.GLTFLoader();
  loader.load("assets/smith.glb", g => {
    m = g.scene; m.traverse(o => { if (o.isSkinnedMesh) { o.material = skin; o.castShadow = true; o.frustumCulled = false; } if (o.isBone) B[o.name.replace(/^mixamorig[:_]?/, "")] = o; });
    if (!B.RightHand) { console.error("smith: bones", Object.keys(B).slice(0, 8)); return; }
    m.position.set(0.25, 0, 0); m.rotation.y = Math.PI / 2;
    // a strong man: chest and shoulders wide, arms and legs thick (bone axis is X for arms, Y for spine/legs)
    ["Spine1", "Spine2"].forEach(n => B[n].scale.set(1.22, 1, 1.2)); ["LeftShoulder", "RightShoulder"].forEach(n => B[n].scale.set(1.08, 1.0, 1.1));
    ["LeftArm", "RightArm"].forEach(n => B[n].scale.set(1, 1.3, 1.3)); ["LeftUpLeg", "RightUpLeg"].forEach(n => B[n].scale.set(1.15, 1, 1.15)); B.Neck.scale.set(1.15, 1, 1.15);   // faces the anvil (+X), camera sees him in 3/4 profile
    // hammer + tongs are placed in WORLD space every frame (hand -> tool direction), not parented to the hand
    hammer = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.024, .03, .78, 10), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: .8 })); handle.position.y = .39; hammer.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.17, .14, .30), steel); head.position.y = .76; hammer.add(head);
    hammer.traverse(o => o.castShadow = true); scene.add(hammer);
    tongs = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .8, 8), steel); tongs.castShadow = true; scene.add(tongs);
    scene.add(m); ready = true; window.__smith = { m, B, renderer, scene, camera };
  });

  // easing
  const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // in-out cubic
  const oQ = t => 1 - Math.pow(1 - t, 3);                                       // out cubic
  const iQ = t => t * t * t;                                                    // in cubic
  const lerp = (a, b, t) => a + (b - a) * t;
  // phase -> 0..1 "raise" amount for the arm, plus the impact pulse
  let lastPhase = 0, t0 = performance.now(); const CYC = 1.6;
  function pose(ph) {
    let raise, drive = 0;          // raise: 0 = hammer on the billet, 1 = top of the wind-up
    if (ph < .10) raise = 0;
    else if (ph < .58) raise = oQ((ph - .10) / .48);
    else if (ph < .66) raise = 1 - iQ((ph - .58) / .08);
    else if (ph < .72) { const k = (ph - .66) / .06; raise = -Math.sin(k * Math.PI) * .06; drive = 1 - k; }
    else raise = 0;
    if (ph >= .58 && ph < .66) drive = (ph - .58) / .08;
    if (!ready) return;
    const R = raise;
    // targets (world). billet top is (1.05, 1.0, 0). hand at the strike so the .76 hammer head lands on it.
    const bil = V(1.05, 1.0, 0);
    const Ts = bil.clone().add(V(-.46, .52, .22));           // hand at impact
    const Tw = V(-.02, 2.12, .3);                            // hand at the top of the wind-up (above and behind the head)
    const Th = Ts.clone().lerp(Tw, R); Th.y += Math.sin(R * Math.PI) * .12;  // arc, not a straight line
    // spine: back on the wind-up, drives forward on the strike, hips dip on impact
    const lean = lerp(.10, -.30, R) + drive * .22;
    B.Spine.rotation.set(lean * .45, 0, 0); B.Spine1.rotation.set(lean * .35, 0, 0); B.Spine2.rotation.set(lean * .25, 0, 0);
    B.Neck.rotation.set(-.12, 0, 0); B.Head.rotation.set(lerp(.02, -.22, R) + drive * .10, -.3, .04);
    fists();
    const dip = drive * 6; B.Hips.position.y = 104 - dip - (1 - R) * 2;
    B.LeftUpLeg.rotation.set(-.22 - dip * .012, .18, .16); B.LeftLeg.rotation.set(.34 + dip * .02, 0, 0);
    B.RightUpLeg.rotation.set(-.18 - dip * .012, -.2, -.14); B.RightLeg.rotation.set(.30 + dip * .02, 0, 0);
    m.updateMatrixWorld(true);
    // two-bone IK, right arm -> hammer hand; left arm -> tongs on the billet
    ik(B.RightArm, B.RightForeArm, B.RightHand, Th, V(0, 1, -.6));
    const Tl = bil.clone().add(V(-.36, .14, .30)); Tl.y += drive * .02;
    ik(B.LeftArm, B.LeftForeArm, B.LeftHand, Tl, V(-.3, 1, .5));
    // tools
    const hand = B.RightHand.getWorldPosition(V());
    const toBillet = bil.clone().sub(hand).normalize(), upBack = V(-.35, .85, .2).normalize();
    const dirH = toBillet.lerp(upBack, R).normalize();
    hammer.position.copy(hand); hammer.quaternion.setFromUnitVectors(V(0, 1, 0), dirH);
    const lh = B.LeftHand.getWorldPosition(V()); const dT = bil.clone().sub(lh); tongs.position.copy(lh.clone().add(dT.clone().multiplyScalar(.5))); tongs.quaternion.setFromUnitVectors(V(0, 1, 0), dT.clone().normalize());
  }
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const FINGERS = ["Index", "Middle", "Ring", "Pinky"];
  function fists() {   // curl the fingers around the tools (finger joints bend about their local Z; the rig is mirrored per side)
    for (const side of ["Right", "Left"]) { const sgn = side === "Right" ? -1 : 1;
      for (const f of FINGERS) for (let k = 1; k <= 3; k++) { const b = B[side + "Hand" + f + k]; if (b) b.rotation.set(0, 0, sgn * (k === 1 ? 1.1 : 1.4)); }
      for (let k = 1; k <= 3; k++) { const b = B[side + "HandThumb" + k]; if (b) b.rotation.set(0, sgn * .3, sgn * (k === 1 ? .5 : .8)); } }
  }
  let m;   // the model root, set on load
  /* two-bone IK. Mixamo arm bones point along their local -X toward the child. Solve in world space with the
     law of cosines, then write world quaternions back as local ones. pole = which way the elbow bends. */
  const _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const _fix = new THREE.Quaternion();
  function aimBone(bone, axis, from, to, up) {
    // world basis with +X along the bone (from -> to), then pre-rotate so the bone's real child axis maps onto +X
    const x = to.clone().sub(from).normalize();
    const z = x.clone().cross(up).normalize(); if (z.lengthSq() < 1e-6) z.set(0, 0, 1); const y = z.clone().cross(x).normalize();
    _m.makeBasis(x, y, z); _q.setFromRotationMatrix(_m); _fix.setFromUnitVectors(axis, V(1, 0, 0)); _q.multiply(_fix);
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(pq.multiply(_q)); bone.updateMatrixWorld(true);
  }
  function ik(upper, fore, hand, target, pole) {
    const S = upper.getWorldPosition(V()); const sc = upper.parent.getWorldScale(V()).x;
    const a1x = fore.position.clone().normalize(), a2x = hand.position.clone().normalize();
    const L1 = fore.position.length() * sc, L2 = hand.position.length() * sc * fore.scale.x;
    const d = Math.min(S.distanceTo(target), (L1 + L2) * .995);
    const dir = target.clone().sub(S).normalize();
    const a1 = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const side = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const dir1 = dir.clone().multiplyScalar(Math.cos(a1)).add(side.clone().multiplyScalar(Math.sin(a1))).normalize();
    const E = S.clone().add(dir1.clone().multiplyScalar(L1));
    aimBone(upper, a1x, S, E, side); aimBone(fore, a2x, E, target, side);
    hand.quaternion.identity(); hand.updateMatrixWorld(true);
  }
  let visible = true; new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(host);
  addEventListener("resize", () => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); frame(); });
  (function loop(now) {
    requestAnimationFrame(loop); if (!visible) return;
    const t = (now - t0) / 1000, ph = (t % CYC) / CYC, dt = 1 / 60;
    if (lastPhase < .66 && ph >= .66) burst(); lastPhase = ph;
    pose(ph);
    // billet: white at the strike, cooling back to orange
    const heat = ph >= .66 && ph < .82 ? 1 - (ph - .66) / .16 : 0; hot.emissive.setHSL(.06 + heat * .05, 1, .5 + heat * .4); hot.emissiveIntensity = 2.2 + heat * 4;
    forge.intensity = 5.0 + Math.sin(t * 9) * .35 + Math.sin(t * 23) * .12 + heat * 2.5;
    flash.intensity *= .78;
    for (let i = 0; i < N; i++) { if (sl[i] > 0) { sl[i] -= dt; sv[i * 3 + 1] -= 9.5 * dt; sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt; if (sp[i * 3 + 1] < 0) sl[i] = 0; } else { sp[i * 3 + 1] = -10; } }
    sparks.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  })(t0);
})();
