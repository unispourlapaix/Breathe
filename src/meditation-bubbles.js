const MeditationBubbles = (() => {
  let field, message, spawnTimer, resizeObserver;
  let lastIndex = -1;
  const pending = new Set();

  function later(callback, delay) {
    const timer = setTimeout(() => {
      pending.delete(timer);
      callback();
    }, delay);
    pending.add(timer);
  }

  function stop() {
    clearInterval(spawnTimer);
    for (const timer of pending) clearTimeout(timer);
    pending.clear();
    field?.replaceChildren();
    resizeObserver?.disconnect();
  }

  function spawn() {
    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "meditation-bubble";
    bubble.setAttribute("aria-label", GameLanguage.text("affirmTitle"));
    message.classList.remove("revealed");
    let popped = false;

    function pop() {
      if (popped) return;
      popped = true;
      bubble.disabled = true;
      bubble.classList.add("popped");
      const count = MEDITATION_AFFIRMATIONS.length;
      lastIndex = (lastIndex + 1 + Math.floor(Math.random() * (count - 1))) % count;
      const language = document.documentElement.lang;
      const translation = MEDITATION_AFFIRMATION_TRANSLATIONS[lastIndex]?.[language];
      message.textContent = translation ?? MEDITATION_AFFIRMATIONS[lastIndex];
      message.lang = translation ? language : "fr";
      message.classList.add("revealed");
      GameSound.pop();
      later(() => bubble.remove(), 1600);
    }

    bubble.addEventListener("click", pop);
    field.appendChild(bubble);
    later(pop, 3000);
  }

  function start() {
    stop();
    field = document.getElementById("med-affirm-bubbles");
    message = document.getElementById("med-affirm-text");
    message.textContent = "";
    const canvas = document.getElementById("med-affirm-landscape");
    const image = document.getElementById("garden-landscapes-1");
    function drawBackground() {
      if (!image.naturalWidth) return;
      const { width, height } = field.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = image.naturalWidth / 2 - 8;
      const h = image.naturalHeight / 2 - 8;
      const scale = Math.max(width / w, height / h);
      ctx.drawImage(image, 4 + (w - width / scale) / 2, 4 + (h - height / scale) / 2,
        width / scale, height / scale, 0, 0, width, height);
    }
    resizeObserver = new ResizeObserver(drawBackground);
    resizeObserver.observe(field);
    if (!image.complete) image.addEventListener("load", drawBackground, { once:true });
    drawBackground();
    GameSound.unlock();
    spawn();
    spawnTimer = setInterval(spawn, 9500);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (Meditation.isVisible() && Meditation.getActiveExercise() === "affirmations") start();
  });

  return { start, stop };
})();
