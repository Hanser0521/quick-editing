# Quick Editing

## Overview

Quick Editing is a desktop Obsidian plugin for fast Markdown transformations,
smart paste, internal-link handling, text cleanup, spacing, and blank-line
editing. Syntax-aware transformations protect Frontmatter, code, math, HTML,
links, images, and Obsidian comments. Full-document operations show a change
preview and provide an undo action.

Quick Editing is maintained by
[Hanser0521](https://github.com/Hanser0521) from the original
[Enhanced Editing project](https://github.com/obsidian-canzi/Enhanced-editing),
with attribution and public upstream authorization recorded in
[NOTICE](./NOTICE).

## Features

- Four independently configurable groups: Smart Symbols, Format Brushes, Smart
  Paste, and Full-document Cleanup.
- Syntax-tree-aware Markdown transformations with previews and undo notices.
- ClipboardEvent-based rich-text paste and DOM-based HTML table conversion.
- MetadataCache-aware internal links generated through Obsidian's link API.
- Searchable settings, per-command switches, and multi-window support.
- One-click removal of image links without deleting attachment files.

## Usage

1. Enable the feature groups you need in **Settings → Quick Editing**.
2. Search the command list to enable or disable individual commands.
3. Open **Settings → Hotkeys** and assign shortcuts to the Quick Editing
   commands you use. The plugin intentionally registers no default hotkeys.
4. Run a command from the Command palette, a configured hotkey, or the format
   brush toolbar. Full-document changes show an estimated change count before
   they are applied.

## Installation

Download `main.js`, `manifest.json`, and `styles.css` from the latest
[GitHub Release](https://github.com/Hanser0521/quick-editing/releases), then put
the files in `<vault>/.obsidian/plugins/quick-editing/`. Reload Obsidian and
enable **Quick Editing** under Community plugins.

For beta installation through BRAT, add `Hanser0521/quick-editing`.

## Privacy and permissions

Quick Editing has no telemetry and makes no network requests. It reads vault
metadata or note files only when a link or cleanup command requires them. It
reads clipboard contents only during smart paste or the manual paste command.
The plugin never deletes image attachment files; the image-link cleanup command
only changes Markdown content after a preview.

## 中文说明

Quick Editing 是一款面向 Obsidian 桌面端的 Markdown 快捷编辑插件。它提供智能符号、格式刷、智能粘贴、内部链接、文本清理、空格与空行整理等高频操作，并为批量修改加入 Markdown 上下文保护、变更预览和撤销入口。

- 当前版本：`1.0.2`
- Obsidian 最低版本：`1.8.7`
- 支持平台：桌面端
- 实机验证：macOS、Obsidian `1.13.4`
- 插件 ID：`quick-editing`

Quick Editing 由 [Hanser0521](https://github.com/Hanser0521) 基于 [obsidian-canzi/Enhanced-editing](https://github.com/obsidian-canzi/Enhanced-editing) 继续维护。项目已更名并使用新的插件 ID，不会覆盖旧版“增强编辑”的安装目录。

版本更新记录统一收录在 [CHANGELOG.md](./CHANGELOG.md)。

## 功能组

| 功能组 | 主要用途 | 默认状态 |
| --- | --- | --- |
| 智能符号 | 括号补全、语法跳过、代码块缩写、Callout 转换 | 开启 |
| 格式刷 | 连续应用标题、粗体、斜体、删除线、高亮、文字与背景颜色 | 开启 |
| 智能粘贴 | URL、路径、HTML、Office/网页表格和制表符表格 | 开启 |
| 全文清理 | 标点、断行、空格、空行、注释、图片链接和潜在链接整理 | 开启 |

关闭功能组后，该组命令不会注册到 Obsidian。更细粒度的控制可在“设置 → Quick Editing → 命令开关”中完成。

## 主要能力

- 链接：内部链接、同名链接、标签/双链互转、潜在链接批量转换、内链与 Markdown 链接互转，以及一键删除图片链接。
- Markdown 格式：格式刷、多彩高亮、上下划线、上下标、三浪线代码块、扩展待办状态和填空语法。
- 结构编辑：标题级别、段落选择与排序、空行增减、行首/行尾空格和中英文间距。
- 文本整理：中英文标点、外来文本、错误语法、意外断行、注释、简繁转换和路径格式。
- 辅助操作：计算选区、提取标注、修改文件名、搜索选区和列表转图示。

## 快捷键配置

`Mod` 在 macOS 上表示 `Command`，在 Windows/Linux 上表示 `Ctrl`。

Quick Editing 不注册任何默认快捷键，以免覆盖用户现有配置或与其他插件冲突。下面是可在“设置 → 快捷键”中手动绑定的建议组合：

| 操作 | 建议快捷键 |
| --- | --- |
| 添加/移除内部链接 | `Alt+Z` |
| 转换为同名链接 | `Alt+Q` |
| 智能符号 | `Alt+;` |
| 高亮格式刷 | `Alt+Shift+G` |
| 智能粘贴后备命令 | `Mod+Alt+V` |
| 转换无语法文本 | `Mod+Alt+Z` |
| 获取无语法文本 | `Mod+Alt+C` |
| 批量插入空行 | `Mod+Shift+L` |
| 批量去除空行 | `Mod+Alt+L` |
| 计算选区 | `F9` |

其他命令默认不占用快捷键，可在 Obsidian 的“快捷键”设置中自行分配。

## 交由 Obsidian 核心处理的操作

Quick Editing 不再维护下列重复实现。请直接在 Obsidian“设置 → 快捷键”中搜索对应核心命令：

| 操作 | Obsidian 核心命令 |
| --- | --- |
| 阅读/源码/实时预览切换 | `markdown:toggle-preview`、`editor:toggle-source` |
| H1–H6 与普通段落 | `editor:set-heading-0` 至 `editor:set-heading-6` |
| 粗体、斜体、删除线、高亮 | `editor:toggle-bold`、`editor:toggle-italics`、`editor:toggle-strikethrough`、`editor:toggle-highlight` |
| Callout 与代码块 | `editor:insert-callout`、`editor:insert-codeblock` |
| 有序/无序列表 | `editor:toggle-numbered-list`、`editor:toggle-bullet-list` |
| 插入标签 | `editor:insert-tag` |
| 删除段落 | `editor:delete-paragraph` |
| 复制库内路径 | `workspace:copy-path` |
| 光标移动 | 编辑器及操作系统原生快捷键 |

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

本项目整体以 [MIT License](./LICENSE) 发布：

- 官方旧版仓库 [Enhanced-Editing-legacy-version](https://github.com/obsidian-canzi/Enhanced-Editing-legacy-version) 的 0.4.4 代码原以 MIT License 发布，本仓库保留原版权声明。
- 2026 年 8 月 5 日，维护者在上游公开的 [授权申请 Issue #93](https://github.com/obsidian-canzi/Enhanced-editing/issues/93) 中，明确申请以 MIT License 使用、修改、构建、再分发和发布衍生版本；原作者 [obsidian-canzi 的公开回复](https://github.com/obsidian-canzi/Enhanced-editing/issues/93#issuecomment-5189283811)为“请随意发布”。
- Hanser0521 在 2026 年新增的现代化模块、测试、工程配置和文档同样以 MIT License 发布。
- 所有历史作者和贡献者的署名均予保留，第三方依赖继续适用各自的许可证。

来源、贡献者署名与公开 Issue 授权记录见 [NOTICE](./NOTICE)。版本更新记录见 [CHANGELOG.md](./CHANGELOG.md)。

## 致谢

- [蚕子 / obsidian-canzi](https://github.com/obsidian-canzi)：原“增强编辑”插件作者。
- [Mouth on Cloud](https://github.com/shaggyfeng)：旧版仓库维护者及 MIT 许可声明保留者。
- 所有参与原项目反馈、修复和测试的贡献者。
