---
name: issue-forms-kit
description: "One-shot bilingual (中文/English) GitHub Issue Forms scaffolder for any repo — generates Bug/Feature form templates, disables blank issues, installs a needs-info triage workflow that flags CLI/AI submissions bypassing the forms, and merges AI-assistant filing guidance into CONTRIBUTING.md. Use when the user wants to: 规范化 issue、给仓库加 issue 模板、issue 表单、set up issue templates, scaffold issue forms, make AI-filed issues structured, or 一键设置 issue 规范 on a GitHub project."
---

# issue-forms-kit — GitHub Issue 表单一键规范化

为一个 GitHub 仓库生成经过实战验证的完整 Issue 规范化设施。所有模板内容源自
dsh-selection-toolbar 仓库的真实生效版本（双语 Issue Forms + 关闭空白入口 +
兜底分流 workflow + CONTRIBUTING 引导段）。

## 何时使用

- 用户说「给我的项目加 issue 模板 / 规范化 issue / issue 表单化」
- 用户抱怨「AI/别人提的 issue 信息不全，想要结构化」
- 新仓库初始化协作规范的一部分

## 使用步骤

1. **确认目标仓库**：在目标仓库的工作目录内运行（脚本会用 `gh` 推断
   `OWNER/NAME`），或显式传 `--repo OWNER/NAME`。
2. **问清三个偏好**（用户没说就用默认值，不要追问）：
   - 语言：默认**中英双语**；纯中文加 `--zh-only`
   - 空白入口：默认**关闭**空白 Issue；保留用 `--keep-blank`
   - 分流兜底 workflow：默认**安装**；不要用 `--no-triage`
3. **先试运行**（必做）：

   ```bash
   node <skill_dir>/scripts/init-issue-forms.mjs --dry-run [--repo X/Y] [flags...]
   ```

   向用户展示计划后去掉 `--dry-run` 正式写入。
4. **冲突处理纪律**：脚本遇到「已存在但非本 kit 管理」的模板文件会以退出码 2
   拒绝覆盖——此时把决定权交给用户（改名保留 / 删除 / `--force` 覆盖），不要自作主张。
5. **收尾三件事**（按用户授权级别执行；git push 必须先征得同意）：
   - `gh label create needs-info --color FBCA04 ...`（`--no-triage` 时跳过）
     ——脚本只做容错尝试，失败时给用户现成命令。
   - 展示 `git diff` 摘要 → 征得授权 → commit & push 到默认分支。
   - push 后可选实测：`gh issue create` 提交一条无模板字段的测试 Issue，
     验证 issue-triage 打标+留言，随后关闭测试 Issue 并注明用途。

## 开关一览

| 开关 | 作用 |
| --- | --- |
| `--repo OWNER/NAME` | 目标仓库 slug（默认 gh 自动推断） |
| `--areas "a,b,…"` | 自定义「涉及范围」下拉选项（逗号分隔，原样输出不翻译） |
| `--zh-only` | 字段标签去英文尾巴，生成纯中文表单 |
| `--keep-blank` | 不关闭空白 Issue 入口（config.yml 写为说明性注释） |
| `--no-triage` | 不生成 issue-triage.yml，也不建 needs-info 标签 |
| `--force` | 覆盖已有但被 kit 管理过（含标记行）的同名文件 |
| `--dry-run` | 只打印计划，不动磁盘不调 gh |

## 幂等与标记

- 每个生成文件首行带 `<!-- managed by issue-forms-kit vX.Y.Z -->` 标记；
  重跑时同名同内容 = 跳过，有标记的文件可直接更新，无标记文件必须人工裁决。
- CONTRIBUTING.md 的引导段包在 `issue-forms-kit:start/end` 注释之间：
  不存在则追加，存在则原位替换——不会碰文件的其他部分。

## 设计不变量（修改 references/ 下模板时不得破坏）

1. 双语字段一律「中文… / English…」，英文是最后一个 ` / ` 分段（`--zh-only` 依赖此约定）。
2. 表单里每个 **required** 字段的 label 必须出现在生成器 `collectMarkers()` 清单里，
   否则分流检测会误伤正常提交。
3. workflow 里 `gh issue edit/comment` 必须带 `--repo "$GITHUB_REPOSITORY"`——
   runner 上没有 checkout，没有 `.git`，缺了必然 `failed to run git` 失败。
4. needs-info 标签必须在推送前建好（不存在时 `gh issue edit --add-label` 会报错）。

## 失败排查速查

| 症状 | 原因 | 处置 |
| --- | --- | --- |
| 退出码 2 conflict | 目标仓库已有手工模板 | 问用户：保留改名 / 删除 / `--force` |
| workflow 报 failed to run git | 老版本未传 `--repo` | 升级到本版模板 |
| 打标失败 label not found | needs-info 未创建 | 先执行步骤 5 的 label 创建命令 |
| 用户 locale 下 YAML 校验失败 | 手改过生成文件 | 用 `python3 -c "import yaml,yaml.safe_load(open(p))"` 或在线校验后回滚 |
