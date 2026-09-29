# issue-forms-kit

一键为任意 GitHub 仓库生成**实战验证过的**双语 Issue 规范化设施。
这是一个 [DeepSeek Harness (DSH)](https://github.com/AkagawaTsuworworworkey/dsh) skill。

一次运行 = 四件套：

```text
.github/ISSUE_TEMPLATE/bug_report.yml        🐛 双语 Bug 表单（查重✓ + 区域下拉 + 摘要 + 版本 必填）
.github/ISSUE_TEMPLATE/feature_request.yml   ✨ 双语功能建议表单（使用场景 / 期望效果 / 替代方案）
.github/ISSUE_TEMPLATE/config.yml            关闭空白 Issue 入口
.github/workflows/issue-triage.yml           兜底：CLI/AI 裸提交自动打 needs-info + 双语引导留言
CONTRIBUTING.md                              追加「用 AI 提 Issue」操作指引（幂等合并）
```

## 为什么需要它

GitHub Issue Forms 对**网页端**是硬约束，但对 `gh issue create` / API——恰恰是很多
AI 助手提 Issue 的方式——完全不生效。本 kit 同时堵住两个口子：

- 网页端：表单 + 必填项直接拦住；
- 命令行端：issue-triage workflow 检测正文缺少 ≥2 个表单特征段落时，
  自动打 `needs-info` 标签并留言引导（实测有效的方案，
  见 [dsh-selection-toolbar](https://github.com/suiyideali/dsh-selection-toolbar/issues/8)
  的端到端验证记录）。

## 安装（DSH）

```bash
dsh plugin add github:suiyideali/skill-issue-forms-kit   # 或手动复制到 ~/.dsh/skills/
```

## 使用（任意仓库内）

```bash
node scripts/init-issue-forms.mjs --dry-run       # 先看计划
node scripts/init-issue-forms.mjs                 # 正式生成 + 建 needs-info 标签
```

常用变体：

```bash
node scripts/init-issue-forms.mjs --repo owner/name --areas "CLI,配置,文档,其他" --zh-only
node scripts/init-issue-forms.mjs --no-triage --keep-blank    # 只要表单，不要兜底
```

零依赖，Node ≥ 16 即可。生成后 `git add . && git commit && git push`
即全局生效（push 请遵守你自己的安全纪律）。

## 设计保证

- **幂等**：每个产物带 kit 管理标记，可安全重跑；冲突的外来文件不会被静默覆盖。
- **不越权**：不 commit、不 push、不改远程状态——这些留给调用方按各自纪律执行。
- **自我一致**：required 字段 label 与检测清单强关联（见 SKILL.md 设计不变量）。

MIT License.
