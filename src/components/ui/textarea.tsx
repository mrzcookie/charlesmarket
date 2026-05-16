import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"field-sizing-content flex min-h-16 w-full rounded-[4px] border border-rule bg-ink-2 px-3 py-2 font-sans text-base text-bone outline-none transition-[border-color,background-color] placeholder:text-bone-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				"focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/40",
				"aria-invalid:border-magenta aria-invalid:ring-2 aria-invalid:ring-magenta/30",
				className
			)}
			{...props}
		/>
	);
}

export { Textarea };
