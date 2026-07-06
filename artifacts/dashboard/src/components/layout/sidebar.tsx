import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  ShoppingCart,
  Instagram,
  MessageCircleQuestion,
  Handshake,
  Bot,
  X,
} from "lucide-react";

const navigation = [
  { name: "Visão Geral", href: "/", icon: LayoutDashboard },
  { name: "Boas-vindas", href: "/welcome", icon: MessageSquare },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "Loja", href: "/shop", icon: ShoppingCart },
  { name: "Instagram", href: "/instagram", icon: Instagram },
  { name: "Tellonym", href: "/tellonym", icon: MessageCircleQuestion },
  { name: "Parcerias", href: "/partnership", icon: Handshake },
  { name: "Identidade", href: "/bot-identity", icon: Bot },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();

  const inner = (
    <div className="flex h-full w-64 flex-col glass-panel border-r">
      <div className="flex h-16 items-center justify-between px-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            FallenBot
          </span>
        </div>
        <button
          className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="text-xs font-medium text-muted-foreground mb-4 px-3 tracking-wider uppercase">
          Módulos
        </div>
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href} onClick={onClose}>
              <div
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer relative overflow-hidden ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
                data-testid={`nav-${item.href.replace("/", "") || "home"}`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_var(--color-primary)] rounded-r-full" />
                )}
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50 mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
            <span className="text-sm font-bold">AD</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Admin</span>
            <span className="text-xs text-muted-foreground">FallenBot Dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex h-full w-64 flex-shrink-0">
        {inner}
      </div>

      {/* Mobile: overlay drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 flex md:hidden">
            {inner}
          </div>
        </>
      )}
    </>
  );
}
