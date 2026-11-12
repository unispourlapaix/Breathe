/* ============================================
   MOD-CALM-001 : Détection de rythme rapide + overlay de respiration
   Surveille la fréquence des taps/swipes pendant le jeu.
   Si le rythme est trop soutenu sur une courte fenêtre, propose une pause respiration.
   ============================================ */

const Calm = (() => {

  const WINDOW_MS = 4000; // fenêtre d'observation du rythme
  const THRESHOLD_ACTIONS = 9; // nombre d'actions dans la fenêtre déclenchant l'invite
  const COOLDOWN_MS = 45000; // ne propose plus l'overlay avant ce délai après une fermeture

  let actionTimestamps = [];
  let lastDismissTime = -Infinity;
  let active = false;

  // Cycle de respiration : phases en secondes (méthode 4-4-6, douce et accessible)
  const BREATH_CYCLE = [
    { label: "Inspire", duration: 4, scaleTo: 1.35 },
    { label: "Retiens", duration: 4, scaleTo: 1.35 },
    { label: "Expire", duration: 6, scaleTo: 0.85 },
  ];

  let phaseIndex = 0;
  let phaseStart = 0;
  let cyclesCompleted = 0;
  let onActivateCallback = null;
  let onResumeCallback = null;

  function registerAction() {
    if (active) return; // pas la peine de continuer à compter pendant que l'overlay est affiché
    const now = performance.now();
    actionTimestamps.push(now);
    actionTimestamps = actionTimestamps.filter(t => now - t <= WINDOW_MS);

    if (actionTimestamps.length >= THRESHOLD_ACTIONS && now - lastDismissTime > COOLDOWN_MS) {
      trigger();
    }
  }

  function trigger() {
    active = true;
    actionTimestamps = [];
    phaseIndex = 0;
    phaseStart = performance.now();
    cyclesCompleted = 0;
    if (onActivateCallback) onActivateCallback();
  }

  function dismiss() {
    active = false;
    lastDismissTime = performance.now();
    if (onResumeCallback) onResumeCallback();
  }

  function isActive() { return active; }

  function setCallbacks(onActivate, onResume) {
    onActivateCallback = onActivate;
    onResumeCallback = onResume;
  }

  // Avance la phase de respiration ; retourne l'état courant pour le rendu
  function updateBreathing(dt) {
    if (!active) return null;
    const now = performance.now();
    const elapsed = (now - phaseStart) / 1000;
    const phase = BREATH_CYCLE[phaseIndex];

    if (elapsed >= phase.duration) {
      phaseIndex = (phaseIndex + 1) % BREATH_CYCLE.length;
      if (phaseIndex === 0) cyclesCompleted++;
      phaseStart = now;
      return updateBreathing(0); // recalcule immédiatement sur la nouvelle phase
    }

    const t = elapsed / phase.duration;
    // easing doux (sinus) plutôt que linéaire, pour une respiration moins mécanique
    const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);

    const prevPhase = BREATH_CYCLE[(phaseIndex - 1 + BREATH_CYCLE.length) % BREATH_CYCLE.length];
    const fromScale = prevPhase.scaleTo;
    const toScale = phase.scaleTo;
    const currentScale = fromScale + (toScale - fromScale) * eased;

    return {
      label: phase.label,
      secondsLeft: Math.ceil(phase.duration - elapsed),
      scale: currentScale,
      cyclesCompleted
    };
  }

  function reset() {
    actionTimestamps = [];
    active = false;
  }

  return { registerAction, trigger, dismiss, isActive, setCallbacks, updateBreathing, reset };
})();
