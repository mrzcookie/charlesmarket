import { Separator } from "@/components/ui/separator";

export function Footer() {
	return (
		<footer className="border-t bg-muted/40">
			<div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
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
						{ label: "Markets", href: "/markets" },
						{ label: "Activity", href: "/activity" },
						{ label: "Leaderboard", href: "/leaderboard" },
					]}
				/>
				<FooterCol
					title="Account"
					links={[
						{ label: "Portfolio", href: "/portfolio" },
						{ label: "Profile", href: "/profile" },
						{ label: "Deposit", href: "#" },
					]}
				/>
				<FooterCol
					title="Resources"
					links={[
						{ label: "How it works", href: "#" },
						{ label: "Resolution rules", href: "#" },
						{ label: "Discord", href: "#" },
					]}
				/>
			</div>
			<Separator />
			<div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2 px-4 py-4 text-muted-foreground text-xs sm:flex-row sm:items-center sm:px-6">
				<div>
					© {new Date().getFullYear()} Charlesmarket. Play money, real feelings.
				</div>
				<div className="flex gap-4">
					<a className="hover:text-foreground" href="#">
						Terms
					</a>
					<a className="hover:text-foreground" href="#">
						Privacy
					</a>
					<a className="hover:text-foreground" href="#">
						Status
					</a>
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
	links: { label: string; href: string }[];
}) {
	return (
		<div>
			<h4 className="font-semibold text-sm">{title}</h4>
			<ul className="mt-3 space-y-2">
				{links.map((l) => (
					<li key={l.label}>
						<a
							href={l.href}
							className="text-muted-foreground text-sm hover:text-foreground"
						>
							{l.label}
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
