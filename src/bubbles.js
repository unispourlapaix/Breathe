/* ============================================
   MOD-BUBBLES-001 : Bulles polygonales
   Gère le spawn, la chute, la détection tap/swipe, le pop
   Expose : Bubbles.init, .update, .draw, .spawnTick,
            .handleTap, .handleSwipe, .resize
   ============================================ */

const Bubbles = (() => {

  let list = [];
  let W = 0, H = 0;
  let spawnTimer = 0;
  let spawnInterval = 950; // ms entre apparitions, ajusté dynamiquement
  let idCounter = 0;
  let onPopCallback = null;

  const PALETTE_NORMAL = ["#bcd9c8", "#cfe3d4", "#d8e8e0", "#b8d4cf", "#cde0d6"];
  const PALETTE_BONUS = ["#f3d27a", "#f0c869", "#f7d98f"];

  function init(width, height, popCallback) {
    W = width; H = height;
    list = [];
    spawnTimer = 0;
    onPopCallback = popCallback;
  }

  function resize(width, height) {
    W = width; H = height;
  }

  function randomPolygon(sides, radius) {
    const pts = [];
    const irregularity = 0.12;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const r = radius * (1 - irregularity / 2 + Math.random() * irregularity);
      pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return pts;
  }

  const NO_TARGET_TIMEOUT_MS = 1400; // si aucune bulle touchée pendant ce délai, le projectile s'éteint

  function spawnBubble() {
    const isBonus = Math.random() < 0.09;
    const radius = isBonus ? 22 + Math.random() * 6 : 18 + Math.random() * 14;
    const sides = isBonus ? 8 : 5 + Math.floor(Math.random() * 3);
    const color = isBonus
      ? PALETTE_BONUS[Math.floor(Math.random() * PALETTE_BONUS.length)]
      : PALETTE_NORMAL[Math.floor(Math.random() * PALETTE_NORMAL.length)];

    list.push({
      id: "BUB-" + (idCounter++),
      x: radius + Math.random() * (W - radius * 2),
      y: -radius - 10,
      radius,
      baseRadius: radius,
      vy: isBonus ? 0.32 + Math.random() * 0.15 : 0.4 + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 0.4,
      driftPhase: Math.random() * Math.PI * 2,
      points: randomPolygon(sides, radius),
      color,
      isBonus,
      popped: false,
      popProgress: 0,
      wobble: Math.random() * Math.PI * 2,
      sparkle: Math.random(),
      // ---- état projectile (utilisé uniquement si isBonus devient "launched") ----
      launched: false,
      launchVx: 0,
      launchVy: 0,
      msSinceLastHit: 0,
      canRelaunch: true
    });
  }

  function update(dt, elapsedMs) {
    spawnTimer += dt;
    // Difficulté/rythme léger : un peu plus fréquent avec le temps, reste zen
    const dynamicInterval = Math.max(550, spawnInterval - elapsedMs * 0.02);
    if (spawnTimer > dynamicInterval) {
      spawnTimer = 0;
      spawnBubble();
    }

    for (const b of list) {
      if (b.popped) {
        b.popProgress += dt * 0.006;
        continue;
      }

      if (b.launched) {
        // ---- physique projectile : déplacement + rebonds sur les bords ----
        b.x += b.launchVx * dt * 0.06;
        b.y += b.launchVy * dt * 0.06;

        if (b.x - b.radius < 0) { b.x = b.radius; b.launchVx *= -1; }
        if (b.x + b.radius > W) { b.x = W - b.radius; b.launchVx *= -1; }
        if (b.y - b.radius < 0) { b.y = b.radius; b.launchVy *= -1; }
        // léger frein pour que ça finisse par s'apaiser si pas assez de touches
        b.launchVx *= 0.998;
        b.launchVy *= 0.998;

        b.msSinceLastHit += dt;
        if (b.msSinceLastHit > NO_TARGET_TIMEOUT_MS) {
          b.popped = true;
          b.popProgress = 0.55;
        }

        // sortie par le bas = disparition discrète
        if (b.y - b.radius > H + 20) {
          b.popped = true;
          b.popProgress = 0.6;
        }
        continue;
      }

      b.y += b.vy * dt * 0.06;
      b.driftPhase += 0.02 * dt;
      b.x += Math.sin(b.driftPhase) * b.drift;
      b.wobble += 0.03 * dt;
    }

    // ---- collisions des projectiles bonus contre les bulles normales ----
    for (const launcher of list) {
      if (!launcher.launched || launcher.popped) continue;
      for (const target of list) {
        if (target === launcher || target.popped || target.isBonus || target.launched) continue;
        const dx = target.x - launcher.x, dy = target.y - launcher.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= target.radius + launcher.radius) {
          // éclate la cible, rebondit dans la direction opposée à l'impact
          popBubble(target, true);
          const nx = dx / (dist || 1), ny = dy / (dist || 1);
          launcher.launchVx -= nx * 2.2;
          launcher.launchVy -= ny * 2.2;
          launcher.msSinceLastHit = 0;
        }
      }
    }

    // Nettoyage : bulles hors écran (en bas) ou pop terminé
    list = list.filter(b => {
      if (b.popped && b.popProgress > 1) return false;
      if (!b.popped && !b.launched && b.y > H + b.radius + 20) return false; // disparaît doucement, pas de game over
      return true;
    });
  }

  function pointInBubble(px, py, b) {
    const dx = px - b.x, dy = py - b.y;
    return Math.sqrt(dx * dx + dy * dy) <= b.radius * 1.15;
  }

  // Tap = pop direct pour bulle normale uniquement
  function handleTap(px, py) {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.popped || b.isBonus) continue;
      if (pointInBubble(px, py, b)) {
        popBubble(b);
        return true;
      }
    }
    return false;
  }

  // Swipe = lance la bulle bonus comme un projectile (billard zen)
  // ou la relance (une seule fois) si elle est déjà en mouvement
  function handleSwipe(x1, y1, x2, y2) {
    let actedOnOne = false;
    for (const b of list) {
      if (b.popped || !b.isBonus) continue;

      const canAct = !b.launched || b.canRelaunch;
      if (!canAct) continue;

      const hitRadius = b.launched ? b.radius * 1.8 : b.radius * 1.3;
      if (segmentCircleIntersect(x1, y1, x2, y2, b.x, b.y, hitRadius)) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const speed = Math.min(7, 1.8 + len * 0.09);

        if (b.launched) {
          b.canRelaunch = false; // relance unique consommée
        }
        b.launched = true;
        b.launchVx = (dx / len) * speed;
        b.launchVy = (dy / len) * speed;
        b.msSinceLastHit = 0;
        actedOnOne = true;
      }
    }
    return actedOnOne;
  }

  function segmentCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      return Math.hypot(cx - x1, cy - y1) <= r;
    }
    let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx, py = y1 + t * dy;
    return Math.hypot(cx - px, cy - py) <= r;
  }

  function popBubble(b, isChainHit) {
    b.popped = true;
    b.popProgress = 0;
    if (onPopCallback) onPopCallback(b, !!isChainHit);
  }

  function drawBubble(ctx, b) {
    ctx.save();
    if (b.popped) {
      const scale = 1 + b.popProgress * 0.8;
      const alpha = 1 - b.popProgress;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(b.x, b.y);
      ctx.scale(scale, scale);
    } else {
      ctx.translate(b.x, b.y);
      const wob = Math.sin(b.wobble) * 0.03;
      ctx.scale(1 + wob, 1 - wob);
    }

    // corps polygonal
    ctx.beginPath();
    b.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();

    ctx.fillStyle = b.color;
    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.88;
    ctx.fill();

    ctx.lineWidth = b.isBonus ? 2 : 1.2;
    ctx.strokeStyle = b.isBonus ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)";
    ctx.stroke();

    // reflet
    ctx.beginPath();
    ctx.ellipse(-b.radius * 0.3, -b.radius * 0.35, b.radius * 0.22, b.radius * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();

    if (b.isBonus && !b.popped) {
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 1.25, 0, Math.PI * 2);
      ctx.strokeStyle = b.launched ? "rgba(243,210,122,0.6)" : "rgba(243,210,122,0.35)";
      ctx.lineWidth = b.launched ? 2.5 : 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw(ctx) {
    for (const b of list) drawBubble(ctx, b);
  }

  function reset() {
    list = [];
    spawnTimer = 0;
  }

  return { init, update, draw, handleTap, handleSwipe, resize, reset };
})();
