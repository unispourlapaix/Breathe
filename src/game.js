/* ============================================
   MOD-GAME-001 : Boucle principale, score, session
   Orchestré : Scenery + Bubbles + Quotes
   Durée de session fixe (zen, sans game over) -> carte finale
   ============================================ */

(function () {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const scoreDisplay = document.getElementById("score-display");
  const comboDisplay = document.getElementById("combo-display");
  const encouragement = document.getElementById("encouragement");
  const encouragementText = document.getElementById("encouragement-text");
  const encouragementLanguage = document.getElementById("encouragement-language");
  const encouragementLanguageKey = "breathe-encouragement-language";
  try {
    const savedLanguage = localStorage.getItem(encouragementLanguageKey);
    if (savedLanguage === "fr" || ENCOURAGEMENT_LANGUAGES.includes(savedLanguage)) {
      encouragementLanguage.value = savedLanguage;
    }
  } catch {
    // Le choix reste disponible pour la session si le stockage est bloqué.
  }
  encouragementLanguage.addEventListener("change", () => {
    translateStartMenu();
    try {
      localStorage.setItem(encouragementLanguageKey, encouragementLanguage.value);
    } catch {
      // Le choix reste disponible pour la session.
    }
  });

  const startMenuTranslations = {
    fr: ["Respire. Éclate. Récolte la sagesse.", "Commencer", "Mon Jardin", "Mode Méditation", "Langue", "Tape les bulles douces.", "Glisse sur les bulles dorées."],
    en: ["Breathe. Pop bubbles. Gather wisdom.", "Start", "My Garden", "Meditation Mode", "Language", "Tap the soft bubbles.", "Swipe across the golden bubbles."],
    ja: ["深呼吸して、泡をはじいて、知恵を集めよう。", "はじめる", "私の庭", "瞑想モード", "言語", "やわらかい泡をタップ。", "金色の泡をスワイプ。"],
    es: ["Respira. Explota burbujas. Recoge sabiduría.", "Empezar", "Mi jardín", "Modo meditación", "Idioma", "Toca las burbujas suaves.", "Desliza sobre las burbujas doradas."],
    pt: ["Respire. Estoure bolhas. Colha sabedoria.", "Começar", "Meu jardim", "Modo meditação", "Idioma", "Toque nas bolhas suaves.", "Deslize sobre as bolhas douradas."]
  };

  function translateStartMenu() {
    const language = encouragementLanguage.value;
    const [subtitle, play, garden, meditation, label, tap, swipe] = startMenuTranslations[language];
    document.documentElement.lang = language;
    document.getElementById("start-sub").textContent = subtitle;
    document.getElementById("start-play").textContent = play;
    document.getElementById("start-garden-btn").textContent = garden;
    document.getElementById("start-meditation-btn").textContent = meditation;
    encouragementLanguage.setAttribute("aria-label", label);
    document.getElementById("start-hint").replaceChildren(tap, document.createElement("br"), swipe);
    const menuText = {
      "meditation-title": meditation,
      "med-choice-affirm .meditation-choice-title": GameLanguage.text("affirmTitle"),
      "med-choice-affirm .meditation-choice-desc": GameLanguage.text("affirmDesc"),
      "med-choice-breathing .meditation-choice-title": GameLanguage.text("breathTitle"),
      "med-choice-breathing .meditation-choice-desc": GameLanguage.text("breathDesc"),
      "med-choice-bodyscan .meditation-choice-title": GameLanguage.text("scanTitle"),
      "med-choice-bodyscan .meditation-choice-desc": GameLanguage.text("scanDesc"),
      "med-breath-message": GameLanguage.text("breathMessage"),
      "med-breath-phase-label": GameLanguage.text("Inspire"),
      "med-scan-progress": GameLanguage.text("step") + " 1 / 15",
      "med-scan-zone": GameLanguage.item("zones", 0, "Le crâne et le cuir chevelu"),
      "med-scan-instruction": GameLanguage.item("instructions", 0, "Fronce doucement le cuir chevelu."),
      "med-scan-phase-badge": GameLanguage.text("hold"),
      "med-scan-skip": GameLanguage.text("skip"),
      "med-scan-finished-title": GameLanguage.text("finished"),
      "med-scan-finished-text": GameLanguage.text("finishedText"),
      "med-scan-restart": GameLanguage.text("restart"),
      "calm-message": GameLanguage.text("calmMessage"),
      "calm-phase-label": GameLanguage.text("Inspire"),
      "calm-resume-btn": GameLanguage.text("resume"),
      "end-card-replay": GameLanguage.text("replay"),
      "combo-display": GameLanguage.text("combo") + " ×2"
    };
    for (const [selector, value] of Object.entries(menuText)) {
      const parts = value.split("\n");
      const element = document.querySelector("#" + selector);
      if (parts.length === 1) element.textContent = value;
      else element.replaceChildren(parts[0], document.createElement("br"), parts[1]);
    }
    for (const [id, key] of [
      ["garden-back-btn", "back"], ["meditation-back-btn", "back"],
      ["garden-image-lock", "locked"], ["garden-progress-bar", "growth"]
    ]) {
      document.getElementById(id).setAttribute("aria-label", GameLanguage.text(key));
    }
  }

  translateStartMenu();
  let encouragementTimer;
  let lastEncouragement = -1;

  const startOverlay = document.getElementById("start-overlay");
  const startPlayBtn = document.getElementById("start-play");

  const endReplayBtn = document.getElementById("end-card-replay");

  const BUBBLES_TO_FILL_HEART = 35; // nombre de pops pour remplir le cœur et finir la session
  let elapsedMs = 0;
  let score = 0;
  let comboCount = 0;
  let comboTimer = 0;
  let lastQuoteId = null;

  let running = false;
  let sessionEnded = false;
  let sessionReward = null;
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
    if (bubble.isStar) showEncouragement();
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
      comboDisplay.textContent = GameLanguage.text("combo") + " ×" + comboCount;
      comboDisplay.classList.add("show");
      clearTimeout(comboDisplay._hideTimeout);
      comboDisplay._hideTimeout = setTimeout(() => comboDisplay.classList.remove("show"), 1000);
    }

    spawnParticles(bubble.x, bubble.y, bubble.color, bubble.isBonus);
    Heart.registerPop();

    const kind = isChainHit ? "chain" : (bubble.isBonus ? "bonus" : "normal");
    PopText.spawn(bubble.x, bubble.y - bubble.radius, kind);
  }

  function showEncouragement() {
    const count = ENCOURAGEMENTS.length;
    const offset = 1 + Math.floor(Math.random() * (count - 1));
    lastEncouragement = lastEncouragement < 0
      ? Math.floor(Math.random() * count)
      : (lastEncouragement + offset) % count;
    const [french, english] = ENCOURAGEMENTS[lastEncouragement];
    const language = encouragementLanguage.value;
    const translationIndex = ENCOURAGEMENT_LANGUAGES.indexOf(language) - 1;
    encouragementText.textContent = language === "fr" ? french
      : ENCOURAGEMENT_TRANSLATIONS[lastEncouragement][translationIndex] ?? english;
    encouragement.hidden = false;
    clearTimeout(encouragementTimer);
    encouragementTimer = setTimeout(() => { encouragement.hidden = true; }, 3500);
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

    if (sessionEnded) {
      Scroll.update(dt);
      Scroll.draw(ctx, viewW / 2, viewH / 2, Math.min(viewW - 50, 320), currentQuote, score);
      if (Scroll.getAppearProgress() > 0.85 && !endReplayBtn.classList.contains("visible") && sessionReward) {
        endReplayBtn.classList.add("visible");
        endReplayBtn.textContent = GameLanguage.text("roundContinue");
        endReplayBtn.style.left = "50%";
        endReplayBtn.style.top = (viewH / 2 + 150) + "px";
        endReplayBtn.style.transform = "translateX(-50%)";
      }
    }

    requestAnimationFrame(gameLoop);
  }

  function startSession() {
    clearTimeout(encouragementTimer);
    encouragement.hidden = true;
    score = 0;
    comboCount = 0;
    elapsedMs = 0;
    particles = [];
    scoreDisplay.textContent = "0";
    sessionEnded = false;
    currentQuote = null;

    const dims = resizeCanvas();
    viewW = dims.w; viewH = dims.h;

    const activeSpecies = Bonsai.getSpecies(Progress.getState().speciesIndex);
    const IMPLEMENTED_THEMES = ["day", "moonlit"]; // les autres (mountain, oasis, rain, snow) arriveront ensuite
    const themeToUse = IMPLEMENTED_THEMES.includes(activeSpecies.gameTheme) ? activeSpecies.gameTheme : "day";

    Scenery.init(viewW, viewH, themeToUse);
    Bubbles.reset();
    const starsUnlocked = Progress.getState().level >= Bonsai.getLevelsPerTree() / 2;
    Bubbles.init(viewW, viewH, onPop, starsUnlocked);
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
    sessionReward = null;
    const quote = getRandomQuote(lastQuoteId);
    lastQuoteId = quote.id;
    currentQuote = quote;
    Scroll.show();

    Garden.onSessionComplete().then(result => {
      sessionReward = result;
      if (result.justCompletedTree) {
        currentQuote = {
          text: currentQuote.text,
          author: currentQuote.author + " — " + GameLanguage.text("mature")
        };
      }
    });
  }

  const SWIPE_THRESHOLD = 9;
  let gesture = null;

  function getPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", event => {
    if (!running || Calm.isActive() || !event.isPrimary || event.button !== 0) return;
    const start = getPos(event);
    gesture = {
      id: event.pointerId,
      start,
      previous: start,
      target: Bubbles.findTapTarget(start.x, start.y),
      swiping: false
    };
    canvas.setPointerCapture(event.pointerId);
  });

  function updateSwipe(position) {
    if (!gesture.swiping &&
        Math.hypot(position.x - gesture.start.x, position.y - gesture.start.y) < SWIPE_THRESHOLD) return;
    gesture.swiping = true;
    const previous = gesture.previous;
    if (previous.x === position.x && previous.y === position.y) return;
    Bubbles.handleSwipe(previous.x, previous.y, position.x, position.y);
    gesture.previous = position;
  }

  canvas.addEventListener("pointermove", event => {
    if (gesture?.id !== event.pointerId || !running || Calm.isActive()) return;
    updateSwipe(getPos(event));
  });

  canvas.addEventListener("pointerup", event => {
    if (gesture?.id !== event.pointerId) return;
    if (running && !Calm.isActive()) {
      const position = getPos(event);
      updateSwipe(position);
      if (!gesture.swiping) {
        Bubbles.popTapTarget(gesture.target ?? Bubbles.findTapTarget(position.x, position.y));
      }
      Calm.registerAction();
    }
    gesture = null;
  });

  function cancelGesture(event) {
    if (gesture?.id === event.pointerId) gesture = null;
  }

  canvas.addEventListener("pointercancel", cancelGesture);
  canvas.addEventListener("lostpointercapture", cancelGesture);

  window.addEventListener("resize", () => {
    if (running || sessionEnded) {
      const dims = resizeCanvas();
      viewW = dims.w; viewH = dims.h;
    }
  });

  function returnToMenu() {
    sessionEnded = false;
    endReplayBtn.classList.remove("visible");
    startOverlay.classList.remove("hidden");
  }

  startPlayBtn.addEventListener("click", startSession);
  endReplayBtn.addEventListener("click", () => {
    if (!sessionEnded || !sessionReward) return;
    returnToMenu();
    if (sessionReward.gainedLevel) Garden.show(true);
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

    calmPhaseLabel.textContent = GameLanguage.text(state.label);
    calmPhaseSeconds.textContent = state.secondsLeft;
    calmCircle.style.transform = "scale(" + state.scale + ")";

    if (state.cyclesCompleted >= MIN_CYCLES_BEFORE_RESUME) {
      calmResumeBtn.classList.add("ready");
      calmCyclesLabel.textContent = GameLanguage.text("ready");
    } else {
      const remaining = MIN_CYCLES_BEFORE_RESUME - state.cyclesCompleted;
      calmCyclesLabel.textContent = GameLanguage.text("cycles") + " · " + remaining;
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
  const medAffirmContainer = document.getElementById("med-affirm-container");
  const medAffirmText = document.getElementById("med-affirm-text");
  const medAffirmCount = document.getElementById("med-affirm-count");
  let affirmIndex = 0;

  function renderAffirmation(delta = 0) {
    const count = MEDITATION_AFFIRMATIONS.length;
    affirmIndex = (affirmIndex + delta + count) % count;
    medAffirmText.textContent = MEDITATION_AFFIRMATIONS[affirmIndex];
    medAffirmCount.textContent = (affirmIndex + 1) + " / " + count;
  }

  document.getElementById("med-choice-affirm").addEventListener("click", () => {
    Meditation.startAffirmations();
    showMeditationExercise("affirmations");
    document.getElementById("med-affirm-next").focus();
  });
  document.getElementById("med-affirm-prev").addEventListener("click", () => renderAffirmation(-1));
  document.getElementById("med-affirm-next").addEventListener("click", () => renderAffirmation(1));
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

    medBreathPhaseLabel.textContent = GameLanguage.text(updatedPhase.label);
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
          medScanProgress.textContent = GameLanguage.text("step") + " " + (state.stepIndex + 1) + " / " + state.totalSteps;
          medScanZone.textContent = GameLanguage.item("zones", state.stepIndex, state.zone);
          medScanInstruction.textContent = GameLanguage.item("instructions", state.stepIndex, state.instruction);
          medScanSeconds.textContent = state.secondsLeft;
          medScanPhaseBadge.textContent = GameLanguage.text(state.phase);
          medScanPhaseBadge.className = state.phase;
        }
      }
    }

    medAnimFrame = requestAnimationFrame(medLoop);
  }

  function showMeditationExercise(exercise) {
    meditationMenu.style.display = "none";
    meditationExerciseView.classList.add("visible");
    medAffirmContainer.hidden = exercise !== "affirmations";
    medBreathContainer.style.display = exercise === "breathing" ? "flex" : "none";
    medScanContainer.style.display = exercise === "bodyscan" ? "flex" : "none";

    if (exercise === "breathing") {
      medBreathPhaseIndex = 0;
      medBreathPhaseStart = performance.now();
    } else if (exercise === "bodyscan") {
      medScanFinished.classList.remove("visible");
      medScanContainer.querySelectorAll(":scope > *:not(#med-scan-finished)").forEach(el => el.style.display = "");
    }

    if (medAnimFrame) { cancelAnimationFrame(medAnimFrame); medAnimFrame = null; }
    if (exercise === "affirmations") renderAffirmation();
    else medLoop();
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
