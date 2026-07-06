import React from "react";
import { useGuild } from "@/lib/guild-context";
import { useListGuilds } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, Server } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { selectedGuildId, setSelectedGuildId } = useGuild();
  const { data: guilds, isLoading } = useListGuilds();

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 glass-panel border-b sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Server className="w-4 h-4" />
          <span>Servidor:</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-[160px] sm:w-[200px] rounded-md" />
        ) : (
          <Select value={selectedGuildId || ""} onValueChange={setSelectedGuildId}>
            <SelectTrigger className="w-[160px] sm:w-[220px] bg-secondary border-border text-xs sm:text-sm" data-testid="guild-selector">
              <SelectValue placeholder="Selecionar servidor" />
            </SelectTrigger>
            <SelectContent>
              {guilds?.map((guild) => (
                <SelectItem key={guild.guildId} value={guild.guildId}>
                  <span className="font-mono text-xs">{guild.guildId}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </header>
  );
}
