/* ============================================
   MOD-PROGRESS-001 : Progression du jardin de bonsaïs
   Sauvegarde via window.storage (persiste sur l'appareil)
   ============================================ */

const Progress = (() => {

  const STORAGE_KEY = "bonsai-progress-v1";
  let state = {
    speciesIndex: 0,
    level: 0, // 0 -> 888 (feuilles actuelles de l'arbre en cours)
    completedSpecies: [] // indices des arbres déjà terminés (888 atteint)
  };
  let loaded = false;

  // Stockage : window.storage dans Claude, sinon localStorage (navigateur, GitHub Pages)
  async function storageGet() {
    if (window.storage) {
      const r = await window.storage.get(STORAGE_KEY, false);
      return r && r.value ? r.value : null;
    }
    return window.localStorage.getItem(STORAGE_KEY);
  }
  async function storageSet(value) {
    if (window.storage) { await window.storage.set(STORAGE_KEY, value, false); return; }
    window.localStorage.setItem(STORAGE_KEY, value);
  }

  async function load() {
    try {
      const raw = await storageGet();
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) {
      // pas de sauvegarde existante, ou stockage indisponible : on garde l'état par défaut
    }
    loaded = true;
    return state;
  }

  async function save() {
    try {
      await storageSet(JSON.stringify(state));
    } catch (e) {
      // échec silencieux : le jeu continue même sans sauvegarde persistée
      console.warn("Sauvegarde progression impossible :", e);
    }
  }

  function getState() { return state; }

  function isLoaded() { return loaded; }

  // Appelé à chaque cœur rempli (1 session = 1 niveau)
  async function advanceLevel() {
    const maxLevel = Bonsai.getLevelsPerTree();
    state.level = Math.min(maxLevel, state.level + 1);

    if (state.level >= maxLevel) {
      // arbre terminé : on le marque comme complété
      if (!state.completedSpecies.includes(state.speciesIndex)) {
        state.completedSpecies.push(state.speciesIndex);
      }
    }
    await save();
    return state;
  }

  // Choisir un nouvel arbre (après avoir terminé le précédent, ou changement manuel)
  async function chooseSpecies(index) {
    state.speciesIndex = index;
    state.level = state.completedSpecies.includes(index) ? Bonsai.getLevelsPerTree() : 0;
    await save();
    return state;
  }

  function isCurrentTreeComplete() {
    return state.level >= Bonsai.getLevelsPerTree();
  }

  return { load, save, getState, isLoaded, advanceLevel, chooseSpecies, isCurrentTreeComplete };
})();
