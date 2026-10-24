# -*- coding: utf-8 -*-
"""雪见庄·长夜 剧本可视化：把 script.ts 解析为带筛选的 HTML 表格。
列：序号 / 类型 / 关键信息(背景·动作·特效·音频·条件等) / 文字内容。
用法：python3 gen_script_viewer.py
输出：script_viewer.html（项目根目录，浏览器打开即可，按 Ctrl+F 搜索定位）
"""
import re, json, html, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src/game/story14/script.ts")
OUT = os.path.join(HERE, "script_viewer.html")

with open(SRC, encoding="utf-8") as f:
    raw = f.read()

m = re.search(r"export const script.*?=\s*\[(.*?)\];", raw, re.S)
if not m:
    raise SystemExit("未找到 export const script = [...]")
body = m.group(1)

cmds = []
for line in body.splitlines():
    s = line.strip()
    if not s or s.startswith("//") or s.startswith("*") or s.startswith("/**"):
        continue
    if s.startswith("{"):
        if s.endswith(","):
            s = s[:-1]
        try:
            cmds.append(json.loads(s))
        except Exception:
            pass

def trunc(v):
    if isinstance(v, str):
        return v[:42] + "…" if len(v) > 42 else v
    return v

rows = []
for i, c in enumerate(cmds):
    t = c.get("type", "?")
    info = []
    for k, v in c.items():
        if k == "type":
            continue
        info.append(f"{k}={trunc(v)}")
    text = c.get("text", "")
    if len(text) > 70:
        text = text[:70] + "…"
    rows.append((i + 1, t, "；".join(info), html.escape(text)))

css = """
body{font-family:"Microsoft YaHei",monospace;background:#15161c;color:#dde;margin:0;padding:14px}
h2{color:#9cf;font-weight:600}
.wrap{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.wrap input,.wrap select{background:#23252f;color:#dde;border:1px solid #444;border-radius:4px;padding:5px 8px;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #3a3d4a;padding:4px 7px;vertical-align:top;text-align:left;line-height:1.45}
th{background:#2a2d3a;position:sticky;top:0;z-index:2}
tr:nth-child(even){background:#1d1f27}
.t-scene{color:#7fd} .t-char{color:#fb7} .t-narration{color:#cfcfcf} .t-dialog{color:#9df}
.t-cinematic{color:#f9f} .t-effect{color:#f99} .t-se{color:#9f9} .t-bgm{color:#9cf}
.t-anim{color:#fd9} .t-item{color:#fc9} .t-clue{color:#9ff} .t-explore{color:#fcf}
.t-label{color:#fff;font-weight:700} .t-if{color:#fbb} .t-jump{color:#bbf} .t-unlock{color:#f6f}
.t-choice{color:#fda} .t-hub{color:#c9f} .t-set{color:#9a9} .t-bgm-action{color:#9cf}
td.idx{text-align:right;color:#888;white-space:nowrap}
td.info{color:#bcd;max-width:360px}
td.txt{color:#eee;max-width:540px}
"""
tr_rows = "\n".join(
    f'<tr><td class="idx">{n}</td><td class="t-{t}">{t}</td><td class="info">{html.escape(info)}</td><td class="txt">{txt}</td></tr>'
    for n, t, info, txt in rows
)

doc = f"""<!doctype html><html><head><meta charset="utf-8">
<title>雪见庄·长夜 · 剧本可视化</title><style>{css}</style></head>
<body>
<h2>雪见庄·长夜 · 剧本可视化（共 {len(rows)} 行指令）</h2>
<div class="wrap">
  <input id="q" placeholder="搜索文字/背景/角色…" oninput="filter()">
  <select id="typ" onchange="filter()">
    <option value="">全部类型</option>
    <option value="scene">scene</option><option value="char">char</option>
    <option value="narration">narration</option><option value="dialog">dialog</option>
    <option value="cinematic">cinematic</option><option value="effect">effect</option>
    <option value="se">se</option><option value="bgm">bgm</option>
    <option value="anim">anim</option><option value="item">item</option>
    <option value="clue">clue</option><option value="explore">explore</option>
    <option value="label">label</option><option value="if">if</option>
    <option value="jump">jump</option><option value="unlock">unlock</option>
    <option value="choice">choice</option><option value="hub">hub</option>
    <option value="set">set</option>
  </select>
  <span id="cnt" style="color:#9cf;align-self:center"></span>
</div>
<table id="t"><tr><th>#</th><th>类型</th><th>关键信息</th><th>文字/内容</th></tr>
{tr_rows}
</table>
<script>
function filter(){{
  const q=document.getElementById('q').value.toLowerCase();
  const ty=document.getElementById('typ').value;
  let n=0;
  document.querySelectorAll('#t tr').forEach((r,i)=>{{
    if(i===0)return;
    const cells=r.cells; const type=cells[1].textContent;
    const blob=(cells[2].textContent+cells[3].textContent).toLowerCase();
    const ok=(!ty||type===ty)&&(!q||blob.includes(q));
    r.style.display=ok?'':'none'; if(ok)n++;
  }});
  document.getElementById('cnt').textContent='显示 '+n+' / {len(rows)}';
}}
filter();
</script>
</body></html>"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(doc)
print("已生成", OUT, "| 共", len(rows), "行指令")
