/* ============================================
   MOD-MEDITATION-001 : Mode Méditation
   Deux exercices : respiration guidée (réutilise le cercle visuel),
   et relaxation musculaire progressive (scan du corps, crâne -> orteils)
   ============================================ */

const Meditation = (() => {

  let visible = false;
  let activeExercise = null; // "breathing" | "bodyscan" | null (menu de choix)

  // ---- Relaxation musculaire progressive : étapes du scan corporel ----
  // Méthode classique : on contracte légèrement chaque groupe musculaire quelques secondes,
  // puis on relâche complètement en se concentrant sur la sensation de détente.
  const BODY_SCAN_STEPS = [
    { zone: "Le crâne et le cuir chevelu", instruction: "Fronce doucement le cuir chevelu, comme pour hausser les sourcils très haut.", holdSec: 5, releaseSec: 8 },
    { zone: "Le front et les yeux", instruction: "Ferme les yeux fort, plisse le front.", holdSec: 5, releaseSec: 8 },
    { zone: "La mâchoire et les joues", instruction: "Serre les dents légèrement, contracte les joues.", holdSec: 5, releaseSec: 8 },
    { zone: "Le cou et la gorge", instruction: "Rentre doucement le menton vers la gorge.", holdSec: 5, releaseSec: 8 },
    { zone: "Les épaules", instruction: "Remonte les épaules vers les oreilles.", holdSec: 5, releaseSec: 8 },
    { zone: "Les bras et les avant-bras", instruction: "Serre les poings, contracte les avant-bras.", holdSec: 5, releaseSec: 8 },
    { zone: "Les mains et les doigts", instruction: "Serre les poings très fort.", holdSec: 5, releaseSec: 8 },
    { zone: "La poitrine", instruction: "Inspire profondément et retiens en gonflant la poitrine.", holdSec: 5, releaseSec: 8 },
    { zone: "Le ventre", instruction: "Contracte les muscles du ventre, comme pour un petit effort.", holdSec: 5, releaseSec: 8 },
    { zone: "Le dos", instruction: "Cambre légèrement le dos, rapproche les omoplates.", holdSec: 5, releaseSec: 8 },
    { zone: "Les fessiers", instruction: "Contracte les fessiers.", holdSec: 5, releaseSec: 8 },
    { zone: "Les cuisses", instruction: "Contracte les muscles des cuisses.", holdSec: 5, releaseSec: 8 },
    { zone: "Les mollets", instruction: "Pointe les orteils vers toi pour contracter les mollets.", holdSec: 5, releaseSec: 8 },
    { zone: "Les pieds et les orteils", instruction: "Recroqueville les orteils vers le bas.", holdSec: 5, releaseSec: 8 },
    { zone: "Le corps entier", instruction: "Laisse maintenant chaque muscle, du crâne aux orteils, complètement détendu.", holdSec: 0, releaseSec: 14 },
  ];

  let scanStepIndex = 0;
  let scanPhase = "hold"; // "hold" | "release"
  let scanPhaseStart = 0;
  let onCloseCallback = null;

  function init(onClose) {
    onCloseCallback = onClose;
  }

  function show() {
    visible = true;
    activeExercise = null;
  }

  function hide() {
    visible = false;
    activeExercise = null;
    if (onCloseCallback) onCloseCallback();
  }

  function isVisible() { return visible; }

  function startBreathing() {
    activeExercise = "breathing";
  }

  function startBodyScan() {
    activeExercise = "bodyscan";
    scanStepIndex = 0;
    scanPhase = BODY_SCAN_STEPS[0].holdSec > 0 ? "hold" : "release";
    scanPhaseStart = performance.now();
  }

  function backToMenu() {
    activeExercise = null;
  }

  function getActiveExercise() { return activeExercise; }

  // ---- Logique du scan corporel : avance automatiquement de phase en phase, étape en étape ----
  function updateBodyScan() {
    if (activeExercise !== "bodyscan") return null;
    const step = BODY_SCAN_STEPS[scanStepIndex];
    const now = performance.now();
    const elapsed = (now - scanPhaseStart) / 1000;
    const duration = scanPhase === "hold" ? step.holdSec : step.releaseSec;

    if (elapsed >= duration) {
      if (scanPhase === "hold") {
        scanPhase = "release";
        scanPhaseStart = now;
      } else {
        // passe à l'étape suivante
        if (scanStepIndex < BODY_SCAN_STEPS.length - 1) {
          scanStepIndex++;
          const nextStep = BODY_SCAN_STEPS[scanStepIndex];
          scanPhase = nextStep.holdSec > 0 ? "hold" : "release";
          scanPhaseStart = now;
        } else {
          // séance terminée
          return { finished: true };
        }
      }
    }

    const currentStep = BODY_SCAN_STEPS[scanStepIndex];
    const currentDuration = scanPhase === "hold" ? currentStep.holdSec : currentStep.releaseSec;
    const phaseElapsed = (performance.now() - scanPhaseStart) / 1000;

    return {
      finished: false,
      stepIndex: scanStepIndex,
      totalSteps: BODY_SCAN_STEPS.length,
      zone: currentStep.zone,
      instruction: currentStep.instruction,
      phase: scanPhase, // "hold" ou "release"
      secondsLeft: Math.max(0, Math.ceil(currentDuration - phaseElapsed)),
      phaseDuration: currentDuration
    };
  }

  function skipToNextStep() {
    if (scanStepIndex < BODY_SCAN_STEPS.length - 1) {
      scanStepIndex++;
      const nextStep = BODY_SCAN_STEPS[scanStepIndex];
      scanPhase = nextStep.holdSec > 0 ? "hold" : "release";
      scanPhaseStart = performance.now();
    }
  }

  function getBodyScanStepCount() { return BODY_SCAN_STEPS.length; }

  return {
    init, show, hide, isVisible,
    startBreathing, startBodyScan, backToMenu, getActiveExercise,
    updateBodyScan, skipToNextStep, getBodyScanStepCount
  };
})();
