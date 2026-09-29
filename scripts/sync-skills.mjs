#!/usr/bin/env node
/**
 * sync-skills.mjs — 把本机 DSH 技能同步为博客的技能内容集合
 *
 * 数据源（可修改 SKILL_HOMES）：
 *   - ~/.dsh/skills/*          （DSH 用户技能）
 *   - ~/.agents/skills/*       （npx skills 全局技能，如 lark-* / gstack / wind-*）
 *   - public/skills/<slug>/*   （仓库自带技能副本，一般由本脚本生成；见 VENDORED_SKILLS）
 *
 * 输出：
 *   src/content/skills/<slug>.md  （frontmatter: title / description / tags / source，正文 = SKILL.md 内容）
 *   public/skills/<slug>/**       （技能目录整体复制，供站点直接下载、安装提示词递归拉取）
 *
 * 用法：
 *   node scripts/sync-skills.mjs
 *   pnpm sync-skills
 *
 * 说明：
 *   1. 收录新技能的常规流程（第三方技能也一样）：先把技能装到本机技能库
 *      （如 ~/.dsh/skills/<name>/SKILL.md），再把名字加进 KEEP_ONLY，
 *      需要的话补 SEMANTIC_TAGS（标签）与 SOURCE_OVERRIDES（上游出处），最后跑本脚本。
 *   2. 脚本会清空 src/content/skills 后重新生成，保证与本地技能库同步；
 *      如需排除某些技能，把名字加进 EXCLUDE 集合即可。
 *   3. 技能目录是**整体复制**的（多文件技能只有同级文件都在，装出来才是完整的）；
 *      复制时按 DENY_FILE_PATTERNS / DENY_DIR_NAMES 跳过密钥、.env 等敏感文件并打印清单。
 *   4. VENDORED_SKILLS 仅供「不适合放进个人技能库」的仓库自带技能使用：以
 *      public/skills/<slug>/ 为唯一副本，同步时保留该目录并据此生成条目
 *      （与本机技能库同名时，以本机技能库为准）。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "content", "skills");
const PUBLIC_SKILLS = join(ROOT, "public", "skills");
const SKILL_HOMES = [join(homedir(), ".dsh", "skills"), join(homedir(), ".agents", "skills")];

/**
 * 仓库自带（第三方）技能：源文件直接放在 public/skills/<slug>/ 下，
 * 那里既是站点静态资源（/skills/<slug>/**）也是唯一副本，因此同步时只保留、不复制，
 * 内容条目由本脚本按其中的 SKILL.md 自动生成。
 *
 * 一般**不需要**用它：第三方技能装到本机技能库（如 ~/.dsh/skills/<name>/）后加进
 * KEEP_ONLY 即可，方向是「本机安装 → 同步发布」。只有确实不适合放进个人技能库的技能
 * 才登记到这里，例如：
 *   "some-skill": { tags: ["标签"], source: "owner/repo" },
 */
const VENDORED_SKILLS = {};

