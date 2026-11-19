const BackgroundMusic = (() => {
  const tracks = [
    "l-appel-du-tres-haut.mp3", "la-paix-interieure-02.mp3", "la-paix-interieure.mp3",
    "le-premier-souffle-02.mp3", "le-premier-souffle.mp3", "le-repos-de-l-ame.mp3",
    "le-silence-de-dieu-02.mp3", "le-silence-de-dieu.mp3",
    "le-vent-de-la-grace-02.mp3", "le-vent-de-la-grace.mp3"
  ];
  const audio = new Audio();
  audio.volume = 0.3;
  audio.preload = "none";
  const button = document.getElementById("sound-toggle");
  let muted = false;
  let started = false;
  let playing = false;
  let queue = [];
  let previous;
  const failed = new Set();
  try { muted = localStorage.getItem("breathe-muted") === "true"; } catch {}

  function nextTrack() {
    if (!queue.length) {
      queue = tracks.filter(track => !failed.has(track));
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      if (queue.length > 1 && queue.at(-1) === previous) {
        [queue[0], queue[queue.length - 1]] = [queue.at(-1), queue[0]];
      }
    }
    const track = queue.pop();
    if (!track) return false;
    previous = track;
    audio.src = "assets/mp3/" + track;
    return true;
  }

  async function play() {
    if (!started || muted || document.hidden || playing) return;
    if (!audio.getAttribute("src") && !nextTrack()) return;
    playing = true;
    try { await audio.play(); } catch {}
    finally {
      playing = false;
      if (muted || document.hidden) audio.pause();
    }
  }

  function refresh() {
    button.textContent = muted ? "🔇" : "🔊";
    const labels = {
      fr: ["Couper le son", "Activer le son"],
      en: ["Mute sound", "Enable sound"],
      ja: ["消音", "音をオンにする"],
      es: ["Silenciar", "Activar sonido"],
      pt: ["Silenciar", "Ativar som"]
    };
    const label = (labels[document.documentElement.lang] || labels.fr)[muted ? 1 : 0];
    button.setAttribute("aria-label", label);
    button.title = label;
    button.setAttribute("aria-pressed", String(muted));
    GameSound.setMuted(muted);
  }

  button.addEventListener("click", () => {
    muted = !muted;
    started = true;
    try { localStorage.setItem("breathe-muted", String(muted)); } catch {}
    refresh();
    if (muted) audio.pause();
    else { GameSound.unlock(); void play(); }
  });
  function start(event) {
    if (event.target.closest("#sound-toggle")) return;
    started = true;
    void play();
  }
  document.addEventListener("pointerdown", start);
  document.addEventListener("keydown", start);
  audio.addEventListener("ended", () => { if (nextTrack()) void play(); });
  audio.addEventListener("error", () => {
    failed.add(previous);
    queue = queue.filter(track => !failed.has(track));
    if (nextTrack()) setTimeout(() => void play(), 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause();
    else void play();
  });
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  refresh();
})();
