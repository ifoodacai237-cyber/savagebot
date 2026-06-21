import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { MessageGroup, Block, RoleMention, TextBlock, RolesBlock, SeparatorBlock } from "@/types/message";
import { DiscordPreview } from "@/components/DiscordPreview";
import { EditorPanel } from "@/components/EditorPanel";

const defaultGroup = (): MessageGroup => ({
  id: nanoid(),
  borderColor: "",
  blocks: [
    {
      id: nanoid(),
      type: "roles",
      roles: [{ id: nanoid(), name: "Zero Family", color: "#5865F2" }],
    } as RolesBlock,
    {
      id: nanoid(),
      type: "text",
      content: "↳ Benefício dado aos membros que utilizam a **tag do servidor** ou colocam o **convite do servidor** em seu \"Sobre Mim\".",
    } as TextBlock,
  ],
});

export function Builder() {
  const [groups, setGroups] = useState<MessageGroup[]>([defaultGroup()]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0].id);

  const addGroup = useCallback(() => {
    const g = defaultGroup();
    setGroups(prev => [...prev, g]);
    setSelectedGroupId(g.id);
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups(prev => {
      const next = prev.filter(g => g.id !== id);
      if (next.length === 0) {
        const g = defaultGroup();
        setSelectedGroupId(g.id);
        return [g];
      }
      setSelectedGroupId(next[next.length - 1].id);
      return next;
    });
  }, []);

  const updateGroup = useCallback((id: string, updater: (g: MessageGroup) => MessageGroup) => {
    setGroups(prev => prev.map(g => g.id === id ? updater(g) : g));
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? groups[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#1e1f22] text-white font-discord">
      <EditorPanel
        groups={groups}
        selectedGroupId={selectedGroup.id}
        onSelectGroup={setSelectedGroupId}
        onAddGroup={addGroup}
        onRemoveGroup={removeGroup}
        onUpdateGroup={updateGroup}
      />
      <DiscordPreview groups={groups} />
    </div>
  );
}
