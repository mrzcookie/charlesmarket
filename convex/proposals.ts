import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { currentUser, isAdminUser, requireAdmin, requireUser } from "./users";

const CATEGORIES = [
	"Antics",
	"Mishaps",
	"Relationships",
	"Career",
	"Health",
	"Travel",
	"Money",
] as const;

const MIN_QUESTION = 12;
const MAX_QUESTION = 140;
const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 1_000;
const MIN_LIQUIDITY = 100;
const MAX_LIQUIDITY = 50_000;

function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return base || `market-${Math.random().toString(36).slice(2, 8)}`;
}

async function uniqueSlug(ctx: QueryCtx, desired: string): Promise<string> {
	let candidate = desired;
	let i = 2;
	while (true) {
		const hit = await ctx.db
			.query("markets")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.unique();
		if (!hit) return candidate;
		candidate = `${desired}-${i}`;
		i += 1;
	}
}

function validateProposalShape(args: {
	question: string;
	description: string;
	category: string;
	resolutionSource: string;
	tags: string[];
	closesAt: string;
	closesAtMs: number;
	initialYesPrice: number;
	initialLiquidity: number;
}) {
	const question = args.question.trim();
	const description = args.description.trim();
	const resolutionSource = args.resolutionSource.trim();
	const closesAt = args.closesAt.trim();
	const tags = args.tags
		.map((t) => t.trim().toLowerCase())
		.filter(Boolean)
		.slice(0, 8);

	if (question.length < MIN_QUESTION || question.length > MAX_QUESTION) {
		throw new Error(
			`Question must be ${MIN_QUESTION}-${MAX_QUESTION} characters`
		);
	}
	if (!/\?$/.test(question)) {
		throw new Error("Question must end with a '?'");
	}
	if (
		description.length < MIN_DESCRIPTION ||
		description.length > MAX_DESCRIPTION
	) {
		throw new Error(
			`Description must be ${MIN_DESCRIPTION}-${MAX_DESCRIPTION} characters`
		);
	}
	if (!CATEGORIES.includes(args.category as (typeof CATEGORIES)[number])) {
		throw new Error("Pick a valid category");
	}
	if (!resolutionSource) throw new Error("Resolution source is required");
	if (!closesAt) throw new Error("Closing date label is required");
	if (!Number.isFinite(args.closesAtMs) || args.closesAtMs < Date.now()) {
		throw new Error("Closing time must be in the future");
	}
	const yp = args.initialYesPrice;
	if (!Number.isFinite(yp) || yp <= 0.01 || yp >= 0.99) {
		throw new Error("Initial Yes price must be between 0.01 and 0.99");
	}
	const liq = args.initialLiquidity;
	if (!Number.isFinite(liq) || liq < MIN_LIQUIDITY || liq > MAX_LIQUIDITY) {
		throw new Error(
			`Initial liquidity must be ${MIN_LIQUIDITY}-${MAX_LIQUIDITY}`
		);
	}

	return {
		question,
		description,
		resolutionSource,
		closesAt,
		tags,
	};
}

export const submit = mutation({
	args: {
		question: v.string(),
		description: v.string(),
		category: v.string(),
		resolutionSource: v.string(),
		tags: v.array(v.string()),
		closesAt: v.string(),
		closesAtMs: v.number(),
		initialYesPrice: v.number(),
		initialLiquidity: v.number(),
	},
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const cleaned = validateProposalShape(args);

		const id = await ctx.db.insert("marketProposals", {
			proposerId: user._id,
			question: cleaned.question,
			description: cleaned.description,
			category: args.category,
			resolutionSource: cleaned.resolutionSource,
			tags: cleaned.tags,
			closesAt: cleaned.closesAt,
			closesAtMs: args.closesAtMs,
			initialYesPrice: args.initialYesPrice,
			initialLiquidity: args.initialLiquidity,
			status: "pending",
		});

		return { id };
	},
});

