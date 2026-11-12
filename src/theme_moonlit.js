/* ============================================
   MOD-THEME-MOONLIT-001 : Ambiance "Soir lunaire étoilé"
   Associée à l'Érable sacré (Momiji)
   Ciel nocturne dégradé, pleine lune avec halo, étoiles scintillantes,
   silhouettes de branches en contre-jour, feuilles tombant éclairées par la lune
   ============================================ */

const ThemeMoonlit = (() => {

  let W = 0, H = 0;
  let stars = [];
  let clouds = []; // nuages fins nocturnes, plus discrets que le thème jour
  let leaves = []; // feuilles d'érable tombant, éclairées par la lune
  let moonPulse = 0;

  function init(width, height) {
    W = width; H = height;
    moonPulse = 0;

    // Étoiles : réparties sur le ciel, quelques-unes plus brillantes (façon constellation)
    stars = [];
    const starCount = 55;
    for (let i = 0; i < starCount; i++) {
      const isBright = Math.random() < 0.15;
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.62, // les étoiles restent dans le tiers/moitié haute du ciel
        size: isBright ? 1.6 + Math.random() * 1.2 : 0.6 + Math.random() * 0.7,
        baseAlpha: isBright ? 0.85 : 0.4 + Math.random() * 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.02,
        isBright
      });
    }

    // Nuages nocturnes fins, très discrets, dérivant lentement devant les étoiles
    clouds = [];
    for (let i = 0; i < 3; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 20 + Math.random() * 100,
        scale: 0.5 + Math.random() * 0.6,
        speed: 0.05 + Math.random() * 0.06,
        opacity: 0.08 + Math.random() * 0.07
      });
    }

    // Feuilles d'érable tombantes, plus rares et plus lentes que les pétales du thème jour
    leaves = [];
    for (let i = 0; i < 9; i++) {
      leaves.push(spawnLeaf(true));
    }
  }

  function spawnLeaf(randomY) {
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : -10,
      size: 4 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      fallSpeed: 0.22 + Math.random() * 0.35,
      driftPhase: Math.random() * Math.PI * 2
    };
  }

  function update(dt) {
    moonPulse += dt * 0.0015;

    for (const s of stars) {
      s.twinklePhase += s.twinkleSpeed * dt;
    }

    for (const c of clouds) {
      c.x += c.speed * dt;
      if (c.x > W + 100) c.x = -100;
    }

    for (const l of leaves) {
      l.y += l.fallSpeed * dt * 0.06;
      l.driftPhase += 0.018 * dt;
      l.x += Math.sin(l.driftPhase) * 0.12 * dt;
      l.rotation += l.rotSpeed * dt;
      if (l.y > H + 10) {
        Object.assign(l, spawnLeaf(false));
      }
    }
  }

  function drawSky(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0d1530");
    grad.addColorStop(0.45, "#1a2347");
    grad.addColorStop(0.8, "#2c2f52");
    grad.addColorStop(1, "#3a3458");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawMoon(ctx) {
    const mx = W * 0.74, my = H * 0.2, r = Math.min(W, H) * 0.085;
    const pulse = 0.92 + Math.sin(moonPulse) * 0.08;

    // halo lumineux doux, plusieurs couches pour un dégradé progressif
    ctx.save();
    const halo = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, r * 4.2 * pulse);
    halo.addColorStop(0, "rgba(255,250,230,0.35)");
    halo.addColorStop(0.4, "rgba(255,250,230,0.12)");
    halo.addColorStop(1, "rgba(255,250,230,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(mx, my, r * 4.2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // corps de la lune
    ctx.save();
    const moonGrad = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r);
    moonGrad.addColorStop(0, "#fffdf2");
    moonGrad.addColorStop(0.7, "#f3ecd2");
    moonGrad.addColorStop(1, "#e0d6b0");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();

    // quelques cratères discrets
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#a89968";
    ctx.beginPath(); ctx.arc(mx - r * 0.3, my - r * 0.15, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.25, my + r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.1, my - r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawStars(ctx) {
    for (const s of stars) {
      const twinkle = 0.6 + Math.sin(s.twinklePhase) * 0.4;
      ctx.save();
      ctx.globalAlpha = s.baseAlpha * twinkle;
      ctx.fillStyle = "#fdf6e3";
      if (s.isBright) {
        // petite croix lumineuse pour les étoiles brillantes (effet scintillant marqué)
        ctx.beginPath();
        ctx.moveTo(s.x - s.size * 2.2, s.y);
        ctx.lineTo(s.x + s.size * 2.2, s.y);
        ctx.moveTo(s.x, s.y - s.size * 2.2);
        ctx.lineTo(s.x, s.y + s.size * 2.2);
        ctx.strokeStyle = "#fdf6e3";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCloud(ctx, c) {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.fillStyle = "#cfd6e8";
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(-20, 3, 20, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 4, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Silhouettes de bambous/branches sombres en contre-jour, en bas de l'écran
  function drawGroundSilhouettes(ctx) {
    ctx.save();
    const baseY = H;
    ctx.fillStyle = "rgba(10, 14, 28, 0.55)";

    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 18;
      const h = 95 + i * 26;
      ctx.fillRect(x, baseY - h, 6, h);
      ctx.fillStyle = "rgba(10, 14, 28, 0.7)";
      for (let n = 1; n < 4; n++) {
        ctx.fillRect(x - 1, baseY - h + n * (h / 4), 8, 2);
      }
      ctx.fillStyle = "rgba(10, 14, 28, 0.55)";
    }

    // silhouette d'érable à droite, branches fines en contre-jour
    ctx.strokeStyle = "rgba(10, 14, 28, 0.6)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W - 42, baseY);
    ctx.quadraticCurveTo(W - 50, baseY - 35, W - 44, baseY - 55);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(W - 44, baseY - 50);
    ctx.lineTo(W - 60, baseY - 70);
    ctx.moveTo(W - 44, baseY - 50);
    ctx.lineTo(W - 30, baseY - 68);
    ctx.moveTo(W - 44, baseY - 55);
    ctx.lineTo(W - 44, baseY - 78);
    ctx.stroke();

    ctx.restore();
  }

  function drawLeaf(ctx, l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rotation);
    // feuille d'érable simplifiée, légèrement bleutée par le clair de lune
    ctx.fillStyle = "rgba(180, 170, 210, 0.55)";
    const size = l.size;
    ctx.beginPath();
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * size, py = Math.sin(a) * size;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a2) * size * 0.4, Math.sin(a2) * size * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw(ctx, width, height) {
    W = width; H = height;
    drawSky(ctx);
    drawMoon(ctx);
    drawStars(ctx);
    for (const c of clouds) drawCloud(ctx, c);
    drawGroundSilhouettes(ctx);
    for (const l of leaves) drawLeaf(ctx, l);
  }

  function resize(width, height) {
    W = width; H = height;
  }

  return { init, update, draw, resize };
})();
