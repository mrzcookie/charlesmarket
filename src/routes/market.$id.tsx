import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/market/$id")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/ticket/$id",
			params: { id: params.id },
		});
	},
	component: () => null,
});
