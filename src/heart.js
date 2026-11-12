/* ============================================
   MOD-HEART-001 : Cœur de progression
   Remplace le timer — se remplit avec le nombre de bulles éclatées
   Explose en petits papillons quand il est plein (fin de session)
   ============================================ */

const Heart = (() => {

  let fillRatio = 0; // 0 -> 1
  let totalNeeded = 40; // nombre de bulles à éclater pour remplir le cœur
  let popped = 0;
  let exploding = false;
  let travelingToCenter = false;
  let travelProgress = 0;
  let startX = 0, startY = 0;
  let explodeButterflies = [];
  let onFullCallback = null;
  let pulsePhase = 0;

  function init(neededCount, onFull) {
    totalNeeded = neededCount || 40;
    popped = 0;
    fillRatio = 0;
    exploding = false;
    travelingToCenter = false;
    travelProgress = 0;
    explodeButterflies = [];
    onFullCallback = onFull;
    pulsePhase = 0;
  }

  function registerPop() {
    if (exploding || travelingToCenter) return;
    popped++;
    fillRatio = Math.min(1, popped / totalNeeded);
    if (fillRatio >= 1) {
      travelingToCenter = true;
      travelProgress = 0;
    }
  }

  let centerX = 0, centerY = 0; // position centrale calculée par game.js au moment du plein

  function setExplosionCenter(x, y) {
    centerX = x; centerY = y;
  }

  function triggerExplosion() {
    exploding = true;
    explodeButterflies = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.2 + Math.random() * 1.8;
      explodeButterflies.push({
        x: 0, y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        wingPhase: Math.random() * Math.PI * 2,
        life: 1,
        size: 5 + Math.random() * 4
      });
    }
    setTimeout(() => {
      if (onFullCallback) onFullCallback();
    }, 1100);
  }

  function update(dt) {
    pulsePhase += dt * 0.004;

    if (travelingToCenter) {
      travelProgress += dt * 0.0022;
      if (travelProgress >= 1) {
        travelProgress = 1;
        travelingToCenter = false;
        triggerExplosion();
      }
      return;
    }

    if (exploding) {
      for (const b of explodeButterflies) {
        b.x += b.vx * dt * 0.05;
        b.y += b.vy * dt * 0.05 - 0.15; // dérive légèrement vers le haut
        b.vy *= 0.985;
        b.vx *= 0.985;
        b.wingPhase += 0.3 * dt;
        b.life -= dt * 0.0009;
      }
      explodeButterflies = explodeButterflies.filter(b => b.life > 0);
    }
  }

  // Dessine le cœur. cornerX/cornerY = position habituelle (coin) ; centerX/centerY = centre de l'écran (passé via setExplosionCenter)
  function draw(ctx, cornerX, cornerY) {
    let drawX = cornerX, drawY = cornerY;
    let growScale = 1 + fillRatio * 0.65;

    if (travelingToCenter) {
      // easing doux vers le centre, et grossit encore plus en route
      const t = travelProgress;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      drawX = cornerX + (centerX - cornerX) * ease;
      drawY = cornerY + (centerY - cornerY) * ease;
      growScale = 1.65 + ease * 0.9; // continue de grossir jusqu'au centre
    } else if (exploding) {
      drawX = centerX; drawY = centerY;
    }

    const pulse = (exploding || travelingToCenter) ? 0 : Math.sin(pulsePhase * 6) * 0.04 * fillRatio;
    const scale = growScale + pulse;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(scale, scale);

    if (!exploding) {
      drawHeartShape(ctx, 0, 0, 16, "rgba(255,255,255,0.5)", "rgba(220,200,200,0.6)");
      // remplissage style "jauge" via clip
      ctx.save();
      drawHeartPath(ctx, 0, 0, 16);
      ctx.clip();
      const fillH = 34 * fillRatio;
      const grad = ctx.createLinearGradient(0, 18, 0, 18 - fillH);
      grad.addColorStop(0, "#e88aa6");
      grad.addColorStop(1, "#f3b8c9");
      ctx.fillStyle = grad;
      ctx.fillRect(-18, 18 - fillH, 36, fillH);
      ctx.restore();

      drawHeartPath(ctx, 0, 0, 16);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(220,160,180,0.7)";
      ctx.stroke();
    }

    ctx.restore();

    if (exploding) {
      ctx.save();
      ctx.translate(centerX, centerY);
      for (const b of explodeButterflies) {
        drawMiniButterfly(ctx, b);
      }
      ctx.restore();
    }
  }

  function drawHeartPath(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1);
    ctx.bezierCurveTo(x - size, y + size * 0.6, x - size * 0.4, y + size * 0.9, x, y + size * 1.3);
    ctx.bezierCurveTo(x + size * 0.4, y + size * 0.9, x + size, y + size * 0.6, x + size, y + size * 0.1);
    ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
    ctx.closePath();
  }

  function drawHeartShape(ctx, x, y, size, fillColor, strokeColor) {
    drawHeartPath(ctx, x, y, size);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }

  function drawMiniButterfly(ctx, b) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, b.life);
    ctx.translate(b.x, b.y);
    const flap = Math.sin(b.wingPhase) * 0.6 + 0.4;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.save(); ctx.scale(flap, 1);
    ctx.beginPath(); ctx.ellipse(-b.size * 0.5, 0, b.size * 0.6, b.size * 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.scale(flap, 1);
    ctx.beginPath(); ctx.ellipse(b.size * 0.5, 0, b.size * 0.6, b.size * 0.4, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function getProgress() {
    return { popped, totalNeeded, fillRatio };
  }

  function isExploding() { return exploding; }
  function isTraveling() { return travelingToCenter; }

  return { init, registerPop, update, draw, getProgress, isExploding, isTraveling, setExplosionCenter };
})();
