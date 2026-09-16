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
