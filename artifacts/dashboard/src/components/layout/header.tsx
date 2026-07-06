import React from "react";
import { useGuild } from "@/lib/guild-context";
import { useListGuilds } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Server } from "lucide-react";

export function Header() {
  const { selectedGuildId, setSelectedGuildId } = useGuild();
  const { data: guilds, isLoading } = useListGuilds();

  return (
    <header className="h-16 flex items-center justify-between px-6 glass-panel border-b sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
          <Server className="w-4 h-4" />
          Servidor:
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-[200px] rounded-md" />
        ) : (
          <Select 
            value={selectedGuildId || ""} 
            onValueChange={setSelectedGuildId}
          >
            <SelectTrigger className="w-[200px] bg-secondary border-border" data-testid="guild-selector">
              <SelectValue placeholder="Selecione um servidor" />
            </SelectTrigger>
            <SelectContent>
              {guilds?.map((guild) => (
                <SelectItem key={guild.guildId} value={guild.guildId}>
                  {guild.id.substring(0, 8)}... ({guild.guildId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </header>
  );
}
