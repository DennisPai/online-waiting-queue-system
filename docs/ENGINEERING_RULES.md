# 工程規範（重構版）

## 分支與版本
- 分支：main（穩定）、develop、feature/*、hotfix/*
- API 版本：/api/v1（舊端點保留相容期）

## 後端
- 回應格式統一：{ success, code, message, data }
- 安全：helmet、rate-limit（login/register）
- 可觀測：/health、/ready、結構化日誌（json）
- DB：增加索引（orderIndex、status、phone、queueNumber）

## 前端
- `services/*` 統一只回傳 data
- 大檔案拆分到 components/ 與 hooks/
- 表單驗證 schema 抽離（yup/zod）

## CI/CD
- Lint+Test+Build 必過；後端先部署、再切前端；觀察 1–2 週
