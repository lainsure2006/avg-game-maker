import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    open: false,
    allowedHosts: true,
    // 若你通过 symlink 访问本仓库（例如把 skill 目录软链到实际 git 仓库），
    // Vite 默认 fs.allow 按「启动目录」判定，但模块真实路径会被解析到 symlink 目标盘，
    // 二者不匹配会导致模块加载被拒（页面黑屏 / Pre-transform error）。
    // 显式把 symlink 目标盘符加入白名单即可消除；无 symlink 时可保留根目录项。
    // 本机软链：C:/Users/wll/.workbuddy/skills/avg-game-maker -> D:/avg-game-maker-skill
    fs: {
      allow: [
        resolve(__dirname),                       // 启动目录（symlink 路径）
        'D:/avg-game-maker-skill/avg-engine-example', // symlink 真实目标（引擎示例）
        'D:/avg-game-maker-skill',               // symlink 真实目标（仓库根）
        'C:/Users/wll/.workbuddy/skills',        // symlink 来源根
      ],
    },
  },
  // 无第三方运行时依赖，关闭预优化以避开环境的 safe-delete 删除拦截
  optimizeDeps: {
    disabled: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 环境的 safe-delete 拦截器会阻止 rmSync 清空 dist，关闭自动清空
    emptyOutDir: false,
  },
});
