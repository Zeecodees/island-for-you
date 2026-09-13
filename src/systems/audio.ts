import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Web Audio API synthesizer & audio management system for sound effects,
 * continuous background music across islands, and emotional celebration tracks.
 */
class SoundSystem {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMusicPlaying = false;
  private musicTimeout: number | null = null;
  private muted = false;
  private benchGain: GainNode | null = null;

  // --- Adventure Main Theme: "I Think They Call This Love (Cover)" ---
  public hasStartedMainTheme = false;
  public isMainThemePlaying = false;
  private isFadingOutMainTheme = false;
  private mainThemeAudio: HTMLAudioElement | null = null;
  private mainThemeGain: GainNode | null = null;
  private mainThemeTimeout: number | null = null;
  private usingAudioElement = false;
  private mainThemeVolume = GAME_CONFIG.music.volume; // Comfortable 30% background volume

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.ctx.destination);

      this.mainThemeGain = this.ctx.createGain();
      this.mainThemeGain.gain.value = this.mainThemeVolume;
      this.mainThemeGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.ctx.destination);

      this.benchGain = this.ctx.createGain();
      this.benchGain.gain.value = 0.35;
      this.benchGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (this.musicGain && this.sfxGain) {
      this.musicGain.gain.value = mute ? 0 : 0.35;
      this.sfxGain.gain.value = mute ? 0 : 0.5;
    }
    if (this.benchGain) {
      this.benchGain.gain.value = mute ? 0 : 0.35;
    }
    if (this.mainThemeGain) {
      this.mainThemeGain.gain.value = mute ? 0 : this.mainThemeVolume;
    }
    if (this.mainThemeAudio) {
      this.mainThemeAudio.volume = mute ? 0 : this.mainThemeVolume;
    }
    if (this.benchAudio) {
      this.benchAudio.volume = mute ? 0 : this.benchVolume;
    }
  }

  public isMuted() {
    return this.muted;
  }

  // --- Main Song: "I Think They Call This Love (Cover)" ---

  /**
   * Starts playing the main adventure theme once Aafraa activates the music box in Level 1.
   * Begins only once; subsequent calls will not restart or disrupt the continuous song.
   */
  public playMainTheme() {
    if (this.hasStartedMainTheme) return;
    this.hasStartedMainTheme = true;
    this.isMainThemePlaying = true;
    this.initContext();

    const rawUrl = GAME_CONFIG.music.songFileUrl;
    const songUrl = rawUrl ? encodeURI(rawUrl) : '';

    // First attempt to load and play user-supplied audio file
    if (typeof window !== 'undefined' && songUrl) {
      try {
        const audio = new Audio(songUrl);
        audio.loop = true;
        audio.volume = this.muted ? 0 : this.mainThemeVolume;
        this.mainThemeAudio = audio;

        audio.addEventListener('error', () => {
          if (!this.usingAudioElement) {
            // Audio file not found or couldn't load -> smoothly fall back to procedural acoustic cover
            this.startProceduralMainTheme();
          }
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.usingAudioElement = true;
            })
            .catch(() => {
              // Browser autoplay policy or missing file -> fall back to Web Audio acoustic synthesizer
              this.startProceduralMainTheme();
            });
        }
      } catch {
        this.startProceduralMainTheme();
      }
    } else {
      this.startProceduralMainTheme();
    }
  }

  /**
   * Smoothly fades out the main theme over the given duration (in seconds),
   * creating a cinematic transition to the birthday celebration.
   */
  public fadeOutMainTheme(duration = 2.0, onComplete?: () => void) {
    if (!this.isMainThemePlaying || this.isFadingOutMainTheme) {
      onComplete?.();
      return;
    }
    this.isFadingOutMainTheme = true;

    if (this.usingAudioElement && this.mainThemeAudio) {
      const audio = this.mainThemeAudio;
      const startVolume = audio.volume;
      const startTime = performance.now();

      const fadeStep = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(1.0, elapsed / duration);
        audio.volume = Math.max(0, startVolume * (1.0 - progress));

        if (progress < 1.0) {
          requestAnimationFrame(fadeStep);
        } else {
          audio.pause();
          this.isMainThemePlaying = false;
          this.isFadingOutMainTheme = false;
          onComplete?.();
        }
      };
      requestAnimationFrame(fadeStep);
    } else if (this.mainThemeGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.mainThemeGain.gain.cancelScheduledValues(now);
      this.mainThemeGain.gain.setValueAtTime(this.mainThemeGain.gain.value, now);
      this.mainThemeGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      setTimeout(() => {
        this.stopProceduralMainTheme();
        this.isMainThemePlaying = false;
        this.isFadingOutMainTheme = false;
        onComplete?.();
      }, duration * 1000);
    } else {
      this.isMainThemePlaying = false;
      this.isFadingOutMainTheme = false;
      onComplete?.();
    }
  }

  /**
   * Egg Breaking Music Transition:
   * Smoothly fades out "I Think They Call This Love" and transitions to
   * the calm, emotional celebration music box theme.
   */
  public transitionToBirthdayCelebration() {
    if (this.isMainThemePlaying) {
      this.fadeOutMainTheme(2.2, () => {
        this.startCalmMusic();
      });
    } else {
      this.startCalmMusic();
    }
  }

  // --- Procedural Acoustic Synth Cover of "I Think They Call This Love" ---

  private startProceduralMainTheme() {
    if (this.usingAudioElement || this.mainThemeTimeout !== null) return;
    this.initContext();
    if (this.mainThemeGain) {
      this.mainThemeGain.gain.value = this.muted ? 0 : this.mainThemeVolume;
    }
    this.loopProceduralSongPhrase(0);
  }

  private stopProceduralMainTheme() {
    if (this.mainThemeTimeout !== null) {
      clearTimeout(this.mainThemeTimeout);
      this.mainThemeTimeout = null;
    }
  }

  private loopProceduralSongPhrase(stepIndex: number) {
    if (!this.isMainThemePlaying || this.isFadingOutMainTheme || !this.ctx || !this.mainThemeGain) return;

    // "I Think They Call This Love" (Acoustic Cover arrangement)
    // Key: A Major / F# Minor
    // Progression: A - F#m - Bm7 - E7
    // Soft acoustic fingerpicked guitar arpeggio with warm Rhodes/celesta lead
    const songSteps = [
      // Bar 1: A Major - gentle acoustic fingerpicking & intro motif
      { bass: 110.0, chord: [220.0, 277.18, 329.63], lead: 554.37, dur: 0.7 }, // C#5
      { bass: 164.81, chord: [277.18, 329.63], lead: 493.88, dur: 0.6 },        // B4
      { bass: 110.0, chord: [220.0, 277.18], lead: 440.0, dur: 0.6 },           // A4
      { bass: 164.81, chord: [277.18, 329.63], lead: 415.3, dur: 0.8 },         // G#4

      // Bar 2: F# Minor - "When every breath I take..."
      { bass: 92.5, chord: [185.0, 220.0, 277.18], lead: 440.0, dur: 0.65 },    // A4
      { bass: 138.59, chord: [220.0, 277.18], lead: 493.88, dur: 0.6 },         // B4
      { bass: 92.5, chord: [185.0, 277.18], lead: 554.37, dur: 0.75 },          // C#5
      { bass: 138.59, chord: [220.0, 329.63], lead: 659.25, dur: 0.9 },         // E5

      // Bar 3: B Minor 7 - "My heart skips a little beat..."
      { bass: 123.47, chord: [246.94, 293.66, 369.99], lead: 554.37, dur: 0.65 }, // C#5
      { bass: 185.0, chord: [293.66, 369.99], lead: 493.88, dur: 0.6 },           // B4
      { bass: 123.47, chord: [246.94, 293.66], lead: 440.0, dur: 0.65 },          // A4
      { bass: 185.0, chord: [293.66, 440.0], lead: 369.99, dur: 0.8 },            // F#4

      // Bar 4: E dominant 7 - "I think they call this love..."
      { bass: 82.41, chord: [164.81, 207.65, 246.94, 293.66], lead: 440.0, dur: 0.6 }, // A4
      { bass: 123.47, chord: [207.65, 246.94], lead: 493.88, dur: 0.6 },                // B4
      { bass: 82.41, chord: [164.81, 246.94], lead: 554.37, dur: 1.1 },                 // C#5 (resolve)
      { bass: 123.47, chord: [207.65, 293.66], lead: 440.0, dur: 1.2 },                 // A4
    ];

    const current = songSteps[stepIndex % songSteps.length];
    const now = this.ctx.currentTime;

    // 1. Warm Acoustic Bass Note (plucked sine/triangle blend)
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(current.bass, now);

    bassGain.gain.setValueAtTime(0.001, now);
    bassGain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + current.dur * 1.2);

    bassOsc.connect(bassGain);
    bassGain.connect(this.mainThemeGain);
    bassOsc.start(now);
    bassOsc.stop(now + current.dur * 1.2);

    // 2. Soft Fingerpicked Acoustic Arpeggio Chord Notes
    current.chord.forEach((noteFreq, idx) => {
      if (!this.ctx || !this.mainThemeGain) return;
      const chordOsc = this.ctx.createOscillator();
      const chordGain = this.ctx.createGain();
      const noteTime = now + idx * 0.06;

      chordOsc.type = 'sine';
      chordOsc.frequency.setValueAtTime(noteFreq, noteTime);

      chordGain.gain.setValueAtTime(0.001, noteTime);
      chordGain.gain.linearRampToValueAtTime(0.12, noteTime + 0.03);
      chordGain.gain.exponentialRampToValueAtTime(0.001, noteTime + current.dur * 0.95);

      chordOsc.connect(chordGain);
      chordGain.connect(this.mainThemeGain);
      chordOsc.start(noteTime);
      chordOsc.stop(noteTime + current.dur * 0.95);
    });

    // 3. Gentle Melodic Lead Note (Rhodes / music box bell character)
    if (current.lead) {
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();

      leadOsc.type = 'sine';
      leadOsc.frequency.setValueAtTime(current.lead, now + 0.02);

      leadGain.gain.setValueAtTime(0.001, now + 0.02);
      leadGain.gain.linearRampToValueAtTime(0.16, now + 0.06);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + current.dur * 0.9);

      leadOsc.connect(leadGain);
      leadGain.connect(this.mainThemeGain);
      leadOsc.start(now + 0.02);
      leadOsc.stop(now + current.dur * 0.9);
    }

    const nextDelay = current.dur * 900;
    this.mainThemeTimeout = window.setTimeout(() => {
      this.loopProceduralSongPhrase((stepIndex + 1) % songSteps.length);
    }, nextDelay);
  }

  // --- Sound Effects ---

  public playJump() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playDoubleJump() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [587.33, 880.0, 1174.66]; // D5, A5, D6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playPickup() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playThrow() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    // Noise/whoosh filter
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playPinHit() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playStrikeFanfare() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    // Celebratory victory chords: C5, E5, G5, C6
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.85);
    });
  }

  public playEggCrack() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Crystalline burst
    const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.95);
    });
  }

  public playFirework() {
    // Sub-bass thumping ("dum dum") disabled during birthday transition to keep music clean and calm
  }

  public playCandleBlow() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Chime sweep
    const chime = [783.99, 987.77, 1174.66, 1567.98];
    chime.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.85);
    });
  }

  public playDoorOpen() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.6);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.72);
  }

  public playEat() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // 2 crisp cute munches
    [0, 0.12].forEach((offset, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420 + idx * 80, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.08);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.1);
    });

    // Cute satisfied chime sparkle
    const notes = [659.25, 880.0, 1174.66];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + 0.22 + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * Playful Psyduck quack/chirp dialogue blip
   */
  public playPsyduckTalk() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Soft triangular wave with quick pitch modulation (cute character squeak/quack)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(460, now + 0.05);
    osc.frequency.linearRampToValueAtTime(380, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Magical awakening fanfare when Psyduck's head connects to its body
   */
  public playReunionAwaken() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Ascending arpeggio C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  /**
   * Cheerful bounce chime when Psyduck catches or tosses the play-head
   */
  public playCatchToss() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  // --- Background Melody: Calming, Emotional Birthday/Romantic Music Box ---

  public startCalmMusic() {
    this.initContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.loopMusicPhrase(0);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimeout !== null) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  }

  public resetAllMusic() {
    this.stopMusic();
    this.stopBenchMusic();
    this.stopProceduralMainTheme();

    if (this.mainThemeAudio) {
      try {
        this.mainThemeAudio.pause();
        this.mainThemeAudio.currentTime = 0;
      } catch {}
      this.mainThemeAudio = null;
    }

    if (this.mainThemeGain && this.ctx) {
      try {
        this.mainThemeGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.mainThemeGain.gain.setValueAtTime(this.muted ? 0 : this.mainThemeVolume, this.ctx.currentTime);
      } catch {}
    }

    this.hasStartedMainTheme = false;
    this.isMainThemePlaying = false;
    this.isFadingOutMainTheme = false;
    this.usingAudioElement = false;
    this.hasStartedBenchMusic = false;
    this.benchTrackIndex = 0;
  }

  private loopMusicPhrase(stepIndex: number) {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

    // A beautiful, gentle pentatonic & romantic chord progression
    // C major 9 -> Am7 -> Fmaj7 -> Gsus4 -> C
    const melodySeq = [
      // Phrase 1: Soft intro / music box
      { note: 523.25, dur: 0.6 }, // C5
      { note: 659.25, dur: 0.6 }, // E5
      { note: 783.99, dur: 0.8 }, // G5
      { note: 987.77, dur: 1.0 }, // B5
      { note: 880.00, dur: 0.8 }, // A5
      { note: 659.25, dur: 0.6 }, // E5
      { note: 783.99, dur: 1.2 }, // G5
      // Phrase 2: Birthday warmth
      { note: 523.25, dur: 0.5 }, // C5
      { note: 523.25, dur: 0.5 }, // C5
      { note: 587.33, dur: 0.8 }, // D5
      { note: 523.25, dur: 0.8 }, // C5
      { note: 698.46, dur: 0.9 }, // F5
      { note: 659.25, dur: 1.6 }, // E5
      // Phrase 3: Ascending celebration
      { note: 523.25, dur: 0.5 },
      { note: 523.25, dur: 0.5 },
      { note: 587.33, dur: 0.8 },
      { note: 523.25, dur: 0.8 },
      { note: 783.99, dur: 0.9 }, // G5
      { note: 698.46, dur: 1.8 }, // F5
      // Phrase 4: Gentle resolve
      { note: 659.25, dur: 0.6 }, // E5
      { note: 587.33, dur: 0.6 }, // D5
      { note: 523.25, dur: 1.2 }, // C5
      { note: 392.00, dur: 1.2 }, // G4
      { note: 523.25, dur: 2.2 }, // C5
    ];

    const item = melodySeq[stepIndex % melodySeq.length];
    const now = this.ctx.currentTime;

    // Music box sine oscillator with soft warm harmonics
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(item.note, now);

    // Warm envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + item.dur * 0.9);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + item.dur);

    const nextDelay = item.dur * 680;
    this.musicTimeout = window.setTimeout(() => {
      this.loopMusicPhrase((stepIndex + 1) % melodySeq.length);
    }, nextDelay);
  }

  // ====================================================
  // --- Level 3 Bench Music Player: 3 Song Playlist ---
  // ====================================================

  public isBenchMusicPlaying = false;
  private benchTrackIndex = 0;
  private hasStartedBenchMusic = false;
  private benchAudio: HTMLAudioElement | null = null;
  private benchVolume = 0.35;

  public readonly benchPlaylist = [
    {
      id: 'change-song-1',
      title: 'Change Song 1',
      fileUrl: '/assets/change-song-1.mp3',
    },
    {
      id: 'change-song-2',
      title: 'Change Song 2',
      fileUrl: '/assets/change-song-2.mp3',
    },
    {
      id: 'change-song-3',
      title: 'Change Song 3',
      fileUrl: '/assets/change-song-3.mp3',
    },
  ];

  public get currentBenchTrackTitle(): string {
    return this.benchPlaylist[this.benchTrackIndex]?.title || 'Change Song 1';
  }

  public nextBenchTrack(): string {
    this.initContext();

    // Fade or stop competing background music so songs don't clash
    if (this.isMainThemePlaying) {
      this.fadeOutMainTheme(0.8);
    }
    if (this.isMusicPlaying) {
      this.stopMusic();
    }

    // Determine track sequence:
    // First press -> Change Song 1 (index 0).
    // Subsequent presses (whether playing or stopped via S) advance to next song:
    // 1 -> 2 -> 3 -> 1 -> 2 -> 3...
    if (!this.hasStartedBenchMusic) {
      this.hasStartedBenchMusic = true;
      this.benchTrackIndex = 0;
    } else {
      this.benchTrackIndex = (this.benchTrackIndex + 1) % this.benchPlaylist.length;
    }

    const track = this.benchPlaylist[this.benchTrackIndex];

    // Properly stop previous song to prevent overlapping audio & duplicate playback
    this.stopCurrentBenchAudio(true);

    this.isBenchMusicPlaying = true;

    if (typeof window !== 'undefined' && track.fileUrl) {
      try {
        const audio = new Audio(track.fileUrl);
        audio.loop = true;
        audio.volume = this.muted ? 0 : this.benchVolume;
        this.benchAudio = audio;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Bench track autoplay deferred:', err);
          });
        }
      } catch (err) {
        console.warn('Failed to load bench track audio:', err);
      }
    }

    return this.currentBenchTrackTitle;
  }

  private stopCurrentBenchAudio(fade = false) {
    if (this.benchAudio) {
      const audioToStop = this.benchAudio;
      this.benchAudio = null;

      if (fade && audioToStop.volume > 0.05) {
        const startVol = audioToStop.volume;
        const startTime = performance.now();
        const fadeDuration = 180;

        const fadeStep = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1.0, elapsed / fadeDuration);
          audioToStop.volume = Math.max(0, startVol * (1.0 - progress));

          if (progress < 1.0) {
            requestAnimationFrame(fadeStep);
          } else {
            audioToStop.pause();
            audioToStop.currentTime = 0;
          }
        };
        requestAnimationFrame(fadeStep);
      } else {
        audioToStop.pause();
        audioToStop.currentTime = 0;
      }
    }
  }

  public stopBenchMusic() {
    this.isBenchMusicPlaying = false;
    this.stopCurrentBenchAudio(true);
  }
}

export const sound = new SoundSystem();
