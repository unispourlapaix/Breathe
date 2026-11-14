/* ============================================
   MOD-SCROLL-001 : Parchemin japonais (makimono)
   Dessiné entièrement en canvas pour un vrai rendu artistique
   Indépendant — prend un texte + auteur + score, se dessine sur un canvas dédié
   ============================================ */

const Scroll = (() => {

  let appearProgress = 0; // 0 -> 1, anim d'apparition (déroulé)
  let visible = false;

  function show() {
    visible = true;
    appearProgress = 0;
  }

  function hide() {
    visible = false;
    appearProgress = 0;
  }

  function update(dt) {
    if (visible && appearProgress < 1) {
      appearProgress = Math.min(1, appearProgress + dt * 0.0016);
    }
  }

  function isVisible() { return visible; }
  function getAppearProgress() { return appearProgress; }

  // ---- Motif seigaiha (vagues en écailles concentriques) ----
  function drawSeigaiha(ctx, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const r = 14;
    const rows = Math.ceil(h / (r * 0.75)) + 1;
    const cols = Math.ceil(w / (r * 2)) + 1;
    for (let row = 0; row < rows; row++) {
      const y = row * r * 0.75;
      const offsetX = (row % 2) * r;
      for (let col = -1; col < cols; col++) {
        const x = col * r * 2 + offsetX;
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          ctx.arc(x + r, y + r * 0.6, r - layer * 4, Math.PI, 0, false);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // ---- Texture papier washi : grain léger via points aléatoires (seedés pour stabilité) ----
  let grainPoints = null;
  function buildGrain(w, h) {
    grainPoints = [];
    const seedRandom = mulberry32(42);
    const count = Math.floor((w * h) / 280);
    for (let i = 0; i < count; i++) {
      grainPoints.push({
        x: seedRandom() * w,
        y: seedRandom() * h,
        r: 0.4 + seedRandom() * 0.8,
        a: 0.04 + seedRandom() * 0.08
      });
    }
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function drawGrain(ctx, w, h) {
    if (!grainPoints || grainPoints._w !== w) {
      buildGrain(w, h);
      grainPoints._w = w;
    }
    ctx.save();
    for (const p of grainPoints) {
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "#5a4a30";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- Baguette de bois (rouleau) ----
  function drawRod(ctx, x, y, width) {
    ctx.save();
    ctx.translate(x, y);
    const rGrad = ctx.createLinearGradient(0, -7, 0, 7);
    rGrad.addColorStop(0, "#6b4a2e");
    rGrad.addColorStop(0.5, "#8a6440");
    rGrad.addColorStop(1, "#5a3d24");
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-width / 2, -7, width, 14, 7);
    } else {
      ctx.rect(-width / 2, -7, width, 14);
    }
    ctx.fill();
    // embouts arrondis (boutons de rouleau)
    ctx.fillStyle = "#4a3018";
    ctx.beginPath(); ctx.arc(-width / 2, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width / 2, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.ellipse(0, -4, width / 2 - 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---- Fallback dessin texte espacé (si ctx.letterSpacing non supporté) ----
  function drawSpacedText(ctx, text, centerX, y, spacing) {
    const widths = text.split("").map(ch => ctx.measureText(ch).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let x = centerX - totalWidth / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    text.split("").forEach((ch, i) => {
      ctx.fillText(ch, x, y);
      x += widths[i] + spacing;
    });
    ctx.textAlign = prevAlign;
  }

  // ---- Texte multi-lignes avec retour automatique ----
  function wrapText(ctx, text, maxWidth) {
    const japanese = document.documentElement.lang === "ja";
    const separator = japanese ? "" : " ";
    const words = japanese ? Array.from(text) : text.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + separator + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  /**
   * Dessine le parchemin complet.
   * @param ctx contexte canvas
   * @param cx, cy centre du parchemin
   * @param maxW largeur max du papier
   * @param quote {text, author}
   * @param score nombre
   */
  function draw(ctx, cx, cy, maxW, quote, score) {
    if (!visible) return;

    // ease-out pour le déroulé
    const t = appearProgress;
    const ease = 1 - Math.pow(1 - t, 3);

    const fullH = 280;
    const paperH = fullH * ease; // se déroule verticalement
    const paperW = maxW;
    const topY = cy - fullH / 2;

    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);

    // ---- ombre portée ----
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;

    // ---- fond papier washi ----
    const paperGrad = ctx.createLinearGradient(cx - paperW / 2, topY, cx + paperW / 2, topY + paperH);
    paperGrad.addColorStop(0, "#f0e4c4");
    paperGrad.addColorStop(0.5, "#e8d9b0");
    paperGrad.addColorStop(1, "#f2e6c8");
    ctx.fillStyle = paperGrad;
    ctx.beginPath();
    ctx.rect(cx - paperW / 2, topY, paperW, paperH);
    ctx.fill();
    ctx.restore();

    // ---- clip pour motif + grain + texte (ne dépasse pas le papier déroulé) ----
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - paperW / 2, topY, paperW, paperH);
    ctx.clip();

    // motif seigaiha en filigrane
    ctx.globalAlpha = 0.16;
    drawSeigaiha(ctx, paperW, fullH, "#8a6a3a");
    ctx.globalAlpha = 1;

    // grain papier
    ctx.translate(cx - paperW / 2, topY - (fullH - paperH));
    drawGrain(ctx, paperW, fullH);
    ctx.translate(-(cx - paperW / 2), -(topY - (fullH - paperH)));

    // bordure encre fine à l'intérieur
    ctx.strokeStyle = "rgba(110,80,40,0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - paperW / 2 + 10, topY + 10, paperW - 20, fullH - 20);

    // contenu texte uniquement quand assez déroulé
    if (ease > 0.55) {
      const textAlpha = Math.min(1, (ease - 0.55) / 0.35);
      ctx.globalAlpha = textAlpha;

      // sceau
      const sealY = topY + 38;
      ctx.save();
      ctx.translate(cx, sealY);
      const sealGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 19);
      sealGrad.addColorStop(0, "#c44b4b");
      sealGrad.addColorStop(1, "#8a2e2e");
      ctx.fillStyle = sealGrad;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(90,30,30,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f2e6c8";
      ctx.font = "16px 'Hiragino Mincho ProN', 'Noto Serif JP', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("禅", 0, 1);
      ctx.restore();

      // titre
      ctx.fillStyle = "#8a7245";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      if ("letterSpacing" in ctx) {
        ctx.save();
        ctx.letterSpacing = "3px";
        ctx.fillText(GameLanguage.text("wisdom"), cx, topY + 70);
        ctx.restore();
      } else {
        drawSpacedText(ctx, GameLanguage.text("wisdom"), cx, topY + 70, 3);
      }

      // citation (wrap automatique)
      ctx.fillStyle = "#3d3221";
      ctx.font = "italic 17px 'Hiragino Mincho ProN', 'Noto Serif JP', Georgia, serif";
      const lines = wrapText(ctx, "\u201C" + quote.text + "\u201D", paperW - 50);
      let ly = topY + 102;
      for (const line of lines) {
        ctx.fillText(line, cx, ly);
        ly += 24;
      }

      // auteur
      ctx.fillStyle = "#8a7245";
      ctx.font = "italic 12px 'Hiragino Mincho ProN', serif";
      ctx.fillText("— " + quote.author, cx, ly + 14, paperW - 36);

      // score
      ctx.fillStyle = "#6b5a3a";
      ctx.font = "13px sans-serif";
      ctx.fillText(GameLanguage.text("score") + " · " + score, cx, topY + fullH - 36);
    }

    ctx.restore(); // fin clip

    // ---- baguettes de bois en haut et en bas ----
    drawRod(ctx, cx, topY, paperW + 14);
    drawRod(ctx, cx, topY + paperH, paperW + 14);

    ctx.restore();
  }

  return { show, hide, update, draw, isVisible, getAppearProgress };
})();
