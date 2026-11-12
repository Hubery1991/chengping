let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export const audio = {
  muted: false,
  unlock() {
    const c = ac();
    if (c && c.state === "suspended") void c.resume();
  },
  tone(freq: number, dur: number, type: OscillatorType, gain: number) {
    if (this.muted) return;
    const c = ac();
    if (!c) return;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    amp.gain.setValueAtTime(gain, c.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(amp);
    amp.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur + 0.02);
  },
  select() {
    this.tone(520, 0.07, "sine", 0.035);
  },
  deny() {
    this.tone(164, 0.14, "triangle", 0.05);
  },
  pour() {
    if (this.muted) return;
    const c = ac();
    if (!c) return;
    const dur = 0.72;
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(980, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(380, c.currentTime + dur);
    filter.Q.value = 0.65;
    const amp = c.createGain();
    amp.gain.setValueAtTime(0.0001, c.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.16, c.currentTime + 0.06);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(c.destination);
    src.start();
    this.tone(390, 0.22, "sine", 0.025);
  },
  win() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      window.setTimeout(() => this.tone(freq, 0.2, "sine", 0.045), i * 120);
    });
  },
};
