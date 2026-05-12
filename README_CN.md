# Quick Command

一个 VS Code 扩展，为终端提供快捷命令按钮。定义常用命令，一键发送到终端执行。

[English](README.md)

![Quick Command 截图](https://raw.githubusercontent.com/kookob/quick-command/main/images/screenshot.png)

## 功能特性

### 侧边栏面板

在活动栏（Activity Bar）中提供专属面板，展示所有配置的命令按钮。按钮分为两个区域：

- **Global（通用）** — 用户级命令，所有项目共享
- **Workspace（项目）** — 工作区级命令，仅当前项目可见

分组命令以标题+子按钮行的形式展开显示，单命令按钮以流式排列。

### 状态栏按钮

任意按钮都可以通过设置 `"showIn": ["statusbar"]` 固定到底部状态栏。分组按钮显示为下拉菜单，子命令也可以单独固定。

### 核心功能

- **单条命令** — 点击按钮，命令直接发送到当前活动终端
- **多行命令** — 支持字符串数组，按顺序逐行发送
- **命令分组** — 将相关命令组织在一个分组下，面板中分区展示
- **执行控制** — 可选自动回车执行（`execute: true`）或仅输入到终端待用户确认
- **双级配置** — 用户全局命令 + 项目工作区命令，合并显示互不覆盖
- **Codicon 图标** — 完整支持 VS Code 内置 [codicon](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing) 图标库
- **视觉标识** — 自动执行按钮显示绿色圆点，点击按钮有反馈动画
- **命令预览** — 鼠标悬停按钮可查看实际命令内容

## 配置说明

Quick Command 使用两个配置项：

| 配置键                          | 作用域       | 说明                   |
| ------------------------------- | ------------ | ---------------------- |
| `quickCommand.buttons`          | 用户（全局） | 所有项目共享的通用命令 |
| `quickCommand.workspaceButtons` | 工作区       | 仅当前项目的专属命令   |

### 按钮属性

| 属性      | 类型                                    | 默认值       | 说明                                                                                          |
| --------- | --------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `label`   | `string`                                | —            | 按钮显示文字（必填）                                                                          |
| `icon`    | `string`                                | `"terminal"` | [Codicon](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing) 图标名称 |
| `command` | `string \| string[]`                    | —            | 发送到终端的命令，支持单条或多条                                                              |
| `execute` | `boolean`                               | `false`      | 是否自动回车执行                                                                              |
| `showIn`  | `("all" \| "sidebar" \| "statusbar")[]` | `[]`         | 控制按钮显示在侧边栏、状态栏或两者                                                            |
| `group`   | `SubCommand[]`                          | —            | 子命令列表（使按钮成为分组按钮）                                                              |

子命令支持 `label`、`command`、`execute`、`showIn` 属性。

### 配置示例

**用户设置**（`settings.json`）：

```json
{
  "quickCommand.buttons": [
    {
      "label": "启动",
      "icon": "play",
      "command": "npm run dev",
      "execute": true,
      "showIn": ["sidebar", "statusbar"]
    },
    {
      "label": "构建",
      "icon": "package",
      "command": "npm run build"
    },
    {
      "label": "Git",
      "icon": "git-merge",
      "group": [
        { "label": "拉取", "command": "git pull", "execute": true },
        { "label": "推送", "command": "git push", "execute": true },
        { "label": "状态", "command": "git status" }
      ]
    }
  ]
}
```

**工作区设置**（`.vscode/settings.json`）：

```json
{
  "quickCommand.workspaceButtons": [
    {
      "label": "初始化",
      "icon": "tools",
      "command": ["git pull", "npm install", "npm run build"],
      "execute": true
    },
    {
      "label": "部署",
      "icon": "rocket",
      "group": [
        { "label": "测试环境", "command": "./deploy.sh staging", "execute": true },
        { "label": "生产环境", "command": "./deploy.sh prod" }
      ]
    }
  ]
}
```

### 多行命令

使用字符串数组可以依次发送多条命令：

```json
{
  "label": "完整初始化",
  "icon": "tools",
  "command": ["git pull", "npm install", "npm run build"],
  "execute": true
}
```

当 `execute` 为 `true` 时，所有行都会自动回车执行。为 `false` 时，最后一行仅输入不执行，方便你检查确认后手动回车。

### 执行控制

- `"execute": false`（默认）— 命令输入到终端但不执行，需要手动按回车
- `"execute": true` — 命令发送后自动回车执行

`execute: true` 的按钮在侧边栏面板中会显示一个绿色圆点标识。

你也可以使用 `Settings` 动作打开菜单，直接跳转全局或项目配置，一键复制可直接粘贴的单按钮/分组按钮 JSON 示例，或打开 Codicon 图标目录。

## 面板操作

侧边栏面板标题栏有两个操作按钮：

- **刷新** — 从配置重新加载按钮
- **设置** — 打开 Quick Command 配置页面

## 常用图标

| 图标 | 名称        | 图标 | 名称         |
| ---- | ----------- | ---- | ------------ |
| ▶    | `play`      | ■    | `debug-stop` |
| 📦   | `package`   | 🧪   | `beaker`     |
| 🚀   | `rocket`    | ⚙    | `gear`       |
| 🔀   | `git-merge` | 📋   | `output`     |
| ⚡   | `zap`       | 🔧   | `tools`      |

完整列表：[VS Code Codicon 图标参考](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing)

## 许可证
