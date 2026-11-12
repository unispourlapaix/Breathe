/* ============================================
   MOD-GARDEN-001 : Orchestration de l'écran Jardin
   Affiche le bonsaï en cours, gère le sélecteur d'espèces, la navigation
   Dépend de : Bonsai, Progress
   ============================================ */

const Garden = (() => {

  let canvas, ctx;
  let speciesRow, progressFill, progressLabel, treeNameEl, treeJpEl;
  let animFrame = null;
  let visible = false;

  function init() {
    canvas = document.getElementById("garden-canvas");
    ctx = canvas.getContext("2d");
    speciesRow = document.getElementById("garden-species-row");
    progressFill = document.getElementById("garden-progress-fill");
    progressLabel = document.getElementById("garden-progress-label");
    treeNameEl = document.getElementById("garden-tree-name");
    treeJpEl = document.getElementById("garden-tree-jp");

    buildSpeciesRow();
  }

  function buildSpeciesRow() {
    speciesRow.innerHTML = "";
    const state = Progress.getState();
    const totalSpecies = Bonsai.getTotalSpecies();

    for (let i = 0; i < totalSpecies; i++) {
      const sp = Bonsai.getSpecies(i);
      const chip = document.createElement("button");
      chip.className = "garden-species-chip";
      chip.textContent = speciesEmoji(sp.leafShape);

      const isActive = state.speciesIndex === i;
      const isComplete = state.completedSpecies.includes(i);
      // débloqué si c'est l'arbre en cours, déjà complété, ou le suivant juste après le dernier complété/en cours
      const unlocked = isActive || isComplete || i <= state.speciesIndex;

      if (isActive) chip.classList.add("active");
      if (isComplete) chip.classList.add("complete");
      if (!unlocked) chip.classList.add("locked");

      chip.addEventListener("click", () => {
        if (!unlocked) return;
        Progress.chooseSpecies(i).then(() => {
          buildSpeciesRow();
          refreshHeader();
        });
      });

      speciesRow.appendChild(chip);
    }
  }

  function speciesEmoji(shape) {
    if (shape === "blossom") return "🌸";
    if (shape === "needle") return "🌲";
    return "🌳";
  }

  function refreshHeader() {
    const state = Progress.getState();
    const sp = Bonsai.getSpecies(state.speciesIndex);
    treeNameEl.textContent = sp.name;
    treeJpEl.textContent = sp.nameJp;
    const maxLevel = Bonsai.getLevelsPerTree();
    progressFill.style.width = (state.level / maxLevel * 100) + "%";
    progressLabel.textContent = "Niveau " + state.level + " / " + maxLevel;
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
  }

  // ---- Décor : étagère de bois + petits accessoires de jardinier ----
  // Seedé pour rester stable d'une frame à l'autre (pas de scintillement)
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawShelfBackground(ctx, w, h) {
    // mur doux en fond, légèrement texturé
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
    wallGrad.addColorStop(0, "#eef1e6");
    wallGrad.addColorStop(1, "#e2e8da");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h);

    const shelfY = h * 0.82; // hauteur de la planche principale (où repose le bonsaï)
    const shelfThickness = h * 0.045;

    // planche d'étagère : dégradé bois + grain horizontal léger
    const woodGrad = ctx.createLinearGradient(0, shelfY, 0, shelfY + shelfThickness);
    woodGrad.addColorStop(0, "#b08a5e");
    woodGrad.addColorStop(0.5, "#9a7048");
    woodGrad.addColorStop(1, "#7a5838");
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, shelfY, w, shelfThickness);

    // grain de bois (traits seedés stables)
    const rand = mulberry32(777);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#5a3e22";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const gy = shelfY + 3 + rand() * (shelfThickness - 6);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x < w; x += 30) {
        ctx.lineTo(x + rand() * 10, gy + (rand() - 0.5) * 2.5);
      }
      ctx.stroke();
    }
    ctx.restore();

    // tranche avant de la planche (effet d'épaisseur 3D)
    ctx.fillStyle = "#6a4a2e";
    ctx.fillRect(0, shelfY + shelfThickness, w, h * 0.025);

    // ombre douce projetée sous l'étagère
    const shadowGrad = ctx.createLinearGradient(0, shelfY + shelfThickness * 1.5, 0, shelfY + shelfThickness * 1.5 + h * 0.06);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.12)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, shelfY + shelfThickness * 1.5, w, h * 0.06);

    return { shelfY, shelfThickness, rand };
  }

  // Petit arrosoir en zinc, posé à droite de l'arbre
  function drawWateringCan(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#8a9aa0";
    // corps
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-12, -16, -4, -18);
    ctx.lineTo(8, -18);
    ctx.quadraticCurveTo(13, -14, 11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // bec verseur
    ctx.beginPath();
    ctx.moveTo(8, -14);
    ctx.lineTo(22, -22);
    ctx.lineTo(24, -19);
    ctx.lineTo(10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // anse
    ctx.beginPath();
    ctx.moveTo(-6, -17);
    ctx.quadraticCurveTo(-2, -28, 4, -17);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#8a9aa0";
    ctx.stroke();
    // petit reflet
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-5, -8, 1.6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Petit sécateur posé à plat
  function drawPruningShears(ctx, x, y, scale, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    // lames
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(-14, -8);
    ctx.moveTo(2, 0); ctx.lineTo(14, -8);
    ctx.stroke();
    // poignées (manches colorés)
    ctx.strokeStyle = "#c44b3a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(-10, 12);
    ctx.stroke();
    ctx.strokeStyle = "#3a6a4a";
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(10, 12);
    ctx.stroke();
    // pivot
    ctx.fillStyle = "#6a6a6a";
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Petit pot en terre cuite vide, décoratif
  function drawEmptyPot(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const grad = ctx.createLinearGradient(0, -10, 0, 10);
    grad.addColorStop(0, "#c97f52");
    grad.addColorStop(1, "#a8623c");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(7, 10); ctx.lineTo(-7, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = "#b8714a";
    ctx.fillRect(-10, -10, 20, 3);
    ctx.restore();
  }

  function drawShelfProps(ctx, w, h, shelfInfo) {
    const { shelfY, rand } = shelfInfo;
    const scale = Math.min(w, h) / 320;

    // arrosoir à droite du bonsaï
    drawWateringCan(ctx, w * 0.84, shelfY - 2, scale * 1.1);

    // petit pot vide à gauche
    drawEmptyPot(ctx, w * 0.13, shelfY - 3, scale * 0.9);

    // sécateur posé à plat près du pot vide
    drawPruningShears(ctx, w * 0.16, shelfY - 1, scale * 0.85, -0.15);
  }


  function renderLoop() {
    if (!visible) return;
    const dims = resizeCanvas();
    ctx.clearRect(0, 0, dims.w, dims.h);

    const shelfInfo = drawShelfBackground(ctx, dims.w, dims.h);
    drawShelfProps(ctx, dims.w, dims.h, shelfInfo);

    const state = Progress.getState();
    const scale = Math.min(dims.w, dims.h) / 220;
    Bonsai.draw(ctx, dims.w / 2, shelfInfo.shelfY + 2, scale, state.speciesIndex, state.level);

    animFrame = requestAnimationFrame(renderLoop);
  }

  function show() {
    visible = true;
    refreshHeader();
    buildSpeciesRow();
    document.getElementById("garden-overlay").classList.add("visible");
    if (!animFrame) renderLoop();
  }

  function hide() {
    visible = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    document.getElementById("garden-overlay").classList.remove("visible");
  }

  // Appelé par game.js quand une session se termine (cœur plein)
  async function onSessionComplete() {
    const wasComplete = Progress.isCurrentTreeComplete();
    await Progress.advanceLevel();
    const isNowComplete = Progress.isCurrentTreeComplete();
    return { justCompletedTree: !wasComplete && isNowComplete };
  }

  return { init, show, hide, onSessionComplete, refreshHeader, buildSpeciesRow };
})();
