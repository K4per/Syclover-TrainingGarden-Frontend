# Syclover Training Garden Frontend

当前版本：**Alpha0.0.6**。CTF 分类主题使用 CSS 线条图形，不依赖 Emoji；Web 和 Pwn 使用自绘地球、炸弹线稿。

版本：**Alpha0.0.6**

Vue 3 + Vite 实现的 Syclover 训练平台界面，提供练习大厅、独立 CTF/AWDP 题库、个人主页、资料编辑、成就徽章、五级难度、分类筛选、Solves/血榜、Markdown 详情与 Hints，以及包含即时镜像构建的管理员控制台。

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

## Alpha0.0.4

- 上传 ZIP 时在上传页面实时显示构建日志，保留最终完整输出及成功/失败状态。
- Web、Pwn、Reverse、Crypto、Misc 分类选项与卡片提供独立主题。
- 页面切换过渡动画，尊重系统减少动态效果设置。
- 正确 Flag 和防御补丁通过 Check 后显示可关闭的醒目成功提示。

## Alpha0.0.6

- CTF 与 AWDP 合并为练习大厅入口，分别进入对应题库。
- 个人主页支持头像地址、签名、训练方向、密码修改和成就徽章。
- 注册自动获得“新芽组成员”，管理员授予“核心组成员”后会移除新芽徽章。
- 个人主页支持头像、签名、方向和密码修改；成就描述使用斜体，获取方式使用粗体。
- AWDP 防御页面提交 `patch.zip`，按 Pwn/Web 题型显示文件要求。
- 管理后台区分根管理员与普通管理员，新增 Peak Geek 2025 徽章。
