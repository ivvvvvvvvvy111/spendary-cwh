# Spendary

Spendary 是一款移动优先的消费日记。每笔消费会变成一颗圆点：大小代表金额，颜色代表分类。

## 本地运行

```bash
npm install
npm run dev
```

消费记录目前保存在浏览器的 `localStorage` 中。

## 生产构建

```bash
npm run build
```

推送到 `main` 后，GitHub Actions 会将 `dist` 部署到 GitHub Pages。
