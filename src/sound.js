const GameSound = (() => {
  let context, windGain, windFilter, master;
  let muted = false;
  let lastBeat = -1;

  function unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(context.destination);
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        const noise = context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        windFilter = context.createBiquadFilter();
        windFilter.type = "bandpass";
        windFilter.frequency.value = 650;
        windFilter.Q.value = 0.55;
        windGain = context.createGain();
        windGain.gain.value = 0;
        noise.connect(windFilter).connect(windGain).connect(master);
        noise.start();
      }
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch {
      // Le jeu reste utilisable si le navigateur ne fournit pas de sortie audio.
    }
  }

  function pop() {
    if (!context || context.state !== "running") return;
    const now = context.currentTime;
    if (now - lastBeat < 0.09) return;
    lastBeat = now;
    for (const [delay, frequency, volume] of [[0, 95, 0.075], [0.12, 72, 0.045]]) {
      const start = now + delay;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(48, start + 0.15);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(volume, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
      oscillator.connect(envelope).connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.19);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }
  }

  function wind(speed) {
    if (!windGain) return;
    const amount = Math.min(1, speed / 7);
    windGain.gain.setTargetAtTime(amount * 0.018, context.currentTime, 0.16);
    windFilter.frequency.setTargetAtTime(450 + amount * 450, context.currentTime, 0.2);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) wind(0);
  });

  function setMuted(value) {
    muted = value;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.03);
  }

  return { unlock, pop, wind, setMuted };
})();
