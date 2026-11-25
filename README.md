# 易采协同台 · SupplyFlow Bidding

面向制造与产业互联网企业的**供应链询报价（RFQ）与多角色在线竞价协同全栈系统**。支持采购方与多家合格供应商在统一工作台内完成需求发标、暗标/明标在线竞价、多维度综合评分比价、一键定标以及采购降本分析全流程。

---

## 核心特性

- **实时多角色工作台切换**：基于 HMAC-SHA256 签名 `HTTP-only Cookie` 会话机制，一键在**采购方（曹杰 · 集团战略采购部）**、**供应商A（青岛海智精密制造有限公司）**、**供应商B（苏州云联工业科技有限公司）**之间无缝切换视角，即时体验完整端到端招采闭环。
- **招采大厅（RFQ Marketplace）**：支持按状态（竞价中 / 评审中 / 已定标）、品类及关键词筛选；采购方可在线发布含多行物料明细（SKU、规格型号、数量、参考单价）的询价单。
- **询价详情与比价开标台**：
  - **供应商视角**：自动汇总明细单价生成总报价，填写交付周期与质保月数，支持竞价期内更新报价；同时对竞争对手报价进行脱敏与匿名排名展示，保证招采合规。
  - **采购方视角**：横向对比各家供应商报价、预算节约额、交期与质保期，自动计算加权综合评分（价格 55% + 交期 20% + 质保 15% + 供应商历史履约 10%），支持“一键定标”。
- **采购降本分析看板**：实时汇总累计预算、实际定标节约率、各品类支出分布以及供应商履约与中标排行榜。
- **零原生依赖持久化**：采用 `sql.js`（WebAssembly SQLite）并自动持久化至 `data/supplyflow.sqlite`，跨平台开箱即用，无需 C++ 编译环境。

---

## 技术栈

- **框架**：Next.js `15.2.4` (App Router) + React `19` + TypeScript
- **样式**：Tailwind CSS `3.4` + Lucide Icons
- **数据存储**：`sql.js` (`^1.12.0`) + 本地 SQLite 文件持久化 (`./data/supplyflow.sqlite`)
- **鉴权**：Node `crypto` HMAC-SHA256 签名 `sf_session` HTTP-only Cookie
- **运行端口**：`9024`

---

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 开发模式运行（端口 9024）
pnpm dev

# 3. 生产构建与启动（端口 9024）
pnpm build
pnpm start
```

访问地址：`http://localhost:9024`

---

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查与库内询价单/报价计数 |
| `GET` | `/api/auth/me` | 获取当前登录角色会话 |
| `POST` | `/api/auth/switch-role` | 一键切换演示角色 (`buyer` / `supplier-a` / `supplier-b`) |
| `GET` | `/api/rfqs` | 获取询价单列表（支持状态、品类、搜索过滤） |
| `POST` | `/api/rfqs` | 采购方发布新询价单 |
| `GET` | `/api/rfqs/[id]` | 获取询价详情、物料明细与比价数据（按角色动态脱敏） |
| `POST` | `/api/rfqs/[id]/bids` | 供应商提交或更新报价（仅 `OPEN` 状态允许） |
| `POST` | `/api/rfqs/[id]/award` | 采购方一键定标并更新供应商中标统计 |
| `GET` | `/api/analytics` | 获取采购降本率、品类分布与供应商绩效排行 |

---

## 作者与许可

- **作者**：曹杰 / caojie (`calmjade`)
- **邮箱**：calmjade@foxmail.com
- **GitHub**：[https://github.com/calmjade](https://github.com/calmjade)
- **Gitee**：[https://gitee.com/jiejie12315](https://gitee.com/jiejie12315)
- **开源协议**：[MIT License](./LICENSE)
