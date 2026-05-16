import { ConvexAuthProvider } from "@convex-dev/auth/react";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { TableRegistryProvider } from "@/components/table-devtools";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { convex } from "@/lib/convex";
import appCss from "@/styles/global.css?url";

const Devtools = import.meta.env.DEV
	? lazy(() =>
			Promise.all([
				import("@tanstack/react-devtools"),
				import("@tanstack/react-router-devtools"),
				import("@/components/table-devtools"),
			]).then(([{ TanStackDevtools }, router, tableDevtools]) => ({
				default: () => (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "TanStack Router",
								render: <router.TanStackRouterDevtoolsPanel />,
							},
							{
								name: "TanStack Table",
								render: <tableDevtools.TableDevtoolsPanel />,
							},
						]}
					/>
				),
			}))
		)
	: null;

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Charlesmarket — Bet on Charles" },
			{
				name: "description",
				content:
					"The prediction market for Charles. Trade contracts on his next move, mishap, or milestone.",
			},
			{ name: "theme-color", content: "#76b900" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap",
			},
		],
		scripts: [{ children: themeInitScript }],
	}),
	shellComponent: RootDocument,
	notFoundComponent: GlobalNotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-screen flex-col font-sans">
				<TableRegistryProvider>
					<ConvexAuthProvider client={convex}>
						<a
							href="#main-content"
							className="absolute top-0 left-2 z-50 -translate-y-full rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm shadow focus:top-2 focus:translate-y-0"
						>
							Skip to content
						</a>
						<Header />
						<div id="main-content" className="flex flex-1 flex-col">
							{children}
						</div>
						<Footer />
						<Toaster richColors closeButton position="bottom-right" />
					</ConvexAuthProvider>
					{Devtools && (
						<Suspense fallback={null}>
							<Devtools />
						</Suspense>
					)}
				</TableRegistryProvider>
				<Scripts />
			</body>
		</html>
	);
}

function GlobalNotFound() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
			<div className="rounded-full bg-accent px-4 py-1 font-medium text-accent-foreground text-xs uppercase tracking-wide">
				404
			</div>
			<h1 className="mt-4 font-bold text-4xl tracking-tight">
				Charles couldn't find that.
			</h1>
			<p className="mt-3 max-w-md text-muted-foreground">
				The page you're looking for doesn't exist, or Charles forgot where he
				put it. Either way — back to the markets.
			</p>
			<div className="mt-6 flex gap-3">
				<Button asChild>
					<Link to="/markets">Browse markets</Link>
				</Button>
				<Button asChild variant="outline">
					<Link to="/">Go home</Link>
				</Button>
			</div>
		</main>
	);
}

export function RootComponent() {
	return <Outlet />;
}
