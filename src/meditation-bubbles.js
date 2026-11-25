const MeditationBubbles = (() => {
  let canvas, ctx, field, hint, button, observer, frame, backdrop;
  let width = 0, height = 0, active = false, lastTime = 0;
  let phase = "appearing", age = 0, pointer = null, origin;
  let pull = { x: 0, y: 0 }, bubble = {}, droplets = [], ripples = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function radius() { return Math.min(64, width * 0.16, height * 0.12); }
  function wall() { return height * 0.29; }
  function floor() { return height * 0.9; }
  function home() { return { x: width * 0.5, y: height * 0.62 }; }

  function label(key) {
    hint.textContent = GameLanguage.text(key);
    button.setAttribute("aria-label", GameLanguage.text(key));
  }

  function resetBubble() {
    phase = "appearing";
    age = 0;
    pull = { x: 0, y: 0 };
    bubble = { ...home(), vx: 0, vy: 0, impactX: 0, impactY: 1 };
    label("elasticReady");
  }

  function background() {
    backdrop = document.createElement("canvas");
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    const c = backdrop.getContext("2d");
    c.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    c.fillStyle = "#d9dec4";
    c.fillRect(0, 0, width, height);
    const image = document.getElementById("garden-landscapes-1");
    if (image.naturalWidth) {
      const w = image.naturalWidth / 2 - 8, h = image.naturalHeight / 2 - 8;
      const scale = Math.max(width / w, height / h);
      c.drawImage(image, 4 + (w - width / scale) / 2, 4 + (h - height / scale) / 2,
        width / scale, height / scale, 0, 0, width, height);
    }
    // Une brume légère unifie les feuilles ajoutées et le paysage peint.
    const mist = c.createLinearGradient(0, 0, 0, height);
    mist.addColorStop(0, "#c5d7ae50");
    mist.addColorStop(0.55, "#fff7e333");
    mist.addColorStop(1, "#edf4dc10");
    c.fillStyle = mist;
    c.fillRect(0, 0, width, height);
  }

  function resize() {
    const oldWidth = width, oldHeight = height;
    const rect = field.getBoundingClientRect();
    width = rect.width; height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    background();
    if (oldWidth && oldHeight) {
      bubble.x *= width / oldWidth;
      bubble.y *= height / oldHeight;
    }
    if (phase === "dragging") {
      pointer = null;
      resetBubble();
    }
  }

  function impact(nx, ny) {
    if (phase !== "flying") return;
    phase = "impact";
    age = 0;
    bubble.impactX = nx;
    bubble.impactY = ny;
    const speed = Math.hypot(bubble.vx, bubble.vy);
    ripples.push({ x: bubble.x / width, y: bubble.y / height, age: 0, strength: clamp(speed / 250, 0.5, 1.2) });
    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 15 + Math.random() * 55;
      droplets.push({ x: bubble.x, y: bubble.y, vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 15, age: 0, size: 1 + Math.random() * 2.1 });
    }
    GameSound.pop();
    label("elasticRest");
  }

  function update(dt) {
    age += dt;
    if (phase === "appearing" && age > 1.2) phase = "ready";
    if (phase === "flying") {
      bubble.vy += height * 0.08 * dt;
      bubble.x += bubble.vx * dt;
      bubble.y += bubble.vy * dt;
      const r = radius();
      if (bubble.y - r <= wall()) {
        bubble.y = wall() + r;
        impact(0, 1);
      } else if (bubble.y + r >= floor()) {
        bubble.y = floor() - r;
        impact(0, -1);
      } else if (bubble.x - r <= 0) {
        bubble.x = r;
        impact(1, 0);
      } else if (bubble.x + r >= width) {
        bubble.x = width - r;
        impact(-1, 0);
      }
    }
    if (phase === "impact" && age > 2.3) resetBubble();
    for (const drop of droplets) {
      drop.age += dt;
      if (!reducedMotion.matches) {
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.vy += 12 * dt;
      }
    }
    droplets = droplets.filter(drop => drop.age < 2.4);
    for (const ripple of ripples) ripple.age += dt;
    ripples = ripples.filter(ripple => ripple.age < 3);
  }

  function foliage() {
    const atlas = document.getElementById("garden-sprout-atlas");
    if (!atlas.naturalWidth) return;
    const sw = atlas.naturalWidth / 3, sh = atlas.naturalHeight / 2;
    // Un rideau peu dense conserve la transparence et les détails de la cascade.
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < Math.ceil(width / 46) + 1; i++) {
        let x = i * 46 + (row % 2) * 20 - 20;
        let y = wall() - 55 + row * 25;
        let turn = Math.sin(i * 3.1 + row * 5) * 0.65;
        for (const ripple of ripples) {
          const distance = Math.hypot(x - ripple.x * width, y - ripple.y * height);
          const wave = Math.exp(-distance / 110) * Math.exp(-ripple.age * 1.7) * ripple.strength;
          if (!reducedMotion.matches) {
            turn += Math.sin(ripple.age * 9 - distance / 35) * wave * 0.6;
            x += Math.sin(ripple.age * 7) * wave * 11;
            y += Math.sin(ripple.age * 9 - distance / 35) * wave * 7;
          }
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(turn);
        ctx.globalAlpha = 0.88;
        ctx.drawImage(atlas, 0, sh, sw, sh, -32, -37, 64, 64);
        ctx.restore();
      }
    }
  }

  function drawBubble() {
    const r = radius(), h = home();
    let x = bubble.x, y = bubble.y;
    let stretch = 0;
    if (phase === "ready" || phase === "appearing") {
      x = h.x; y = h.y;
    }
    if (phase === "dragging") {
      x = h.x + pull.x * 0.58;
      y = h.y + pull.y * 0.58;
      stretch = Math.min(0.65, Math.hypot(pull.x, pull.y) / (r * 2));
    }
    const appearance = phase === "appearing" ? Math.min(1, age / 1.2) : 1;
    const fade = phase === "impact" ? Math.max(0, 1 - age / 0.9) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = appearance * fade;
    if (phase === "dragging") {
      ctx.rotate(Math.atan2(pull.y, pull.x));
      ctx.scale(1 + stretch, 1 - stretch * 0.35);
    } else if (phase === "impact") {
      ctx.rotate(Math.atan2(bubble.impactY, bubble.impactX));
      const squeeze = Math.sin(Math.min(1, age / 0.6) * Math.PI);
      ctx.scale(1 - squeeze * 0.55, 1 + squeeze * 0.38);
    } else if (!reducedMotion.matches) {
      const wobble = Math.sin(age * 2) * 0.012;
      ctx.scale(1 + wobble, 1 - wobble);
    }
    ctx.scale(0.85 + appearance * 0.15, 0.85 + appearance * 0.15);
    const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r);
    fill.addColorStop(0, "#ffffff40");
    fill.addColorStop(0.6, "#a9e6cf16");
    fill.addColorStop(0.86, "#d2f3e134");
    fill.addColorStop(1, "#efffffa8");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#f5fff5ce";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.87, -2.65, -1.2);
    ctx.strokeStyle = "#ffffffe0";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.91, 0.35, 1.4);
    ctx.strokeStyle = "#e1bde570";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    button.style.left = x + "px";
    button.style.top = y + "px";
    button.style.width = r * 2.5 + "px";
    button.style.height = r * 2.5 + "px";
    button.hidden = phase === "flying" || phase === "impact";
  }

  function tick(time) {
    if (!active) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 0;
    lastTime = time;
    if (width && height) {
      update(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(backdrop, 0, 0);
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      foliage();
      drawBubble();
      for (const drop of droplets) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - drop.age / 2.4);
        ctx.shadowBlur = reducedMotion.matches ? 0 : 5;
        ctx.shadowColor = "#fff6cf";
        ctx.fillStyle = "#fffbe3";
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    frame = requestAnimationFrame(tick);
  }

  function press() {
    if (!["ready", "appearing"].includes(phase)) return;
    phase = "dragging";
    age = 0;
    pull = { x: 0, y: 0 };
    GameSound.unlock();
    label("elasticPull");
  }

  function launch() {
    if (phase !== "dragging") return;
    const h = home(), length = Math.hypot(pull.x, pull.y);
    bubble.x = h.x + pull.x * 0.58;
    bubble.y = h.y + pull.y * 0.58;
    const speed = clamp(length * 2.1, 65, 230);
    bubble.vx = length > 4 ? -pull.x / length * speed : 0;
    bubble.vy = length > 4 ? -pull.y / length * speed : -80;
    phase = "flying";
    age = 0;
    label("elasticRest");
  }

  function stop() {
    active = false;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    pointer = null;
    field?.replaceChildren();
  }

  function start() {
    stop();
    field = document.getElementById("med-affirm-bubbles");
    hint = document.getElementById("med-affirm-hint");
    document.getElementById("med-affirm-text").classList.remove("revealed");
    canvas = document.getElementById("med-affirm-landscape");
    ctx = canvas.getContext("2d");
    button = document.createElement("button");
    button.type = "button";
    button.className = "meditation-bubble";
    field.appendChild(button);
    button.addEventListener("pointerdown", event => {
      if (event.button !== 0 || pointer !== null || !["ready","appearing"].includes(phase)) return;
      pointer = event.pointerId;
      origin = { x: event.clientX, y: event.clientY };
      button.setPointerCapture(pointer);
      press();
    });
    button.addEventListener("pointermove", event => {
      if (event.pointerId !== pointer) return;
      const x = event.clientX - origin.x, y = event.clientY - origin.y;
      const limit = Math.min(width * 0.23, height * 0.15);
      const factor = Math.min(1, limit / (Math.hypot(x, y) || 1));
      pull = { x: x * factor, y: y * factor };
    });
    button.addEventListener("pointerup", event => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      launch();
    });
    const cancel = event => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      resetBubble();
    };
    button.addEventListener("pointercancel", cancel);
    button.addEventListener("lostpointercapture", cancel);
    button.addEventListener("keydown", event => {
      if ([" ","Enter"].includes(event.key)) {
        event.preventDefault();
        press();
      } else if (phase === "dragging" && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const limit = Math.min(width * 0.23, height * 0.15);
        pull.x = clamp(pull.x + (event.key === "ArrowLeft" ? -10 : event.key === "ArrowRight" ? 10 : 0), -limit, limit);
        pull.y = clamp(pull.y + (event.key === "ArrowUp" ? -10 : event.key === "ArrowDown" ? 10 : 0), -limit, limit);
      }
    });
    button.addEventListener("keyup", event => {
      if ([" ","Enter"].includes(event.key)) { event.preventDefault(); launch(); }
    });
    observer = new ResizeObserver(resize);
    observer.observe(field);
    resize();
    active = true;
    lastTime = 0;
    droplets = []; ripples = [];
    resetBubble();
    for (const id of ["garden-landscapes-1","garden-sprout-atlas"]) {
      const image = document.getElementById(id);
      if (!image.complete) image.addEventListener("load", () => { if (active) resize(); }, { once:true });
    }
    frame = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (Meditation.isVisible() && Meditation.getActiveExercise() === "affirmations") start();
  });

  return { start, stop };
})();
