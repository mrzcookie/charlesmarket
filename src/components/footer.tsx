import { Link } from "@tanstack/react-router";

export function Footer() {
	return (
		<footer className="mt-12 border-rule border-t bg-ink">
			<div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-10 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
				<div>
					<div className="font-display font-extrabold text-bone text-lg leading-none tracking-[-0.04em]">
						CHARLES<span className="text-brand">.</span>MARKET
					</div>
					<p className="mt-4 max-w-xs text-bone-2 text-sm leading-relaxed">
						The prediction console for one chaotic friend. Play-money shekels,
						real consequences for his reputation.
					</p>
					<div className="mt-5 inline-flex items-center gap-2 border border-rule px-3 py-1.5">
						<span className="label leading-none">Session</span>
						<span className="font-bold font-mono text-bone text-xs tabular-nums">
							{new Date().getFullYear()}.
							{String(new Date().getMonth() + 1).padStart(2, "0")}
						</span>
					</div>
				</div>

				<FooterCol
					title="Trade"
					links={[
						{ label: "Tickets", to: "/markets" },
						{ label: "Activity", to: "/activity" },
						{ label: "Leaderboard", to: "/leaderboard" },
						{ label: "Propose", to: "/propose" },
					]}
				/>
				<FooterCol
					title="Account"
					links={[
						{ label: "Portfolio", to: "/portfolio" },
						{ label: "Profile", to: "/profile" },
					]}
				/>
			</div>
			<div className="border-rule border-t">
				<div className="mx-auto flex w-full max-w-[1280px] flex-col items-start justify-between gap-2 px-4 py-4 font-mono text-[11px] text-bone-3 uppercase tracking-[0.14em] sm:flex-row sm:items-center sm:px-6">
					<span>© {new Date().getFullYear()} CHARLES.MARKET</span>
					<span className="text-bone-2">
						Play money <span className="text-brand">/</span> real feelings
					</span>
				</div>
			</div>
		</footer>
	);
}

function FooterCol({
	title,
	links,
}: {
	title: string;
	links: { label: string; to: string }[];
}) {
	return (
		<div>
			<h4 className="font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.16em]">
				{title}
			</h4>
			<ul className="mt-4 space-y-3">
				{links.map((l) => (
					<li key={l.label}>
						<Link
							to={l.to}
							className="font-mono text-[12px] text-bone-2 uppercase tracking-[0.12em] transition-colors hover:text-brand"
						>
							{l.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
