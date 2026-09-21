/**
 * AVG Engine - 音频管理器
 * 管理 BGM、音效、语音的播放
 */

export class AudioManager {
  private audioContext: AudioContext;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmGain: GainNode;
  private seGain: GainNode;
  private masterGain: GainNode;
  private buffers: Map<string, AudioBuffer> = new Map();
  private currentBgmId: string | null = null;
  private bgmVolume: number = 0.7;
  private seVolume: number = 0.8;
  /** 淡出令牌：每次播放/停止自增，用于防止挂起的淡出回调误停新 BGM */
  private fadeToken: number = 0;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.connect(audioContext.destination);

    this.bgmGain = audioContext.createGain();
    this.bgmGain.connect(this.masterGain);
    this.bgmGain.gain.value = this.bgmVolume;

    this.seGain = audioContext.createGain();
    this.seGain.connect(this.masterGain);
    this.seGain.gain.value = this.seVolume;
  }

  /** 注册音频 buffer */
  async register(id: string, arrayBuffer: ArrayBuffer): Promise<void> {
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
    this.buffers.set(id, audioBuffer);
  }

  /** 播放 BGM（循环） */
  playBgm(id: string): void {
    this.stopBgm();
    this.fadeToken++; // 使任何挂起的淡出回调失效，避免误停本轨
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    // 恢复音量（fadeOutBgm 曾把 gain 淡到 0，若不恢复，新 BGM 会静音）
    this.bgmGain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.audioContext.currentTime);

    this.currentBgmId = id;
    this.bgmSource = this.audioContext.createBufferSource();
    this.bgmSource.buffer = buffer;
    this.bgmSource.loop = true;
    this.bgmSource.connect(this.bgmGain);
    this.bgmSource.start();
  }

  /** 获取当前正在播放的 BGM id（用于存档/读档恢复音频状态） */
  getCurrentBgmId(): string | null {
    return this.currentBgmId;
  }

  /** 停止 BGM */
  stopBgm(): void {
    this.fadeToken++; // 使挂起的淡出回调失效
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch { /* ignore */ }
      this.bgmSource = null;
    }
    this.currentBgmId = null;
    // 恢复音量，供下一次播放使用
    this.bgmGain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.audioContext.currentTime);
  }

  /** 淡出 BGM */
  fadeOutBgm(duration: number = 1): void {
    const gain = this.bgmGain.gain;
    gain.cancelScheduledValues(this.audioContext.currentTime);
    gain.setValueAtTime(gain.value, this.audioContext.currentTime);
    gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    const token = ++this.fadeToken;
    const targetVol = this.bgmVolume;
    setTimeout(() => {
      // 若期间已播放/停止新 BGM（token 变化），则放弃本次清理，避免误停新轨
      if (token !== this.fadeToken) return;
      this.stopBgm();
      this.bgmGain.gain.setValueAtTime(targetVol, this.audioContext.currentTime);
    }, duration * 1000 + 100);
  }

  /** 播放音效 */
  playSe(id: string): void {
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.seGain);
    source.start();
  }

  /** 设置 BGM 音量 */
  setBgmVolume(vol: number): void {
    this.bgmVolume = vol;
    this.bgmGain.gain.value = vol;
  }

  /** 设置音效音量 */
  setSeVolume(vol: number): void {
    this.seVolume = vol;
    this.seGain.gain.value = vol;
  }

  /** 恢复 AudioContext（需要用户交互） */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /** 销毁 */
  dispose(): void {
    this.stopBgm();
    this.buffers.clear();
  }
}
