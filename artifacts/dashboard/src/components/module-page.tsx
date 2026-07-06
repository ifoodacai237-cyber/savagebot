import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ModulePageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  noGuildSelected?: boolean;
  children: React.ReactNode;
}

export function ModulePage({ title, description, icon, isLoading, noGuildSelected, children }: ModulePageProps) {
  if (noGuildSelected) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-xl font-semibold">Nenhum servidor selecionado</h2>
        <p className="text-muted-foreground">Selecione um servidor no menu superior para configurar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(139,92,246,0.2)]">
          {icon}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 space-y-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 bg-white/[0.02]">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  );
}
