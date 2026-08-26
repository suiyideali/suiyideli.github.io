#!/usr/bin/env node
/**
 * sync-skills.mjs — 把本机 DSH 技能同步为博客的技能内容集合
 *
 * 数据源（可修改 SKILL_HOMES）：
 *   - ~/.dsh/skills/*          （DSH 用户技能）
 *   - ~/.agents/skills/*       （npx skills 全局技能，如 lark-* / gstack / wind-*）
 *
 * 输出：
 *   src/content/skills/<slug>.md  （frontmatter: title / description / tags / source，正文 = SKILL.md 内容）
 *
 * 用法：
 *   node scripts/sync-skills.mjs
 *   pnpm sync-skills
 *
 * 说明：脚本会清空 src/content/skills 目录后重新生成，保证与本地技能库同步；
 *       如需排除某些技能，把名字加进 EXCLUDE 集合即可。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "content", "skills");
const SKILL_HOMES = [join(homedir(), ".dsh", "skills"), join(homedir(), ".agents", "skills")];

/** 私有辅助技能，不展示 */
const EXCLUDE = new Set(["_gstack-command"]);

/** 按家族整组排除：值为 familyTag() 返回的标签（如 "lark" 飞书系列、"wind" 万得系列） */
const EXCLUDE_FAMILIES = new Set([]);

/** 仅保留白名单：非空时只同步这些技能，其余全部跳过 */
const KEEP_ONLY = new Set(["fact-check", "clarify-first", "first-principles"]);

/** 语义标签映射：slug -> 展示给访问者的分类标签（有映射时优先于来源/家族标签） */
const SEMANTIC_TAGS = {
	"clarify-first": ["需求澄清", "方法论"],
	"fact-check": ["事实核查", "方法论", "联网核实"],
	"first-principles": ["第一性原理", "思维模型", "方法论"],
};

/** 家族标签：给技能打上可读分组 */
function familyTag(name) {
	if (name.startsWith("lark-")) return "lark";
	if (name.startsWith("wind-")) return "wind";
	if (name === "gstack" || name === "ego-browser" || name === "gstack-upgrade") return "gstack";
	if (name === "agently-mail") return "agently";
	return "";
}

/** 极简 YAML frontmatter 解析：只取单行标量键（name / description 等），保留正文 */
function parseFrontmatter(text) {
	if (!text.startsWith("---")) return { data: {}, body: text };

	const end = text.indexOf("\n---", 3);
	if (end < 0) return { data: {}, body: text };

	const fm = text.slice(3, end);
	const body = text.slice(end + 4).replace(/^\n+/, "");
	const data = {};

	for (const line of fm.split("\n")) {
		const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!m) continue;
		const key = m[1];
		let val = m[2].trim();
		if (val === "") continue;
		// 去掉单双引号包裹
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
		}
		// 跳过列表/多行值（以 - 开头）
		if (val.startsWith("-") || val === "|" || val === ">") continue;
		data[key] = val;
	}

	return { data, body };
}

function firstHeading(body) {
	const m = body.match(/^#\s+(.+)$/m);
	return m ? m[1].trim() : "";
}

function firstParagraph(body) {
	const cleaned = body
		.replace(/^#.*$/gm, "") // 去掉标题行
		.replace(/```[\s\S]*?```/g, " ") // 去掉代码块
		.replace(/[>`#*_\-\[\]()!|]/g, " ") // 去掉 markdown 符号
		.replace(/\s+/g, " ")
		.trim();
	return cleaned.slice(0, 200);
}

function slugify(name) {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function yamlStr(value) {
	return JSON.stringify(String(value));
}

// ---------- 收集 ----------
const collected = new Map(); // slug -> entry，先到先得（~/.dsh/skills 优先）

for (const home of SKILL_HOMES) {
	if (!existsSync(home)) continue;
	const homeLabel = basename(home) === "skills" ? basename(dirname(home)) : basename(home);

	for (const dir of readdirSync(home, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const skillName = dir.name;
		if (EXCLUDE.has(skillName)) continue;
		if (KEEP_ONLY.size > 0 && !KEEP_ONLY.has(skillName)) continue;
		if (EXCLUDE_FAMILIES.has(familyTag(skillName))) continue;

		const skillMd = join(home, skillName, "SKILL.md");
		if (!existsSync(skillMd)) continue;

		const raw = readFileSync(skillMd, "utf8");
		const { data, body } = parseFrontmatter(raw);

		const title = data.name || firstHeading(body) || skillName;
		const description = data.description || firstParagraph(body) || "";
		const slug = slugify(title);

		if (collected.has(slug)) continue; // 去重

		const tags =
			SEMANTIC_TAGS[slug] && SEMANTIC_TAGS[slug].length > 0
				? SEMANTIC_TAGS[slug]
				: [homeLabel, familyTag(skillName)].filter(Boolean);
		collected.set(slug, { title, description, tags, source: `${homeLabel}/${skillName}`, body, skillMd });
	}
}

// ---------- 写入 ----------
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// 原始 SKILL.md 原样复制到 public/skills/<slug>/，随仓库提交到 GitHub，供访问者直接拉取
const PUBLIC_SKILLS = join(ROOT, "public", "skills");
rmSync(PUBLIC_SKILLS, { recursive: true, force: true });
mkdirSync(PUBLIC_SKILLS, { recursive: true });

let count = 0;
for (const [slug, entry] of [...collected.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title, "zh"))) {
	const frontmatter = [
		"---",
		`title: ${yamlStr(entry.title)}`,
		`description: ${yamlStr(entry.description)}`,
		`tags: ${JSON.stringify(entry.tags)}`,
		`source: ${yamlStr(entry.source)}`,
		"---",
		"",
	].join("\n");

	writeFileSync(join(OUT_DIR, `${slug}.md`), `${frontmatter}${entry.body.replace(/^\n+/, "")}\n`, "utf8");

	// 原始 SKILL.md（含原始 frontmatter，拿到即可用）
	const publicDir = join(PUBLIC_SKILLS, slug);
	mkdirSync(publicDir, { recursive: true });
	copyFileSync(entry.skillMd, join(publicDir, "SKILL.md"));

	count++;
}

console.log(`✅ 已同步 ${count} 个技能到 src/content/skills/`);
for (const [slug, entry] of [...collected.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title, "zh"))) {
	console.log(`   - ${entry.title} (${entry.source})`);
}
