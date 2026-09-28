// Web Audio API synthesized supermarket scanner sound effects
export type ScannerSoundStyle = 'supermarket_loud' | 'zebra_long_beep' | 'hypermarket_dual';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.9; // High default volume (0.0 to 1.0)
  private compressor: DynamicsCompressorNode | null = null;
  public soundStyle: ScannerSoundStyle = 'supermarket_loud';

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // Setup master compressor for high loudness and punch without clipping
        try {
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);
          this.compressor.connect(this.ctx.destination);
        } catch {
          this.compressor = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0.1, Math.min(1.0, vol));
  }

  getVolume(): number {
    return this.volume;
  }

  setSoundStyle(style: ScannerSoundStyle) {
    this.soundStyle = style;
  }

  /**
   * Supermarket Barcode Scanner Sound:
   * Replaced previous 80ms weak pulse with a much longer (~280ms), louder, punchy,
   * resonant dual-harmonic supermarket scanner ping that cuts clearly through room noise!
   */
  playScanBeep(styleOverride?: ScannerSoundStyle) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterOutput = this.compressor || ctx.destination;
      const style = styleOverride || this.soundStyle;

      if (style === 'zebra_long_beep') {
        // Classic Honeywell / Zebra scanner long loud industrial beep (~260ms sustained 2480Hz tone)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Richer harmonic punch than plain sine
        osc.frequency.setValueAtTime(2480, now);

        const peakGain = 0.85 * this.volume;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
        gain.gain.setValueAtTime(peakGain, now + 0.20); // Sustained loud body
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27); // Clean end

        osc.connect(gain);
        gain.connect(masterOutput);

        osc.start(now);
        osc.stop(now + 0.28);
      } else if (style === 'hypermarket_dual') {
        // High-energy 2-tone melodic confirmation chime (~320ms, 1975Hz -> 2637Hz)
        const tone1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        tone1.type = 'sine';
        tone1.frequency.setValueAtTime(1975.5, now); // B6 note
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.75 * this.volume, now + 0.008);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        tone1.connect(gain1);
        gain1.connect(masterOutput);
        tone1.start(now);
        tone1.stop(now + 0.16);

        const tone2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        tone2.type = 'sine';
        tone2.frequency.setValueAtTime(2637, now + 0.11); // E7 note
        gain2.gain.setValueAtTime(0.001, now + 0.11);
        gain2.gain.linearRampToValueAtTime(0.85 * this.volume, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        tone2.connect(gain2);
        gain2.connect(masterOutput);
        tone2.start(now + 0.11);
        tone2.stop(now + 0.33);
      } else {
        // Default: Supermarket Loud Ping (~280ms dual-harmonic resonance at 2350Hz + 3520Hz)
        // Primary loud fundamental tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2350, now);

        const peak = 0.8 * this.volume;
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(peak, now + 0.008);
        gain1.gain.setValueAtTime(peak, now + 0.18); // Solid sustained loud ring
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain1);
        gain1.connect(masterOutput);

        osc1.start(now);
        osc1.stop(now + 0.29);

        // Harmonic overtone giving the authentic retail register punch
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3525, now);

        const peakOvertone = 0.35 * this.volume;
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(peakOvertone, now + 0.008);
        gain2.gain.setValueAtTime(peakOvertone, now + 0.16);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc2.connect(gain2);
        gain2.connect(masterOutput);

        osc2.start(now);
        osc2.stop(now + 0.27);
      }
    } catch {
      // Audio playback silently fails if blocked by browser policy
    }
  }

  // Rising double-tone chime for a brand-new item detected
  playNewItemChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterOutput = this.compressor || ctx.destination;

      // Note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      gain1.gain.setValueAtTime(0.01, now);
      gain1.gain.linearRampToValueAtTime(0.6 * this.volume, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(masterOutput);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2093, now + 0.12); // C7
      gain2.gain.setValueAtTime(0.01, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.7 * this.volume, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc2.connect(gain2);
      gain2.connect(masterOutput);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.37);
    } catch {}
  }

  // Warning buzz (e.g., out of stock or duplicate error)
  playWarningTone() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterOutput = this.compressor || ctx.destination;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.55 * this.volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(masterOutput);

      osc.start(now);
      osc.stop(now + 0.33);
    } catch {}
  }

  // Pleasant success cash register kaching / completed bill chord
  playSaleSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterOutput = this.compressor || ctx.destination;
      [1046.5, 1318.51, 1567.98, 2093].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.01, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.45 * this.volume, now + idx * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.30);
        osc.connect(gain);
        gain.connect(masterOutput);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.31);
      });
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
