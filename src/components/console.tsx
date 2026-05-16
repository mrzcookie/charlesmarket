import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Map a market slug to a deterministic numeric ID (`M-007`).
 * Pure visual layer. Backend slugs are unchanged.
 */
export function marketId(slug: string): string {
	let h = 0;
	for (let i = 0; i < slug.length; i++) {
		h = (h * 31 + slug.charCodeAt(i)) >>> 0;
	}
	const n = (h % 999) + 1;
	return `M-${String(n).padStart(3, "0")}`;
}

/**
 * Bracket-chip: a mono [ LABEL ] marker used for status tags ([ LIVE ],
 * [ CLOSED ], category codes). The brackets are part of the type, so it
 * needs no border or background.
 */
export function BracketChip({
	children,
	tone = "brand",
	pulse,
	className,
	as: As = "span",
}: {
	children: ReactNode;
	tone?: "brand" | "neutral" | "danger";
	pulse?: boolean;
	className?: string;
	as?: "span" | "div";
}) {
	return (
		<As
			className={cn("bracket-chip", className)}
			data-tone={tone}
			data-pulse={pulse || undefined}
		>
			{children}
		</As>
	);
}

/**
 * Kicker: the `// SECTION` mono marker above tabloid section headlines.
 */
export function Kicker({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("kicker", className)}>
			<span aria-hidden="true" className="mr-1 text-bone-3">
				{"//"}
			</span>
			{children}
		</div>
	);
}

/**
 * Tiny SVG sparkline. 24-ish points, single stroke, no fill, brand or
 * magenta depending on trajectory. Animates the stroke on first paint.
 */
export function Sparkline({
	points,
	trend,
	width = 96,
	height = 28,
	className,
}: {
	points: number[];
	trend?: "up" | "down" | "flat";
	width?: number;
	height?: number;
	className?: string;
}) {
	if (points.length < 2) {
		return (
			<svg
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				className={cn("text-bone-3", className)}
				aria-hidden="true"
			>
				<title>No data</title>
				<line
					x1={0}
					y1={height / 2}
					x2={width}
					y2={height / 2}
					stroke="currentColor"
					strokeWidth={1}
					strokeDasharray="2 3"
					opacity={0.5}
				/>
			</svg>
		);
	}
	const min = Math.min(...points);
	const max = Math.max(...points);
	const span = Math.max(0.001, max - min);
	const stepX = width / (points.length - 1);
	const path = points
		.map((p, i) => {
			const x = i * stepX;
			const y = height - ((p - min) / span) * (height - 4) - 2;
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");
	const stroke =
		trend === "down"
			? "var(--magenta)"
			: trend === "flat"
				? "var(--bone-3)"
				: "var(--brand)";
	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			className={className}
			aria-hidden="true"
			preserveAspectRatio="none"
		>
			<title>Trend</title>
			<path
				d={path}
				fill="none"
				stroke={stroke}
				strokeWidth={1.25}
				strokeLinecap="round"
				className="spark-path"
			/>
		</svg>
	);
}

/**
 * Stat: a small `LABEL / value` block used in the home hero strip and
 * sidebar stats. Mono label, big tabular value.
 */
export function Stat({
	label,
	value,
	tone = "default",
}: {
	label: string;
	value: ReactNode;
	tone?: "default" | "brand" | "magenta";
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="label">{label}</div>
			<div
				className={cn(
					"font-bold font-mono text-lg tabular-nums leading-none sm:text-xl",
					tone === "brand" && "text-brand",
					tone === "magenta" && "text-magenta"
				)}
			>
				{value}
			</div>
		</div>
	);
}

/**
 * Section header: a tabloid-headline `// KICKER` + Display M heading
 * with an optional right-side action slot.
 */
export function SectionHead({
	kicker,
	title,
	action,
}: {
	kicker: string;
	title: string;
	action?: ReactNode;
}) {
	return (
		<header className="flex flex-wrap items-end justify-between gap-3">
			<div className="min-w-0">
				<Kicker>{kicker}</Kicker>
				<h2 className="display-headline mt-1.5 text-2xl sm:text-3xl md:text-[2.25rem]">
					{title}
				</h2>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</header>
	);
}
