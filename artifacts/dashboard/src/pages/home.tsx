import React from "react";
import { useGuild } from "@/lib/guild-context";
import { useGetGuildStats, getGetGuildStatsQueryKey } from "@workspace/api-client-react";
import { Users, Ticket, Handshake, Coins, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { selectedGuildId } = useGuild();
  const { data: stats, isLoading } = useGetGuildStats(selectedGuildId || "", {
    query: {
      enabled: !!selectedGuildId,
      queryKey: getGetGuildStatsQueryKey(selectedGuildId || "")
    }
  });

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Nenhum servidor selecionado</h2>
        <p className="text-muted-foreground">Selecione um servidor no menu superior para ver as estatísticas.</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Usuários",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "Tickets Abertos",
      value: stats?.openTickets || 0,
      subtext: `de ${stats?.totalTickets || 0} totais`,
      icon: Ticket,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10"
    },
    {
      title: "Parcerias",
      value: stats?.totalPartnerships || 0,
      icon: Handshake,
      color: "text-purple-400",
      bg: "bg-purple-400/10"
    },
    {
      title: "Economia Total",
      value: stats?.totalEconomy || 0,
      subtext: `Maior saldo: ${stats?.richestBalance || 0}`,
      icon: Coins,
      color: "text-amber-400",
      bg: "bg-amber-400/10"
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Visão Geral</h1>
        <p className="text-muted-foreground">
          Estatísticas e status do servidor {selectedGuildId}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat, index) => (
            <Card key={index} className="glass border-border/50 relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-mono">
                  {stat.value.toLocaleString('pt-BR')}
                </div>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.subtext}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Decorative futuristic elements */}
      <div className="mt-12 p-6 glass rounded-xl border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Status do Sistema
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-border/40">
            <span className="text-sm text-muted-foreground font-mono">Módulo de Boas-vindas</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-sm font-medium text-emerald-500">Operacional</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-border/40">
            <span className="text-sm text-muted-foreground font-mono">Sistema de Tickets</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-sm font-medium text-emerald-500">Operacional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
