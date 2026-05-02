/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("AudioContext init failed", e);
    }
  }

  playSpinProgress(duration: number = 0.1) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Use two oscillators for a richer, more melodic "lottery" beep
      [400, 800].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = i === 0 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + duration);
        
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start();
        osc.stop(now + duration);
      });
    } catch (e) {}
  }

  playDrumroll() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Snare-like noise for drumroll effect
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start();
    } catch (e) {}
  }

  playTick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx!.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx!.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.1);
    } catch (e) {
      // Audio might be blocked by browser policy
    }
  }

  playSuccess() {
    try {
      this.init();
      const now = this.ctx!.currentTime;
      
      // Play a chord
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.5);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(now + i * 0.1);
        osc.stop(now + 0.8 + i * 0.1);
      });
    } catch (e) {
      // Audio might be blocked
    }
  }
}

export const sounds = new SoundManager();
