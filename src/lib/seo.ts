export const SITE_URL = "https://charles.market";
export const SITE_NAME = "CHARLES.MARKET";
export const SITE_TAGLINE = "Bet on the people you know";
export const OG_IMAGE_PATH = "/og.svg";

const TITLE_SUFFIX = ` · ${SITE_NAME}`;

export function pageTitle(label: string): string {
	if (!label) return `${SITE_NAME} · ${SITE_TAGLINE}`;
	if (label.toUpperCase().includes(SITE_NAME)) return label;
	return `${label}${TITLE_SUFFIX}`;
}

export function canonical(path = "/"): string {
	if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
	return `${SITE_URL}${path}`;
}

type MetaTag =
	| { name: string; content: string }
	| { property: string; content: string }
	| { title: string };

type LinkTag = { rel: string; href: string } & Record<string, string>;

type PageHeadInput = {
	title: string;
	description: string;
	path: string;
	noIndex?: boolean;
	image?: string;
};

export function pageHead({
	title,
	description,
	path,
	noIndex,
	image,
}: PageHeadInput): { meta: MetaTag[]; links: LinkTag[] } {
	const fullTitle = pageTitle(title);
	const url = canonical(path);
	const ogImage = canonical(image ?? OG_IMAGE_PATH);
	const meta: MetaTag[] = [
		{ title: fullTitle },
		{ name: "description", content: description },
		{ property: "og:title", content: fullTitle },
		{ property: "og:description", content: description },
		{ property: "og:url", content: url },
		{ property: "og:type", content: "website" },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:image", content: ogImage },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: fullTitle },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: ogImage },
	];
	if (noIndex) {
		meta.push({ name: "robots", content: "noindex, nofollow" });
	}
	const links: LinkTag[] = [{ rel: "canonical", href: url }];
	return { meta, links };
}
