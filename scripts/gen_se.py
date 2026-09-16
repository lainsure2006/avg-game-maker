# -*- coding: utf-8 -*-
"""
生成《樱色未央》4 个音效 SE（纯 Python 标准库合成，无需 numpy/ffmpeg）。
输出 WAV（16bit 单声道，44100Hz），落位到 avg-engine/public/audio/。
引擎按 .wav 路径解码（浏览器原生支持 WAV），manifest 登记即可播放。
"""
import wave, math, random, struct, os

SR = 44100
OUT_DIR = r"<avg-engine>\public\audio"


def write_wav(path, samples):
    """samples: float 列表，范围 [-1,1]"""
    n = len(samples)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for s in samples:
            s = max(-1.0, min(1.0, s))
            frames += struct.pack("<h", int(s * 32767))
        w.writeframes(bytes(frames))


# ---------- 风声 se_wind ----------
def gen_wind(dur=1.3):
    n = int(SR * dur)
    lp = 0.0
    out = []
    for i in range(n):
        t = i / SR
        wn = random.uniform(-1, 1)
        lp += 0.02 * (wn - lp)          # 一极点低通，柔化噪声
        gust = 0.45 + 0.55 * math.sin(2 * math.pi * 0.6 * t)   # 缓慢阵风
        envv = min(t / 0.25, 1.0) * min((dur - t) / 0.35, 1.0)
        out.append(lp_just(lp) * 0.55 * gust * max(0.0, envv))
    return out


def lp_just(lp):
    return lp


# ---------- 糖果 se_candy（清脆双音叮咚）----------
def gen_candy(dur=0.55):
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        if t < 0.15:
            tt = t
            s = math.sin(2 * math.pi * 1318.5 * tt) * math.exp(-tt * 18)
            s += 0.3 * math.sin(2 * math.pi * 2637 * tt) * math.exp(-tt * 18)
        else:
            tt = t - 0.15
            s = math.sin(2 * math.pi * 1760 * tt) * math.exp(-tt * 10)
            s += 0.3 * math.sin(2 * math.pi * 3520 * tt) * math.exp(-tt * 10)
            s += 0.15 * math.sin(2 * math.pi * 5280 * tt) * math.exp(-tt * 10)
        envv = min(t / 0.01, 1.0) * min((dur - t) / 0.1, 1.0)
        out.append(s * 0.6 * max(0.0, envv))
    return out


# ---------- 上课铃 se_bell（金属铃声，双响）----------
def gen_bell(dur=1.1):
    n = int(SR * dur)
    base = 523.25
    ratios = [1.0, 2.0, 2.76, 5.4, 8.1]
    amps = [1.0, 0.6, 0.4, 0.25, 0.15]
    decs = [3.5, 4.0, 5.0, 6.0, 7.0]
    out = []
    for i in range(n):
        t = i / SR
        s = 0.0
        for strike in (0.0, 0.4):
            ts = t - strike
            if ts >= 0:
                for r, a, d in zip(ratios, amps, decs):
                    s += a * math.sin(2 * math.pi * base * r * ts) * math.exp(-ts * d)
        envv = min(t / 0.005, 1.0) * min((dur - t) / 0.2, 1.0)
        out.append(s * 0.4 * max(0.0, envv))
    return out


# ---------- 篮球 se_basketball（弹跳 boing，双跳）----------
def gen_basketball(dur=0.5):
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        s = 0.0
        for strike in (0.0, 0.22):
            ts = t - strike
            if 0.0 <= ts < 0.18:
                f = 420 - 300 * (ts / 0.18)       # 音高快速下滑
                envv = math.exp(-ts * 22)
                samp = math.sin(2 * math.pi * f * ts) * envv
                if ts < 0.01:                      # 起音处一点噪声瞬态
                    samp += random.uniform(-1, 1) * math.exp(-ts * 80) * 0.3
                s += samp
        out.append(s * 0.6)
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = {
        "se_wind.wav": gen_wind(),
        "se_candy.wav": gen_candy(),
        "se_bell.wav": gen_bell(),
        "se_basketball.wav": gen_basketball(),
    }
    for name, samples in jobs.items():
        path = os.path.join(OUT_DIR, name)
        write_wav(path, samples)
        print(f"  wrote {name}: {len(samples)/SR:.2f}s, {len(samples)} frames")


if __name__ == "__main__":
    main()
