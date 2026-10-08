import { Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  /** Si se provee, intercepta el clic (llamar e.preventDefault() para no ir al inicio). */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function Logo({ className, showText = true, onClick }: LogoProps) {
  return (
    <Link to="/" onClick={onClick} className={cn("flex items-center gap-2.5 group", className)} aria-label="NeoCharge inicio">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} fill="currentColor" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-bold text-lg tracking-tight text-foreground">NeoCharge</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Habana · 24h</span>
        </div>
      )}
    </Link>
  );
}
