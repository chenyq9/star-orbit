# Star Orbit 项目状态（唯一事实来源）

> 任何 AI（主 AI / 子 AI / 新会话）接手前必读本文档。每阶段结束由主 AI 更新。
> 更新时间：2026-09-19（v1.3 内容扩充完成：17 关全链路验证）

## 一句话现状

星球主题轨道解谜游戏（Web 原型阶段）。核心机制已数学验证，**关卡扩产完成：17 关**（v1 教学 6 关 + v2 双球巩固带 L7-L12 + 三色挑战带 L13-L17），全链路验证通过（BFS 双保险 + 浏览器 17/17 全通关 + 游戏内 solver 全部最优步破关）。**v1.3 已交付**（prototype/levels-v1.html）。打包基建已就绪（GitHub Actions CI 出包 + 真机部署验证过 v1.2 debug APK）。当前焦点：① 用户真机试玩 v1.3 反馈（重点 L12/L16 卡关感、L13 紫球引入回落是否够）；② 外部识图 AI 画面评审（提示词已存档，等回贴）；③ 上架合规项（防沉迷+隐私政策）未实施。

## 项目宪法摘要（全文见 PROJECT_CHARTER.md）

- 目标：做出真正好玩、可上架的游戏，不是"能运行"
- AI 主导设计决策；用户低参与，只在重大分歧时决策
- **不降级原则**：做不了的功能保留原设计，占位+汇报+方案讨论，禁止私自弱化
- 主题：星球环绕，特效模仿现实天体物理（物理是比喻不是数学课）

## 技术架构与文件

- 引擎：纯 HTML5 Canvas 单文件（无依赖），原型阶段；正式版引擎未定（TapTap 打包预研走 Capacitor 路线）
- 运行环境：手机 Linux 终端（proot Ubuntu）+ 无头浏览器测试（依赖 Shizuku，掉线需重启）+ node BFS 求解器
- 仓库：github.com/chenyq9/star-orbit（main，最新 commit `294a953`，与本地已同步）
- 本地工作区：`/tmp/star-orbit`；本地服务：`python3 -m http.server 8765`（掉线重启）
- 文件：
  - `PROJECT_CHARTER.md` 宪法（不改）
  - `DESIGN_DRAFT.md` 设计方向（方向 A 纯解谜主骨架，B 实时物理 / C 双人对弈 / D 无尽生成保留）
  - `00_PROJECT_STATUS.md` 本文档（唯一事实来源）
  - `levels/levels-v1.md` 6 关设计表 + 最优解
  - `levels/levels-v2.md` **v2 关卡设计文档（L7~L17 量化维度+设计意图）**
  - `prototype/skeleton-v0.1.html` 机制骨架（已验证）
  - `prototype/levels-v1.html` **试玩包 v1.3（当前主文件，17 关）**
  - `prototype/VERIFY_REPORT.md` 骨架验证报告
  - `tools/orbit_core.js` **规则核心单一来源（simStep/hasDup/isWin 与游戏同源）**
  - `tools/verify_levels.js` 关卡验证器（BFS：可解性/最优步/解条数/首步分支）
  - `tools/gen_levels.js` 关卡候选生成器（程序化采样+量化筛选）
  - `tools/levels-v2.json` v2 关卡设计源（验证输入）
  - `tools/extract_levels.js` 游戏内关卡反向提取器（双保险验证）
  - `tools/extract-shot.js` 截图提取工具；`tools/external_review_prompt.md` 外部评审提示词存档
  - `test-shots/` 测试截图（v13-l1 / v13-l13-purple / v13-l17-final）

## 核心机制（已数学验证）

- 双轨道各 12 槽（30°/槽），交点：左 10↔右 8（上）、左 2↔右 4（下）
- 转某轨 = 该轨所有球 ±1 槽；到交点自动双挂；随任一轨离开交点即脱离另一轨
- **已证明**：当前规则下球间永不互挡（碰撞检查是安全冗余）
- 关卡用 BFS 求解器精确验证（node 环境跑，代码模式在 levels-v1.md）

