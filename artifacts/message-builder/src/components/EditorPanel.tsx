import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { MessageGroup, Block, RoleMention, TextBlock, RolesBlock, SeparatorBlock, ButtonsBlock, DividerBlock, ButtonItem } from "@/types/message";
import { Trash2, Plus, ChevronDown, ChevronUp, GripVertical, Minus } from "lucide-react";

interface Props {
  groups: MessageGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  onAddGroup: () => void;
  onRemoveGroup: (id: string) => void;
  onUpdateGroup: (id: string, updater: (g: MessageGroup) => MessageGroup) => void;
}

export function EditorPanel({ groups, selectedGroupId, onSelectGroup, onAddGroup, onRemoveGroup, onUpdateGroup }: Props) {
  const group = groups.find(g => g.id === selectedGroupId)!;

  const updateBlocks = (blocks: Block[]) => {
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks }));
  };

  const addTextBlock = () => {
    const block: TextBlock = { id: nanoid(), type: "text", content: "↳ Escreva a descrição aqui..." };
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks: [...g.blocks, block] }));
  };

  const addRolesBlock = () => {
    const block: RolesBlock = {
      id: nanoid(),
      type: "roles",
      roles: [{ id: nanoid(), name: "Cargo", color: "#5865F2" }],
    };
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks: [...g.blocks, block] }));
  };

  const addSeparatorBlock = () => {
    const block: SeparatorBlock = { id: nanoid(), type: "separator", content: "— ☆ 🌸 Seção 〇〇" };
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks: [...g.blocks, block] }));
  };

  const addButtonsBlock = () => {
    const block: ButtonsBlock = {
      id: nanoid(),
      type: "buttons",
      items: [
        { id: nanoid(), label: "Botão 1", emoji: "", style: "secondary" },
        { id: nanoid(), label: "Botão 2", emoji: "", style: "secondary" },
      ],
    };
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks: [...g.blocks, block] }));
  };

  const addDividerBlock = () => {
    const block: DividerBlock = { id: nanoid(), type: "divider" };
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks: [...g.blocks, block] }));
  };

  const removeBlock = (blockId: string) => {
    onUpdateGroup(selectedGroupId, g => ({ ...g, blocks: g.blocks.filter(b => b.id !== blockId) }));
  };

  const updateBlock = (blockId: string, updater: (b: Block) => Block) => {
    onUpdateGroup(selectedGroupId, g => ({
      ...g,
      blocks: g.blocks.map(b => b.id === blockId ? updater(b) : b),
    }));
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    onUpdateGroup(selectedGroupId, g => {
      const idx = g.blocks.findIndex(b => b.id === blockId);
      if (idx + dir < 0 || idx + dir >= g.blocks.length) return g;
      const next = [...g.blocks];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return { ...g, blocks: next };
    });
  };

  return (
    <div className="w-[380px] flex-shrink-0 flex flex-col bg-[#2b2d31] border-r border-[#1e1f22] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1f22]">
        <h1 className="text-white font-bold text-base">Montador de Mensagem</h1>
        <p className="text-[#949ba4] text-xs mt-0.5">Construa mensagens estilo Discord Webhook</p>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e1f22] overflow-x-auto">
        {groups.map((g, i) => (
          <button
            key={g.id}
            onClick={() => onSelectGroup(g.id)}
            className={`flex-shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors ${
              g.id === selectedGroupId
                ? "bg-[#5865F2] text-white"
                : "bg-[#383a40] text-[#b5bac1] hover:bg-[#43464d]"
            }`}
          >
            Mensagem {i + 1}
          </button>
        ))}
        <button
          onClick={onAddGroup}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-[#383a40] text-[#b5bac1] hover:bg-[#43464d] transition-colors"
          title="Nova mensagem"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wide">Cor da borda lateral</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={group.borderColor || "#4f545c"}
              onChange={e => onUpdateGroup(selectedGroupId, g => ({ ...g, borderColor: e.target.value }))}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <input
              type="text"
              value={group.borderColor}
              placeholder="#4f545c (vazio = sem cor)"
              onChange={e => onUpdateGroup(selectedGroupId, g => ({ ...g, borderColor: e.target.value }))}
              className="flex-1 bg-[#1e1f22] text-[#dbdee1] text-sm px-2 py-1.5 rounded border border-[#3f4147] focus:outline-none focus:border-[#5865F2] placeholder:text-[#4e5058]"
            />
            {group.borderColor && (
              <button
                onClick={() => onUpdateGroup(selectedGroupId, g => ({ ...g, borderColor: "" }))}
                className="text-[#949ba4] hover:text-[#dbdee1] text-xs px-2 py-1.5 bg-[#1e1f22] rounded border border-[#3f4147]"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-[#3f4147] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#b5bac1] text-xs font-semibold uppercase tracking-wide">Blocos</span>
            <span className="text-[#949ba4] text-xs">{group.blocks.length} bloco(s)</span>
          </div>
          <div className="space-y-2">
            {group.blocks.map((block, idx) => (
              <BlockEditor
                key={block.id}
                block={block}
                isFirst={idx === 0}
                isLast={idx === group.blocks.length - 1}
                onRemove={() => removeBlock(block.id)}
                onUpdate={updater => updateBlock(block.id, updater)}
                onMoveUp={() => moveBlock(block.id, -1)}
                onMoveDown={() => moveBlock(block.id, 1)}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={addRolesBlock}
              className="flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-2 rounded transition-colors"
            >
              <Plus size={12} /> Cargos
            </button>
            <button
              onClick={addTextBlock}
              className="flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-2 rounded transition-colors"
            >
              <Plus size={12} /> Texto
            </button>
            <button
              onClick={addSeparatorBlock}
              className="flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-2 rounded transition-colors"
            >
              <Plus size={12} /> Separador
            </button>
            <button
              onClick={addButtonsBlock}
              className="flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-2 rounded transition-colors"
            >
              <Plus size={12} /> Botões
            </button>
            <button
              onClick={addDividerBlock}
              className="col-span-2 flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-2 rounded transition-colors"
            >
              <Minus size={12} /> Divisória
            </button>
          </div>
        </div>

        {groups.length > 1 && (
          <div className="border-t border-[#3f4147] pt-3">
            <button
              onClick={() => onRemoveGroup(selectedGroupId)}
              className="w-full flex items-center justify-center gap-2 bg-[#3d2626] hover:bg-[#522] text-[#f87171] text-xs py-2 rounded transition-colors"
            >
              <Trash2 size={12} /> Remover esta mensagem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface BlockEditorProps {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onUpdate: (updater: (b: Block) => Block) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockEditor({ block, isFirst, isLast, onRemove, onUpdate, onMoveUp, onMoveDown }: BlockEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  const typeLabel =
    block.type === "text" ? "Texto" :
    block.type === "roles" ? "Cargos" :
    block.type === "separator" ? "Separador" :
    block.type === "buttons" ? "Botões" :
    "Divisória";

  const typeColor =
    block.type === "text" ? "bg-[#248046]" :
    block.type === "roles" ? "bg-[#5865F2]" :
    block.type === "separator" ? "bg-[#e67e22]" :
    block.type === "buttons" ? "bg-[#9b59b6]" :
    "bg-[#4e5058]";

  const preview =
    block.type === "roles" ? `${(block as RolesBlock).roles.length} cargo(s)` :
    block.type === "text" ? (block as TextBlock).content.slice(0, 30) + "..." :
    block.type === "separator" ? (block as SeparatorBlock).content.slice(0, 30) :
    block.type === "buttons" ? `${(block as ButtonsBlock).items.length} botão(ões)` :
    "linha divisória";

  const isDivider = block.type === "divider";

  return (
    <div className="bg-[#1e1f22] rounded border border-[#3f4147]">
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={14} className="text-[#4e5058] flex-shrink-0" />
        <span className={`${typeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm`}>{typeLabel}</span>
        <div className="flex-1 min-w-0 truncate text-[#949ba4] text-xs">
          {preview}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-[#4e5058] hover:text-[#b5bac1] disabled:opacity-30 transition-colors">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-[#4e5058] hover:text-[#b5bac1] disabled:opacity-30 transition-colors">
            <ChevronDown size={14} />
          </button>
          {!isDivider && (
            <button onClick={() => setCollapsed(c => !c)} className="text-[#4e5058] hover:text-[#b5bac1] transition-colors">
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          <button onClick={onRemove} className="text-[#4e5058] hover:text-[#f87171] transition-colors ml-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {!isDivider && !collapsed && (
        <div className="px-3 pb-3 border-t border-[#3f4147]">
          {block.type === "text" && (
            <TextBlockEditor block={block as TextBlock} onUpdate={onUpdate} />
          )}
          {block.type === "roles" && (
            <RolesBlockEditor block={block as RolesBlock} onUpdate={onUpdate} />
          )}
          {block.type === "separator" && (
            <SeparatorBlockEditor block={block as SeparatorBlock} onUpdate={onUpdate} />
          )}
          {block.type === "buttons" && (
            <ButtonsBlockEditor block={block as ButtonsBlock} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </div>
  );
}

function TextBlockEditor({ block, onUpdate }: { block: TextBlock; onUpdate: (u: (b: Block) => Block) => void }) {
  return (
    <div className="mt-2">
      <label className="text-[#949ba4] text-[11px] mb-1 block">Conteúdo (suporta **negrito**)</label>
      <textarea
        value={block.content}
        onChange={e => onUpdate(b => ({ ...b, content: e.target.value } as TextBlock))}
        rows={3}
        className="w-full bg-[#2b2d31] text-[#dbdee1] text-sm px-2 py-1.5 rounded border border-[#3f4147] focus:outline-none focus:border-[#5865F2] resize-none"
        placeholder="↳ Descrição do cargo..."
      />
    </div>
  );
}

function SeparatorBlockEditor({ block, onUpdate }: { block: SeparatorBlock; onUpdate: (u: (b: Block) => Block) => void }) {
  return (
    <div className="mt-2">
      <label className="text-[#949ba4] text-[11px] mb-1 block">Texto do separador</label>
      <input
        type="text"
        value={block.content}
        onChange={e => onUpdate(b => ({ ...b, content: e.target.value } as SeparatorBlock))}
        className="w-full bg-[#2b2d31] text-[#dbdee1] text-sm px-2 py-1.5 rounded border border-[#3f4147] focus:outline-none focus:border-[#5865F2]"
        placeholder="— ☆ 🌸 Seção 〇〇"
      />
    </div>
  );
}

function RolesBlockEditor({ block, onUpdate }: { block: RolesBlock; onUpdate: (u: (b: Block) => Block) => void }) {
  const addRole = () => {
    const role: RoleMention = { id: nanoid(), name: "Novo Cargo", color: "#5865F2" };
    onUpdate(b => ({ ...b, roles: [...(b as RolesBlock).roles, role] } as RolesBlock));
  };

  const removeRole = (roleId: string) => {
    onUpdate(b => ({ ...b, roles: (b as RolesBlock).roles.filter(r => r.id !== roleId) } as RolesBlock));
  };

  const updateRole = (roleId: string, field: "name" | "color", value: string) => {
    onUpdate(b => ({
      ...b,
      roles: (b as RolesBlock).roles.map(r => r.id === roleId ? { ...r, [field]: value } : r),
    } as RolesBlock));
  };

  return (
    <div className="mt-2 space-y-2">
      {block.roles.map(role => (
        <div key={role.id} className="flex items-center gap-2 bg-[#2b2d31] px-2 py-1.5 rounded border border-[#3f4147]">
          <input
            type="color"
            value={role.color}
            onChange={e => updateRole(role.id, "color", e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
          />
          <input
            type="text"
            value={role.name}
            onChange={e => updateRole(role.id, "name", e.target.value)}
            className="flex-1 bg-transparent text-[#dbdee1] text-sm focus:outline-none placeholder:text-[#4e5058]"
            placeholder="Nome do cargo"
          />
          <input
            type="text"
            value={role.color}
            onChange={e => updateRole(role.id, "color", e.target.value)}
            className="w-20 bg-[#1e1f22] text-[#949ba4] text-xs px-1.5 py-1 rounded focus:outline-none"
          />
          <button
            onClick={() => removeRole(role.id)}
            className="text-[#4e5058] hover:text-[#f87171] transition-colors flex-shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={addRole}
        className="w-full flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-1.5 rounded transition-colors border border-dashed border-[#3f4147]"
      >
        <Plus size={12} /> Adicionar cargo
      </button>
    </div>
  );
}

const BUTTON_STYLES: { value: ButtonItem["style"]; label: string; color: string }[] = [
  { value: "primary",   label: "Azul",     color: "bg-[#5865F2]" },
  { value: "secondary", label: "Cinza",    color: "bg-[#4e5058]" },
  { value: "success",   label: "Verde",    color: "bg-[#248046]" },
  { value: "danger",    label: "Vermelho", color: "bg-[#da373c]" },
];

function ButtonsBlockEditor({ block, onUpdate }: { block: ButtonsBlock; onUpdate: (u: (b: Block) => Block) => void }) {
  const addItem = () => {
    const item: ButtonItem = { id: nanoid(), label: "Botão", emoji: "", style: "secondary" };
    onUpdate(b => ({ ...b, items: [...(b as ButtonsBlock).items, item] } as ButtonsBlock));
  };

  const removeItem = (itemId: string) => {
    onUpdate(b => ({ ...b, items: (b as ButtonsBlock).items.filter(i => i.id !== itemId) } as ButtonsBlock));
  };

  const updateItem = (itemId: string, field: keyof ButtonItem, value: string) => {
    onUpdate(b => ({
      ...b,
      items: (b as ButtonsBlock).items.map(i => i.id === itemId ? { ...i, [field]: value } : i),
    } as ButtonsBlock));
  };

  return (
    <div className="mt-2 space-y-2">
      {block.items.map((item, idx) => (
        <div key={item.id} className="bg-[#2b2d31] rounded border border-[#3f4147] p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[#949ba4] text-[10px] w-4 text-center">{idx + 1}</span>
            <input
              type="text"
              value={item.emoji}
              onChange={e => updateItem(item.id, "emoji", e.target.value)}
              className="w-10 bg-[#1e1f22] text-[#dbdee1] text-sm px-1.5 py-1 rounded border border-[#3f4147] focus:outline-none focus:border-[#5865F2] text-center"
              placeholder="😀"
              title="Emoji (opcional)"
            />
            <input
              type="text"
              value={item.label}
              onChange={e => updateItem(item.id, "label", e.target.value)}
              className="flex-1 bg-[#1e1f22] text-[#dbdee1] text-sm px-2 py-1 rounded border border-[#3f4147] focus:outline-none focus:border-[#5865F2]"
              placeholder="Label do botão"
            />
            <button
              onClick={() => removeItem(item.id)}
              className="text-[#4e5058] hover:text-[#f87171] transition-colors flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 pl-6">
            <span className="text-[#949ba4] text-[10px] mr-1">Estilo:</span>
            {BUTTON_STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => updateItem(item.id, "style", s.value)}
                className={`px-2 py-0.5 rounded text-[10px] text-white font-medium transition-opacity ${s.color} ${item.style === s.value ? "opacity-100 ring-1 ring-white/40" : "opacity-40 hover:opacity-70"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1 bg-[#383a40] hover:bg-[#43464d] text-[#b5bac1] text-xs py-1.5 rounded transition-colors border border-dashed border-[#3f4147]"
      >
        <Plus size={12} /> Adicionar botão
      </button>
    </div>
  );
}
