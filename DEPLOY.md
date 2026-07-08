# 部署说明

要让其他设备正常使用，需要把 `dist` 目录发布到公网静态托管平台。

## 推荐方式

上传整个 `dist` 目录到任意静态网站平台，例如：

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- 阿里云 OSS 静态网站
- 腾讯云 COS 静态网站

部署完成后，平台会给你一个 `https://...` 链接。把这个链接发给朋友，对方就可以直接使用。

## 文件说明

- `dist/index.html` 是最终首页
- `dist/manifest.webmanifest` 用于手机添加到主屏幕
- `dist/sw.js` 用于缓存页面，让用户首次打开后网络不稳定时也能继续使用
- 单词数据已经内嵌在这个 HTML 文件里
- 不需要后端、数据库或额外接口

## 每次修改后重新生成

如果改了 `assets/app.js`、`assets/styles.css` 或单词数据，运行：

```bash
npm run build
```

然后重新上传 `dist` 目录。

## 同一 Wi-Fi 下临时测试

如果只想用自己的手机临时测试，可以在电脑上运行：

```bash
npm run preview
```

然后查看电脑局域网 IP，例如 `192.168.x.x`。手机和电脑连接同一个 Wi-Fi 后，在手机浏览器打开：

```text
http://电脑局域网IP:5174/
```

这种方式只适合临时测试，电脑关机或离开同一 Wi-Fi 后就不能访问。

## 注意

`localhost`、`127.0.0.1` 这类链接只能当前电脑访问，不能发给朋友使用。给朋友长期使用时，请发送公网 `https://...` 链接。
