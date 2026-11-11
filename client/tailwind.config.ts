import type { Config } from "tailwindcss";

export default {
	darkMode: ["class", "dark+"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			keyframes: {
				"fade-in": {
				"0%": { opacity: 0, transform: "translateY(10px)" },
				"100%": { opacity: 1, transform: "translateY(0)" },
				},
				"pop-in": {
				"0%": { opacity: 0, transform: "scale(0.8)" },
				"100%": { opacity: 1, transform: "scale(1)" },
				},
				"bounce-in": {
				"0%": { transform: "scale(0.5)", opacity: 0 },
				"70%": { transform: "scale(1.1)", opacity: 1 },
				"100%": { transform: "scale(1)", opacity: 1 },
				},
				shake: {
				"0%, 100%": { transform: "translateX(0)" },
				"10%, 30%, 50%, 70%, 90%": { transform: "translateX(-5px)" },
				"20%, 40%, 60%, 80%": { transform: "translateX(5px)" },
				},
				"fade-out": {
				"0%": { opacity: 1 },
				"100%": { opacity: 0 },
				},
				"accordion-down": {
					from: {
						height: "0",
					},
					to: {
						height: "var(--radix-accordion-content-height)",
					},
				},
				"accordion-up": {
					from: {
						height: "var(--radix-accordion-content-height)",
					},
					to: {
						height: "0",
					},
				},
				// "fade-in": {
				// 	from: {
				// 		opacity: "0",
				// 		transform: "translateY(10px)",
				// 	},
				// 	to: {
				// 		opacity: "1",
				// 		transform: "translateY(0)",
				// 	},
				// },
				"slide-in": {
					from: {
						opacity: "0",
						transform: "translateX(-100%)",
					},
					to: {
						opacity: "1",
						transform: "translateX(0)",
					},
				},
				"shimmer": {
					from: {
						backgroundPosition: "0 0",
					},
					to: {
						backgroundPosition: "-200% 0",
					},
				},
			},
			animation: {
				"fade-in": "fade-in 0.5s ease-out forwards",
				"pop-in": "pop-in 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards",
				"bounce-in": "bounce-in 0.5s ease-out forwards",
				shake: "shake 0.5s ease-in-out",
				"fade-out": "fade-out 0.5s ease-out forwards",
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				// "fade-in": "fade-in 0.3s ease-out",
				"slide-in": "slide-in 0.3s ease-out",
				"shimmer": "shimmer 2s linear infinite",
			},
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					"primary": "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"shimmer":
					"linear-gradient(to right, transparent 0%, rgba(255,255,255,0.2) 20%, transparent 40%)",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
