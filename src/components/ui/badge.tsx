import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[2px] border border-transparent px-2 py-0.5 font-mono font-bold text-[10px] uppercase tracking-[0.12em] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand aria-invalid:border-magenta [&>svg]:pointer-events-none [&>svg]:size-3",
	{
		variants: {
			variant: {
				default: "bg-brand text-brand-foreground [a&]:hover:bg-brand-deep",
				secondary:
					"border-rule bg-ink-2 text-bone-2 [a&]:hover:border-rule-bright [a&]:hover:text-bone",
				outline:
					"border-rule text-bone-2 [a&]:hover:border-rule-bright [a&]:hover:text-bone",
				destructive:
					"bg-magenta text-magenta-foreground [a&]:hover:bg-magenta-deep",
				ghost: "[a&]:hover:bg-ink-3 [a&]:hover:text-bone",
				yes: "border-brand/40 bg-brand-wash text-brand",
				no: "border-magenta/40 bg-magenta-wash text-magenta",
				brand: "bg-brand text-brand-foreground [a&]:hover:bg-brand-deep",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function Badge({
	className,
	variant = "default",
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "span";

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
