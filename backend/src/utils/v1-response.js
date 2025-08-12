// 統一 v1 回應封裝中介層（暫做占位，後續逐步接入各 controller）
module.exports = (req, res, next) => {
  // 可在 res 上掛載 helper，例如 res.ok()/res.fail()，此處先保留最小實作
  next();
};

