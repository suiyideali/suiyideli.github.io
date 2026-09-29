#!/usr/bin/env node
/**
 * issue-forms-kit — one-shot bilingual GitHub Issue Forms scaffolder.
 *
 * Generates (idempotently) into the current repository:
 *   .github/ISSUE_TEMPLATE/bug_report.yml        bilingual bug form
 *   .github/ISSUE_TEMPLATE/feature_request.yml   bilingual feature form
 *   .github/ISSUE_TEMPLATE/config.yml            blank-issue gate (unless --keep-blank)
 *   .github/workflows/issue-triage.yml           needs-info backstop (unless --no-triage)
 *   CONTRIBUTING.md                              merged AI-assistant guidance section
 *
 * Zero dependencies. Node >= 16.
 *
 * Exit codes: 0 ok · 1 usage/environment error · 2 conflict (existing unmanaged templates)
 *
 * Flags:
 *   --repo OWNER/NAME   target repo slug for deep links (default: gh repo view / $GITHUB_REPOSITORY)
 *   --areas "a,b,..."   custom entries for the "Affected area" dropdown (comma-separated)
 *   --no-triage         skip the issue-triage workflow + needs-info label
 *   --keep-blank        do not disable blank issues (config.yml becomes a comment-only stub)
 *   --zh-only           emit Chinese-only field labels instead of bilingual ones
 *   --force             overwrite files previously written by this kit (marker line must be present)
 *   --dry-run           print the plan without touching disk or running gh
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const VERSION = "1.0.0";
const KIT_MARK = `<!-- managed by issue-forms-kit v${VERSION}: regeneration allowed while this line survives -->`;

/* ---------------------------------- args ---------------------------------- */

function usage(code = 1) {
  console.error(`usage: node init-issue-forms.mjs [--repo OWNER/NAME] [--areas "a,b,…"]
                    [--no-triage] [--keep-blank] [--zh-only] [--force] [--dry-run]`);
  process.exit(code);
}

function parseArgs(argv) {
  const o = {
    repo: process.env.GITHUB_REPOSITORY || null,
    areas: null,
    noTriage: false,
    keepBlank: false,
    zhOnly: false,
    force: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--repo": o.repo = argv[++i]; break;
      case "--areas": o.areas = argv[++i]; break;
      case "--no-triage": o.noTriage = true; break;
      case "--keep-blank": o.keepBlank = true; break;
      case "--zh-only": o.zhOnly = true; break;
      case "--force": o.force = true; break;
      case "--dry-run": o.dryRun = true; break;
      case "-h": case "--help": usage(0); break;
      default: console.error(`unknown flag: ${a}`); usage();
    }
  }
  return o;
}

/* ------------------------------ i18n helpers ------------------------------ */
/* Every bilingual literal below follows the exact shape "中文… / English…" with
 * English as the final " / "-segment. --zh-only strips that trailing segment. */

function stripEn(s) {
  let out = s;
  for (;;) { // iterate: some literals carry several "中文a / 中文b / English c / English d" segments
    const i = out.lastIndexOf(" / ");
    if (i > 0 && /^[ -~]+$/.test(out.slice(i + 3))) out = out.slice(0, i);
    else break;
  }
  return out;
}
const t = (s, zhOnly) => (zhOnly ? stripEn(s) : s);

const DEFAULT_AREAS_BILINGUAL = [
  "主功能 / Main features",
  "配置与设置 / Configuration & settings",
  "界面与交互 / UI & interaction",
  "安装与兼容性 / Installation & compatibility",
  "性能与稳定性 / Performance & stability",
  "其他 / Other",
];

/* -------------------------------- templates -------------------------------- */

function yq(body) { // tiny YAML serializer for flat attribute maps
  const esc = (v) => JSON.stringify(String(v));
  return Object.entries(body)
    .map(([k, v]) => `${k}: ${typeof v === "boolean" || typeof v === "number" ? v : esc(v)}`)
    .join("\n");
}

