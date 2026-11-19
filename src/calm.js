function createBreathingGuide() {
  const INHALE_SECONDS = 4;
  const EXHALE_SECONDS = 6;
  let phase = "waiting", phaseStart = 0, releaseScale = 0.85;
  let fullInhale = false, cyclesCompleted = 0;
  function inhaleScale(now) {
    const t = Math.min(1, (now - phaseStart) / (INHALE_SECONDS * 1000));
    return 0.85 + 0.5 * (0.5 - 0.5 * Math.cos(t * Math.PI));
  }

  function press() {
    if (phase !== "waiting") return;
    phase = "inhale";
    phaseStart = performance.now();
  }

  function release() {
    if (phase !== "inhale") return;
    const now = performance.now();
    releaseScale = inhaleScale(now);
    fullInhale = now - phaseStart >= INHALE_SECONDS * 1000;
    phase = "exhale";
    phaseStart = now;
  }

  function updateBreathing() {
    const now = performance.now();
    if (phase === "inhale" && now - phaseStart >= INHALE_SECONDS * 1000) {
      releaseScale = 1.35;
      fullInhale = true;
      phase = "exhale";
      phaseStart += INHALE_SECONDS * 1000;
    }
    const elapsed = (now - phaseStart) / 1000;
    if (phase === "exhale" && elapsed >= EXHALE_SECONDS) {
      if (fullInhale) cyclesCompleted++;
      phase = "waiting";
    }
    if (phase === "waiting") {
      return { label: "pressInhale", secondsLeft: INHALE_SECONDS, scale: 0.85, cyclesCompleted };
    }
    if (phase === "inhale") {
      return {
        label: elapsed >= INHALE_SECONDS ? "releaseExhale" : "keepInhaling",
        secondsLeft: Math.max(0, Math.ceil(INHALE_SECONDS - elapsed)),
        scale: inhaleScale(now), cyclesCompleted
      };
    }
    const t = Math.min(1, elapsed / EXHALE_SECONDS);
    return {
      label: "relaxExhale", secondsLeft: Math.max(0, Math.ceil(EXHALE_SECONDS - elapsed)),
      scale: releaseScale + (0.85 - releaseScale) * (0.5 - 0.5 * Math.cos(t * Math.PI)),
      cyclesCompleted
    };
  }
  return { press, release, updateBreathing };
}
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

  let breathingGuide = createBreathingGuide();
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
    breathingGuide = createBreathingGuide();


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

  function press() {
    if (active) breathingGuide.press();
  }

  function release() {
    if (active) breathingGuide.release();
  }

  function updateBreathing() {
    return active ? breathingGuide.updateBreathing() : null;
  }
  function reset() {
    actionTimestamps = [];
    active = false;
  }

  return { registerAction, trigger, dismiss, isActive, setCallbacks, press, release, updateBreathing, reset };
})();
