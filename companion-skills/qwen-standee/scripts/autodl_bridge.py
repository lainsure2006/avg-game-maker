#!/usr/bin/env python3
"""AutoDL + character-standee 本地编排桥（paramiko）。

职责：本地用 paramiko 走 SSH 密码登录 → 上传 skill 脚本与角色输入 → 在云端跑
sheet/state/rmbg/check → 用 SFTP 拉回 rmbg/*.png → 本地归一化（高度980/底部对齐/透明RGBA）
注册到引擎 sprite/jianmo。无需 6006 隧道、无需 sshpass/plink。

凭证：从本地凭证文件读取（见下方 CREDS，默认读环境变量 AUTODL_CREDS 指向的 JSON，
含 host/port/user/password）。**不要把凭证写死在脚本里、不要进任何 git 仓库。**

用法:
  python autodl_bridge.py --probe                 # 探活 + 列模型（确认云端可达）
  python autodl_bridge.py --upload                # 上传 scripts + chars
  python autodl_bridge.py --char <CHAR_ID> --sheet  # 只跑设定表（qwen 出 4 视角 2:1 宽图）
  python autodl_bridge.py --char <CHAR_ID> ... --sheet_pull  # 拉回设定图给客户审形象（审核门）
  python autodl_bridge.py --char <CHAR_ID> --state --rmbg --check --pull   # 客户形象合格后再：立绘+抠图+验收+拉回
  python autodl_bridge.py --char <CHAR_ID> --register          # 客户确认立绘 OK 后，仅本地把已拉回的图注册引擎
"""
import argparse, json, os, re, sys, time
from pathlib import Path

from paramiko import SSHClient, AutoAddPolicy, SSHException

BASE = Path(__file__).resolve().parent
# 本地凭证 JSON：{ "host": "...", "port": 6006, "user": "root", "password": "..." }
# 默认读环境变量 AUTODL_CREDS；也可直接改成你的凭证文件路径。切勿提交此文件入 git。
CREDS = Path(os.environ.get("AUTODL_CREDS", r"<path-to-your-autodl-creds-json>"))
TOOLS_LOCAL = BASE / "scripts"
CHARS_LOCAL = BASE / "chars"
OUT_LOCAL = BASE / "out"
# 引擎 sprite 输出目录（注册目标）。默认读环境变量 ENGINE_SPRITE_DIR；也可直接改。
# 例：<your-avg-engine>/public/images/sprite/<game>
PROJECT_ROOT = Path(os.environ.get("AVG_PROJECT_ROOT", r"<path-to-your-avg-engine-example>"))
ENGINE_SPRITE = Path(os.environ.get("ENGINE_SPRITE_DIR", str(PROJECT_ROOT / "public/images/sprite/<game>")))

TOOLS_REMOTE = "/root/autodl-tmp/tools"
CHAR_REMOTE = "/root/autodl-tmp/char"
COMFY_OUT = "/root/ComfyUI/output"


def load_creds():
    return json.loads(CREDS.read_text())


def client():
    c = load_creds()
    ssh = SSHClient()
    ssh.set_missing_host_key_policy(AutoAddPolicy())
    ssh.connect(c["host"], port=c["port"], username=c["user"], password=c["password"],
                timeout=30, look_for_keys=False, allow_agent=False)
    ssh.get_transport().set_keepalive(30)
    return ssh


