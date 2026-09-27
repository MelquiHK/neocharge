import { cva } from "class-variance-authority";

export const buttonVariants = cva(

  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-brand-300 via-brand-400 to-brand-500 text-white shadow-glow-brand-sm hover:shadow-glow-brand hover:brightness-[1.03]",
        hero: "bg-gradient-primary text-white shadow-glow-brand hover:shadow-glow-brand btn-shine hover:-translate-y-0.5",
        /* Secundario de la tienda: morado */
        purple: "bg-gradient-to-br from-grape-400 via-grape-500 to-grape-600 text-white shadow-glow-grape-sm hover:shadow-glow-grape hover:brightness-[1.04] hover:-translate-y-0.5",
        "purple-glass": "border border-grape-300/70 bg-grape-100/50 text-grape-800 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(124,58,237,0.12)] hover:border-grape-400/80 hover:bg-grape-100/80 hover:-translate-y-0.5",
        electric: "bg-gradient-accent text-brand-900 shadow-glow-brand-sm hover:shadow-glow-brand btn-shine hover:-translate-y-0.5",
        whatsapp: "bg-[hsl(142_70%_45%)] text-white hover:bg-[hsl(142_70%_40%)] shadow-elevated hover:shadow-lifted hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft",
        outline: "border-2 border-border bg-white/60 backdrop-blur hover:bg-white/85 hover:border-brand-500/50 text-foreground",
        soft: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "hover:bg-white/70 text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-2xl px-4 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },

);
