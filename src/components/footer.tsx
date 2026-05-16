import { Link } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";

export function Footer() {
	return (
		<footer className="border-t bg-muted/40">
			<div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
				<div className="col-span-2 md:col-span-1">
					<div className="flex items-center gap-2">
						<div className="grid h-7 w-7 place-items-center rounded-md bg-primary font-black text-primary-foreground text-xs">
							C
						</div>
						<span className="font-semibold text-sm">Charlesmarket</span>
					</div>
					<p className="mt-3 text-muted-foreground text-sm">
						A prediction market for one chaotic friend. Trade the future of
						Charles.
					</p>
				</div>

				<FooterCol
					title="Trade"
					links={[
						{ label: "Markets", to: "/markets" },
						{ label: "Activity", to: "/activity" },
						{ label: "Leaderboard", to: "/leaderboard" },
						{ label: "Propose a market", to: "/propose" },
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
			<Separator />
			<div className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-4 text-muted-foreground text-xs sm:px-6">
				© {new Date().getFullYear()} Charlesmarket · Play money, real feelings.
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
			<h4 className="font-semibold text-sm">{title}</h4>
			<ul className="mt-3 space-y-2">
				{links.map((l) => (
					<li key={l.label}>
						<Link
							to={l.to}
							className="text-muted-foreground text-sm hover:text-foreground"
						>
							{l.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
