import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 使用相对 base，构建产物可以直接放在 GitHub Pages 的任意子路径下
// （例如 https://<user>.github.io/<repo>/），无需修改配置。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
