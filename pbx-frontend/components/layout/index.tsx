"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  LucideIcon,
  Phone,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowRightLeft,
  Globe,
  FileDigit,
  Home,
  Moon,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({
  href,
  icon: Icon,
  label,
  active = false,
}) => {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
};

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/extensions", icon: Phone, label: "Extensions" },
    { href: "/trunks", icon: Globe, label: "Trunks" },
    { href: "/queues", icon: Users, label: "Queues" },
    {
      href: "/outbound-routes",
      icon: ArrowRightLeft,
      label: "Outbound Routes",
    },
    { href: "/inbound-routes", icon: ArrowRightLeft, label: "Inbound Routes" },
    { href: "/cdr", icon: FileDigit, label: "Call Records" },
    { href: "/system", icon: Settings, label: "System" },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-background px-2 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-4">
        <span className="text-2xl font-bold">Asterisk Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            active={
              pathname === link.href || pathname.startsWith(`${link.href}/`)
            }
          />
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const links = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/extensions", icon: Phone, label: "Extensions" },
    { href: "/trunks", icon: Globe, label: "Trunks" },
    { href: "/queues", icon: Users, label: "Queues" },
    {
      href: "/outbound-routes",
      icon: ArrowRightLeft,
      label: "Outbound Routes",
    },
    { href: "/inbound-routes", icon: ArrowRightLeft, label: "Inbound Routes" },
    { href: "/cdr", icon: FileDigit, label: "Call Records" },
    { href: "/system", icon: Settings, label: "System" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-lg font-bold">Asterisk Admin</span>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <X />
              </Button>
            </SheetTrigger>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {links.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                active={
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                }
              />
            ))}
          </nav>
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-red-500"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileNav />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="font-semibold">
              {user?.name || user?.username}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t py-4 text-center text-sm text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} Asterisk Admin</p>
    </footer>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 pt-4 md:ml-64 md:px-6 px-4">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
