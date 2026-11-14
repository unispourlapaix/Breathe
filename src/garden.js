/* Écran du jardin : sélection, progression et rendu de l’illustration. */
const Garden = (() => {
  let canvas, ctx, trees, landscapes;
  let speciesRow, progressBar, progressFill;
  let visible = false;
  let selectedSpecies = 0;
  let sproutFrame, sprout;
  let description, imageLock, thoughtText, thoughtSource, lastThoughtId;

  function init() {
    canvas = document.getElementById("garden-canvas");
    ctx = canvas.getContext("2d");
    trees = GardenScene.getTreeImages();
    landscapes = [
      document.getElementById("garden-landscapes-1"),
      document.getElementById("garden-landscapes-2")
    ];
    for (const landscape of landscapes) landscape.addEventListener("load", render);
    for (const tree of [trees.bare, trees.growing, trees.mature]) {
      tree.addEventListener("load", () => {
        if (!visible) return;
        render();
        for (const [index, chip] of Array.from(speciesRow.children).entries()) {
          drawSpeciesIcon(chip.firstElementChild, index);
        }
      });
    }
    speciesRow = document.getElementById("garden-species-row");
    progressBar = document.getElementById("garden-progress-bar");
    progressFill = document.getElementById("garden-progress-fill");
    description = document.getElementById("garden-description");
    imageLock = document.getElementById("garden-image-lock");
    thoughtText = document.getElementById("garden-thought-text");
    thoughtSource = document.getElementById("garden-thought-source");

    new ResizeObserver(render).observe(canvas.parentElement);
  }

  function buildSpeciesRow() {
    const state = Progress.getState();
    const scrollLeft = speciesRow.scrollLeft;
    speciesRow.replaceChildren();

    for (let i = 0; i < Bonsai.getTotalSpecies(); i++) {
      const species = Bonsai.getSpecies(i);
      const chip = document.createElement("button");
      chip.className = "garden-species-chip";

      const isComplete = state.completedSpecies.includes(i);
      const locked = isLocked(i, state);
      const label = GameLanguage.item("species", i, species.name) +
        (locked ? " · " + GameLanguage.text("preview") : "");
      chip.title = label;
      chip.setAttribute("aria-label", label);
      chip.setAttribute("aria-pressed", String(selectedSpecies === i));
      chip.classList.toggle("complete", isComplete);
      chip.classList.toggle("locked", locked);

      const icon = document.createElement("canvas");
      icon.width = 92;
      icon.height = 92;
      icon.setAttribute("aria-hidden", "true");
      drawSpeciesIcon(icon, i);
      chip.appendChild(icon);

      chip.addEventListener("click", () => {
        stopSprout();
        if (canStartSpecies(i, Progress.getState())) void Progress.chooseSpecies(i);
        selectedSpecies = i;
        buildSpeciesRow();
        refreshProgress();
        speciesRow.children[i].focus({ preventScroll: true });
      });

      speciesRow.appendChild(chip);
    }
    speciesRow.scrollLeft = scrollLeft;
  }

  function drawSpeciesIcon(icon, index) {
    const iconContext = icon.getContext("2d");
    iconContext.clearRect(0, 0, icon.width, icon.height);
    GardenScene.drawTree(iconContext, trees, index, 46, 85, 78, speciesLevel(Progress.getState(), index));
  }

  function canStartSpecies(index, state) {
    return index === state.speciesIndex + 1 &&
      state.level === Bonsai.getLevelsPerTree() &&
      !state.completedSpecies.includes(index);
  }

  function isLocked(index, state) {
    return index !== state.speciesIndex && !state.completedSpecies.includes(index) &&
      !canStartSpecies(index, state);
  }

  function speciesLevel(state, index) {
    if (index === state.speciesIndex) return state.level;
    return state.completedSpecies.includes(index) ? Bonsai.getLevelsPerTree() : 0;
  }

  function refreshProgress() {
    const state = Progress.getState();
    const species = Bonsai.getSpecies(selectedSpecies);
    const maxLevel = Bonsai.getLevelsPerTree();
    const level = speciesLevel(state, selectedSpecies);
    imageLock.hidden = !isLocked(selectedSpecies, state);
    description.textContent = GameLanguage.item("species", selectedSpecies, species.name) + " (" + species.nameJp + ") · " +
      GardenScene.getName(selectedSpecies);
    canvas.setAttribute("aria-labelledby", description.id);
    progressFill.style.width = (level / maxLevel * 100) + "%";
    progressBar.setAttribute("aria-valuenow", level);
    progressBar.setAttribute("aria-valuemax", maxLevel);
    render();
  }

  function render() {
    if (!visible) return;
    const { width, height } = canvas.parentElement.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);

    const state = Progress.getState();
    GardenScene.draw(ctx, width, height, landscapes, trees, selectedSpecies, speciesLevel(state, selectedSpecies), sprout);
  }

  function stopSprout() {
    if (sproutFrame !== undefined) cancelAnimationFrame(sproutFrame);
    sproutFrame = undefined;
    sprout = undefined;
  }

  function animateSprout() {
    stopSprout();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Laisse le panneau entrer à l’écran avant le début de la pousse.
    const start = performance.now() + (reducedMotion ? 0 : 400);

    function animate(now) {
      const elapsed = Math.max(0, now - start);
      if (elapsed >= 2200) {
        stopSprout();
        render();
        return;
      }
      sprout = {
        progress: reducedMotion ? 1 : Math.min(1, elapsed / 1400),
        opacity: reducedMotion ? 1 : Math.min(1, (2200 - elapsed) / 400)
      };
      render();
      sproutFrame = requestAnimationFrame(animate);
    }

    sproutFrame = requestAnimationFrame(animate);
  }

  function show(playSprout = false) {
    const thought = getRandomQuote(lastThoughtId, BIBLICAL_THOUGHTS);
    lastThoughtId = thought.id;
    thoughtText.textContent = thought.text;
    thoughtSource.textContent = thought.author;
    selectedSpecies = Progress.getState().speciesIndex;
    visible = true;
    document.getElementById("garden-overlay").classList.add("visible");
    refreshProgress();
    buildSpeciesRow();
    if (playSprout) animateSprout();
  }

  function hide() {
    stopSprout();
    visible = false;
    document.getElementById("garden-overlay").classList.remove("visible");
  }

  async function onSessionComplete() {
    const levelBefore = Progress.getState().level;
    const wasComplete = Progress.isCurrentTreeComplete();
    await Progress.advanceLevel();
    const isNowComplete = Progress.isCurrentTreeComplete();
    return {
      justCompletedTree: !wasComplete && isNowComplete,
      gainedLevel: Progress.getState().level > levelBefore
    };
  }

  return { init, show, hide, onSessionComplete, refreshProgress, buildSpeciesRow };
})();
