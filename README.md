# Amazon US FBA 新品利润评估器

中文、无框架、无运行时依赖的响应式静态网页。源代码使用 ES modules；`index.html` 为自动生成的独立网页，CSS、费率配置、计算器与交互代码全部内联，无需服务器或外部模块加载。点击项目中的 `index.html` 可交给支持 HTML 的界面预览。当前工具无法直接控制 ChatGPT 右侧面板。

## 独立文件预览

打开 `index.html` 即可使用独立版，不需要访问任何本机地址。维护时修改 `page.template.html`、CSS 或 JS 源文件，再运行 `npm run build:preview` 生成新版 `index.html`。打包只移除 import/export 包装，计算函数保持不变。

## 开发服务器与测试

需要 Python 3；测试需要 Node.js 18+。无需 npm install。

```sh
cd /workspace/codex-projects
npm start
# 或 python3 -m http.server 8000 --bind 0.0.0.0
```

可选开发服务：服务器监听 `0.0.0.0:8000`，保持进程运行，。当前交付的独立 `index.html` 无需启动服务。本项目不包含公开部署。

```sh
npm test
```

浏览器验收脚本 `tests/browser-check.cjs` 使用环境预装的 Playwright 和 Chromium（可通过 CHROMIUM_PATH 指定路径），服务启动后执行 `node tests/browser-check.cjs`。它不是应用运行依赖。

## 当前费率覆盖（2026 用户提供完整费表）

数据源：用户上传并声明已核对的 Amazon Seller Central “2026 US FBA fulfillment fee changes”页面中的 **FBA Non-Peak Fulfillment Fees (excluding apparel)** 和 **2026 Peak Fulfillment Fees (excluding apparel)**。上传原文保存在 `docs/2026-user-provided-rates.txt` 以便追溯；未再次访问 Seller Central，未采用第三方、服装、危险品或 MCF 数据。

已完整支持八种尺寸等级、三个售价档和两套费率。Small Standard 为八个重量区间；Large Standard 为至 3 lb 的十二个固定区间，加 3+–20 lb 每开始的 4 oz（0.25 lb）递增档；另有两种 Bulky 和四种 Extra-Large 档。每套配置展开为 81 行，共 162 行基础费记录。售价恰好 $10、$50 属中间档，所有重量上限均包含边界。旧 Peak Bulky/Extra-Large 费率已全部替换，不再使用旧费表。

Non-Peak：2026-01-15 至 2026-10-14；Holiday Peak：2026-10-15 至 2027-01-14。按 America/Los_Angeles 日期自动判断，2026-11-02 为 Peak，也可手动选择季节。当前版本仅提供此处列明期间的费表，不提供历史或后续年度数据。

3.5% 附加费从 2026-04-17 起单独计收，之前为 0。手动切换季节只切换基础费表，附加费仍按实际日期判断。默认可修改百分比；基础费与附加费分别四舍五入至美分，再加总。基础费配置不含附加费。

### 案例 A

15 × 12 × 12 cm、0.5 kg，售价 $10.99、出厂价 ¥9、汇率 7.2、海运 $250/m³、佣金 15%，日期 2026-11-02。

- Large Standard；实际重量和 Shipping Weight 1.1023113109 lb；体积重 0.9482826420 lb。
- 重量档 1+–1.25 lb，售价档 $10–$50，Holiday Peak。
- 基础费 $5.34；附加费 $0.19；尾程合计 **$5.53**。
- CBM 0.00216 m³；头程 $0.54；佣金 $1.6485（显示 $1.65）；出厂成本 $1.25。
- 单件利润 $2.0215（显示 **$2.02**）；利润率 **18.39%**；ROI **27.62%**。

### 案例 B

52.5 × 52.5 × 62.5 cm、21 kg：实际重 46.297075 lb，体积重和 Shipping Weight 75.628010 lb，Length + Girth 107.283465 inch，Extra-Large 70+–150 lb。超出 71 lb 的部分计 5 个 1 lb 区间。

Holiday Peak、明确输入售价 <$10：54.97 + 5 × 0.75 = $58.72，附加费 $2.06，尾程 **$60.78**。售价 $10–$50 或 >$50：55.74 + 5 × 0.75 = $59.49，附加费 $2.08，尾程 **$61.57**。体积显示 0.1723 m³，头程 $43.07。未输入售价不默认假设价格，也不默认假设出厂成本；旧 $70.16 结果已废弃。

## 默认参数与公式

