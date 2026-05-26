#!/usr/bin/env node
// Reads an unzipped Convex v1 snapshot and produces a JSON payload ready to
// feed into `npx convex run migrations:importV1Snapshot`.
//
// Usage:
//   unzip v1-snapshot.zip -d ./v1
//   node scripts/build-migration-payload.mjs ./v1 <charlesUserId> <defaultCreatorId> > payload.json
//   cat payload.json | npx convex run migrations:importV1Snapshot --prod --no-push
//
// See MIGRATION.md for the full runbook.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [, , snapDir, charlesUserId, defaultCreatorId, ...rest] = process.argv;
const dryRun = rest.includes("--dry-run");

if (!snapDir || !charlesUserId || !defaultCreatorId) {
	console.error(
		"Usage: build-migration-payload.mjs <snapshot-dir> <charlesUserId> <defaultCreatorId> [--dry-run]"
	);
	process.exit(1);
}

function readJsonl(file) {
	if (!existsSync(file)) return [];
	return readFileSync(file, "utf-8")
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => JSON.parse(line));
}

// Convex export layout: <snapshot>/<table>/documents.jsonl
function loadTable(name) {
	const candidates = [
		path.join(snapDir, name, "documents.jsonl"),
		path.join(snapDir, `${name}.jsonl`),
	];
	for (const file of candidates) {
		if (existsSync(file)) return readJsonl(file);
	}
	return [];
}

const rawMarkets = loadTable("markets");
const rawPositions = loadTable("positions");
const rawTrades = loadTable("trades");
const rawComments = loadTable("comments");
const rawPriceTicks = loadTable("priceTicks");
const rawReports = loadTable("ticketReports");

// Strip fields the v2 mutation doesn't accept. Keeps the JSON small + avoids
// validator errors if v1 had extras (e.g. `category`, `resolutionSource`).
const markets = rawMarkets.map((m) => ({
	_id: m._id,
	slug: m.slug,
	question: m.question,
	description: m.description ?? "",
	yesPrice: m.yesPrice,
	volume: m.volume,
	liquidity: m.liquidity,
	openInterest: m.openInterest,
	closesAt: m.closesAt,
	closesAtMs: m.closesAtMs,
	tags: m.tags ?? [],
	status: m.status,
	resolution: m.resolution,
	createdAt: m.createdAt,
}));

const positions = rawPositions.map((p) => ({
	userId: p.userId,
	marketId: p.marketId,
	side: p.side,
	shares: p.shares,
	avgPrice: p.avgPrice,
	realizedPnl: p.realizedPnl,
}));

const trades = rawTrades.map((t) => ({
	userId: t.userId,
	marketId: t.marketId,
	side: t.side,
	kind: t.kind,
	shares: t.shares,
	price: t.price,
	cost: t.cost,
}));

const comments = rawComments.map((c) => ({
	userId: c.userId,
	marketId: c.marketId,
	body: c.body,
}));

const priceTicks = rawPriceTicks.map((t) => ({
	marketId: t.marketId,
	yesPrice: t.yesPrice,
}));

const ticketReports = rawReports.map((r) => ({
	marketId: r.marketId,
	reporterId: r.reporterId,
	description: r.description,
	status: r.status,
	reviewedBy: r.reviewedBy,
	reviewedAt: r.reviewedAt,
}));

const payload = {
	charlesUserId,
	defaultCreatorId,
	markets,
	positions,
	trades,
	comments,
	priceTicks,
	ticketReports,
	...(dryRun ? { dryRun: true } : {}),
};

console.error(
	`payload summary: ${markets.length} markets, ${positions.length} positions, ${trades.length} trades, ${comments.length} comments, ${priceTicks.length} priceTicks, ${ticketReports.length} reports${dryRun ? " (dry-run)" : ""}`
);

process.stdout.write(JSON.stringify(payload));