def run(ssh, cmd, timeout=3600):
    print(f"[ssh]$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    rc = stdout.channel.recv_exit_status()
    for line in out.splitlines():
        print("   ", line)
    if err.strip():
        for line in err.splitlines():
            print("   !", line)
    if rc != 0:
        print(f"   [非零退出 {rc}]")
    return rc, out, err


def sftp_upload_dir(sftp, local_dir: Path, remote_dir: str):
    for f in local_dir.iterdir():
        if f.is_file():
            sftp.put(str(f), f"{remote_dir}/{f.name}")
            print(f"   put {f.name}")


def _exists(sftp, path):
    try:
        sftp.stat(path)
        return True
    except IOError:
        return False


def upload(ssh):
    sftp = ssh.open_sftp()
    # tools
    ssh.exec_command(f"mkdir -p {TOOLS_REMOTE}")
    sftp_upload_dir(sftp, TOOLS_LOCAL, TOOLS_REMOTE)
    # chars
    for char_dir in sorted(CHARS_LOCAL.iterdir()):
        if not char_dir.is_dir():
            continue
        rid = f"{CHAR_REMOTE}/{char_dir.name}"
        ssh.exec_command(f"mkdir -p {rid}")
        sftp_upload_dir(sftp, char_dir, rid)
    sftp.close()
    print("[upload] done")


def ensure_comfy(ssh):
    # 云端 ComfyUI 已在 6006 运行（用户启动），不要自启 8188 实例
    rc, out, _ = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6006/system_stats")
    if "200" in out:
        print("[comfy] 6006 已在运行")
        return
    print("[comfy] 6006 未运行！云端 ComfyUI 应在 6006，请确认已启动（勿自启 8188）")
    sys.exit(1)


def gen_stage(ssh, char, stage, steps=30, ref=None, ref_cells="0,3"):
    cmd = (f"cd {TOOLS_REMOTE} && /root/miniconda3/bin/python3.12 char_pipeline.py --char {char} "
           f"--stage {stage} --steps {steps}")
    if ref and stage == "state":
        cmd += f" --ref_image {ref} --ref_grid 4,1 --ref_cells {ref_cells}"
    run(ssh, cmd, timeout=1800)


def clean_stage(ssh, char):
    """清云端该角色的 states/rmbg 残留（避免跨轮次变体累积被 rmbg 一起处理）。"""
    run(ssh, f"rm -f {COMFY_OUT}/{char}/states/*.png {COMFY_OUT}/{char}/rmbg/*.png")


def rmbg_stage(ssh, char):
    run(ssh, f"rm -f {COMFY_OUT}/{char}/rmbg/*.png")   # 防跨轮次累积变体
    cmd = (f"cd {TOOLS_REMOTE} && /root/miniconda3/bin/python3.12 rmbg_stage.py --char {char} "
           f"--pattern 'states/*.png'")
    run(ssh, cmd, timeout=600)


def check_stage(ssh, char, ref=False):
    if not ref:
        run(ssh, f"cd {TOOLS_REMOTE} && /root/miniconda3/bin/python3.12 check_assets.py sheet "
                  f"{COMFY_OUT}/{char}/cells/*.png")
    run(ssh, f"cd {TOOLS_REMOTE} && /root/miniconda3/bin/python3.12 check_assets.py alpha "
              f"{COMFY_OUT}/{char}/rmbg/*.png")
    # 外部参考(krea2)时身份锚点用面部特写格 k3（与 --ref_cells 默认最后一列一致）；
    # 原生流程用 qwen 自出 sheet 的 head 格。
    refcell = f"{COMFY_OUT}/{char}/cells/k3.png" if ref else f"{COMFY_OUT}/{char}/cells/head.png"
    run(ssh, f"cd {TOOLS_REMOTE} && /root/miniconda3/bin/python3.12 check_assets.py sim "
              f"{refcell} {COMFY_OUT}/{char}/rmbg/*.png")


def pull(ssh, char):
    sftp = ssh.open_sftp()
    dst = OUT_LOCAL / char / "rmbg"
    dst.mkdir(parents=True, exist_ok=True)
    for f in dst.glob("*.png"):        # 清本地旧变体，避免与云端不一致累积
        f.unlink()
    remote = f"{COMFY_OUT}/{char}/rmbg"
    try:
        files = sftp.listdir(remote)
    except IOError:
        print(f"[pull] 远端无 {remote}")
        sftp.close()
        return []
    got = []
    for fn in files:
        if fn.lower().endswith(".png"):
            sftp.get(f"{remote}/{fn}", str(dst / fn))
            got.append(dst / fn)
            print(f"   get {fn}")
    sftp.close()
    return got


def sheet_pull(ssh, char):
    """【审核门用】只把云端该角色的设定图 sheet_*.png 拉回本地 out/<char>/sheet/ 供客户审形象。"""
    sftp = ssh.open_sftp()
    dst = OUT_LOCAL / char / "sheet"
    dst.mkdir(parents=True, exist_ok=True)
    remote = f"{COMFY_OUT}/{char}"
    try:
        files = sftp.listdir(remote)
    except IOError:
        print(f"[sheet_pull] 远端无 {remote}")
        sftp.close()
        return []
    got = []
    for fn in files:
        if fn.startswith("sheet_") and fn.lower().endswith(".png"):
            sftp.get(f"{remote}/{fn}", str(dst / fn))
            got.append(dst / fn)
            print(f"   get {fn}")
    sftp.close()
    return got


def register(char):
    """把本地 OUT_LOCAL/<char>/rmbg/*.png 归一化（高980/底部对齐/透明）注册引擎。"""
    src = OUT_LOCAL / char / "rmbg"
    prompts = json.loads((CHARS_LOCAL / char / "prompts.json").read_text())
    poses = list(prompts["game"]["shots"].keys())
    ENGINE_SPRITE.mkdir(parents=True, exist_ok=True)
    from PIL import Image
    H = 980
    done = set()   # 每个 pose 只取第一张变体（sorted 后 _00001_ 在前），确定性覆盖
    for png in sorted(src.glob("*.png")):
        # 解析 pose：文件名形如 game_default_00001__00001_.png
        pose = None
        m = re.match(r"game_(.+?)_\d+__\d+_", png.stem)
        if m:
            pose = m.group(1)
        if pose not in poses:
            print(f"   [skip] {png.name} 未匹配已知 pose（{poses}）")
            continue
        if pose in done:
            continue
        done.add(pose)
        im = Image.open(png).convert("RGBA")
        alpha = im.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            im = im.crop(bbox)
        w, h = im.size
        scale = H / h
        nw = max(1, round(w * scale))
        im = im.resize((nw, H), Image.LANCZOS)
        canvas = Image.new("RGBA", (nw, H), (0, 0, 0, 0))
        canvas.paste(im, (0, 0))
        out = ENGINE_SPRITE / f"{char}_{pose}.png"
        canvas.save(out)
        print(f"   register {out.name}  {nw}x{H}")


def probe(ssh):
    rc, out, _ = run(ssh, "curl -s http://127.0.0.1:8188/system_stats | head -c 200")
    run(ssh, "ls -1 /root/ComfyUI/models/checkpoints/ 2>/dev/null | head; "
              "ls -1 /root/ComfyUI/models/ | head -30")
    run(ssh, "df -h /root/autodl-tmp 2>/dev/null | tail -1")
    run(ssh, "python -c \"import insightface\" 2>&1 | head -1; "
              "ls /root/ComfyUI/models/insightface 2>/dev/null")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--upload", action="store_true")
    ap.add_argument("--char", nargs="+")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--state", action="store_true")
    ap.add_argument("--rmbg", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--pull", action="store_true")
    ap.add_argument("--sheet_pull", action="store_true",
                    help="【审核门】只拉云端设定图 sheet_*.png 到本地 out/<char>/sheet/ 供客户审形象")
    ap.add_argument("--register", action="store_true")
    ap.add_argument("--gen", action="store_true", help="sheet+state+rmbg+pull+register")
    ap.add_argument("--steps", type=int, default=30)
    ap.add_argument("--ref", default=None,
                    help="云端已存在的外部设定表(如 krea2 4视图)路径，state 阶段作为 qwen 参考源")
    ap.add_argument("--ref_local", default=None,
                    help="本地 krea2 设定表路径，上传到云端 refs/<char>.png 后当 --ref 用（单角色实验）")
    ap.add_argument("--ref_cells", default="0,3",
                    help="外部设定表取哪几列当参考(逗号分隔，负数=-len)；默认 0,3")
    ap.add_argument("--clean", action="store_true",
                    help="跑前清云端该角色 states/rmbg 残留（避免跨轮次变体累积）")
    a = ap.parse_args()

    ssh = client()
    try:
        if a.probe:
            probe(ssh)
            return
        if a.upload:
            upload(ssh)
            return
        ensure_comfy(ssh)
        chars = a.char or []
        ref_cloud = a.ref
        if a.ref_local and chars:
            sftp = ssh.open_sftp()
            ssh.exec_command(f"mkdir -p {TOOLS_REMOTE}/refs")
            sftp.put(a.ref_local, f"{TOOLS_REMOTE}/refs/{chars[0]}.png")
            sftp.close()
            ref_cloud = f"{TOOLS_REMOTE}/refs/{chars[0]}.png"
            print(f"[ref] 上传 {a.ref_local} -> {ref_cloud}")
        for char in chars:
            ref_here = ref_cloud if (len(chars) == 1) else None
            if a.clean:
                clean_stage(ssh, char)
            if a.gen or a.sheet:
                gen_stage(ssh, char, "sheet", a.steps)
            if a.gen or a.state:
                gen_stage(ssh, char, "state", a.steps, ref=ref_here, ref_cells=a.ref_cells)
            if a.gen or a.rmbg:
                rmbg_stage(ssh, char)
            if a.gen or a.check:
                check_stage(ssh, char, ref=bool(ref_here))
            if a.gen or a.pull:
                pull(ssh, char)
            if a.sheet_pull:
                sheet_pull(ssh, char)
            if a.gen or a.register:
                register(char)
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
