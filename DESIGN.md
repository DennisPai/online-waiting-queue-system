# 修玄宮候位系統 — UI 設計規範

> 所有 UI 改動必須遵循此文件。配色、字體、元件風格的 source of truth。

---

## 配色方案

基於 MUI Theme（`frontend/src/theme.js`）：

| 用途 | 色碼 | 說明 |
|------|------|------|
| Primary | `#ff8800` | 橙色主色調（修玄宮品牌色） |
| Primary Light | `#ffaa33` | 淺橙（hover、背景） |
| Primary Dark | `#e67700` | 深橙（active、強調） |
| Secondary | `#3b3b3b` | 深灰輔助色 |
| Secondary Light | `#6d6d6d` | 中灰 |
| Secondary Dark | `#1e1e1e` | 近黑 |
| Background Default | `#f5f5f5` | 頁面背景 |
| Background Paper | `#ffffff` | 卡片/面板背景 |
| Text Primary | `#333333` | 主要文字 |
| Text Secondary | `#666666` | 次要文字 |
| Contrast Text | `#ffffff` | 按鈕/深色背景上的文字 |

## 字體

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

- 使用系統字體堆疊，不引入外部字體
- 支援 `--font-size-multiplier` CSS 變數（用戶端字體大小調整功能）
- 標題（h1-h6）：`fontWeight: 600`
- 按鈕：`fontWeight: 600`，`textTransform: none`（不強制大寫）

### 字級（base × multiplier）
| 層級 | 基準大小 |
|------|---------|
| h1 | 2.125rem |
| h2 | 1.875rem |
| h3 | 1.5rem |
| h4 | 1.25rem |
| h5 | 1.125rem |
| h6 | 1rem |
| body1 | 1rem |
| body2 | 0.875rem |
| button | 0.875rem |
| caption | 0.75rem |

## 元件風格

### 按鈕（MuiButton）
- `borderRadius: 30`（圓角膠囊型）
- `padding: 8px 24px`
- Contained 按鈕無 boxShadow，hover 時出現 `0px 4px 8px rgba(0,0,0,0.1)`

### 卡片（MuiCard）
- `borderRadius: 12`
- `boxShadow: 0px 2px 10px rgba(0,0,0,0.05)`（輕柔陰影）

### 輸入框（MuiTextField）
- `borderRadius: 8`
- Outlined 樣式

### 表格（MuiTableCell）
- 字級同 body2（0.875rem × multiplier）

### Chip 標籤（MuiChip）
- 字級 0.8125rem × multiplier

## 全域圓角
- `shape.borderRadius: 8`（通用圓角）

## 響應式

前端使用 MUI Grid + Breakpoints（MUI 預設）：
- **xs**：0px（手機直向）
- **sm**：600px（手機橫向 / 小平板）
- **md**：900px（平板）
- **lg**：1200px（桌面）
- **xl**：1536px（大螢幕）

管理後台使用 AdminLayout 左側選單 + 主內容區。手機版自動收合選單。

## 視覺參考

- 問事單實體樣式：`docs/修玄宮問事單.jpg`
- PDF 問事單格式：A4 橫式，內含雙 A5 直式問事單
- 品牌核心意象：橙色（廟宇金色系）+ 白底乾淨簡約
