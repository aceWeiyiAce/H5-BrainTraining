# 脑力锻炼 H5

这是一个可部署到 GitHub Pages 的静态 H5 应用，包含：

- 舒特尔方格训练
- 单词拼写训练
- 顺序/无序词表
- 内嵌本地单词数据
- PWA 缓存支持

## 本地预览

```bash
npm run preview
```

## 重新生成发布目录

```bash
npm run build
```

发布目录是 `dist`。GitHub Actions 会在推送到 `main` 后自动发布 `dist` 到 GitHub Pages。
