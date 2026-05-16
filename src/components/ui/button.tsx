import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[4px] font-mono font-bold text-sm uppercase tracking-[0.08em] transition-[background-color,color,border-color,transform,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-magenta aria-invalid:ring-magenta/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"bezel bg-brand text-brand-foreground hover:bg-brand-deep active:translate-y-[1px]",
				destructive:
					"bezel bg-magenta text-magenta-foreground hover:bg-magenta-deep active:translate-y-[1px]",
				outline:
					"border border-rule bg-transparent text-bone hover:border-rule-bright hover:bg-ink-3",
				secondary:
					"border border-rule bg-ink-2 text-bone hover:border-rule-bright hover:bg-ink-3",
				ghost: "bg-transparent text-bone-2 hover:bg-ink-3 hover:text-bone",
				link: "rounded-none px-0 normal-case tracking-normal text-brand underline-offset-4 hover:underline",
				yes: "bezel bg-brand text-brand-foreground hover:bg-brand-deep active:translate-y-[1px]",
				no: "bezel bg-magenta text-magenta-foreground hover:bg-magenta-deep active:translate-y-[1px]",
				"yes-soft":
					"border border-brand/40 bg-brand-wash text-brand hover:border-brand hover:bg-brand-wash/80",
				"no-soft":
					"border border-magenta/40 bg-magenta-wash text-magenta hover:border-magenta hover:bg-magenta-wash/80",
				prose:
					"rounded-[4px] border border-rule bg-ink-2 font-sans normal-case tracking-normal text-bone hover:border-rule-bright hover:bg-ink-3",
			},
			size: {
				default: "h-9 px-4 has-[>svg]:px-3 text-xs",
				xs: "h-6 gap-1 px-2 text-[10px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 px-3 text-[11px] has-[>svg]:px-2.5",
				lg: "h-11 px-6 text-sm has-[>svg]:px-4",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
