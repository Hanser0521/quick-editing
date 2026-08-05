# Quick Editing

Quick Editing 是一款面向 Obsidian 桌面端的 Markdown 快捷编辑插件。它提供智能符号、格式刷、智能粘贴、内部链接、文本清理、空格与空行整理等高频操作，并为批量修改加入 Markdown 上下文保护、变更预览和撤销入口。

- 当前版本：`1.0.0`
- Obsidian 最低版本：`1.8.7`
- 支持平台：桌面端
- 实机验证：macOS、Obsidian `1.13.4`
- 插件 ID：`quick-editing`

Quick Editing 由 [Hanser0521](https://github.com/Hanser0521) 基于 [obsidian-canzi/Enhanced-editing](https://github.com/obsidian-canzi/Enhanced-editing) 继续维护。项目已更名并使用新的插件 ID，不会覆盖旧版“增强编辑”的安装目录。

## 1.0.0 更新概要

### 更安全的 Markdown 转换

- 使用 Markdown 语法树识别转换上下文。
- 全文与选区转换会保护 Frontmatter、围栏代码块、缩进代码块、行内代码、数学公式、HTML、链接、图片和 Obsidian 注释。
- 纯文本转换保留 LF/CRLF 行尾风格，并覆盖中英文标点、嵌套格式、代码块与表格等测试场景。

### 可预览、可撤销的全文操作

- 全文操作执行前显示预计修改处数、影响行数和前后片段。
- 确认后以单个编辑事务应用修改。
- 完成提示提供“撤销”按钮，降低批量清理的误操作风险。

### 现代化智能粘贴

- 监听 Obsidian 的 `editor-paste` / `ClipboardEvent`，同时读取 `text/html` 与 `text/plain`。
- Office 和网页表格通过 HTML DOM 解析为 Markdown 表格，不再依赖 Office 专用正则链。
- 自动识别 URL、Windows 本地/UNC 路径、制表符表格和富文本。
- `Mod+Alt+V` 仍作为无法取得剪贴板事件时的手动后备命令。

### 更可靠的内部链接

- 通过 `MetadataCache` 匹配文件路径、文件名、别名和 Frontmatter 标题。
- 使用 `FileManager.generateMarkdownLink()` 生成与当前笔记匹配的相对链接。
- 正确保留标题、块引用和显示别名，避免手工拼接 Wiki Link。

### 模块化设置与命令管理

- “智能符号”“格式刷”“智能粘贴”“全文清理”拆分为四个独立功能组，可逐组启用。
- 设置页支持按名称、命令 ID、功能组和关键词搜索。
- 每条命令均可单独启用或关闭，开关在插件重载后生效。
- Obsidian 核心已经实现得更完整的光标移动、标题、粗体、斜体、删除线和行内代码等命令默认关闭，仍可按需恢复。

### 新版 Obsidian 兼容性

- 编辑器获取使用 `workspace.activeEditor`，不再假设 `activeLeaf` 一定位于主窗口。
- 为主窗口和弹出窗口分别注册格式刷事件，支持多窗口工作流。
- 移除动态代码执行和已废弃/私有 API 的直接使用。
- 恢复 TypeScript 源码、严格类型检查、单元测试、生产构建和 bundle smoke test。

## 功能组

| 功能组 | 主要用途 | 默认状态 |
| --- | --- | --- |
| 智能符号 | 括号补全、语法跳过、代码块缩写、Callout 转换 | 开启 |
| 格式刷 | 标题、粗体、斜体、删除线、高亮、文字与背景颜色 | 开启 |
| 智能粘贴 | URL、路径、HTML、Office/网页表格和制表符表格 | 开启 |
| 全文清理 | 标点、断行、空格、空行、注释和潜在链接整理 | 开启 |

关闭功能组后，该组命令不会注册到 Obsidian。更细粒度的控制可在“设置 → Quick Editing → 命令开关”中完成。

## 主要能力

- 链接：内部链接、同名链接、标签/双链互转、潜在链接批量转换、内链与 Markdown 链接互转。
- Markdown 格式：高亮、粗体、斜体、删除线、上下划线、上下标、代码块、Callout、待办状态和填空语法。
- 结构编辑：标题级别、段落选择与排序、空行增减、行首/行尾空格和中英文间距。
- 文本整理：中英文标点、外来文本、错误语法、意外断行、注释、简繁转换和路径格式。
- 辅助操作：计算选区、提取标注、获取相对路径、修改文件名、搜索选区和列表转图示。

## 常用默认快捷键

`Mod` 在 macOS 上表示 `Command`，在 Windows/Linux 上表示 `Ctrl`。

| 操作 | 快捷键 |
| --- | --- |
| 添加/移除内部链接 | `Alt+Z` |
| 转换为同名链接 | `Alt+Q` |
| 智能符号 | `Alt+;` |
| 高亮 | `Alt+G` |
| 智能粘贴后备命令 | `Mod+Alt+V` |
| 转换无语法文本 | `Mod+Alt+Z` |
| 获取无语法文本 | `Mod+Alt+C` |
| 批量插入空行 | `Mod+Shift+L` |
| 批量去除空行 | `Mod+Alt+L` |
| 计算选区 | `F9` |

其他命令默认不占用快捷键，可在 Obsidian 的“快捷键”设置中自行分配。

## 安装

### GitHub Release

1. 从 [Releases](https://github.com/Hanser0521/quick-editing/releases) 下载最新版。
2. 将 `main.js`、`manifest.json` 和 `styles.css` 放入：

   ```text
   <你的库>/.obsidian/plugins/quick-editing/
   ```

3. 重载 Obsidian，在“设置 → 第三方插件”中启用 Quick Editing。

### BRAT

安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)，然后添加：

```text
Hanser0521/quick-editing
```

### 从旧版“增强编辑”迁移

Quick Editing 使用新的插件 ID。升级后请停用旧版 `Enhanced-editing`，避免重复注册命令和快捷键。旧版自定义快捷键不会自动迁移，需要在 Obsidian 设置中重新分配。

## 开发与验证

需要 Node.js 22 或更高版本。

```bash
npm ci
npm run check
```

- `npm run dev`：监听源码并生成带 source map 的 `main.js`。
- `npm run verify`：检查版本一致性、命令 ID、类型诊断和禁止使用的 API。
- `npm test`：运行纯文本、粘贴、链接和设置等单元测试。
- `npm run build`：执行 TypeScript 检查并生成生产版 `main.js`。
- `npm run smoke`：验证构建产物能够由 Obsidian 运行环境加载。
- `npm run check`：依次执行上述发布前检查。

`main.js` 是构建产物；代码修改应提交到 `src/`。

## 许可证与来源

本仓库的许可证范围不是简单的单一 MIT：

- 官方旧版仓库 [Enhanced-Editing-legacy-version](https://github.com/obsidian-canzi/Enhanced-Editing-legacy-version) 的 0.4.4 代码以 MIT License 发布，本仓库保留其版权与许可声明。
- Hanser0521 在 2026 年新增的现代化模块、测试和工程配置以 MIT License 发布。
- 上游后续仓库 0.5–0.6 阶段没有附带明确 License；这些历史代码的权利不由本仓库重新授权。

完整范围和限制见 [LICENSE](./LICENSE)。在获得相关权利人的书面确认或替换相应历史实现前，本项目不提交 Obsidian 社区插件目录，也不宣称整个代码库已经完成单一开源许可证清理。

## 致谢

- [蚕子 / obsidian-canzi](https://github.com/obsidian-canzi)：原“增强编辑”插件作者。
- [Mouth on Cloud](https://github.com/shaggyfeng)：旧版仓库维护者及 MIT 许可声明保留者。
- 所有参与原项目反馈、修复和测试的贡献者。
