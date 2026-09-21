#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《缄默回廊》SE 程序化合成器（纯标准库，无第三方依赖）。
产出 6 个 44.1kHz / 16-bit / 单声道 WAV，落位到引擎音频目录。
这些是可用的程序化占位音效，后续可替换为高质量采样音源。
"""
import os, math, random, wave, array

SR = 44100
OUT_DIR = r"D:\avg-game-maker-skill\avg-engine-example\public\audio\jianmo"
random.seed(20260917)

def write_wav(path, samples):
    a = array.array('h')
    for s in samples:
        v = int(max(-1.0, min(1.0, s)) * 32767)
        a.append(v)
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(a.tobytes())

def normalize(samples, peak_db=-3.0):
    peak = max((abs(s) for s in samples), default=0.0)
    if peak < 1e-6:
        return samples
    target = 10 ** (peak_db / 20.0)
    k = target / peak
    return [s * k for s in samples]

def center_scale(samples):
    n = len(samples)
    m = sum(samples) / n
    samples = [x - m for x in samples]
    var = sum(x * x for x in samples) / n
    sd = math.sqrt(var) + 1e-9
    return [x / sd for x in samples]

def white_noise(n):
    return [random.gauss(0.0, 1.0) for _ in range(n)]

def brown_noise(n):
    out = []
    b = 0.0
    for w in white_noise(n):
        b += w
        out.append(b)
    return center_scale(out)

def pinkish(n):
    out = []
    prev = 0.0
    a = 0.97
    for w in white_noise(n):
        prev = w + a * prev
        out.append(prev)
    return center_scale(out)

def env_exp(n, attack=0.01, decay=None):
    out = []
    for i in range(n):
        t = i / SR
        e = 1.0 - math.exp(-t / attack)
        if decay:
            e *= math.exp(-t / decay)
        out.append(e)
    return out


def se_wind():
    n = int(4.0 * SR)
    base = pinkish(n)
    t = [i / SR for i in range(n)]
    sig = []
    for i in range(n):
        gust = 0.5 + 0.5 * math.sin(2 * math.pi * 0.2 * t[i]) * (0.6 + 0.4 * math.sin(2 * math.pi * 0.07 * t[i]))
        gust = max(0.0, min(1.0, gust))
        hiss = random.gauss(0, 1) * 0.02 * gust
        sig.append(base[i] * 0.5 * gust + hiss)
    return normalize(sig, -6)


def se_chain():
    n = int(1.6 * SR)
    sig = [0.0] * n
    events = [0.05, 0.18, 0.30, 0.42, 0.55, 0.70, 0.85, 1.0]
    for st in events:
        start = int(st * n)
        dur = int(0.08 * SR)
        if start + dur > n:
            continue
        burst = white_noise(dur)
        bp = [burst[i] - (burst[i - 1] if i > 0 else 0.0) for i in range(dur)]
        for i in range(dur):
            t = i / SR
            tone = math.sin(2 * math.pi * 3000 * t) * 0.4
            e = math.exp(-t / 0.05)
            v = (bp[i] * 0.6 + tone) * e * 0.5
            sig[start + i] += v
    return normalize(sig, -3)


def se_heartbeat():
    n = int(3.0 * SR)
    sig = [0.0] * n
    for bs in (0.3, 0.8, 1.7):
        s = int(bs * SR)
        dur = int(0.18 * SR)
        if s + dur > n:
            continue
        for i in range(dur):
            t = i / SR
            thump = math.sin(2 * math.pi * 55 * t) * math.exp(-t / 0.06)
            e = math.exp(-t / 0.09)
            sig[s + i] += thump * e
    return normalize(sig, -3)


def se_key():
    n = int(1.3 * SR)
    sig = [0.0] * n
    events = [0.05, 0.12, 0.20, 0.28, 0.40, 0.55, 0.75]
    for st in events:
        start = int(st * n)
        dur = int(0.05 * SR)
        if start + dur > n:
            continue
        burst = white_noise(dur)
        bp = [burst[i] - (burst[i - 1] if i > 0 else 0.0) for i in range(dur)]
        for i in range(dur):
            t = i / SR
            tone = math.sin(2 * math.pi * 5000 * t) * 0.3
            e = math.exp(-t / 0.03)
            v = (bp[i] * 0.7 + tone) * e * 0.5
            sig[start + i] += v
    return normalize(sig, -4)


def se_clue():
    n = int(1.6 * SR)
    sig = [0.0] * n
    def note(f, start_s, dur_s, amp):
        s = int(start_s * SR)
        d = int(dur_s * SR)
        for i in range(d):
            if s + i >= n:
                break
            t = i / SR
            osc = math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * 2 * f * t)
            e = math.exp(-t / 0.5)
            sig[s + i] += osc * e * amp
    note(523.25, 0.0, 1.4, 0.5)   # C5
    note(783.99, 0.18, 1.3, 0.45)  # G5
    return normalize(sig, -4)


def se_wave():
    n = int(5.0 * SR)
    brown = brown_noise(n)
    sig = []
    for i in range(n):
        t = i / SR
        swell = abs(math.sin(2 * math.pi * 0.2 * t))
        swell = 0.3 + 0.7 * swell
        hiss = random.gauss(0, 1) * 0.03 * max(0.0, swell - 0.7) / 0.3
        sig.append(brown[i] * 0.4 * swell + hiss)
    return normalize(sig, -6)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = {
        "se_wind.wav": se_wind,
        "se_chain.wav": se_chain,
        "se_heartbeat.wav": se_heartbeat,
        "se_key.wav": se_key,
        "se_clue.wav": se_clue,
        "se_wave.wav": se_wave,
    }
    for name, fn in jobs.items():
        path = os.path.join(OUT_DIR, name)
        write_wav(path, fn())
        print("written:", path)
    print("ALL_SE_DONE")

if __name__ == "__main__":
    main()
