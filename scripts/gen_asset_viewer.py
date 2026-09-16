#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_asset_viewer.py —— 通用「游戏资产管理 / 审核页」生成器

从任意 story<N>/manifest.ts 提取真实资产清单，生成一个独立 HTML 查看页，
自动用浏览器检测磁盘缺失（红框 = 引擎会 404），支持分类 tab + 点击放大。
让"资产管理"成为 AVG 制作流程的标准一环：每做完一个 story 的编写，跑一条命令即可。

用法：
  python gen_asset_viewer.py --story <story> \
      --engine <avg-engine> \
      --meta <game>_assets/asset_viewer_meta.json \
      --out public/resource-manager-<game>.html

依赖：纯标准库（re/os/json/argparse/datetime）。
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime


# ---------- manifest.ts 解析（稳健括号配对，不依赖 TS 编译器） ----------
def grab_brace(text, idx):
    """idx 指向 '{'，返回从 idx 到匹配 '}' 的子串（含两端）。"""
    depth = 0
    for i in range(idx, len(text)):
        c = text[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[idx:i + 1]
    return text[idx:]


def find_block(text, key):
    m = re.search(r'\b' + re.escape(key) + r'\s*:\s*\{', text)
    if not m:
        return None
    return grab_brace(text, m.end() - 1)  # m.end()-1 指向 '{'


def parse_kv(block):
    """提取 `word : 'str'` → dict（值为字符串）。"""
    return dict(re.findall(r"(\w+)\s*:\s*'([^']*)'", block))


def parse_sprites(block):
    """sprites: { charId: { pose: 'url', ... }, ... } → {charId: [(pose,url),...]}"""
    out = {}
    for m in re.finditer(r'(\w+)\s*:\s*\{', block):
        sub = grab_brace(block, m.end() - 1)
        inner = sub[1:-1]
        poses = re.findall(r"(\w+)\s*:\s*'([^']*)'", inner)
        out[m.group(1)] = poses
    return out


def dir_of(url):
    return url.rsplit('/', 1)[0] + '/'


# ---------- HTML 模板 ----------
HEADER = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>游戏资产管理 · __STORY_TITLE__</title>
<style>
:root{
  --bg:#0f1115; --panel:#171a21; --panel2:#1d212b; --border:#2a2f3a;
  --text:#e6e9ef; --muted:#9aa4b2; --accent:#6ea8fe;
  --green:#3fb950; --red:#f85149; --amber:#d29922; --blue:#388bfd;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.5}
header{padding:18px 22px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,#14171e,#0f1115)}
header h1{margin:0;font-size:20px;font-weight:700}
header .sub{color:var(--muted);font-size:12px;margin-top:4px}
.tabs{display:flex;gap:4px;padding:10px 18px 0;border-bottom:1px solid var(--border);background:var(--panel);flex-wrap:wrap}
.tab{padding:9px 16px;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;color:var(--muted);font-weight:600}
.tab.active{background:var(--panel2);color:var(--text);border-color:var(--border)}
.tab .badge{margin-left:6px;font-size:11px;background:#2a2f3a;color:var(--muted);padding:1px 7px;border-radius:10px}
.tab .badge.warn{background:rgba(210,153,34,.18);color:var(--amber)}
.tab .badge.bad{background:rgba(248,81,73,.18);color:var(--red)}
main{padding:18px 22px;max-width:1320px;margin:0 auto}
.hidden{display:none}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.stat{background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:16px}
.stat h3{margin:0 0 6px;font-size:13px;color:var(--muted);font-weight:600}
.stat .big{font-size:30px;font-weight:800}
.stat .bar{height:8px;background:#0c0e13;border-radius:6px;margin-top:10px;overflow:hidden}
.stat .bar>i{display:block;height:100%;background:linear-gradient(90deg,#3fb950,#6ea8fe)}
.stat .note{font-size:12px;color:var(--muted);margin-top:6px}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.controls input,.controls select{background:var(--panel);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:7px 10px;font-size:13px}
.controls input{min-width:240px}
.char-card{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:18px}
.char-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.char-head .nm{font-size:19px;font-weight:800}
.char-head .meta{color:var(--muted);font-size:12px}
.pose-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:10px}
.pose{cursor:pointer;background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:.15s;position:relative}
.pose:hover{border-color:var(--accent);transform:translateY(-2px)}
.pose .thumb{width:100%;height:200px;object-fit:contain;background:
  repeating-conic-gradient(#232831 0% 25%,#1a1d24 0% 50%) 50%/20px 20px;display:block}
.pose .thumb.miss{display:flex;align-items:center;justify-content:center;color:var(--red);font-size:12px}
.pose .cap{padding:8px 10px}
.pose .fn{font-family:ui-monospace,Consolas,monospace;font-size:12px;word-break:break-all}
.pose .st{position:absolute;top:8px;right:8px;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:700}
.st.ok{background:rgba(63,185,80,.18);color:var(--green)}
.st.miss{background:rgba(248,81,73,.18);color:var(--red)}
.group-title{font-size:15px;font-weight:700;margin:18px 0 8px;padding-left:10px;border-left:3px solid var(--accent)}
.scene-card{background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px}
.scene-head{font-size:14px;font-weight:700;margin-bottom:8px}
.scene-head .kk{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--muted);font-weight:400;margin-left:8px}
.angle-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:680px){.angle-grid{grid-template-columns:1fr}}
.angle{cursor:pointer;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--panel);position:relative}
.angle .thumb{width:100%;height:130px;object-fit:cover;display:block;background:#0c0e13}
.angle .thumb.miss{display:flex;align-items:center;justify-content:center;color:var(--red);font-size:12px}
.angle .cap{padding:6px 8px;font-size:12px;font-family:ui-monospace,Consolas,monospace}
.bg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
.bg-card{cursor:pointer;background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;position:relative}
.bg-card .thumb{width:100%;height:110px;object-fit:cover;display:block;background:#0c0e13}
.bg-card .thumb.miss{display:flex;align-items:center;justify-content:center;color:var(--red);font-size:12px}
.bg-card .cap{padding:6px 8px;font-size:12px;word-break:break-all}
.item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.item-card{cursor:pointer;background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;position:relative}
.item-card .thumb{width:100%;height:150px;object-fit:contain;display:block;background:
  repeating-conic-gradient(#232831 0% 25%,#1a1d24 0% 50%) 50%/20px 20px}
.item-card .thumb.miss{display:flex;align-items:center;justify-content:center;color:var(--red);font-size:12px}
.item-card .cap{padding:8px 10px}
.item-card .nm{font-size:13px;font-weight:700}
.item-card .fn{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--muted);word-break:break-all;margin-top:2px}
table{width:100%;border-collapse:collapse;background:var(--panel2);border:1px solid var(--border);border-radius:12px;overflow:hidden}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border);font-size:13px;vertical-align:top}
th{background:#0c0e13;color:var(--muted);font-weight:600;position:sticky;top:0}
tr:last-child td{border-bottom:none}
td.mono{font-family:ui-monospace,Consolas,monospace}
.tag{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;font-weight:700}
.tag.ok{background:rgba(63,185,80,.18);color:var(--green)}
.tag.miss{background:rgba(248,81,73,.18);color:var(--red)}
.tag.bgm{background:rgba(56,139,253,.18);color:var(--blue)}
.tag.se{background:rgba(210,153,34,.18);color:var(--amber)}
.lb{position:fixed;inset:0;background:rgba(0,0,0,.82);display:none;align-items:center;justify-content:center;z-index:50;padding:24px}
.lb.show{display:flex}
.lb-inner{background:var(--panel);border:1px solid var(--border);border-radius:14px;max-width:900px;width:100%;max-height:90vh;overflow:auto;display:flex;flex-direction:column}
.lb-imgwrap{padding:18px;display:flex;justify-content:center;background:
  repeating-conic-gradient(#232831 0% 25%,#1a1d24 0% 50%) 50%/22px 22px}
.lb-img{max-width:100%;max-height:60vh;border-radius:8px}
.lb-body{padding:16px 20px 22px}
.lb-body h2{margin:0 0 4px;font-size:18px}
.lb-body .fn{font-family:ui-monospace,Consolas,monospace;color:var(--accent);font-size:13px;word-break:break-all}
.lb-body .row{margin-top:12px}
.lb-body .lbl{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.lb-close{position:absolute;top:14px;right:18px;font-size:26px;color:#fff;cursor:pointer;background:none;border:none}
</style>
</head>
<body>
<header>
  <h1>游戏资产管理 · <span id="st"></span></h1>
  <div class="sub">数据来源：story 的 manifest.ts（设计应有）＋ 磁盘实际文件（自动检测缺失）· 生成于 <span id="gen"></span></div>
</header>
<nav class="tabs">
  <div class="tab active" data-t="overview">概览<span class="badge" id="t-overview"></span></div>
  <div class="tab" data-t="bg">背景<span class="badge" id="t-bg"></span></div>
  <div class="tab" data-t="cg">CG<span class="badge" id="t-cg"></span></div>
  <div class="tab" data-t="char">人物<span class="badge" id="t-char"></span></div>
  <div class="tab" data-t="item">物证<span class="badge" id="t-item"></span></div>
  <div class="tab" data-t="audio">音频<span class="badge warn" id="t-audio"></span></div>
</nav>
<main>
  <section id="p-overview"></section>
  <section id="p-bg" class="hidden"></section>
  <section id="p-cg" class="hidden"></section>
  <section id="p-char" class="hidden"></section>
  <section id="p-item" class="hidden"></section>
  <section id="p-audio" class="hidden"></section>
</main>
<div class="lb" id="lb"><div class="lb-inner"><button class="lb-close" onclick="closeLb()">&times;</button><div id="lb-content"></div></div></div>

<script>
/* ===== 资产清单（由 gen_asset_viewer.py 从 manifest.ts 自动提取）===== */
"""

FOOTER = r"""
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let missTotal = 0;

/* 图片缺失自动检测：onerror 时标红 + 累加 */
function markMiss(img){
  img.classList.add("miss");
  img.textContent = "缺失";
  missTotal++;
  updateMissingBadges();
}
function updateMissingBadges(){
  const ov=$("#p-overview .note.miss-note");
  if(ov) ov.textContent = missTotal>0
    ? "⚠ 检测到 "+missTotal+" 个图片资源缺失（红框=磁盘无此文件）"
    : "✓ 所有图片资源均已落位";
}

/* lightbox */
function openLb(src, title, fn){
  $("#lb-content").innerHTML =
    '<div class="lb-imgwrap"><img class="lb-img" src="'+esc(src)+'" onerror="this.style.opacity=.3"></div>'+
    '<div class="lb-body"><h2>'+esc(title||"")+'</h2>'+
    (fn?'<div class="fn">'+esc(fn)+'</div>':'')+'</div>';
  $("#lb").classList.add("show");
}
function closeLb(){ $("#lb").classList.remove("show"); }
$("#lb").addEventListener("click", e=>{ if(e.target.id==="lb") closeLb(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeLb(); });

function stat(t,n,note){
  return '<div class="stat"><h3>'+esc(t)+'</h3><div class="big">'+n+'</div><div class="note">'+esc(note)+'</div></div>';
}

/* ===== 渲染 ===== */
function renderOverview(){
  const nBg = DATA.scenes.length*3;
  const nCg = DATA.cgs.length;
  const nSp = DATA.chars.reduce((a,c)=>a+c.poses.length,0);
  const nItem = DATA.items.length;
  const nAudio = DATA.audio.length;
  const nAudioMiss = DATA.audio.filter(a=>a.status==="miss").length;
  $("#p-overview").innerHTML =
    '<div class="stat-grid">'+
      stat("背景机位", nBg, DATA.scenes.length+" 场景 × 左/中/右")+
      stat("CG", nCg, "过场单图")+
      stat("立绘", nSp, DATA.chars.length+" 角色 · 含差分")+
      stat("物证", nItem, "弹窗物件")+
      stat("音频", (nAudio-nAudioMiss)+"/"+nAudio, (nAudio-nAudioMiss)+" 已落位 · "+nAudioMiss+" 待采购")+
    '</div>'+
    '<div class="note miss-note" style="color:var(--muted)">正在检测磁盘图片缺失…（下方各 tab 红框即缺失项）</div>'+
    '<div class="box" style="background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-top:14px">'+
      '<h3 style="margin:0 0 8px">说明</h3>'+
      '<div style="color:var(--muted);font-size:13px;line-height:1.7">'+
        '· 本页直接对照 <code>'+esc(DATA.storyTitle)+'/manifest.ts</code> 的真实清单，并用浏览器自动检测磁盘文件。<br>'+
        '· <span style="color:var(--red)">红框</span>=磁盘缺失（引擎加载会 404）；正常图可点击放大核对。<br>'+
        '· 音频状态由生成器实测 <code>public/</code> 下文件存在性得出（"待采购"=磁盘无此文件，登记会 404 崩溃）。<br>'+
        '· 缺失图片通常因对应素材尚未产出；补齐后刷新本页即变绿。'+
      '</div>'+
    '</div>';
}

function renderBg(){
  let h='';
  DATA.scenes.forEach(s=>{
    const angles=["left","center","right"];
    h+='<div class="scene-card"><div class="scene-head">'+esc(s.name)+
       '<span class="kk">'+esc(s.key)+'</span></div><div class="angle-grid">';
    angles.forEach(a=>{
      const file=s.key+"_"+a+".png";
      const src=DATA.bgPrefix+file;
      h+='<div class="angle" onclick="openLb(\''+esc(src)+'\',\''+esc(s.name+" · "+a)+'\',\''+esc(file)+'\')">'+
          '<img class="thumb" src="'+esc(src)+'" onerror="markMiss(this)">'+
          '<div class="cap">'+esc(a)+' · '+esc(file)+'</div></div>';
    });
    h+='</div></div>';
  });
  $("#p-bg").innerHTML=h;
}

function renderCg(){
  let h='<div class="group-title">CG 单图（'+DATA.cgs.length+' 张 · 与背景同目录同 16:9）</div><div class="bg-grid">';
  DATA.cgs.forEach(k=>{
    const file=k+".png"; const src=DATA.bgPrefix+file;
    h+='<div class="bg-card" onclick="openLb(\''+esc(src)+'\',\''+esc("CG "+k)+'\',\''+esc(file)+'\')">'+
        '<img class="thumb" src="'+esc(src)+'" onerror="markMiss(this)">'+
        '<div class="cap">'+esc(file)+'</div></div>';
  });
  h+='</div>';
  $("#p-cg").innerHTML=h;
}

function renderChars(){
  let h='';
  DATA.chars.forEach(c=>{
    h+='<div class="char-card"><div class="char-head"><span class="nm">'+esc(c.name||c.id)+'</span>'+
       '<span class="meta">id: '+esc(c.id)+' · '+c.poses.length+' pose</span></div><div class="pose-grid">';
    c.poses.forEach(p=>{
      const file=c.id+"_"+p+".png"; const src=DATA.spPrefix+file;
      h+='<div class="pose" onclick="openLb(\''+esc(src)+'\',\''+esc((c.name||c.id)+" · "+p)+'\',\''+esc(file)+'\')">'+
          '<img class="thumb" src="'+esc(src)+'" onerror="markMiss(this)">'+
          '<div class="cap"><div class="fn">'+esc(file)+'</div></div></div>';
    });
    h+='</div></div>';
  });
  $("#p-char").innerHTML=h;
}

function renderItems(){
  let h='<div class="group-title">物证弹窗图（'+DATA.items.length+' 张）</div><div class="item-grid">';
  DATA.items.forEach(it=>{
    const file=it.src.split('/').pop(); const src=it.src;
    h+='<div class="item-card" onclick="openLb(\''+esc(src)+'\',\''+esc(it.caption)+'\',\''+esc(file)+'\')">'+
        '<img class="thumb" src="'+esc(src)+'" onerror="markMiss(this)">'+
        '<div class="cap"><div class="nm">'+esc(it.caption)+'</div><div class="fn">'+esc(file)+'</div></div></div>';
  });
  h+='</div>';
  $("#p-item").innerHTML=h;
}

function renderAudio(){
  let rows='';
  DATA.audio.forEach(a=>{
    const tag = a.type==="bgm"
      ? '<span class="tag bgm">BGM</span>'
      : '<span class="tag se">SE</span>';
    const st = a.status==="ok"
      ? '<span class="tag ok">已落位</span>'
      : '<span class="tag miss">待采购</span>';
    rows+='<tr><td class="mono">'+esc(a.id)+'</td><td>'+tag+'</td><td>'+st+'</td>'+
          '<td class="mono">'+esc(a.file)+'</td><td class="mono">'+esc(a.src)+'</td></tr>';
  });
  $("#p-audio").innerHTML=
    '<table><thead><tr><th>id</th><th>类型</th><th>状态</th><th>文件名</th><th>落位路径</th></tr></thead><tbody>'+
    rows+'</tbody></table>'+
    '<div style="color:var(--muted);font-size:13px;margin-top:12px;line-height:1.7">'+
      '· 文件名必须逐字符等于左表（小写、无空格/中文），否则引擎 <code>loadAudio</code> 404 → 游戏启动崩溃。<br>'+
      '· BGM 需在收费 AI 音乐站生成后，把 wav/mp3 放入 <code>public/audio/</code> 并以左表 id 命名。<br>'+
      '· BGM 要求可无缝循环（首尾能接上），结尾别做长尾淡出。'+
    '</div>';
}

/* tab 切换 */
document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    const which=t.dataset.t;
    ["overview","bg","cg","char","item","audio"].forEach(s=>{
      $("#p-"+s).classList.toggle("hidden", s!==which);
    });
  });
});

/* 启动 */
$("#st").textContent = DATA.storyTitle;
$("#gen").textContent = DATA.generated;
renderOverview(); renderBg(); renderCg(); renderChars(); renderItems(); renderAudio();
</script>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser(description="从 story<N>/manifest.ts 生成资产查看/审核页")
    ap.add_argument('--story', required=True, help='故事目录名，如 <story>')
    ap.add_argument('--engine', default='<avg-engine>', help='avg-engine 根目录')
    ap.add_argument('--meta', default=None, help='可选：中文名映射 json（scenes/chars）')
    ap.add_argument('--out', default=None, help='输出 html 路径；缺省 public/resource-manager-<story>.html')
    a = ap.parse_args()

    manifest_path = os.path.join(a.engine, 'src', 'game', a.story, 'manifest.ts')
    if not os.path.exists(manifest_path):
        sys.exit('✗ manifest 未找到: ' + manifest_path)

    text = open(manifest_path, encoding='utf-8').read()

    bg_block = find_block(text, 'backgrounds') or ''
    sp_block = find_block(text, 'sprites') or ''
    it_block = find_block(text, 'items') or ''
    au_block = find_block(text, 'audio') or ''

    bg_kv = parse_kv(bg_block)
    sprites = parse_sprites(sp_block)
    audio_kv = parse_kv(au_block)

    # items
    items = []
    item_prefix = None
    for m in re.finditer(r'(\w+)\s*:\s*\{([^}]*)\}', it_block):
        inner = m.group(2)
        src = re.search(r"src\s*:\s*'([^']*)'", inner)
        cap = re.search(r"caption\s*:\s*'([^']*)'", inner)
        if src:
            items.append({'id': m.group(1), 'src': src.group(1).lstrip('/'),
                          'caption': cap.group(1) if cap else m.group(1)})
            if item_prefix is None:
                item_prefix = dir_of(src.group(1).lstrip('/'))

    # scenes + cgs（从 backgrounds 推导；前缀也从第一个 url 取）
    scenes_order = []
    scenes_set = set()
    cgs = []
    bg_prefix = None
    for k, url in bg_kv.items():
        if bg_prefix is None:
            # 转相对路径：使本页既能 file:// 直接打开，也能经 dev server 访问
            bg_prefix = dir_of(url.lstrip('/'))
        if k.startswith('cg_'):
            cgs.append(k)
        elif re.search(r'_(left|center|right)$', k):
            s = k.rsplit('_', 1)[0]
            if s not in scenes_set:
                scenes_set.add(s)
                scenes_order.append(s)
        else:
            if k not in scenes_set:
                scenes_set.add(k)
                scenes_order.append(k)

    # sprites（含 prefix 提取）
    sp_prefix = None
    chars = []
    for cid, poses in sprites.items():
        if poses and sp_prefix is None:
            sp_prefix = dir_of(poses[0][1].lstrip('/'))
        chars.append({'id': cid, 'poses': [p for p, _ in poses]})

    # audio（实测磁盘存在性 → ok/miss）
    audio = []
    audio_prefix = None
    for k, url in audio_kv.items():
        rurl = url.lstrip('/')
        if audio_prefix is None:
            audio_prefix = dir_of(rurl)
        f = rurl.rsplit('/', 1)[1]
        typ = 'bgm' if k.startswith('bgm_') else 'se'
        local = os.path.join(a.engine, 'public', rurl)
        status = 'ok' if os.path.exists(local) else 'miss'
        audio.append({'id': k, 'type': typ, 'status': status, 'file': f, 'src': rurl})

    # meta 中文名（可选）
    meta = {}
    if a.meta and os.path.exists(a.meta):
        try:
            meta = json.load(open(a.meta, encoding='utf-8'))
        except Exception as e:
            print('⚠ meta 解析失败，使用 id 兜底:', e)
    scene_names = meta.get('scenes', {})
    char_names = meta.get('chars', {})
    title = meta.get('title', a.story)

    scenes = [{'key': s, 'name': scene_names.get(s, s)} for s in scenes_order]
    chars = [{'id': c['id'], 'name': char_names.get(c['id'], c['id']), 'poses': c['poses']}
             for c in chars]

    data = {
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'storyTitle': title,
        'bgPrefix': bg_prefix or '',
        'spPrefix': sp_prefix or '',
        'itemPrefix': item_prefix or '',
        'audioPrefix': audio_prefix or '',
        'scenes': scenes,
        'cgs': cgs,
        'chars': chars,
        'items': items,
        'audio': audio,
    }

    out = a.out or os.path.join(a.engine, 'public', 'resource-manager-%s.html' % a.story)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    html = (HEADER.replace('__STORY_TITLE__', title)
            + '\nconst DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
            + FOOTER)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)

    n_audio_ok = sum(1 for x in audio if x['status'] == 'ok')
    print('✓ 生成:', out)
    print('  场景 %d · CG %d · 立绘 %d(角色 %d) · 物证 %d · 音频 %d(%d 已落位)'
          % (len(scenes), len(cgs),
             sum(len(c['poses']) for c in chars), len(chars),
             len(items), len(audio), n_audio_ok))


if __name__ == '__main__':
    main()
