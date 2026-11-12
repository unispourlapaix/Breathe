/* ============================================
   MOD-POPTEXT-001 : Onomatopées visuelles
   Mots universels (pas de dépendance à une langue) qui apparaissent
   et s'envolent à chaque bulle éclatée. Plus marqués sur les ricochets.
   ============================================ */

const PopText = (() => {

  let texts = [];

  // Onomatopées universelles, lisibles sans traduction (BD/manga international)
  const WORDS_NORMAL = ["POP!", "PAF!", "PLIC!", "TOC!"];
  const WORDS_CHAIN = ["BAM!", "BOOM!", "WAOUH!", "ZIP!", "PAN!"];
  const WORDS_BONUS = ["YEAH!", "WOW!", "✦POP✦"];

  function spawn(x, y, kind) {
    let word, color, baseSize;
    if (kind === "chain") {
      word = WORDS_CHAIN[Math.floor(Math.random() * WORDS_CHAIN.length)];
      color = "#e8853f";
      baseSize = 26;
    } else if (kind === "bonus") {
      word = WORDS_BONUS[Math.floor(Math.random() * WORDS_BONUS.length)];
      color = "#e8a03f";
      baseSize = 22;
    } else {
      word = WORDS_NORMAL[Math.floor(Math.random() * WORDS_NORMAL.length)];
      color = "#7fae8a";
      baseSize = 17;
    }

    texts.push({
      id: "POPTXT-" + Math.random().toString(36).slice(2, 7),
      word,
      x: x + (Math.random() - 0.5) * 10,
      y,
      vy: -0.9 - Math.random() * 0.4,
      rot: (Math.random() - 0.5) * 0.3,
      life: 1,
      color,
      baseSize
    });
  }

  function update(dt) {
    for (const t of texts) {
      t.y += t.vy * dt * 0.06;
      t.life -= dt * 0.0014;
    }
    texts = texts.filter(t => t.life > 0);
  }

  function draw(ctx) {
    for (const t of texts) {
      const growIn = Math.min(1, (1 - t.life) * 6); // petit pop d'entrée rapide
      const scale = 0.6 + growIn * 0.5 + (1 - t.life) * 0.25;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.life > 0.7 ? 1 : t.life / 0.7);
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      ctx.scale(scale, scale);
      ctx.font = "bold " + t.baseSize + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.strokeText(t.word, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.word, 0, 0);
      ctx.restore();
    }
  }

  function reset() { texts = []; }

  return { spawn, update, draw, reset };
})();