function blocker(id, labelBilingual, checklistBilingual, opts) {
  const label = t(labelBilingual, opts.zhOnly);
  const item = t(checklistBilingual, opts.zhOnly);
  return [
    `  - type: checkboxes`,
    `    id: ${id}`,
    `    attributes:`,
    `      label: ${JSON.stringify(label)}`,
    `      description: ${JSON.stringify(t("请确认没有重复 Issue。/ Please confirm no duplicate issue exists.", opts.zhOnly))}`,
    `      options:`,
    `        - label: ${JSON.stringify(item)}`,
    `          required: true`,
  ].join("\n");
}

function textarea(id, labelBilingual, descBilingual, placeholderLines, opts) {
  const out = [
    `  - type: textarea`,
    `    id: ${id}`,
    `    attributes:`,
    `      label: ${JSON.stringify(t(labelBilingual, opts.zhOnly))}`,
    `      description: ${JSON.stringify(t(descBilingual, opts.zhOnly))}`,
  ];
  if (placeholderLines && placeholderLines.length) {
    out.push(`      placeholder: |`);
    for (const l of placeholderLines) out.push(`        ${l}`);
  }
  return out.join("\n");
}

function areaDropdown(opts, includeInstall) {
  const label = t("涉及范围 / Affected area", opts.zhOnly);
  const desc = t("选最贴近的一项。/ Pick the closest match.", opts.zhOnly);
  let items;
  if (opts.areas) {
    // Custom list is used verbatim — no implicit entries.
    items = opts.areas.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    items = [...DEFAULT_AREAS_BILINGUAL];
    if (includeInstall) {
      items.splice(items.length - 1, 0, "安装 / 加载失败 / Install / load failure");
    }
  }
  const optLines = items.map((x) => `        - ${opts.areas ? x : t(x, opts.zhOnly)}`);
  return [
    `  - type: dropdown`,
    `    id: area`,
    `    attributes:`,
    `      label: ${JSON.stringify(label)}`,
    `      description: ${JSON.stringify(desc)}`,
    `      options:`,
    ...optLines,
    `    validations:`,
    `      required: true`,
  ].join("\n");
}

