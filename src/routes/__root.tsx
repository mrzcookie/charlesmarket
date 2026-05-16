import { ConvexAuthProvider } from "@convex-dev/auth/react";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useEffect } from "react";
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
    var theme = stored || 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

// Hard-reload once when a code-split chunk fails to load (stale deploy after
// a new release). The session-storage flag prevents an infinite reload loop
// if the chunk really is broken and not just a hash mismatch.
const chunkErrorRecoveryScript = `
(function() {
  var KEY = '__cm_chunk_reload_at';
  function recover(reason) {
    try {
      var last = Number(sessionStorage.getItem(KEY) || '0');
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch (e) {}
    if (typeof console !== 'undefined') {
      console.warn('[charlesmarket] chunk load failed, hard-reloading:', reason);
    }
    window.location.reload();
  }
  window.addEventListener('vite:preloadError', function (e) {
    e.preventDefault();
    recover('vite:preloadError');
  });
  window.addEventListener('error', function (e) {
    var msg = e && e.message ? String(e.message) : '';
    if (
      msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      msg.indexOf('Importing a module script failed') !== -1 ||
      (msg.indexOf('ChunkLoadError') !== -1)
    ) {
      recover('window.error');
    }
  });
  window.addEventListener('unhandledrejection', function (e) {
    var msg = (e && e.reason && (e.reason.message || String(e.reason))) || '';
    if (
      msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      msg.indexOf('Importing a module script failed') !== -1 ||
      msg.indexOf('ChunkLoadError') !== -1
    ) {
      recover('unhandledrejection');
    }
  });
})();
`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "CHARLES.MARKET / Bet on Charles" },
			{
				name: "description",
				content:
					"The prediction console for Charles. Trade Yes/No tickets on his next mishap, milestone, or antic.",
			},
			{ name: "theme-color", content: "#bcf03d" },
			{ name: "color-scheme", content: "dark light" },
			{
				property: "og:title",
				content: "CHARLES.MARKET / Bet on Charles",
			},
			{
				property: "og:description",
				content:
					"A near-future prediction console built for one chaotic friend. Play-money shekels, real consequences for his reputation.",
			},
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "CHARLES.MARKET" },
			{ name: "twitter:card", content: "summary_large_image" },
			{
				name: "twitter:title",
				content: "CHARLES.MARKET / Bet on Charles",
			},
			{
				name: "twitter:description",
				content:
					"A near-future prediction console built for one chaotic friend. Play-money shekels, real consequences.",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/favicon.svg" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Funnel+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@500;700&display=swap",
			},
		],
		scripts: [
			{ children: themeInitScript },
			{ children: chunkErrorRecoveryScript },
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: GlobalNotFound,
	errorComponent: GlobalError,
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
							className="absolute top-0 left-2 z-50 -translate-y-full rounded-[4px] bg-brand px-3 py-1.5 font-mono font-semibold text-brand-foreground text-xs uppercase tracking-widest focus:top-2 focus:translate-y-0"
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

function isChunkLoadError(error: Error): boolean {
	const msg = error?.message ?? "";
	return (
		msg.includes("Failed to fetch dynamically imported module") ||
		msg.includes("Importing a module script failed") ||
		msg.includes("ChunkLoadError") ||
		error?.name === "ChunkLoadError"
	);
}

function GlobalError({ error }: { error: Error }) {
	const chunkError = isChunkLoadError(error);

	useEffect(() => {
		if (!chunkError || typeof window === "undefined") return;
		const KEY = "__cm_chunk_reload_at";
		let last = 0;
		try {
			last = Number(sessionStorage.getItem(KEY) || "0");
			sessionStorage.setItem(KEY, String(Date.now()));
		} catch {}
		if (Date.now() - last < 10_000) return;
		window.location.reload();
	}, [chunkError]);

	if (chunkError) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
				<div className="bracket-chip" data-pulse="true">
					RELOADING
				</div>
				<h1 className="display-headline mt-6 text-4xl sm:text-5xl">
					New version is live.
				</h1>
				<p className="mt-4 max-w-md text-bone-2">
					Refreshing to pick up the latest build…
				</p>
				<Button className="mt-8" onClick={() => window.location.reload()}>
					Reload now
				</Button>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
			<div className="bracket-chip" data-tone="danger">
				FAULT / UNHANDLED
			</div>
			<h1 className="display-headline mt-6 text-5xl sm:text-7xl">
				The console crashed.
			</h1>
			<p className="mt-4 max-w-lg text-bone-2">
				Something blew up rendering this page. Probably Charles's fault. Try
				reloading; if it keeps happening, head back to tickets.
			</p>
			<pre className="mt-6 max-w-xl overflow-x-auto border border-rule bg-ink-2 p-3 text-left font-mono text-[11px] text-magenta">
				{error.message}
			</pre>
			<div className="mt-8 flex gap-3">
				<Button onClick={() => window.location.reload()}>Reload</Button>
				<Button asChild variant="outline">
					<Link to="/tickets">Browse tickets</Link>
				</Button>
			</div>
		</main>
	);
}

function GlobalNotFound() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
			<div className="bracket-chip" data-tone="danger">
				404 / NOT FOUND
			</div>
			<h1 className="display-headline mt-6 text-5xl sm:text-7xl">
				Charles lost it.
			</h1>
			<p className="mt-4 max-w-md text-bone-2">
				That page does not exist, or Charles forgot where he put it. Either way,
				back to tickets.
			</p>
			<div className="mt-8 flex gap-3">
				<Button asChild>
					<Link to="/tickets">Browse tickets</Link>
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
