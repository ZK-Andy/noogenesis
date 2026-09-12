/**
 * skill-provider.mts — 技能随库分发的 DSH 技能 provider（ADR 2026-09-06-skills-ride-bank）。
 *
 * 零宿主依赖（防火墙规则 2，selftest 直测可脱离 DSH）：badge 式极简 provider，
 * 但 list 是动态的——每次 lookup 以 options.cwd 走四级回退链逐次解析 repoRoot
 * （部署收口 ADR 的正确性要求；patch 静态声明覆盖不了会话工作区/cwd 两级，
 * 见该 ADR Alternatives）。技能目录 = <repoRoot>/.noogenesis/genes-cache/.agents/
 * skills/（引擎 pull 整仓浅克隆，零引擎改动）；缓存缺席（ENOENT）→ 空数组静默
 * 降级，其余读错误 warn 留痕仍返回 []（与 bank-pull 的降级纪律同构，绝不抛）。
 * 胶囊过滤不在此实现——provider 的 list 形状以「成员集」为输入，过滤随
 * capsules/ 原语立项落地（ADR Decision 6）。
 *
 * 缓存刷新：宿主按 (cwd, scope, revision) 缓存 list 结果，
 * revision 只由 control.invalidate/dispose bump——工厂留持 control，
 * registerBankSkills 返回 invalidate 钩子，pull 成功后由 index.mjs 调用，
 * pull 前已被 list 过的 cwd 无需重启会话即重发现技能面。
 *
 * 注册时序：宿主 skills 服务未必在 apply() 时到场，注册走 `ctx.inject(["skills"], cb)`
 * 可重试路径（服务在场即跑、晚到补跑）；插件 inject 不声明 skills——全局声明会把
 * 整个插件推到服务到场之后，服务永不到场则插件不装载（ADR
 * 2026-09-12-bank-skill-provider-registration Decision 1 探针实测）。
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

/** 注入 logger 的最小面（仅 warn 被消费）。 */
interface ProviderLogger {
	warn?: (message: string) => void;
}

/** 解析后的 frontmatter 面。 */
interface ParsedMeta {
	name: string;
	description: string;
	whenToUse?: string;
}

/** 成对引号才剥（两侧独立剥会把 `don't` 的撇号误伤）。 */
function stripPairedQuotes(value: string): string {
	if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
		return value.slice(1, -1);
	}
	return value;
}

/**
 * frontmatter 极简解析：仅接受 `---` 围栏块内的单行 `key: value`（name 必须
 * kebab-case、description 必填、whenToUse 可选）。CRLF 行尾入口归一化为 LF
 * （换任何 CRLF 收录的库缓存不得整技能面静默清空）。返回 null =
 * 不可用——调用方 warn 跳过（坏文件绝不炸整个技能面）。目录式布局
 * `<name>/SKILL.md` 之外的形式不支持。
 */
export function parseSkillFile(rawInput: string): { meta: ParsedMeta; content: string } | null {
	const raw = rawInput.replace(/\r\n/g, "\n");
	if (!raw.startsWith("---")) return null;
	const fenceEnd = raw.indexOf("\n---", 3);
	if (fenceEnd === -1) return null;
	const meta: Record<string, string> = {};
	for (const line of raw.slice(3, fenceEnd).split("\n")) {
		const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
		// 正则保证两个捕获组在 m 非空时必在——undefined 检查是 noUncheckedIndexedAccess
		// 下的行为等价窄化（运行时恒真）。
		if (m && m[1] !== undefined && m[2] !== undefined) meta[m[1]] = stripPairedQuotes(m[2].trim());
	}
	if (typeof meta.name !== "string" || !KEBAB_NAME.test(meta.name)) return null;
	if (typeof meta.description !== "string" || meta.description.length === 0) return null;
	const out: ParsedMeta = { name: meta.name, description: meta.description };
	if (meta.whenToUse) out.whenToUse = meta.whenToUse;
	const bodyStart = raw.indexOf("\n", fenceEnd + 1);
	return { meta: out, content: bodyStart === -1 ? "" : raw.slice(bodyStart + 1).replace(/^\n+/, "") };
}

/** list/get 共同基座（差异面：list 独有 rank+locator 供宿主回调寻址，get 独有 content）。 */
function baseDefinition(parsed: { meta: ParsedMeta }, skillPath: string, skillDir: string, content?: string) {
	return {
		name: parsed.meta.name,
		description: parsed.meta.description,
		...(parsed.meta.whenToUse !== undefined ? { whenToUse: parsed.meta.whenToUse } : {}),
		invocation: { modelInvocable: true, userInvocable: true },
		source: "bundled",
		provider: PROVIDER_NAME,
		resourceBase: { kind: "directory", path: skillDir },
		path: skillPath,
		...(content !== undefined ? { content } : {}),
	};
}

async function listSkillsDir(skillsDir: string, { logger }: { logger?: ProviderLogger } = {}) {
	const entries = await readdir(skillsDir, { withFileTypes: true });
	const candidates = [];
	for (const entry of [...entries].sort((a, b) => (a.name < b.name ? -1 : 1))) {
		if (!entry.isDirectory()) continue;
		const skillDir = path.join(skillsDir, entry.name);
		const skillPath = path.join(skillDir, "SKILL.md");
		let raw: string;
		try {
			raw = await readFile(skillPath, "utf8");
		} catch {
			// 无 SKILL.md 的目录静默跳过（缓存是全仓镜像，杂目录是常态）
			continue;
		}
		const parsed = parseSkillFile(raw);
		if (!parsed) {
			logger?.warn?.(`noogenesis-bank: skipping ${skillPath} (frontmatter must carry kebab-case name + non-empty description)`);
			continue;
		}
		const base = baseDefinition(parsed, skillPath, skillDir);
		candidates.push({ ...base, rank: BUNDLED_SKILL_RANK, locator: { path: skillPath, directory: skillDir } });
	}
	return candidates;
}

