import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 关键修改：使用相对路径 './'
  // 这样无论在本地，还是部署到 GitHub Pages 的任何子路径，都能正常找到资源
  base: './',
})