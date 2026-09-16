#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
synth_se.py — 程序合成 5 个短音效(SE)占位文件, 供<game> <story> 使用。
纯标准库实现(不依赖 numpy): os.urandom 取均匀噪声 + 一阶 IIR 滤波 + 包络。
全部为数字拟音(非真实采样), 落位 public/audio/ 即可被引擎按需调用。
格式: 单声道 16bit PCM WAV, 44100Hz。
注意: 本脚本只生成文件, 不登记到 manifest; 登记需手动放开 <story> 脚本注释。
"""
import os, sys, wave, struct, math, random, array

SR = 44100

def write_wav(path, data):
    n = len(data)
    ints = [int(max(-1.0, min(1.0, v)) * 32767) for v in data]
    a = array.array('h', ints)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(a.tobytes())

def white(n):
    raw = os.urandom(n * 2)
    vals = struct.unpack('<%dh' % n, raw)
    return [v / 32768.0 for v in vals]

def lp(x, fc):
    """一阶低通, 截止 fc Hz。"""
    a = 1 - math.exp(-2 * math.pi * fc / SR)
    y = [0.0] * len(x)
    prev = 0.0
    for i in range(len(x)):
        prev = prev + a * (x[i] - prev)
        y[i] = prev
    return y

def bandpass(x, lo, hi):
    """带通: 先低通到 hi, 再减去低通到 lo 的分量。"""
    yh = lp(x, hi)
    yl = lp(x, lo)
    return [a - b for a, b in zip(yh, yl)]

def exp_env(n, attack, tau):
    ai = max(1, int(attack * SR))
    e = [0.0] * n
    for i in range(ai):
        e[i] = (i / (ai - 1)) if ai > 1 else 1.0
    for i in range(ai, n):
        e[i] = math.exp(-(i - ai) / (tau * SR))
    return e

def norm(x, peak=0.9):
    m = max((abs(v) for v in x), default=0.0)
    if m < 1e-9:
        return x
    k = peak / m
    return [v * k for v in x]

def make_loop(x, cf=0.3):
    """把噪声段做成近似无缝循环: 首尾各 cf 秒交叉淡化。"""
    n = len(x)
    c = int(cf * SR)
    if c <= 0 or c >= n // 2:
        return x
    joint = [0.0] * c
    for i in range(c):
        w = (i / (c - 1)) if c > 1 else 0.0
        joint[i] = (1 - w) * x[n - c + i] + w * x[i]
    return x[:n - c] + joint

def synth_letter():
    # 信纸摩擦: 中高频沙沙 + 长尾渐弱 + 不规则抖动
    n = int(0.9 * SR)
    x = white(n)
    x = bandpass(x, 1500, 7000)
    e = exp_env(n, 0.01, 0.18)
    for i in range(n):
        x[i] *= e[i] * (0.8 + 0.2 * random.random())
    return norm(x)

def synth_card():
    # 硬卡片: 更脆更高频 + 开头极短"啪"
    n = int(0.45 * SR)
    x = white(n)
    x = bandpass(x, 3000, 9000)
    e = exp_env(n, 0.005, 0.10)
    for i in range(n):
        x[i] *= e[i]
    cb = int(0.006 * SR)
    click = white(cb)
    click = bandpass(click, 2500, 9000)
    ce = exp_env(cb, 0.0005, 0.01)
    for i in range(cb):
        click[i] *= ce[i]
    for i in range(cb):
        x[i] += click[i] * 0.8
    return norm(x)

def synth_photo():
    # 相机快门: 两声"咔嚓" + 轻翻动
    total = int(0.6 * SR)
    out = [0.0] * total
    def click(at, amp):
        cb = int(0.012 * SR)
        c = white(cb)
        c = bandpass(c, 2000, 9000)
        ce = exp_env(cb, 0.0005, 0.018)
        for i in range(cb):
            c[i] *= ce[i]
        for i in range(cb):
            c[i] += 0.3 * math.sin(2 * math.pi * 3200 * (i / SR)) * ce[i]
        s = int(at * SR)
        for i in range(cb):
            out[s + i] += c[i] * amp
    click(0.0, 1.0)
    click(0.11, 0.8)
    s2 = int(0.2 * SR)
    fl = white(total - s2)
    fl = bandpass(fl, 2000, 8000)
    fe = exp_env(total - s2, 0.01, 0.10)
    for i in range(total - s2):
        fl[i] *= fe[i]
    for i in range(total - s2):
        out[s2 + i] += fl[i] * 0.5
    return norm(out)

def synth_coffee():
    # 陶瓷杯轻放木桌: 低频"咚" + 高频"叮" + 接触噪声
    n = int(0.5 * SR)
    e1 = exp_env(n, 0.002, 0.12)
    e2 = exp_env(n, 0.001, 0.05)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        out[i] = 0.7 * math.sin(2 * math.pi * 180 * t) * e1[i] \
               + 0.15 * math.sin(2 * math.pi * 2500 * t) * e2[i]
    cb = int(0.01 * SR)
    cc = white(cb)
    cc = lp(cc, 1500)
    ce = exp_env(cb, 0.0005, 0.008)
    for i in range(cb):
        cc[i] *= ce[i]
    for i in range(cb):
        out[i] += cc[i] * 0.4
    return norm(out)

def synth_rain():
    # 雨声环境(循环): 低通雨幕 + 高频沙沙, 整段幅度调制周期对齐 -> 无缝
    L = 8.0
    n = int(L * SR)
    base = white(n)
    base = lp(base, 4000)
    hi = white(n)
    hi = bandpass(hi, 6000, 12000)
    x = [0.0] * n
    for i in range(n):
        t = i / SR
        mod = 1 + 0.12 * math.sin(2 * math.pi * t / L)
        x[i] = base[i] * mod + hi[i] * 0.25
    x = make_loop(x, 0.3)
    return norm(x, 0.5)

def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else \
        r"<avg-engine>/public/audio"
    os.makedirs(outdir, exist_ok=True)
    jobs = {
        "se_letter.wav": synth_letter,
        "se_card.wav": synth_card,
        "se_photo.wav": synth_photo,
        "se_coffee.wav": synth_coffee,
        "se_rain.wav": synth_rain,
    }
    for name, fn in jobs.items():
        p = os.path.join(outdir, name)
        data = fn()
        write_wav(p, data)
        dur = len(data) / SR
        print("OK  %-16s %5.2fs  %8d bytes" % (name, dur, os.path.getsize(p)))
    print("done ->", outdir)

if __name__ == "__main__":
    main()