async function enrichProposal(
	ctx: QueryCtx,
	p: Doc<"marketProposals">
): Promise<{
	_id: Id<"marketProposals">;
	_creationTime: number;
	question: string;
	description: string;
	category: string;
	resolutionSource: string;
	tags: string[];
	closesAt: string;
	closesAtMs: number;
	initialYesPrice: number;
	initialLiquidity: number;
	status: "pending" | "approved" | "rejected";
	rejectionReason?: string;
	proposerHandle: string;
	approvedMarketId?: Id<"markets">;
	approvedMarketSlug?: string;
}> {
	const proposer = await ctx.db.get(p.proposerId);
	let approvedMarketSlug: string | undefined;
	if (p.approvedMarketId) {
		const market = await ctx.db.get(p.approvedMarketId);
		approvedMarketSlug = market?.slug;
	}
	return {
		_id: p._id,
		_creationTime: p._creationTime,
		question: p.question,
		description: p.description,
		category: p.category,
		resolutionSource: p.resolutionSource,
		tags: p.tags,
		closesAt: p.closesAt,
		closesAtMs: p.closesAtMs,
		initialYesPrice: p.initialYesPrice,
		initialLiquidity: p.initialLiquidity,
		status: p.status,
		rejectionReason: p.rejectionReason,
		proposerHandle: proposer?.handle ?? "@anon",
		approvedMarketId: p.approvedMarketId,
		approvedMarketSlug,
	};
}

export const listMine = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!user) return [];
		const rows = await ctx.db
			.query("marketProposals")
			.withIndex("by_proposer", (q) => q.eq("proposerId", user._id))
			.order("desc")
			.take(50);
		return await Promise.all(rows.map((p) => enrichProposal(ctx, p)));
	},
});

export const listAll = query({
	args: {
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("approved"),
				v.literal("rejected")
			)
		),
	},
	handler: async (ctx, { status }) => {
		const user = await currentUser(ctx);
		if (!isAdminUser(user)) return [];
		const rows = status
			? await ctx.db
					.query("marketProposals")
					.withIndex("by_status", (q) => q.eq("status", status))
					.order("desc")
					.take(200)
			: await ctx.db.query("marketProposals").order("desc").take(200);
		return await Promise.all(rows.map((p) => enrichProposal(ctx, p)));
	},
});

export const pendingCount = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!isAdminUser(user)) return 0;
		const rows = await ctx.db
			.query("marketProposals")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.take(100);
		return rows.length;
	},
});

export const approve = mutation({
	args: {
		proposalId: v.id("marketProposals"),
		slugOverride: v.optional(v.string()),
	},
	handler: async (ctx, { proposalId, slugOverride }) => {
		const reviewer = await requireAdmin(ctx);
		const proposal = await ctx.db.get(proposalId);
		if (!proposal) throw new Error("Proposal not found");
		if (proposal.status !== "pending") {
			throw new Error("Proposal already reviewed");
		}

		const desired = slugify(slugOverride ?? proposal.question);
		const slug = await uniqueSlug(ctx, desired);
		const now = Date.now();

		const marketId = await ctx.db.insert("markets", {
			slug,
			question: proposal.question,
			description: proposal.description,
			category: proposal.category,
			yesPrice: proposal.initialYesPrice,
			volume: 0,
			liquidity: proposal.initialLiquidity,
			openInterest: 0,
			closesAt: proposal.closesAt,
			closesAtMs: proposal.closesAtMs,
			resolutionSource: proposal.resolutionSource,
			tags: proposal.tags,
			status: "open",
			createdAt: now,
		});

		await ctx.db.insert("priceTicks", {
			marketId,
			yesPrice: proposal.initialYesPrice,
		});

		await ctx.db.patch(proposalId, {
			status: "approved",
			reviewedBy: reviewer._id,
			reviewedAt: now,
			approvedMarketId: marketId,
		});

		return { marketId, slug };
	},
});

export const reject = mutation({
	args: {
		proposalId: v.id("marketProposals"),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, { proposalId, reason }) => {
		const reviewer = await requireAdmin(ctx);
		const proposal = await ctx.db.get(proposalId);
		if (!proposal) throw new Error("Proposal not found");
		if (proposal.status !== "pending") {
			throw new Error("Proposal already reviewed");
		}
		await ctx.db.patch(proposalId, {
			status: "rejected",
			rejectionReason: reason?.trim() || undefined,
			reviewedBy: reviewer._id,
			reviewedAt: Date.now(),
		});
		return { ok: true };
	},
});

export const remove = mutation({
	args: { proposalId: v.id("marketProposals") },
	handler: async (ctx, { proposalId }) => {
		const user = await requireUser(ctx);
		const proposal = await ctx.db.get(proposalId);
		if (!proposal) throw new Error("Proposal not found");
		const owner = proposal.proposerId === user._id;
		const admin = isAdminUser(user);
		if (!owner && !admin) throw new Error("Not allowed");
		if (proposal.status === "approved") {
			throw new Error("Approved proposals can't be deleted");
		}
		await ctx.db.delete(proposalId);
		return { ok: true };
	},
});