function buildBugForm(opts) {
  const header = `# ${KIT_MARK}`;
  const intro = opts.zhOnly
    ? ["感谢反馈！请尽量保持模板完整，信息越全越快修复。提交前先[搜索现有 Issue](%URL%/issues?q=is%3Aissue) 避免重复。"]
    : ["感谢反馈！请尽量保持模板完整，信息越全越快修复。提交前先[搜索现有 Issue](%URL%/issues?q=is%3Aissue) 避免重复。", "Thanks for the feedback! Please keep the template intact — complete information means faster fixes. Search [existing issues](%URL%/issues?q=is%3Aissue) first to avoid duplicates."];
  return [
    header,
    `name: "🐛 Bug 报告 / Bug Report"`,
    `description: ${JSON.stringify(t("报告可复现的问题，帮助我们定位与修复。/ Report a reproducible problem to help us locate and fix it.", opts.zhOnly))}`,
    `title: "[Bug]: "`,
    `labels: ["bug"]`,
    `body:`,
    `  - type: markdown`,
    `    attributes:`,
    `      value: |`,
    ...intro.map((l) => `        ${l.replaceAll("%URL%", `https://github.com/${opts.repo}`)}`),
    blocker("duplicate-check", "提交前查重 / Duplicate check",
      "我已搜索过 open/closed 的 Issue，确认本 Issue 没有重复。/ I have searched open/closed issues and confirmed this is not a duplicate.", opts),
    areaDropdown(opts, false, false),
    textarea("summary", "摘要 / Summary",
      "一两句话说清出了什么问题。/ Describe the problem in one or two sentences.",
      ["出了什么问题？What went wrong?"], opts),
    textarea("steps", "复现步骤 / Reproduction steps",
      "从什么操作开始、期望发生什么、实际发生了什么。截图或录屏可放到下一项。/ Where does it start, what should happen, what actually happens?",
      ["1. …", "2. …", "3. 实际：…（期望：…）"], opts),
    textarea("screenshots", "截图 / 录屏 / Screenshots or recording",
      "有助于定位问题的图片或录屏（可选）。/ Images or recordings that help locate the issue (optional).", null, opts),
    input("version", "版本信息 / Version info",
      "插件或应用的版本号；如涉及宿主环境请一并给出（浏览器 / 系统等）。/ Plugin or app version; include host environment (browser / OS) if relevant.",
      "例如 v1.2.3 · Chrome 126 · macOS / e.g. v1.2.3 · Chrome 126 · macOS", opts, true),
    textarea("additional", "补充信息 / Additional context",
      "控制台报错、日志片段或其他背景（可选）。/ Console errors, log snippets or other context (optional).", null, opts),
  ].join("\n");
}

function buildFeatureForm(opts) {
  const header = `# ${KIT_MARK}`;
  const intro = opts.zhOnly
    ? [`欢迎提建议！描述清楚「解决什么问题」比直接给方案更有帮助——我们会从问题出发评估方案。`, `(链接见仓库 Issues 页)`]
    : ["欢迎提建议！描述清楚「解决什么问题」比直接给方案更有帮助——我们会从问题出发评估方案。", "Welcome! Describing the problem you want solved matters more than proposing a solution — we evaluate from the problem outward."];
  return [
    header,
    `name: "✨ 功能建议 / Feature Request"`,
    `description: ${JSON.stringify(t("建议新功能或对现有功能的改进。/ Suggest a new feature or an improvement.", opts.zhOnly))}`,
    `title: "[Feature]: "`,
    `labels: ["enhancement"]`,
    `body:`,
    `  - type: markdown`,
    `    attributes:`,
    `      value: |`,
    ...intro.map((l) => `        ${l}`),
    blocker("duplicate-check", "提交前查重 / Duplicate check",
      "我已搜索过 open/closed 的 Issue，确认本 Issue 没有重复。/ I have searched open/closed issues and confirmed this is not a duplicate.", opts),
    areaDropdown(opts, true, false),
    textarea("scenario", "使用场景 / Use case",
      "你在什么情况下需要它？解决什么问题？/ When do you need it, and what problem does it solve?",
      ["描述真实的使用情境。Describe your real-world scenario."], opts),
    textarea("proposal", "期望效果 / Expected behavior",
      "如果实现了，你期望怎么运作？可提及你设想的交互方式。/ How would you expect it to work once implemented? Interaction ideas welcome.", null, opts),
    textarea("alternative", "替代方案 / Alternatives considered",
      "目前你是用什么方式凑合的？/ What workaround are you using today?", null, opts),
    textarea("additional", "补充信息 / Additional context",
      "其他补充（可选）。/ Anything else (optional).", null, opts),
  ].join("\n");
}

function input(id, labelBilingual, descBilingual, placeholder, opts, required) {
  return [
    `  - type: input`,
    `    id: ${id}`,
    `    attributes:`,
    `      label: ${JSON.stringify(t(labelBilingual, opts.zhOnly))}`,
    `      description: ${JSON.stringify(t(descBilingual, opts.zhOnly))}`,
    `      placeholder: ${JSON.stringify(t(placeholder, opts.zhOnly))}`,
    ...(required ? [`    validations:`, `      required: true`] : []),
  ].join("\n");
}

function buildConfig(opts) {
  if (opts.keepBlank) {
    return `# ${KIT_MARK}\n# blank_issues_enabled intentionally left default (--keep-blank); add "blank_issues_enabled: false" to require templates.`;
  }
  return `# ${KIT_MARK}\nblank_issues_enabled: false`;
}

/* --------------------------- triage workflow gen --------------------------- */

function collectMarkers(opts) {
  // Must mirror every required-field label emitted by the two forms above.
  const m = new Set();
  const add = (s) => m.add(JSON.stringify(t(s, opts.zhOnly)));
  add("提交前查重 / Duplicate check");
  add("涉及范围 / Affected area");
  add("摘要 / Summary");
  add("复现步骤 / Reproduction steps");
  add("使用场景 / Use case");
  add("期望效果 / Expected behavior");
  add("替代方案 / Alternatives considered");
  add("版本信息 / Version info");
  return [...m];
}

function buildWorkflow(opts) {
  const markers = collectMarkers(opts);
  return `# ${KIT_MARK}
name: issue-triage

on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  check-template:
    runs-on: ubuntu-latest
    steps:
      - name: Flag issues that bypass the templates
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NUMBER: \${{ github.event.issue.number }}
          BODY: \${{ github.event.issue.body }}
        run: |
          # Web-form submissions store answers as "### <label>" sections.
          # Command-line/API submissions usually lack them. Require >= 2 markers
          # so a single accidental phrase never triggers a false positive.
          MARKERS=(
${markers.map((m) => `            ${m}`).join("\n")}
          )
          COUNT=0
          for m in "\${MARKERS[@]}"; do
            if [[ "$BODY" == *"$m"* ]]; then COUNT=$((COUNT+1)); fi
          done
          echo "template markers found: $COUNT"
          if [ "$COUNT" -ge 2 ]; then
            echo "Form submission detected; no action needed."
            exit 0
          fi
          # No checkout here: always pass --repo so gh never needs a git remote.
          gh issue edit "$NUMBER" --repo "$GITHUB_REPOSITORY" --add-label needs-info
          gh issue comment "$NUMBER" --repo "$GITHUB_REPOSITORY" --body-file - <<'MSG'
          感谢提交！本仓库的 Issue 需要通过模板表单填写：https://github.com/${opts.repo}/issues/new/choose

          这条 Issue 缺少模板的结构化字段，已被标记为 \`needs-info\`。请补全信息或通过上面的链接用表单重新提交；信息不足之前可能会被关闭。

          ---

          Thanks for filing an issue! This repo requires issues submitted via the form templates: https://github.com/${opts.repo}/issues/new/choose

          This issue is missing the structured template sections and has been labeled \`needs-info\`. Please complete the information or resubmit via the link above; it may be closed until then.
          MSG`;
}

/* ---------------------------- CONTRIBUTING merge --------------------------- */

function contribSection(opts) {
  // Management mark lives INSIDE the start/end span so idempotent replace
  // covers it (a marker outside would duplicate on every rerun).
  return `<!-- issue-forms-kit:start v${VERSION} -->
## Reporting issues (including with AI assistants)

File issues through the templates at <https://github.com/${opts.repo}/issues/new/choose>${opts.keepBlank ? "" : " (blank issues are disabled)"}:

- 🐛 Bug 报告 / Bug Report — reproducible problems
- ✨ 功能建议 / Feature Request — ideas and improvements

Submitting via **command line or API** (e.g. an AI assistant running \`gh issue create\`)? The templates are **not applied automatically** there. In that case:

1. Read the relevant \`.github/ISSUE_TEMPLATE/bug_report.yml\` or \`feature_request.yml\` first.
2. Prefix the title with \`[Bug]: \` or \`[Feature]: \` accordingly.
3. Reconstruct the form in the body as markdown sections using the exact \`### …\` headings from the template (e.g. \`### ${t("摘要 / Summary", opts.zhOnly)}\`).
4.${opts.noTriage ? "" : " Issues lacking two or more of these sections are automatically labeled `needs-info` by the `issue-triage` workflow and may be closed until the information is provided."}
<!-- issue-forms-kit:end -->`;
}

function mergeContributing(existing, opts) {
  const section = contribSection(opts);
  // Headers may carry a trailing " vX.Y.Z"; match them flexibly so upgrades
  // and reruns always land inside the existing span instead of appending.
  const SPAN = /<!--\s*issue-forms-kit:start[^>]*-->[\s\S]*?<!--\s*issue-forms-kit:end[^>]*-->/;
  if (!existing) return `# Contributing\n\n${section}\n`;
  if (SPAN.test(existing)) {
    return existing.replace(SPAN, section);
  }
  const nl = existing.endsWith("\n") ? "" : "\n";
  return existing + nl + "\n" + section + "\n";
}

/* ------------------------------ gh: label mgmt ----------------------------- */

function ensureNeedsInfoLabel(dryRun) {
  if (dryRun) return console.log("(dry-run) would ensure label needs-info (#FBCA04)");
  const base = ["label", "create", "needs-info", "--color", "FBCA04",
    "--description", "缺少模板要求的信息，等待补充 / Missing required information"];
  let r = spawnSync("gh", base, { encoding: "utf8" });
  if (r.status !== 0) {
    r = spawnSync("gh", [...base, "--force"], { encoding: "utf8" });
  }
  if (r.status === 0) console.log("label ready: needs-info (#FBCA04)");
  else console.warn("! could not create label automatically — run:\n  gh label create needs-info --color FBCA04 --description \"missing info\"");
}

/* ------------------------------ conflict policy ---------------------------- */

function writeFileManaged(path, content, opts) {
  const exists = existsSync(path);
  if (exists) {
    const old = readFileSync(path, "utf8");
    const ours = old.includes("issue-forms-kit");
    if (old === content) { console.log(`  = unchanged  ${path}`); return; }
    if (!ours && !opts.force) {
      console.error(`✗ conflict: ${path} exists but is not managed by this kit.`);
      console.error("  Review/rename it first, delete it, or pass --force to overwrite.");
      process.exit(2);
    }
  }
  if (opts.dryRun) { console.log(`  (dry-run) write ${exists ? "over" : ""}${path}`); return; }
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  console.log(`  ✓ wrote ${path}${exists ? " (overwrite)" : ""}`);
}

/* ----------------------------------- main ---------------------------------- */

(function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.repo) {
    // Local-first inference from the git remote — no network needed.
    try {
      const url = execFileSync("git", ["remote", "get-url", "origin"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      const m = url.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
      if (m) opts.repo = `${m[1]}/${m[2]}`;
    } catch { /* fall through */ }
  }
  if (!opts.repo) {
    try {
      opts.repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch { /* handled below */ }
  }
  if (!opts.repo || !/^[\w.-]+\/[\w.-]+$/.test(opts.repo)) {
    console.error("✗ cannot determine repo slug — pass --repo OWNER/NAME or run inside a repo with a gh remote.");
    process.exit(1);
  }

  const dir = ".github/ISSUE_TEMPLATE";
  const plan = [
    [join(dir, "bug_report.yml"), buildBugForm(opts)],
    [join(dir, "feature_request.yml"), buildFeatureForm(opts)],
    [join(dir, "config.yml"), buildConfig(opts)],
  ];
  if (!opts.noTriage) plan.push([join(".github/workflows", "issue-triage.yml"), buildWorkflow(opts)]);
  plan.push(["CONTRIBUTING.md", mergeContributing(existsSync("CONTRIBUTING.md") ? readFileSync("CONTRIBUTING.md", "utf8") : null, opts)]);

  console.log(`issue-forms-kit v${VERSION} → ${opts.repo}${opts.dryRun ? " (dry-run)" : ""}
  zh-only=${opts.zhOnly} keep-blank=${opts.keepBlank} triage=${!opts.noTriage} areas=${opts.areas ?? "(default)"}`);

  for (const [p, c] of plan) writeFileManaged(p, c, opts);

  if (!opts.noTriage) ensureNeedsInfoLabel(opts.dryRun);

  console.log(`
done. Next steps (agent will do these WITH your approval):
  git add .github/ISSUE_TEMPLATE${opts.noTriage ? "" : " .github/workflows/issue-triage.yml"} CONTRIBUTING.md
  git commit -m "chore: scaffold bilingual issue forms (issue-forms-kit)"
  git push origin <default-branch>
Forms go live immediately after push.`);
})();
