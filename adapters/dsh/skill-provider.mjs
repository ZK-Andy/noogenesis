/**
 * skill-provider.mjs — 技能随库分发的 DSH 技能 provider（ADR 2026-09-06-skills-ride-bank）。
 *
 * 零宿主依赖（防火墙规则 2，selftest 直测可脱离 DSH）：badge 式极简 provider，
 * 但 list 是动态的——每次 lookup 以 options.cwd 走四级回退链逐次解析 repoRoot
 * （部署收口 ADR 的正确性要求；patch 静态声明覆盖不了会话工作区/cwd 两级，
 * 见该 ADR Alternatives）。技能目录 = <repoRoot>/.noogenesis/genes-cache/.agents/
 * skills/（引擎 pull 整仓浅克隆，零引擎改动）；缓存缺席 → 空数组降级，绝不抛
 * （与 geneBankUrl 的 warn 降级语义同构）。胶囊过滤不在此实现——provider 的
 * list 形状以「成员集」为输入，过滤随 capsules/ 原语立项落地（ADR Decision 6）。
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepoRoot } from "./engine-bridge.mjs";

/** 宿主 dsh-skill 为打包技能定义的标准 precedence 位（镜像常量，不引宿主依赖）。 */
export const BUNDLED_SKILL_RANK = 600;

export const PROVIDER_NAME = "noogenesis-bank";

const KEBAB_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 缓存内技能目录（相对 repoRoot；引擎 D5 缓存落点 + 本 ADR 技能随库面）。 */
const CACHE_SKILLS_DIR = path.join(".noogenesis", "genes-cache", ".agents", "skills");

/**
 * frontmatter 极简解析：仅接受 `---` 围栏块内的单行 `key: value`（name 必须
 * kebab-case、description 必填、whenToUse 可选；值两侧成对引号剥除）。返回
 * null = 不可用——调用方 warn 跳过（dsh-skill-filesystem 同款纪律：坏文件
 * 绝不炸整个技能面）。目录式布局 `<name>/SKILL.md` 之外的形式不支持。
 */
export function parseSkillFile(raw) {
	if (!raw.startsWith("---")) return null;
	const fenceEnd = raw.indexOf("\n---", 3);
	if (fenceEnd === -1) return null;
	const meta = {};
	for (const line of raw.slice(3, fenceEnd).split("\n")) {
		const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
		if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
	}
	if (typeof meta.name !== "string" || !KEBAB_NAME.test(meta.name)) return null;
	if (typeof meta.description !== "string" || meta.description.length === 0) return null;
	const out = { name: meta.name, description: meta.description };
	if (meta.whenToUse) out.whenToUse = meta.whenToUse;
	const bodyStart = raw.indexOf("\n", fenceEnd + 1);
	return { meta: out, content: bodyStart === -1 ? "" : raw.slice(bodyStart + 1).replace(/^\n+/, "") };
}

async function listSkillsDir(skillsDir, { logger } = {}) {
	const entries = await readdir(skillsDir, { withFileTypes: true });
	const candidates = [];
	for (const entry of [...entries].sort((a, b) => (a.name < b.name ? -1 : 1))) {
		if (!entry.isDirectory()) continue;
		const skillDir = path.join(skillsDir, entry.name);
		const skillPath = path.join(skillDir, "SKILL.md");
		let raw;
		try {
			raw = await readFile(skillPath, "utf8");
		} catch {
			continue; // 无 SKILL.md 的目录静默跳过（缓存是全仓镜像，杂目录是常态）
		}
		const parsed = parseSkillFile(raw);
		if (!parsed) {
			logger?.warn?.(`noogenesis-bank: skipping ${skillPath} (frontmatter must carry kebab-case name + non-empty description)`);
			continue;
		}
		candidates.push({
			name: parsed.meta.name,
			description: parsed.meta.description,
			...(parsed.meta.whenToUse !== undefined ? { whenToUse: parsed.meta.whenToUse } : {}),
			invocation: { modelInvocable: true, userInvocable: true },
			source: "bundled",
			provider: PROVIDER_NAME,
			resourceBase: { kind: "directory", path: skillDir },
			rank: BUNDLED_SKILL_RANK,
			locator: { path: skillPath, directory: skillDir },
			path: skillPath,
		});
	}
	return candidates;
}

/**
 * 动态 provider（SkillProvider 合同三件套）：list 逐次解析 + get 全文加载。
 * get 对外来 candidate / 技能文件消失 / 名字漂移一律 undefined（宿主合同：
 * "no longer loadable"）；目录扫描无长驻句柄，control.invalidate 无操作面。
 */
export function createBankSkillProvider({ config = {}, logger } = {}) {
	return {
		name: PROVIDER_NAME,
		async list(options = {}) {
			const root = resolveRepoRoot(config, options.cwd);
			try {
				return await listSkillsDir(path.join(root, CACHE_SKILLS_DIR), { logger });
			} catch {
				return []; // 缓存未拉/拉失败 → 空技能面（ADR Decision 1，绝不抛）
			}
		},
		async get(candidate) {
			if (candidate?.provider !== PROVIDER_NAME) return undefined;
			let raw;
			try {
				raw = await readFile(candidate.locator?.path ?? "", "utf8");
			} catch {
				return undefined;
			}
			const parsed = parseSkillFile(raw);
			if (!parsed || parsed.meta.name !== candidate.name) return undefined;
			return {
				name: parsed.meta.name,
				description: parsed.meta.description,
				...(parsed.meta.whenToUse !== undefined ? { whenToUse: parsed.meta.whenToUse } : {}),
				invocation: { modelInvocable: true, userInvocable: true },
				source: "bundled",
				provider: PROVIDER_NAME,
				resourceBase: { kind: "directory", path: candidate.locator.directory },
				path: candidate.locator.path,
				content: parsed.content,
			};
		},
	};
}

/**
 * 宿主接线（index.mjs 唯一调用点）：skills 服务缺席 / registerProvider 抛错
 * → warn 降级不阻塞装载（提问面同款「缺席降级」纪律，inject 不声明 skills）。
 * 返回 true = 注册成功（selftest 断言面）。
 */
export function registerBankSkills(ctx, { config = {}, logger } = {}) {
	try {
		if (ctx.skills?.registerProvider) {
			ctx.skills.registerProvider(() => createBankSkillProvider({ config, logger }));
			return true;
		}
		logger?.warn?.("noogenesis-bank: host skills service absent; bank skills surface skipped");
	} catch (cause) {
		logger?.warn?.(`noogenesis-bank: skill provider registration skipped (${cause instanceof Error ? cause.message : String(cause)})`);
	}
	return false;
}
