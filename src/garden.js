/* Écran du jardin : sélection, progression et rendu de l’illustration. */
const Garden = (() => {
  let canvas, ctx, atlas, landscapes;
  let speciesRow, progressBar, progressFill, progressLabel, treeNameEl, treeJpEl;
  let visible = false;
  let selectedSpecies = 0;
  let replayButton, replayFrame, sprout;

  function init() {
    canvas = document.getElementById("garden-canvas");
    ctx = canvas.getContext("2d");
    atlas = document.getElementById("garden-tree-atlas");
    landscapes = [
      document.getElementById("garden-landscapes-1"),
      document.getElementById("garden-landscapes-2")
    ];
    for (const landscape of landscapes) landscape.addEventListener("load", render);
    atlas.addEventListener("load", () => {
      if (!visible) return;
      render();
      for (const [index, chip] of Array.from(speciesRow.children).entries()) {
        drawSpeciesIcon(chip.firstElementChild, index);
      }
    });
    speciesRow = document.getElementById("garden-species-row");
    progressBar = document.getElementById("garden-progress-bar");
    progressFill = document.getElementById("garden-progress-fill");
    progressLabel = document.getElementById("garden-progress-label");
    treeNameEl = document.getElementById("garden-tree-name");
    treeJpEl = document.getElementById("garden-tree-jp");
    replayButton = document.getElementById("garden-replay-sprout");
    replayButton.addEventListener("click", replaySprout);

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
      const locked = i !== state.speciesIndex && !isComplete && !canStartSpecies(i, state);
      const label = species.name + (locked ? " · Aperçu du jardin" : "");
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
        refreshHeader();
        speciesRow.children[i].focus({ preventScroll: true });
      });

      speciesRow.appendChild(chip);
    }
    speciesRow.scrollLeft = scrollLeft;
  }

  function drawSpeciesIcon(icon, index) {
    GardenScene.drawTree(icon.getContext("2d"), atlas, index, 46, 85, 78, Bonsai.getLevelsPerTree());
  }

  function canStartSpecies(index, state) {
    return index === state.speciesIndex + 1 &&
      state.level === Bonsai.getLevelsPerTree() &&
      !state.completedSpecies.includes(index);
  }

  function selectedLevel(state) {
    if (selectedSpecies === state.speciesIndex) return state.level;
    return state.completedSpecies.includes(selectedSpecies) ? Bonsai.getLevelsPerTree() : 0;
  }

  function refreshHeader() {
    const state = Progress.getState();
    const species = Bonsai.getSpecies(selectedSpecies);
    const maxLevel = Bonsai.getLevelsPerTree();
    const level = selectedLevel(state);
    const preview = selectedSpecies !== state.speciesIndex && !state.completedSpecies.includes(selectedSpecies);
    replayButton.hidden = species.leafShape !== "maple" || Bonsai.levelToLeafCount(level) === 0;
    treeNameEl.textContent = species.name;
    treeJpEl.textContent = species.nameJp + " · " + GardenScene.getName(selectedSpecies);
    progressFill.style.width = (level / maxLevel * 100) + "%";
    progressBar.setAttribute("aria-valuenow", level);
    progressBar.setAttribute("aria-valuemax", maxLevel);
    progressLabel.textContent = preview ? "Aperçu · Arbre à débloquer" : "Niveau " + level + " / " + maxLevel;
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
    GardenScene.draw(ctx, width, height, landscapes, atlas, selectedSpecies, selectedLevel(state), sprout);
  }

  function stopSprout() {
    if (replayFrame !== undefined) cancelAnimationFrame(replayFrame);
    replayFrame = undefined;
    sprout = undefined;
  }

  function replaySprout() {
    stopSprout();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();

    function animate(now) {
      const elapsed = now - start;
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
      replayFrame = requestAnimationFrame(animate);
    }

    replayFrame = requestAnimationFrame(animate);
  }

  function show() {
    selectedSpecies = Progress.getState().speciesIndex;
    visible = true;
    document.getElementById("garden-overlay").classList.add("visible");
    refreshHeader();
    buildSpeciesRow();
  }

  function hide() {
    stopSprout();
    visible = false;
    document.getElementById("garden-overlay").classList.remove("visible");
  }

  async function onSessionComplete() {
    const wasComplete = Progress.isCurrentTreeComplete();
    await Progress.advanceLevel();
    const isNowComplete = Progress.isCurrentTreeComplete();
    return { justCompletedTree: !wasComplete && isNowComplete };
  }

  return { init, show, hide, onSessionComplete, refreshHeader, buildSpeciesRow };
})();
