const MeditationBubbles = (() => {
  let field, message, spawnTimer;
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
  }

  function spawn() {
    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "meditation-bubble";
    bubble.setAttribute("aria-label", GameLanguage.text("affirmTitle"));
    bubble.style.left = (6 + Math.random() * 68) + "%";
    bubble.style.setProperty("--drift", (Math.random() * 24 - 12) + "px");
    let popped = false;

    function pop() {
      if (popped) return;
      popped = true;
      bubble.disabled = true;
      bubble.classList.add("popped");
      const count = MEDITATION_AFFIRMATIONS.length;
      lastIndex = (lastIndex + 1 + Math.floor(Math.random() * (count - 1))) % count;
      message.textContent = MEDITATION_AFFIRMATIONS[lastIndex];
      GameSound.pop();
      later(() => bubble.remove(), 350);
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
    GameSound.unlock();
    spawn();
    spawnTimer = setInterval(spawn, 4500);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (Meditation.isVisible() && Meditation.getActiveExercise() === "affirmations") start();
  });

  return { start, stop };
})();