/** 宿主 skills 注册面（本模块消费的窄合同；宿主全貌不在本层）。 */
interface SkillsSurface {
	registerProvider?: (create: (control: { invalidate: () => void }) => unknown) => void;
}

/**
 * 宿主注入面：`inject` = cordis 动态注入——回调在 deps 到场时执行（子 fiber），
 * 装载时已在场则同步执行、晚到则到场时补执行，且不阻塞本插件其余装载面。
 */
interface HostInject {
	inject?: (deps: string[], callback: (scoped: { skills?: SkillsSurface }) => void) => unknown;
}

/**
 * 动态 provider（SkillProvider 合同三件套）：list 逐次解析 + get 全文加载。
 * get 对外来 candidate / 技能文件消失 / 名字漂移一律 undefined（宿主合同：
 * "no longer loadable"）。目录扫描无长驻句柄；invalidate 不在 provider 内
 * 调用——由 registerBankSkills 返回的钩子在 pull 落地后触发（见头注）。
 */
export function createBankSkillProvider({ config = {}, logger }: { config?: { repoRoot?: string }; logger?: ProviderLogger } = {}) {
	return {
		name: PROVIDER_NAME,
		async list(options: { cwd?: string } = {}) {
			const root = resolveRepoRoot(config, options.cwd);
			try {
				return await listSkillsDir(path.join(root, CACHE_SKILLS_DIR), { logger });
			} catch (cause) {
				if ((cause as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") {
					logger?.warn?.(`noogenesis-bank: bank skills dir unreadable at ${root} (${cause instanceof Error ? cause.message : String(cause)}); empty surface`);
				}
				// 缓存未拉（ENOENT）静默；其余读错误 warn 留痕——均空技能面，绝不抛
				return [];
			}
		},
		async get(candidate?: { provider?: string; name?: string; locator?: { path?: string; directory?: string } }) {
			if (candidate?.provider !== PROVIDER_NAME) return undefined;
			let raw: string;
			try {
				raw = await readFile(candidate.locator?.path ?? "", "utf8");
			} catch {
				return undefined;
			}
			const parsed = parseSkillFile(raw);
			// locator 两字段由本 provider 自产的 candidate 恒有（list 落盘形状）；
			// 缺席即外来 candidate → undefined，与「文件消失」同分型（行为等价窄化）。
			const locator = candidate.locator;
			if (!parsed || !locator || locator.path === undefined || locator.directory === undefined || parsed.meta.name !== candidate.name) return undefined;
			return baseDefinition(parsed, locator.path, locator.directory, parsed.content);
		},
	};
}

/**
 * 宿主接线（index.mts 唯一调用点）：注册走 `ctx.inject(["skills"], …)`——服务装载前
 * 已在场即注册，晚到则到场时补注册（一次性读服务在缺席时会抛错并永久缺席，ADR
 * Decision 1 探针 A2/B）。`ctx.inject` 缺席 / skills 服务缺席 / registerProvider
 * 抛错 → warn 留痕降级，不阻塞装载。
 * 返回 `{ isRegistered, invalidate }`：isRegistered = provider 已交给宿主（提醒面
 * 可达性门消费，见 mount-policies.mts）；invalidate 留持宿主 SkillProviderControl，
 * pull 成功后由 index.mts 调用，控制未回传时为 no-op。
 */
export function registerBankSkills(ctx: unknown, { config = {}, logger }: { config?: { repoRoot?: string }; logger?: ProviderLogger } = {}): { isRegistered: () => boolean; invalidate: () => void } {
	// handed = registerProvider 已受理（宿主 catalog 从此含本 provider）；control 由
	// 宿主在 create 回调里回传，回传时点不影响失效语义（invalidate 调用时懒读）。
	const state: { handed: boolean; control: { invalidate: () => void } | null } = { handed: false, control: null };
	const handle = {
		isRegistered: () => state.handed,
		invalidate: () => {
			try {
				state.control?.invalidate();
			} catch (cause) {
				logger?.warn?.(`noogenesis-bank: invalidate failed (${cause instanceof Error ? cause.message : String(cause)}); catalog refresh deferred to next session`);
			}
		},
	};
	try {
		const inject = (ctx as HostInject | null)?.inject;
		if (typeof inject !== "function") {
			logger?.warn?.("noogenesis-bank: host context exposes no inject(); bank skills surface skipped");
			return handle;
		}
		inject.call(ctx, ["skills"], (scoped) => {
			try {
				const skills = scoped?.skills;
				if (!skills?.registerProvider) {
					logger?.warn?.("noogenesis-bank: host skills service absent; bank skills surface skipped");
					return;
				}
				skills.registerProvider((control) => {
					state.control = control;
					return createBankSkillProvider({ config, logger });
				});
				state.handed = true;
			} catch (cause) {
				logger?.warn?.(`noogenesis-bank: skill provider registration skipped (${cause instanceof Error ? cause.message : String(cause)})`);
			}
		});
	} catch (cause) {
		logger?.warn?.(`noogenesis-bank: inject(skills) failed (${cause instanceof Error ? cause.message : String(cause)}); bank skills surface skipped`);
	}
	return handle;
}
