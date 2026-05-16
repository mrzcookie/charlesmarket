import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
	if (typeof document === "undefined") return "dark";
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
	const html = document.documentElement;
	html.classList.toggle("dark", theme === "dark");
	try {
		localStorage.setItem("theme", theme);
	} catch {}
}

export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("dark");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setTheme(getInitialTheme());
		setMounted(true);
	}, []);

	const next: Theme = theme === "dark" ? "light" : "dark";

	return (
		<Button
			variant="outline"
			size="icon-sm"
			aria-label={`Switch to ${next} mode`}
			title={`Switch to ${next} mode`}
			onClick={() => {
				applyTheme(next);
				setTheme(next);
			}}
		>
			{mounted && theme === "dark" ? <Sun /> : <Moon />}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