## 教学关卡 v1（全部实测通关）

| 关 | 名称 | 最优步 |
|---|---|---|
| 1 | 启程（学拖动） | 3 |
| 2 | 引力窗口（学换轨·核心顿悟关） | 4 |
| 3 | 双星协奏（学双球规划） | 8 |
| 4 | 弧的抉择（学看弧段） | 2 |
| 5 | 交叉航线（双球换轨） | 9 |
| 6 | 轨道合流（综合） | 10 |

## 当前版本功能清单（v1.2）

- 6 教学关 + 三星评价（≤最优 3 星）+ 进度存档（localStorage: starorbit_progress_v1）+ 解锁链
- 拖动跟手渲染 + 松手 150ms 缓动 + 自适应缩放（R=min(W*0.31,H*0.26)，全屏可见）
- 三档提示系统：H1 轨道高亮（紫光晕，不给方向）/ H2 方向箭头 / H3 自动执行一步（计入步数，170ms 锁防连点）
- 提示配额：每关每尝试 H1×3 / H2×2 / H3×1；restart 重置；不持久化
- Mock 激励广告位：配额用尽弹面板「模拟看完广告」→ grant 恢复该档满值；`AdGateway` 接口形状（isReady/showRewarded）为 TapTap SDK 预留
- 实时 BFS 求解器（solveHint）：genSim/genDup/genWin 按 levelDef 泛化（rings/balls 数组 + gates 数组），为三轨预留；返回 status/ring/dir/dist
- **逻辑层四函数（simStep / hasDup / applyStepCore / checkWin）自骨架验证后未动过，禁改**

## 待办 / 已知问题

1. 【进行中】外部识图 AI 画面评审：提示词已存档（`tools/external_review_prompt.md`），等用户将外部 AI 回复贴回 → 主 AI 逐条核对采纳。「悟了」时刻描述直接决定 L2 教学设计是否成立
2. 【进行中】真人试玩反馈：v1.2 已交付用户真机自玩。关键验证点：L2「引力窗口」顿悟感、拖动手感、H1 紫光晕 / H2 箭头视觉直觉、双圆缩放可见性
3. TapTap 打包预研（Capacitor 路线，纯本地）+ 商业化合规（版号问题需核实）
4. 双挂堵门规则设计决策（当前规则下不存在，待真人试玩后讨论）
5. 椭圆变速 / 第三轨道 / 音频未启动（保留方向，非降级）
6. 合成 PointerEvent 触发 setPointerCapture 报错（不影响逻辑但日志脏，小修）
7. Shizuku 掉线时浏览器自动化不可用（环境问题，重启 Shizuku 恢复）

## 模型与账号分工（2026-09-18 核对）

- ⚠️ agentrouter glm-5.3 已于 09-16 下架（503 无可用渠道），勿再用
- ⚠️ **当前 CHAT 绑定 = 「默认配置」deepseek-v4.1-flash-expires-on-0910（DeepSeek 官方）**——与「不用默认配置」政策不符，待用户确认是否切回洛樱云
- 9 项功能模型 → 洛樱云（zai-org/GLM-5.3；池子会重排，modelIndex 用前核对）
- 子 AI「星轨·设计审查员」：FOLLOW_GLOBAL，随 CHAT 绑定
- 默认配置（DeepSeek 官方）原则不用——花真钱
- 账号：GitHub chenyq9 / star-orbit，PAT 在记忆库「游戏项目 star-orbit：Github 账号与安全提醒」

## 历史里程碑

- 09-14 玩法种子入库（circle.html 系列）；宪法 + 设计草案
- 09-15 骨架 v0.1（BFS 验证）+ 教学关 v1 + 试玩包 v1.1
- 09-16 丝滑移动 + 自适应缩放（`3a245dd`）
- 09-17/18 提示系统 v1.2（`fa31f9d`）→ 锁期 bug 修复（`5cec66d`）→ 全链路验收 T1-T8 → 子 AI 评审 → 修复 4 项（`294a953`）；v1.2 交付用户真机自玩；画面评审交外部识图 AI