- 海运头程：250 USD/m³；佣金：15%；附加费：3.5%（按用户最新确认执行）。均可修改。
- 汇率：7.20 RMB/USD，为可编辑示例值，非实时汇率。
- 旺季：2026-10-15 至 2027-01-14，含首尾两天，按 America/Los_Angeles 日历日期判定；其余 Non-Peak。日期按用户最新确认；不外推其他年份。
- 输入三个尺寸自动降序排列为 Longest / Median / Shortest。inch = cm / 2.54；lb = kg × 2.2046226218。
- CBM = 长 × 宽 × 高 / 1,000,000；头程 = CBM × 海运单价。
- Length + Girth = Longest + 2 × (Median + Shortest)，使用 inch。
- Large Standard、Small Bulky、Large Bulky 和 Extra-Large 的体积重 = Longest × max(Median, 2) × max(Shortest, 2) / 139（inch）。宽高最低值仅用于体积重，不改变实测尺寸、CBM、头程或 Length + Girth。Small Standard 和 Extra-Large 150+ lb 的 FBA Shipping Weight 使用实际重量；其他等级取实际重与适用体积重中的较大值。尺寸等级判断沿用已确认的重量比较规则，并应用对应等级的体积重最低宽高。
- Shipping Weight 按 tier 选择 Unit 或 max(Unit, Dimensional)；不额外添加未提供的包装重量或重量进位。费表中的每开始 1 lb 区间使用向上取整。
- FBA 基础费 = 对应期间、尺寸等级、售价档位、Shipping Weight 查表；费用在档内按完整增量向上进位。恰好 $10 和 $50 均属中间档。
- 附加费 = FBA 基础费 × 附加费率；单独展示，当前计算引擎按美分四舍五入基础费及附加费。2026-04-17 起生效，生效前为 0。
- 尾程合计 = 基础费 + 附加费。
- Referral Fee = 售价 × 佣金率。
- Factory Cost USD = 出厂价 RMB / RMB/USD 汇率。
- Profit = 售价 − 佣金 − 尾程合计 − 头程 − 出厂成本 USD。
- Profit Margin = Profit / 售价 × 100%。
- ROI = Profit / (出厂成本 USD + 头程 + 尾程合计) × 100%；分母为零显示不适用。
- 除独立 FBA 金额外，中间计算保留精度，展示金额保留两位小数，CBM 四位；比率两位。
- 判断：亏损优先；利润率 ≥25% 健康；≥15% 可考虑优化；其余非亏损谨慎开发。按未四舍五入比率判断。

不包含广告、仓储、入库配置、退货、税费、关税、汇兑等；结果属于开发估算而非完整会计净利润。

## 目标售价搜索

分别在 $0.01–$9.99、$10.00–$50.00、$50.01–$1,000,000.00 三个档位上二分搜索最小美分售价。每次重新查询该售价的 FBA 费、计算利润率；各档独立搜索，避免跨档费用跳变破坏全局单调性。固定包装和档内固定费用时，利润率单调，故可二分。只返回最早满足目标的档位中的最低美分售价。不擅自调整佣金或费用为零。没有官方费表或成本输入时不搜索；范围内无解显示 —。

若未来 Amazon 在单一售价档内引入其他售价相关费用，应细分区间或修改搜索，不能继续假设档内固定费用。

## 文件与更新费率

- `fee-config.js`：独立费率配置、默认值、季节窗口、官方来源。
- `calculator.js`：纯计算函数，与 DOM 分离。
- `app.js`：输入校验、展示、复制、实时更新。
- `styles.css`：移动端优先的响应式样式。
- `tests/calculator.test.js`：计算及边界测试。模拟费表仅存在测试内，绝不作为 Amazon 数据导出。

配置结构：`sizeTiers` 按优先级排列，包含 `maxSides`（inch）、`maxTierWeightLb`、`maxGirthIn`；均为含边界上限。`shipping` 定义除数、实际重/两者最大值、包装增量、进位单位。当前 `incrementLb:null` 表示不先对重量进位，在费表计增量时进位。

`rateCards.peak/nonPeak` 每行包含 tier、band、maxWeightLb、base、includedWeightLb、stepLb、perStep。`standard()` 展开固定重量档，`rows()` 按三个售价档展开增量档，`stepLb` 为 0.25 或 1。更新费率时只能添加完整、可追溯的行，并添加尺寸/重量/售价边界测试。`effectiveStart` 记录目标版本开始日，不提供历史费表回溯。未提供的日期范围和其他年份不能当作已覆盖。

尺寸定义按用户提供的门槛执行，Extra-Large 以 max(Unit,Dimensional) 分为 ≤50、>50–70、>70–150、>150 lb。即使 Extra-Large 150+ 的收费重量使用实际重，分类仍按两者最大值。

修改源文件后运行 `npm run build:preview`，生成独立 `index.html`。`tests/2026.test.js` 验证本次提供的真实规则，`tests/full-rate-card.test.js` 逐值核对上传原文，并覆盖全部重量边界、两个季节、四个价格边界及增量档。其他测试中使用的模拟费表仅为隔离测试数据。

本工具用于新品成本预估。Amazon 最终费用以 Seller Central 实际测量尺寸、重量、商品类别及官方收费为准。
