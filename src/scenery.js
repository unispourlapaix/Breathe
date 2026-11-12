/* ============================================
   MOD-SCENERY-001 : Décor manga épuré
   Bambous, bonsaï, cerisiers, papillons, nuages
   Lecture seule du canvas — n'interagit jamais avec la logique de jeu
   ============================================ */

const Scenery = (() => {

  let clouds = [];
  let petals = [];
  let butterflies = [];
  let stars = [];
  let W = 0, H = 0;
  let currentTheme = "day"; // "day" (défaut) ou "moonlit" pour l'instant, d'autres viendront

  function init(width, height, theme) {
    W = width; H = height;
    currentTheme = theme || "day";
    clouds = [];
    petals = [];
    butterflies = [];
    stars = [];

    if (currentTheme === "moonlit") {
      ThemeMoonlit.init(W, H, { stars, clouds });
      return;
    }

    // Nuages (SCN-CLOUD)
    for (let i = 0; i < 4; i++) {
      clouds.push({
        id: "SCN-CLOUD-" + i,
        x: Math.random() * W,
        y: 30 + Math.random() * 120,
        scale: 0.6 + Math.random() * 0.8,
        speed: 0.08 + Math.random() * 0.1,
        opacity: 0.35 + Math.random() * 0.25
      });
    }

    // Pétales de cerisier en chute lente (SCN-PETAL)
    for (let i = 0; i < 14; i++) {
      petals.push(spawnPetal(true));
    }

    // Papillons blancs (SCN-BUTTERFLY)
    for (let i = 0; i < 3; i++) {
      butterflies.push({
        id: "SCN-BFLY-" + i,
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.3,
        baseY: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.3,
        wingPhase: 0,
        dir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  function spawnPetal(randomY) {
    return {
      id: "SCN-PETAL-" + Math.random().toString(36).slice(2, 7),
      x: Math.random() * W,
      y: randomY ? Math.random() * H : -10,
      size: 4 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      fallSpeed: 0.3 + Math.random() * 0.5,
      driftPhase: Math.random() * Math.PI * 2,
      driftAmp: 15 + Math.random() * 20
    };
  }

  function update(dt) {
    if (currentTheme === "moonlit") {
      ThemeMoonlit.update(dt);
      return;
    }

    // Nuages dérivent
    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > W + 80) c.x = -80;
    }

    // Pétales tombent en se balançant
    for (const p of petals) {
      p.y += p.fallSpeed * dt * 0.06;
      p.driftPhase += 0.02 * dt;
      p.x += Math.sin(p.driftPhase) * 0.15 * dt;
      p.rotation += p.rotSpeed * dt;
      if (p.y > H + 10) {
        Object.assign(p, spawnPetal(false));
      }
    }

    // Papillons volent en courbes douces
    for (const b of butterflies) {
      b.phase += 0.01 * dt;
      b.wingPhase += 0.25 * dt;
      b.x += b.dir * b.speed * dt * 0.05;
      b.y += Math.sin(b.phase) * 0.3;
      if (b.x > W + 20) { b.x = -20; }
      if (b.x < -20) { b.x = W + 20; }
    }
  }

  function drawCloud(ctx, c) {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(-22, 4, 22, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(24, 5, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPetal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = "rgba(243, 197, 212, 0.85)";
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size);
    ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size);
    ctx.fill();
    ctx.restore();
  }

  function drawButterfly(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const flap = Math.sin(b.wingPhase) * 0.6 + 0.4;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "rgba(200,200,200,0.5)";
    ctx.lineWidth = 0.5;
    // aile gauche
    ctx.save();
    ctx.scale(flap, 1);
    ctx.beginPath();
    ctx.ellipse(-4, 0, 5, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // aile droite
    ctx.save();
    ctx.scale(flap, 1);
    ctx.beginPath();
    ctx.ellipse(4, 0, 5, 3.5, -0.3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  // Silhouettes bambou / bonsaï en bas de l'écran (statique, dessiné une fois par frame en bas)
  function drawGroundSilhouettes(ctx) {
    ctx.save();
    const baseY = H;
    ctx.fillStyle = "rgba(120, 140, 115, 0.18)";

    // Bambous à gauche
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 18;
      const h = 90 + i * 25;
      ctx.fillRect(x, baseY - h, 6, h);
      // noeuds de bambou
      ctx.fillStyle = "rgba(120,140,115,0.28)";
      for (let n = 1; n < 4; n++) {
        ctx.fillRect(x - 1, baseY - h + n * (h / 4), 8, 2);
      }
      ctx.fillStyle = "rgba(120, 140, 115, 0.18)";
    }

    // Bonsaï à droite (silhouette ronde + tronc courbé)
    ctx.beginPath();
    ctx.moveTo(W - 40, baseY);
    ctx.quadraticCurveTo(W - 55, baseY - 40, W - 45, baseY - 60);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(120,140,115,0.22)";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(W - 45, baseY - 75, 28, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(W - 65, baseY - 65, 18, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(150, 175, 140, 0.25)";
    ctx.fill();

    ctx.restore();
  }

  function draw(ctx) {
    if (currentTheme === "moonlit") {
      ThemeMoonlit.draw(ctx, W, H);
      return;
    }
    for (const c of clouds) drawCloud(ctx, c);
    drawGroundSilhouettes(ctx);
    for (const p of petals) drawPetal(ctx, p);
    for (const b of butterflies) drawButterfly(ctx, b);
  }

  function resize(width, height) {
    W = width; H = height;
    if (currentTheme === "moonlit") ThemeMoonlit.resize(width, height);
  }

  return { init, update, draw, resize };
})();
