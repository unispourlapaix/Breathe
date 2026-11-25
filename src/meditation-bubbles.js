const MeditationBubbles = (() => {
  let canvas, ctx, field, message, bubbleButton, hint, backdrop;
  let width = 0, height = 0, frame, observer, active = false;
  let phase = "ready", charge = 0, phaseTime = 0, lastTime = 0;
  let pointerId = null, origin, aim = 0, flight;
  let flowers = [], petals = [], lastIndex = -1, celebration = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function wallY() { return height * 0.39; }

  function setHint(key) {
    hint.textContent = GameLanguage.text(key);
    bubbleButton.setAttribute("aria-label", GameLanguage.text(key));
  }

  function prepare() {
    phase = "ready";
    phaseTime = 0;
    charge = 0;
    aim = 0;
    bubbleButton.hidden = false;
    bubbleButton.disabled = false;
    message.classList.remove("revealed");
    setHint("gardenBreatheIn");
  }

  function press() {
    if (phase !== "ready") return;
    phase = "charging";
    phaseTime = 0;
    setHint("gardenRelease");
    GameSound.unlock();
  }

  function launch() {
    if (phase !== "charging") return;
    const targetX = Math.max(35, Math.min(width - 35, width / 2 + aim * 2));
    flight = { x: width / 2, y: height * 0.79, targetX, targetY: wallY() + Math.random() * 25 - 12 };
    phase = "flying";
    phaseTime = 0;
    bubbleButton.disabled = true;
    setHint("gardenBloom");
  }

  function showThought(x, y) {
    const count = MEDITATION_AFFIRMATIONS.length;
    lastIndex = (lastIndex + 1 + Math.floor(Math.random() * (count - 1))) % count;
    const language = document.documentElement.lang;
    message.textContent = MEDITATION_AFFIRMATION_TRANSLATIONS[lastIndex]?.[language] ??
      MEDITATION_AFFIRMATIONS[lastIndex];
    message.lang = language;
    message.style.left = Math.max(0.25, Math.min(0.75, x / width)) * 100 + "%";
    message.style.top = Math.max(height * 0.52, y + 65) + "px";
    message.classList.add("revealed");
  }

  function impact() {
    phase = "blooming";
    phaseTime = 0;
    bubbleButton.hidden = true;
    const flower = { x: flight.targetX / width, y: flight.targetY / height,
      age: 0, color: Math.random(), seed: Math.random() * 6 };
    flowers.push(flower);
    if (flowers.length > 60) flowers.shift();
    if (flowers.length % 6 === 0) {
      celebration = 3;
      for (let i = 0; i < 18; i++) {
        petals.push({ x: flower.x * width, y: flower.y * height,
          vx: (Math.random() - 0.5) * 34, vy: 12 + Math.random() * 18, age: 0, rotation: Math.random() * 6 });
      }
    }
    showThought(flight.targetX, flight.targetY);
    GameSound.pop();
  }

  function drawBackground() {
    backdrop = document.createElement("canvas");
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    const background = backdrop.getContext("2d");
    background.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    background.fillStyle = "#e8e7c9";
    background.fillRect(0, 0, width, height);
    const image = document.getElementById("garden-landscapes-1");
    if (image.naturalWidth) {
      const w = image.naturalWidth / 2 - 8, h = image.naturalHeight / 2 - 8;
      const scale = Math.max(width / w, height / h);
      background.drawImage(image, 4 + (w - width / scale) / 2, 4 + (h - height / scale) / 2,
        width / scale, height / scale, 0, 0, width, height);
    }
    // Le feuillage est constitué de rameaux botaniques déjà illustrés pour les bonsaïs.
    const leaves = document.getElementById("garden-sprout-atlas");
    const ground = wallY();
    background.fillStyle = "#426951db";
    background.beginPath();
    background.ellipse(width / 2, ground, width * 0.67, height * 0.17, 0, 0, Math.PI * 2);
    background.fill();
    if (leaves.naturalWidth) {
      const cellW = leaves.naturalWidth / 3, cellH = leaves.naturalHeight / 2;
      for (let row = 0; row < 4; row++) {
        for (let column = 0; column < Math.ceil(width / 43) + 1; column++) {
          const x = column * 43 + (row % 2) * 17;
          const y = ground - height * 0.13 + row * height * 0.065;
          background.save();
          background.translate(x, y);
          background.rotate(Math.sin(column * 5 + row * 7) * 0.6);
          background.drawImage(leaves, 0, cellH, cellW, cellH, -35, -35, 70, 70);
          background.restore();
        }
      }
    }
  }

  function resize() {
    const rect = field.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    drawBackground();
  }

  function drawGrowth(dt) {
    const atlas = document.getElementById("garden-sprout-atlas");
    for (const flower of flowers) {
      flower.age += dt;
      const age = reducedMotion.matches ? 5 : flower.age;
      const x = flower.x * width, y = flower.y * height;
      ctx.save();
      ctx.translate(x, y);
      // Frémissement du rameau au point d’impact.
      ctx.rotate(reducedMotion.matches ? 0 : Math.sin(age * 16) * Math.max(0, 1 - age) * 0.2);
      ctx.strokeStyle = "#92b66a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.quadraticCurveTo(-5, 3, 0, -Math.min(12, age * 10));
      ctx.stroke();
      const bloom = Math.max(0, Math.min(1, (age - 1.4) / 2));
      ctx.fillStyle = "#edb6c0";
      ctx.beginPath();
      ctx.ellipse(0, -10, 3 + bloom * 3, 5 + bloom * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (bloom > 0 && atlas.naturalWidth) {
        const cellW = atlas.naturalWidth / 3, cellH = atlas.naturalHeight / 2;
        const size = 18 + bloom * 32;
        ctx.globalAlpha = bloom;
        // Cerisier et azalée conservent la texture peinte du jardin.
        ctx.drawImage(atlas, cellW, flower.color < 0.5 ? 0 : cellH,
          cellW, cellH, -size / 2, -size / 2 - 8, size, size);
      }
      ctx.restore();
    }
    petals = petals.filter(petal => petal.age < 5);
    for (const petal of petals) {
      petal.age += dt;
      if (!reducedMotion.matches) {
        petal.x += (petal.vx + Math.sin(petal.age * 3) * 8) * dt;
        petal.y += petal.vy * dt;
      }
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation + petal.age);
      ctx.globalAlpha = Math.min(1, 5 - petal.age);
      ctx.fillStyle = "#ffe1e1";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (celebration > 0) {
      celebration -= dt;
      const glow = ctx.createRadialGradient(width / 2, wallY(), 0, width / 2, wallY(), width * 0.6);
      glow.addColorStop(0, "#fff5c240");
      glow.addColorStop(1, "#fff5c200");
      ctx.globalAlpha = Math.max(0, celebration / 3);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

  function tick(time) {
    if (!active) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    phaseTime += dt;
    let x = width / 2, y = height * 0.79, scale = 0.7;
    if (phase === "charging") {
      charge = Math.min(1, phaseTime / 4);
      scale = 0.7 + charge * 0.65;
      if (phaseTime >= 4) setHint("gardenRelease");
      x += aim * 0.3;
      y += Math.min(30, Math.abs(aim) * 0.12);
    } else if (phase === "flying") {
      const t = Math.min(1, phaseTime / 2.2);
      const eased = t * t * (3 - 2 * t);
      x = flight.x + (flight.targetX - flight.x) * eased;
      y = flight.y + (flight.targetY - flight.y) * eased;
      scale = (0.7 + charge * 0.65) * (1 - Math.max(0, t - 0.85) * 2);
      if (t === 1) impact();
    } else if (phase === "blooming" && phaseTime > 7) {
      prepare();
    }
    bubbleButton.style.left = x + "px";
    bubbleButton.style.top = y + "px";
    bubbleButton.style.transform = "translate(-50%,-50%) scale(" + scale + ")";
    if (width && height && backdrop) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(backdrop, 0, 0);
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      drawGrowth(dt);
    }
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    pointerId = null;
    if (field) field.replaceChildren();
  }

  function start() {
    stop();
    field = document.getElementById("med-affirm-bubbles");
    message = document.getElementById("med-affirm-text");
    hint = document.getElementById("med-affirm-hint");
    canvas = document.getElementById("med-affirm-landscape");
    ctx = canvas.getContext("2d");
    bubbleButton = document.createElement("button");
    bubbleButton.className = "meditation-bubble";
    bubbleButton.type = "button";
    field.appendChild(bubbleButton);
    bubbleButton.addEventListener("pointerdown", event => {
      if (event.button !== 0 || pointerId !== null || phase !== "ready") return;
      pointerId = event.pointerId;
      origin = { x: event.clientX, y: event.clientY };
      bubbleButton.setPointerCapture(pointerId);
      press();
    });
    bubbleButton.addEventListener("pointermove", event => {
      if (event.pointerId === pointerId) aim = Math.max(-width * 0.35,
        Math.min(width * 0.35, event.clientX - origin.x));
    });
    bubbleButton.addEventListener("pointerup", event => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      launch();
    });
    function cancel(event) {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      prepare();
    }
    bubbleButton.addEventListener("pointercancel", cancel);
    bubbleButton.addEventListener("lostpointercapture", cancel);
    bubbleButton.addEventListener("keydown", event => {
      if (![" ", "Enter"].includes(event.key)) return;
      event.preventDefault();
      press();
    });
    bubbleButton.addEventListener("keyup", event => {
      if (![" ", "Enter"].includes(event.key)) return;
      event.preventDefault();
      launch();
    });
    observer = new ResizeObserver(resize);
    observer.observe(field);
    for (const id of ["garden-landscapes-1", "garden-sprout-atlas"]) {
      const image = document.getElementById(id);
      if (!image.complete) image.addEventListener("load", () => { if (active) resize(); }, { once:true });
    }
    resize();
    active = true;
    lastTime = 0;
    prepare();
    frame = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (Meditation.isVisible() && Meditation.getActiveExercise() === "affirmations") start();
  });

  return { start, stop };
})();
