export type Outcome = "Yes" | "No";

export type PriceTick = {
	t: number;
	yes: number;
};

export type UserMini = {
	_id: string;
	handle: string;
	name: string | null;
	image: string | null;
};

// Subject can be a linked user OR a free-text name (someone not in the system).
// `name` is always present. When `_id` is set, the subject links to a profile;
// otherwise it's off-platform.
export type SubjectRef = {
	name: string;
	_id?: string;
	handle?: string;
	image?: string | null;
};

export type Ticket = {
	id: string;
	slug: string;
	question: string;
	description: string;
	yesPrice: number;
	volume: number;
	liquidity: number;
	openInterest: number;
	closesAt: string;
	closesIn: string;
	createdAt: number;
	tradeCount: number;
	commentCount: number;
	trend: "up" | "down" | "flat";
	delta: number;
	tags: string[];
	history: PriceTick[];
	status: "open" | "closed" | "resolved" | "cancelled";
	resolution?: "Yes" | "No";
	subject: SubjectRef | null;
	creator: UserMini | null;
};

function trail(yes: number, points = 24, drift = 0.02): PriceTick[] {
	let s = Math.floor(yes * 1_000_003) || 1;
	const rand = () => {
		s = (s * 16_807) % 2_147_483_647;
		return s / 2_147_483_647;
	};
	const out: PriceTick[] = [];
	let v = Math.max(0.02, Math.min(0.98, yes - drift * points * 0.5));
	for (let i = points - 1; i >= 0; i--) {
		v = Math.max(0.02, Math.min(0.98, v + drift * (rand() - 0.5) * 2));
		out.push({ t: i, yes: v });
	}
	out[out.length - 1] = { t: 0, yes };
	return out;
}

export const CURRENCY_SYMBOL = "₪";
export const CURRENCY_NAME = "shekels";
export const STARTING_BALANCE = 2000;

export function money(n: number): string {
	if (n >= 1_000_000) return `${CURRENCY_SYMBOL}${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${CURRENCY_SYMBOL}${(n / 1_000).toFixed(1)}k`;
	return `${CURRENCY_SYMBOL}${Math.round(n)}`;
}

export function cents(n: number): string {
	return `${CURRENCY_SYMBOL}${Math.round(n * 100)}`;
}

export function pct(n: number): string {
	return `${Math.round(n * 100)}%`;
}

export function formatClosesIn(closesAtMs: number, now = Date.now()): string {
	const diff = closesAtMs - now;
	if (diff <= 0) return "closed";
	const day = 86_400_000;
	const hour = 3_600_000;
	const minute = 60_000;
	const days = Math.floor(diff / day);
	if (days >= 7) return `${Math.floor(days / 7)}w`;
	if (days >= 1) {
		const hours = Math.floor((diff - days * day) / hour);
		return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	}
	const hours = Math.floor(diff / hour);
	if (hours >= 1) return `${hours}h`;
	const mins = Math.max(1, Math.floor(diff / minute));
	return `${mins}m`;
}

export type ConvexTicket = {
	_id: string;
	_creationTime: number;
	slug: string;
	question: string;
	description: string;
	yesPrice: number;
	volume: number;
	liquidity: number;
	openInterest: number;
	closesAt: string;
	closesAtMs: number;
	tags: string[];
	status: "open" | "closed" | "resolved" | "cancelled";
	resolution?: "Yes" | "No";
	createdAt: number;
	tradeCount?: number;
	commentCount?: number;
	subject?: SubjectRef | null;
	creator?: UserMini | null;
};

export type UITicket = Ticket & { _id: string };

export function toUITicket(
	doc: ConvexTicket,
	history?: { yesPrice: number }[]
): UITicket {
	const yesterday =
		history && history.length > 1 ? history[0].yesPrice : doc.yesPrice;
	const delta = doc.yesPrice - yesterday;
	const trend: Ticket["trend"] =
		delta > 0.005 ? "up" : delta < -0.005 ? "down" : "flat";
	return {
		_id: doc._id,
		id: doc._id,
		slug: doc.slug,
		question: doc.question,
		description: doc.description,
		yesPrice: doc.yesPrice,
		volume: doc.volume,
		liquidity: doc.liquidity,
		openInterest: doc.openInterest,
		closesAt: doc.closesAt,
		closesIn: formatClosesIn(doc.closesAtMs),
		createdAt: doc.createdAt,
		tradeCount: doc.tradeCount ?? 0,
		commentCount: doc.commentCount ?? 0,
		trend,
		delta,
		tags: doc.tags,
		history: history?.map((h, i) => ({ t: i, yes: h.yesPrice })) ?? [],
		status: doc.status,
		resolution: doc.resolution,
		subject: doc.subject ?? null,
		creator: doc.creator ?? null,
	};
}

export { trail };
