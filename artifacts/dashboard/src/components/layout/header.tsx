import React from "react";
import { useGuild } from "@/lib/guild-context";
import { useListGuilds } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, Server, ChevronDown } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

function GuildAvatar({
  name,
  iconUrl,
  size = 6,
}: {
  name: string | null | undefined;
  iconUrl: string | null | undefined;
  size?: number;
}) {
  const initials = name
    ? name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name ?? "Server"}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-xs`}
    >
      {initials}
    </div>
  );
}

export function Header({ onMenuClick }: HeaderProps) {
  const { selectedGuildId, setSelectedGuildId } = useGuild();
  const { data: guilds, isLoading } = useListGuilds();

  const selectedGuild = guilds?.find((g) => g.guildId === selectedGuildId);

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
          <Skeleton className="h-10 w-[200px] sm:w-[240px] rounded-xl" />
        ) : guilds && guilds.length > 0 ? (
          <Select value={selectedGuildId || ""} onValueChange={setSelectedGuildId}>
            <SelectTrigger
              className="h-10 w-[200px] sm:w-[240px] bg-secondary/60 border-border/60 rounded-xl px-3 gap-2 hover:bg-secondary transition-colors"
              data-testid="guild-selector"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <GuildAvatar
                  name={selectedGuild?.discordName}
                  iconUrl={selectedGuild?.discordIcon}
                  size={6}
                />
                <span className="truncate text-sm font-medium">
                  {selectedGuild?.discordName ?? selectedGuild?.guildId ?? "Selecionar"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/60">
              {guilds.map((guild) => (
                <SelectItem
                  key={guild.guildId}
                  value={guild.guildId}
                  className="rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3 py-0.5">
                    <GuildAvatar
                      name={guild.discordName}
                      iconUrl={guild.discordIcon}
                      size={7}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">
                        {guild.discordName ?? guild.guildId}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {guild.guildId}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-secondary/60 border border-border/60 text-sm text-muted-foreground">
            <Server className="w-4 h-4" />
            <span>Nenhum servidor</span>
          </div>
        )}
      </div>
    </header>
  );
}
