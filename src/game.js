/* ============================================
   MOD-GAME-001 : Boucle principale, score, session
   Orchestré : Scenery + Bubbles + Quotes
   Durée de session fixe (zen, sans game over) -> carte finale
   ============================================ */

(function () {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const treeImages = GardenScene.getTreeImages();

  const scoreDisplay = document.getElementById("score-display");
  const comboDisplay = document.getElementById("combo-display");

  const startOverlay = document.getElementById("start-overlay");
  const startPlayBtn = document.getElementById("start-play");

  const endReplayBtn = document.getElementById("end-card-replay");

  const BUBBLES_TO_FILL_HEART = 35; // nombre de pops pour remplir le cœur et finir la session
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let elapsedMs = 0;
  let score = 0;
  let comboCount = 0;
  let comboTimer = 0;
  let lastQuoteId = null;

  let running = false;
  let sessionEnded = false;
  let revealingTree = false;
  let revealProgress = 0;
  let treeStateAtReveal = null; // {speciesIndex, levelBefore, levelAfter, treeName, treeJp}
  let currentQuote = null;
  let lastFrameTime = 0;

  let particles = []; // petites étincelles au pop, géré ici (léger, pas besoin de module séparé)

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Scenery.resize(rect.width, rect.height);
    Bubbles.resize(rect.width, rect.height);
    return { w: rect.width, h: rect.height };
  }

  let viewW = 0, viewH = 0;

  function onPop(bubble, isChainHit) {
    const now = performance.now();
    if (now - comboTimer < 900) {
      comboCount++;
    } else {
      comboCount = 1;
    }
    comboTimer = now;

    // Un hit en chaîne (rebond du projectile) applique un multiplicateur x5 sur (base + combo)
    const base = isChainHit ? 20 : (bubble.isBonus ? 25 : 10);
    const comboBonus = comboCount > 1 ? (comboCount - 1) * 4 : 0;
    const subtotal = base + comboBonus;
    const gained = isChainHit ? subtotal * 5 : subtotal;
    score += gained;
    scoreDisplay.textContent = score;

    if (comboCount > 1) {
      comboDisplay.textContent = "Combo x" + comboCount;
      comboDisplay.classList.add("show");
      clearTimeout(comboDisplay._hideTimeout);
      comboDisplay._hideTimeout = setTimeout(() => comboDisplay.classList.remove("show"), 1000);
    }

    spawnParticles(bubble.x, bubble.y, bubble.color, bubble.isBonus);
    Heart.registerPop();

    const kind = isChainHit ? "chain" : (bubble.isBonus ? "bonus" : "normal");
    PopText.spawn(bubble.x, bubble.y - bubble.radius, kind);
  }

  function spawnParticles(x, y, color, isBonus) {
    const count = isBonus ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      particles.push({
        id: "PRT-" + Math.random().toString(36).slice(2, 6),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 2.5,
        color
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt * 0.05;
      p.y += p.vy * dt * 0.05;
      p.vy += 0.002 * dt;
      p.life -= dt * 0.0018;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawParticles(ctx) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function gameLoop(timestamp) {
    if (!running && !sessionEnded) return;
    const dt = lastFrameTime ? Math.min(timestamp - lastFrameTime, 50) : 16;
    lastFrameTime = timestamp;
    if (!Calm.isActive()) elapsedMs += dt;

    // Background gradient (subtil, statique pour perf)
    ctx.clearRect(0, 0, viewW, viewH);
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, "#dceadd");
    grad.addColorStop(1, "#f4f1e8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    Scenery.update(dt);
    Scenery.draw(ctx);

    if (running && !Calm.isActive()) {
      Bubbles.update(dt, elapsedMs);
      Bubbles.draw(ctx);

      updateParticles(dt);
      drawParticles(ctx);

      PopText.update(dt);
      PopText.draw(ctx);

      Heart.update(dt);
      Heart.draw(ctx, viewW - 46, 50);
    } else if (running && Calm.isActive()) {
      // jeu figé : on affiche l'état actuel sans le faire avancer, juste pour garder le décor visible derrière l'overlay
      Bubbles.draw(ctx);
      drawParticles(ctx);
      PopText.draw(ctx);
      Heart.draw(ctx, viewW - 46, 50);
    }

    if (sessionEnded && !revealingTree) {
      Scroll.update(dt);
      Scroll.draw(ctx, viewW / 2, viewH / 2, Math.min(viewW - 50, 320), currentQuote, score);
      if (Scroll.getAppearProgress() > 0.85 && !endReplayBtn.classList.contains("visible") && treeStateAtReveal) {
        endReplayBtn.classList.add("visible");
        endReplayBtn.textContent = "Continuer";
        endReplayBtn.style.left = "50%";
        endReplayBtn.style.top = (viewH / 2 + 150) + "px";
        endReplayBtn.style.transform = "translateX(-50%)";
      }
    }

    if (revealingTree) {
      drawTreeReveal(ctx, dt);
    }

    requestAnimationFrame(gameLoop);
  }

  function drawTreeReveal(ctx, dt) {
    if (!treeStateAtReveal) return; // la progression n'a pas encore fini de se résoudre, on attend la frame suivante

    const leavesBefore = Bonsai.levelToLeafCount(treeStateAtReveal.levelBefore);
    const leavesAfter = Bonsai.levelToLeafCount(treeStateAtReveal.levelAfter);
    const gainedLeaf = leavesAfter > leavesBefore;
    const revealDuration = gainedLeaf ? 2100 : 750;
    revealProgress = reducedMotion.matches ? 1 : Math.min(1, revealProgress + dt / revealDuration);
    const sproutProgress = gainedLeaf
      ? Math.max(0, Math.min(1, (revealProgress - 0.18) / 0.65))
      : 1;

    // petit fond doux derrière l'arbre pour le mettre en valeur
    ctx.save();
    const vign = ctx.createRadialGradient(viewW / 2, viewH * 0.55, 10, viewW / 2, viewH * 0.55, viewW * 0.7);
    vign.addColorStop(0, "rgba(255,250,230,0.9)");
    vign.addColorStop(1, "rgba(255,250,230,0)");
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();

    const treeSize = Math.min(viewW * 0.82, viewH * 0.38);
    const treeBase = viewH * 0.68;

    GardenScene.drawTree(
      ctx, treeImages, treeStateAtReveal.speciesIndex,
      viewW / 2, treeBase, treeSize, treeStateAtReveal.levelAfter,
      gainedLeaf ? { progress: sproutProgress, opacity: 1 } : undefined
    );

    // texte d'accompagnement, adapté selon qu'une feuille soit vraiment apparue ou non
    ctx.save();
    ctx.fillStyle = "#5a6a5a";
    ctx.font = "15px sans-serif";
    ctx.textAlign = "center";
    const mainText = gainedLeaf
      ? treeStateAtReveal.treeName + " a gagné une feuille"
      : treeStateAtReveal.treeName + " continue de grandir";
    ctx.fillText(mainText, viewW / 2, viewH * 0.18);
    ctx.font = "italic 12px sans-serif";
    ctx.fillStyle = "#8a9a8a";
    ctx.fillText(
      treeStateAtReveal.treeJp + " · " + leavesAfter + " / " + Bonsai.getLeafCount() + " feuilles",
      viewW / 2, viewH * 0.18 + 20
    );
    ctx.restore();

    if (revealProgress >= 1 && !endReplayBtn.classList.contains("visible")) {
      endReplayBtn.classList.add("visible");
      endReplayBtn.textContent = "Rejouer";
      endReplayBtn.style.left = "50%";
      endReplayBtn.style.top = Math.min(viewH - 52, treeBase + 28) + "px";
      endReplayBtn.style.transform = "translateX(-50%)";
    }
  }

  function startSession() {
    score = 0;
    comboCount = 0;
    elapsedMs = 0;
    particles = [];
    scoreDisplay.textContent = "0";
    sessionEnded = false;
    revealingTree = false;
    revealProgress = 0;
    currentQuote = null;

    const dims = resizeCanvas();
    viewW = dims.w; viewH = dims.h;

    const activeSpecies = Bonsai.getSpecies(Progress.getState().speciesIndex);
    const IMPLEMENTED_THEMES = ["day", "moonlit"]; // les autres (mountain, oasis, rain, snow) arriveront ensuite
    const themeToUse = IMPLEMENTED_THEMES.includes(activeSpecies.gameTheme) ? activeSpecies.gameTheme : "day";

    Scenery.init(viewW, viewH, themeToUse);
    Bubbles.reset();
    Bubbles.init(viewW, viewH, onPop);
    Heart.init(BUBBLES_TO_FILL_HEART, endSession);
    Heart.setExplosionCenter(viewW / 2, viewH / 2);
    Scroll.hide();
    PopText.reset();
    Calm.reset();

    startOverlay.classList.add("hidden");
    endReplayBtn.classList.remove("visible");

    running = true;
    lastFrameTime = 0;
    requestAnimationFrame(gameLoop);
  }

  function endSession() {
    running = false;
    sessionEnded = true;
    revealingTree = false;
    revealProgress = 0;
    treeStateAtReveal = null;
    const quote = getRandomQuote(lastQuoteId);
    lastQuoteId = quote.id;
    currentQuote = quote;
    Scroll.show();

    // Capture l'état du bonsaï avant progression, puis fait avancer le niveau (1 session = 1 niveau)
    const stateBefore = Progress.getState();
    const speciesIndex = stateBefore.speciesIndex;
    const levelBefore = stateBefore.level;
    const sp = Bonsai.getSpecies(speciesIndex);

    Garden.onSessionComplete().then(result => {
      const stateAfter = Progress.getState();
      treeStateAtReveal = {
        speciesIndex,
        levelBefore,
        levelAfter: stateAfter.level,
        treeName: sp.name,
        treeJp: sp.nameJp
      };
      if (result.justCompletedTree) {
        currentQuote = {
          text: currentQuote.text,
          author: currentQuote.author + " — ton arbre a atteint sa pleine maturité 🌳"
        };
      }
    });
  }

  // ---- Input handling (tap + swipe) ----
  let touchStart = null;
  let touchMoved = false;

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const t = evt.touches ? evt.touches[0] : evt;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  canvas.addEventListener("touchstart", (e) => {
    if (!running || Calm.isActive()) return;
    touchStart = getPos(e);
    touchMoved = false;
  }, { passive: true });

  canvas.addEventListener("touchmove", (e) => {
    if (!running || !touchStart || Calm.isActive()) return;
    touchMoved = true;
    const pos = getPos(e);
    Bubbles.handleSwipe(touchStart.x, touchStart.y, pos.x, pos.y);
    touchStart = pos;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    if (!running || !touchStart || Calm.isActive()) return;
    if (!touchMoved) {
      Bubbles.handleTap(touchStart.x, touchStart.y);
    }
    Calm.registerAction();
    touchStart = null;
  }, { passive: true });

  // Souris (test desktop)
  let mouseDown = false;
  canvas.addEventListener("mousedown", (e) => {
    if (!running || Calm.isActive()) return;
    mouseDown = true;
    touchStart = getPos(e);
    touchMoved = false;
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!running || !mouseDown || !touchStart || Calm.isActive()) return;
    touchMoved = true;
    const pos = getPos(e);
    Bubbles.handleSwipe(touchStart.x, touchStart.y, pos.x, pos.y);
    touchStart = pos;
  });
  canvas.addEventListener("mouseup", (e) => {
    if (!running || !touchStart || Calm.isActive()) return;
    if (!touchMoved) Bubbles.handleTap(touchStart.x, touchStart.y);
    Calm.registerAction();
    mouseDown = false;
    touchStart = null;
  });

  window.addEventListener("resize", () => {
    if (running || sessionEnded) {
      const dims = resizeCanvas();
      viewW = dims.w; viewH = dims.h;
    }
  });

  startPlayBtn.addEventListener("click", startSession);
  endReplayBtn.addEventListener("click", () => {
    if (sessionEnded && !revealingTree) {
      // phase parchemin -> on passe à la révélation de l'arbre
      revealingTree = true;
      revealProgress = 0;
      endReplayBtn.classList.remove("visible");
    } else {
      // phase révélation déjà vue -> on relance une nouvelle session
      startSession();
    }
  });

  const startGardenBtn = document.getElementById("start-garden-btn");
  const gardenBackBtn = document.getElementById("garden-back-btn");
  startGardenBtn.addEventListener("click", () => Garden.show());
  gardenBackBtn.addEventListener("click", () => Garden.hide());

  // ---- Overlay de respiration apaisante (MOD-CALM-001) ----
  const calmOverlay = document.getElementById("calm-overlay");
  const calmCircle = document.getElementById("calm-circle");
  const calmPhaseLabel = document.getElementById("calm-phase-label");
  const calmPhaseSeconds = document.getElementById("calm-phase-seconds");
  const calmResumeBtn = document.getElementById("calm-resume-btn");
  const calmCyclesLabel = document.getElementById("calm-cycles-label");

  let calmAnimFrame = null;
  const MIN_CYCLES_BEFORE_RESUME = 2; // au moins 2 cycles complets avant de pouvoir reprendre

  function calmLoop() {
    const state = Calm.updateBreathing(16);
    if (!state) return; // l'overlay a été fermé entre-temps

    calmPhaseLabel.textContent = state.label;
    calmPhaseSeconds.textContent = state.secondsLeft;
    calmCircle.style.transform = "scale(" + state.scale + ")";

    if (state.cyclesCompleted >= MIN_CYCLES_BEFORE_RESUME) {
      calmResumeBtn.classList.add("ready");
      calmCyclesLabel.textContent = "Tu peux reprendre quand tu es prêt";
    } else {
      const remaining = MIN_CYCLES_BEFORE_RESUME - state.cyclesCompleted;
      calmCyclesLabel.textContent = remaining + " cycle" + (remaining > 1 ? "s" : "") + " avant de pouvoir reprendre";
    }

    calmAnimFrame = requestAnimationFrame(calmLoop);
  }

  Calm.setCallbacks(
    () => {
      // activation : affiche l'overlay et démarre la boucle d'animation
      calmOverlay.classList.add("visible");
      calmResumeBtn.classList.remove("ready");
      calmLoop();
    },
    () => {
      // reprise : masque l'overlay et arrête la boucle
      calmOverlay.classList.remove("visible");
      if (calmAnimFrame) { cancelAnimationFrame(calmAnimFrame); calmAnimFrame = null; }
    }
  );

  calmResumeBtn.addEventListener("click", () => {
    if (!calmResumeBtn.classList.contains("ready")) return;
    Calm.dismiss();
  });

  // ---- Mode Méditation (MOD-MEDITATION-001) ----
  const startMeditationBtn = document.getElementById("start-meditation-btn");
  const meditationOverlay = document.getElementById("meditation-overlay");
  const meditationBackBtn = document.getElementById("meditation-back-btn");
  const meditationMenu = document.getElementById("meditation-menu");
  const meditationExerciseView = document.getElementById("meditation-exercise-view");
  const medChoiceBreathing = document.getElementById("med-choice-breathing");
  const medChoiceBodyscan = document.getElementById("med-choice-bodyscan");
  const medBreathContainer = document.getElementById("med-breath-container");
  const medScanContainer = document.getElementById("med-scan-container");
  const medBreathCircle = document.getElementById("med-breath-circle");
  const medBreathPhaseLabel = document.getElementById("med-breath-phase-label");
  const medBreathPhaseSeconds = document.getElementById("med-breath-phase-seconds");
  const medScanProgress = document.getElementById("med-scan-progress");
  const medScanZone = document.getElementById("med-scan-zone");
  const medScanInstruction = document.getElementById("med-scan-instruction");
  const medScanPhaseBadge = document.getElementById("med-scan-phase-badge");
  const medScanSeconds = document.getElementById("med-scan-seconds");
  const medScanSkip = document.getElementById("med-scan-skip");
  const medScanFinished = document.getElementById("med-scan-finished");
  const medScanRestart = document.getElementById("med-scan-restart");

  let medAnimFrame = null;
  // Réutilise le même cycle de respiration que Calm, via une instance de calcul indépendante
  // (on duplique une petite logique locale pour ne pas coupler Meditation à l'état de Calm)
  const MED_BREATH_CYCLE = [
    { label: "Inspire", duration: 4, scaleTo: 1.35 },
    { label: "Retiens", duration: 4, scaleTo: 1.35 },
    { label: "Expire", duration: 6, scaleTo: 0.85 },
  ];
  let medBreathPhaseIndex = 0;
  let medBreathPhaseStart = 0;

  function updateMedBreathing() {
    const now = performance.now();
    const elapsed = (now - medBreathPhaseStart) / 1000;
    const phase = MED_BREATH_CYCLE[medBreathPhaseIndex];
    if (elapsed >= phase.duration) {
      medBreathPhaseIndex = (medBreathPhaseIndex + 1) % MED_BREATH_CYCLE.length;
      medBreathPhaseStart = now;
    }
    const updatedPhase = MED_BREATH_CYCLE[medBreathPhaseIndex];
    const updatedElapsed = (performance.now() - medBreathPhaseStart) / 1000;
    const t = Math.min(1, updatedElapsed / updatedPhase.duration);
    const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
    const prevPhase = MED_BREATH_CYCLE[(medBreathPhaseIndex - 1 + MED_BREATH_CYCLE.length) % MED_BREATH_CYCLE.length];
    const scale = prevPhase.scaleTo + (updatedPhase.scaleTo - prevPhase.scaleTo) * eased;

    medBreathPhaseLabel.textContent = updatedPhase.label;
    medBreathPhaseSeconds.textContent = Math.ceil(updatedPhase.duration - updatedElapsed);
    medBreathCircle.style.transform = "scale(" + scale + ")";
  }

  function medLoop() {
    if (!Meditation.isVisible()) return;
    const exercise = Meditation.getActiveExercise();

    if (exercise === "breathing") {
      updateMedBreathing();
    } else if (exercise === "bodyscan") {
      const state = Meditation.updateBodyScan();
      if (state) {
        if (state.finished) {
          medScanContainer.querySelectorAll(":scope > *:not(#med-scan-finished)").forEach(el => el.style.display = "none");
          medScanFinished.classList.add("visible");
        } else {
          medScanProgress.textContent = "Étape " + (state.stepIndex + 1) + " / " + state.totalSteps;
          medScanZone.textContent = state.zone;
          medScanInstruction.textContent = state.instruction;
          medScanSeconds.textContent = state.secondsLeft;
          medScanPhaseBadge.textContent = state.phase === "hold" ? "Contracte" : "Relâche et ressens";
          medScanPhaseBadge.className = state.phase;
        }
      }
    }

    medAnimFrame = requestAnimationFrame(medLoop);
  }

  function showMeditationExercise(exercise) {
    meditationMenu.style.display = "none";
    meditationExerciseView.classList.add("visible");
    medBreathContainer.style.display = exercise === "breathing" ? "flex" : "none";
    medScanContainer.style.display = exercise === "bodyscan" ? "flex" : "none";

    if (exercise === "breathing") {
      medBreathPhaseIndex = 0;
      medBreathPhaseStart = performance.now();
    } else if (exercise === "bodyscan") {
      medScanFinished.classList.remove("visible");
      medScanContainer.querySelectorAll(":scope > *:not(#med-scan-finished)").forEach(el => el.style.display = "");
    }

    if (medAnimFrame) cancelAnimationFrame(medAnimFrame);
    medLoop();
  }

  function showMeditationMenu() {
    meditationMenu.style.display = "flex";
    meditationExerciseView.classList.remove("visible");
    if (medAnimFrame) { cancelAnimationFrame(medAnimFrame); medAnimFrame = null; }
  }

  startMeditationBtn.addEventListener("click", () => {
    Meditation.show();
    showMeditationMenu();
    meditationOverlay.classList.add("visible");
  });

  meditationBackBtn.addEventListener("click", () => {
    if (Meditation.getActiveExercise()) {
      Meditation.backToMenu();
      showMeditationMenu();
    } else {
      Meditation.hide();
      meditationOverlay.classList.remove("visible");
    }
  });

  medChoiceBreathing.addEventListener("click", () => {
    Meditation.startBreathing();
    showMeditationExercise("breathing");
  });

  medChoiceBodyscan.addEventListener("click", () => {
    Meditation.startBodyScan();
    showMeditationExercise("bodyscan");
  });

  medScanSkip.addEventListener("click", () => Meditation.skipToNextStep());

  medScanRestart.addEventListener("click", () => {
    Meditation.startBodyScan();
    showMeditationExercise("bodyscan");
  });

  Meditation.init(() => {
    // callback de fermeture : rien de spécial à nettoyer côté jeu, le mode est autonome
  });

  // Affichage initial (décor visible derrière l'écran de démarrage)
  resizeCanvas();

  // Initialisation de la progression du jardin (chargement asynchrone depuis le storage)
  Garden.init();
  Progress.load();
})();
