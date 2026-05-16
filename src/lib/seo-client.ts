import { useEffect } from "react";
import { canonical, pageTitle, SITE_NAME } from "./seo";

function setMeta(name: string, content: string, isProperty = false) {
	if (typeof document === "undefined") return;
	const attr = isProperty ? "property" : "name";
	const selector = `meta[${attr}="${name}"]`;
	let el = document.head.querySelector<HTMLMetaElement>(selector);
	if (!el) {
		el = document.createElement("meta");
		el.setAttribute(attr, name);
		document.head.appendChild(el);
	}
	el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
	if (typeof document === "undefined") return;
	const selector = `link[rel="${rel}"]`;
	let el = document.head.querySelector<HTMLLinkElement>(selector);
	if (!el) {
		el = document.createElement("link");
		el.setAttribute("rel", rel);
		document.head.appendChild(el);
	}
	el.setAttribute("href", href);
}

type DynamicHead = {
	title: string;
	description: string;
	path: string;
};

/**
 * Update document.title + description + canonical + og/twitter tags when a
 * dynamic page's Convex query resolves. The TanStack `head` option is static
 * and runs before queries hydrate, so this fills in the gap client-side.
 */
export function useDynamicHead({ title, description, path }: DynamicHead) {
	useEffect(() => {
		if (typeof document === "undefined") return;
		const fullTitle = pageTitle(title);
		const url = canonical(path);
		document.title = fullTitle;
		setMeta("description", description);
		setMeta("og:title", fullTitle, true);
		setMeta("og:description", description, true);
		setMeta("og:url", url, true);
		setMeta("og:site_name", SITE_NAME, true);
		setMeta("twitter:title", fullTitle);
		setMeta("twitter:description", description);
		setLink("canonical", url);
	}, [title, description, path]);
}
