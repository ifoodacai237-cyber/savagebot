import React, { createContext, useContext, useState, useEffect } from "react";
import { useListGuilds } from "@workspace/api-client-react";

interface GuildContextType {
  selectedGuildId: string | null;
  setSelectedGuildId: (id: string | null) => void;
  isLoading: boolean;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  
  const { data: guilds, isLoading } = useListGuilds();

  useEffect(() => {
    if (guilds && guilds.length > 0 && !selectedGuildId) {
      setSelectedGuildId(guilds[0].guildId);
    }
  }, [guilds, selectedGuildId]);

  return (
    <GuildContext.Provider value={{ selectedGuildId, setSelectedGuildId, isLoading }}>
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild() {
  const context = useContext(GuildContext);
  if (context === undefined) {
    throw new Error("useGuild must be used within a GuildProvider");
  }
  return context;
}
