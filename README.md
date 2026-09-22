# Syclover Training Garden Frontend

版本：**Alpha0.0.4**

Vue 3 + Vite 实现的 Syclover 训练平台界面，提供独立 CTF/AWDP 题库、五级难度、分类筛选、Solves/血榜、Markdown 详情与 Hints，以及包含即时镜像构建的管理员控制台。

```bash
npm install
npm run dev
```

开发服务器默认运行于 `http://localhost:5173`，并把 `/api` 转发至 `http://localhost:8000`。如需使用其他 API 地址，在 `.env` 中设置 `VITE_API_BASE`。

生产构建：

```bash
npm run build
```

构建结果位于 `dist/`。仓库内的 `Dockerfile` 使用 Nginx 提供静态文件，并将 API 请求反向代理至 Compose 中的 `backend` 服务。
