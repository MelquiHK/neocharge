import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

/**
 * Menú de cuenta del header (radix dropdown-menu). Va en chunk asíncrono:
 * el header pinta primero y el menú se hidrata en paralelo.
 */
export function AccountMenu() {
  const { user, isAdmin, signOut } = useAuth();

  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full">
        <Link to="/auth">Iniciar sesión</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cuenta">
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate">{user.email}</span>
            {isAdmin && (
              <span className="text-xs text-accent font-semibold mt-0.5">Administrador</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/cuenta" className="cursor-pointer">
            <User className="w-4 h-4 mr-2" /> Mi cuenta
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="cursor-pointer">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Panel admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
