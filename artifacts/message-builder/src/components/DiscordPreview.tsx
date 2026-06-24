import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { MessageGroup, Block, TextBlock, RolesBlock, SeparatorBlock, ButtonsBlock, DividerBlock } from "@/types/message";

interface Props {
  groups: MessageGroup[];
}

function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(<strong key={key++} className="font-semibold text-white">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return parts;
}

const BUTTON_STYLE_CLASSES: Record<string, string> = {
  primary:   "bg-[#5865F2] hover:bg-[#4752c4] text-white",
  secondary: "bg-[#4e5058] hover:bg-[#43444b] text-white",
  success:   "bg-[#248046] hover:bg-[#1a6b38] text-white",
  danger:    "bg-[#da373c] hover:bg-[#c12d31] text-white",
};

function renderBlock(block: Block) {
  if (block.type === "text") {
    const tb = block as TextBlock;
    return (
      <p key={block.id} className="text-[#dbdee1] text-[0.9375rem] leading-[1.375rem] mt-2">
        {parseMarkdown(tb.content)}
      </p>
    );
  }

  if (block.type === "roles") {
    const rb = block as RolesBlock;
    return (
      <div key={block.id} className="mt-1">
        {rb.roles.map(role => (
          <div key={role.id} className="flex items-center gap-[6px] leading-[1.3]">
            <span className="text-[#b5bac1] text-[0.9375rem] select-none">•</span>
            <span className="text-[#b5bac1] text-[0.9375rem] opacity-70 select-none tracking-wider">@♦ .</span>
            <span className="text-[#b5bac1] text-[0.9375rem] opacity-50 select-none">/☞ɔ</span>
            <span style={{ color: role.color || "#ffffff" }} className="text-[0.9375rem] font-medium">
              {role.name}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "separator") {
    const sb = block as SeparatorBlock;
    return (
      <div key={block.id} className="text-[#dbdee1] text-[0.9375rem] leading-[1.375rem] mt-1 font-semibold">
        {sb.content}
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div key={block.id} className="my-2">
        <div className="h-px bg-[#3f4147] w-full" />
      </div>
    );
  }

  if (block.type === "buttons") {
    const bb = block as ButtonsBlock;
    return (
      <div key={block.id} className="flex flex-wrap gap-2 mt-2">
        {bb.items.map(item => (
          <button
            key={item.id}
            className={`inline-flex items-center gap-1.5 px-4 py-[6px] rounded text-sm font-medium transition-colors cursor-default select-none ${BUTTON_STYLE_CLASSES[item.style] ?? BUTTON_STYLE_CLASSES.secondary}`}
          >
            {item.emoji && <span className="leading-none">{item.emoji}</span>}
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

function buildPlainText(groups: MessageGroup[]): string {
  return groups.map(g => {
    return g.blocks.map(block => {
      if (block.type === "text") return (block as TextBlock).content;
      if (block.type === "separator") return (block as SeparatorBlock).content;
      if (block.type === "divider") return "───────────────────";
      if (block.type === "roles") {
        return (block as RolesBlock).roles
          .map(r => `• @${r.name}`)
          .join("\n");
      }
      if (block.type === "buttons") {
        return (block as ButtonsBlock).items
          .map(i => `[ ${i.emoji ? i.emoji + " " : ""}${i.label} ]`)
          .join("  ");
      }
      return "";
    }).join("\n");
  }).join("\n\n");
}

export function DiscordPreview({ groups }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPlainText(groups));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#313338] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#313338] border-b border-[#232428] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#80848e] font-bold text-lg leading-none">#</span>
          <span className="text-white font-semibold text-[0.9375rem]">cargos</span>
          <span className="text-[#80848e] text-[0.8125rem] ml-1">Pré-visualização</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[#b5bac1] hover:text-white text-xs px-2.5 py-1 rounded bg-[#2b2d31] hover:bg-[#383a40] transition-colors border border-[#3f4147]"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? "Copiado!" : "Copiar texto"}
        </button>
      </div>

      <div className="flex flex-col px-4 pt-4 pb-8">
        {groups.map((group, gIdx) => (
          <div key={group.id} className={gIdx > 0 ? "mt-[17px]" : ""}>
            <DiscordMessage group={group} isFirst={gIdx === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscordMessage({ group, isFirst }: { group: MessageGroup; isFirst: boolean }) {
  const hasBorder = !!group.borderColor;
  const borderColor = group.borderColor || "#4f545c";

  return (
    <div className="flex group/msg hover:bg-white/[0.03] rounded px-2 py-0.5 -mx-2 transition-colors">
      <div className="flex gap-4 w-full min-w-0">
        <div className="flex-shrink-0 w-10 flex justify-start pt-[3px]">
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-sm font-bold select-none flex-shrink-0">
            W
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {isFirst && (
            <div className="flex items-baseline gap-2 mb-[2px]">
              <span className="text-white font-medium text-[0.9375rem] hover:underline cursor-pointer">Webhook</span>
              <span className="text-[#949ba4] text-[0.6875rem]">Hoje às 14:47</span>
              <span className="text-[#5865F2] text-[0.65rem] bg-[#5865F2]/25 px-1 py-[1px] rounded-sm font-semibold tracking-wide">BOT</span>
            </div>
          )}

          <div
            className="flex rounded overflow-hidden"
            style={{
              backgroundColor: "#2b2d31",
              borderLeft: `4px solid ${borderColor}`,
            }}
          >
            <div className="flex-1 min-w-0 px-3 py-2.5">
              {group.blocks.map(block => renderBlock(block))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