/** 复制技能目录时跳过的子目录（依赖、版本控制、缓存等，与技能无关） */
const DENY_DIR_NAMES = new Set([".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".cache"]);

/** 复制技能目录时跳过敏感文件：dotfile（.env/.npmrc/.netrc…）、密钥证书、凭证类命名 */
const DENY_FILE_PATTERNS = [
	/^\./,
	/\.env(\.|$)/i,
	/\.(key|pem|p12|pfx|jks|keystore|ppk|crt|cer|der|asc)$/i,
	/(^|[._-])id_(rsa|dsa|ecdsa|ed25519)([._-]|$)/i,
	/(secret|credential|password|passwd|private[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token)/i,
];

/** 判断相对路径是否属于「不应发布」的文件 */
function isDenied(relPath) {
	const name = basename(relPath);
	return DENY_FILE_PATTERNS.some((re) => re.test(name));
}

/** 把技能目录整体复制到 public/skills/<slug>/，返回被跳过的敏感文件清单 */
function copySkillDir(srcDir, destDir) {
	const skipped = [];
	const walk = (src, dest, rel) => {
		mkdirSync(dest, { recursive: true });
		for (const item of readdirSync(src, { withFileTypes: true })) {
			const relPath = rel ? `${rel}/${item.name}` : item.name;
			if (item.isDirectory()) {
				if (DENY_DIR_NAMES.has(item.name)) continue;
				walk(join(src, item.name), join(dest, item.name), relPath);
			} else if (item.isFile()) {
				if (isDenied(relPath)) {
					skipped.push(relPath);
					continue;
				}
				copyFileSync(join(src, item.name), join(dest, item.name));
			}
		}
	};
	walk(srcDir, destDir, "");
	return skipped;
}

/** 私有辅助技能，不展示 */
const EXCLUDE = new Set(["_gstack-command"]);

/** 按家族整组排除：值为 familyTag() 返回的标签（如 "lark" 飞书系列、"wind" 万得系列） */
const EXCLUDE_FAMILIES = new Set([]);

/** 仅保留白名单：非空时只同步这些技能，其余全部跳过 */
const KEEP_ONLY = new Set(["fact-check", "clarify-first", "first-principles", "issue-forms-kit", "security-audit"]);

/** 语义标签映射：slug -> 展示给访问者的分类标签（有映射时优先于来源/家族标签） */
const SEMANTIC_TAGS = {
	"clarify-first": ["需求澄清", "方法论"],
	"fact-check": ["事实核查", "方法论", "联网核实"],
	"first-principles": ["第一性原理", "思维模型", "方法论"],
	"issue-forms-kit": ["GitHub 协作", "工程规范", "自动化"],
	"security-audit": ["安全审计", "代码审计", "方法论"],
};

/** 来源覆盖：本机安装但来自第三方的技能，页面上注明上游出处（否则显示 .dsh/<name>） */
const SOURCE_OVERRIDES = {
	"security-audit": "cloudflare/security-audit-skill",
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
		collected.set(slug, {
			title,
			description,
			tags,
			source: SOURCE_OVERRIDES[slug] || `${homeLabel}/${skillName}`,
			body,
			dir: join(home, skillName),
		});
	}
}

// ---------- 收集：仓库自带（第三方）技能 ----------
for (const [slug, config] of Object.entries(VENDORED_SKILLS)) {
	if (collected.has(slug)) continue; // 本机技能库优先，避免两处定义互相覆盖
	const dir = join(PUBLIC_SKILLS, slug);
	const skillMd = join(dir, "SKILL.md");
	if (!existsSync(skillMd)) {
		console.warn(`⚠️  vendored 技能 ${slug} 缺少 ${skillMd}，已跳过`);
		continue;
	}

	const raw = readFileSync(skillMd, "utf8");
	const { data, body } = parseFrontmatter(raw);

	collected.set(slug, {
		title: config.title || data.name || firstHeading(body) || slug,
		description: config.description || data.description || firstParagraph(body) || "",
		tags: config.tags || SEMANTIC_TAGS[slug] || [],
		source: config.source || `vendored/${slug}`,
		body,
		dir: null, // 文件已在 public/skills/<slug>/，无需复制
	});
}

// ---------- 写入 ----------
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// 技能目录整体复制到 public/skills/<slug>/（随仓库提交，供访问者安装时递归拉取）；
// 仓库自带技能原地保留，只清掉上一轮由本脚本生成的那些目录。
mkdirSync(PUBLIC_SKILLS, { recursive: true });
for (const item of readdirSync(PUBLIC_SKILLS, { withFileTypes: true })) {
	if (VENDORED_SKILLS[item.name]) continue;
	rmSync(join(PUBLIC_SKILLS, item.name), { recursive: true, force: true });
}

let count = 0;
const skippedFiles = [];
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

	// 原始技能文件（含原始 frontmatter，拿到即可用）整体复制；vendored 技能已在原地
	if (entry.dir) {
		const skipped = copySkillDir(entry.dir, join(PUBLIC_SKILLS, slug));
		if (skipped.length > 0) {
			skippedFiles.push(`${slug}: ${skipped.join(", ")}`);
		}
	}

	count++;
}

console.log(`✅ 已同步 ${count} 个技能到 src/content/skills/`);
for (const [slug, entry] of [...collected.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title, "zh"))) {
	console.log(`   - ${entry.title} (${entry.source})`);
}

if (skippedFiles.length > 0) {
	console.warn(`\n⚠️  以下敏感/无关文件未发布（如属误判请调整 DENY_FILE_PATTERNS）：`);
	for (const line of skippedFiles) console.warn(`   - ${line}`);
}
