import React from "react";
import { Eye } from "lucide-react";

export interface DiscordEmbedData {
  title?: string | null;
  description?: string | null;
  footer?: string | null;
  color?: string | null;
  bannerUrl?: string | null;
  thumbUrl?: string | null;
  bannerPosition?: "top" | "bottom" | string | null;
  onlyBanner?: boolean;
  useDivider?: boolean;
  button?: {
    label?: string | null;
    emoji?: string | null;
    style?: "primary" | "secondary" | "success" | "danger" | string | null;
  } | null;
  botName?: string;
}

const BUTTON_COLORS: Record<string, string> = {
  primary: "bg-[#5865F2] hover:bg-[#4752C4]",
  secondary: "bg-[#4e5058] hover:bg-[#6d6f78]",
  success: "bg-[#248046] hover:bg-[#1a6334]",
  danger: "bg-[#da373c] hover:bg-[#a12828]",
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function DiscordText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|__[^_]+__)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="bg-[#2b2d31] px-1 rounded text-[#e3e5e8] text-xs font-mono">{part.slice(1, -1)}</code>;
        if (part.startsWith("__") && part.endsWith("__"))
          return <u key={i}>{part.slice(2, -2)}</u>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function DiscordEmbedPreview({ data, className = "" }: { data: DiscordEmbedData; className?: string }) {
  const color = data.color ?? "#7c3aed";
  const rgb = hexToRgb(color);
  const borderColor = rgb ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : "#7c3aed";
  const botName = data.botName ?? "FallenBot";
  const buttonStyle = data.button?.style ?? "primary";
  const buttonClass = BUTTON_COLORS[buttonStyle] ?? BUTTON_COLORS.primary;

  const isEmpty = !data.title && !data.description && !data.bannerUrl && !data.thumbUrl;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Eye className="w-3.5 h-3.5" />
        Preview (tempo real)
      </div>

      <div className="rounded-xl bg-[#313338] p-4 font-sans text-[#dbdee1] text-sm leading-relaxed shadow-xl border border-white/5">
        {/* Bot author row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
            F
          </div>
          <span className="text-white font-semibold text-sm">{botName}</span>
          <span className="text-[10px] bg-[#5865F2] text-white px-1 py-0.5 rounded font-medium tracking-wide">BOT</span>
          <span className="text-[#949ba4] text-xs ml-1">Hoje às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {isEmpty ? (
          <div className="text-[#949ba4] text-xs italic py-4 text-center border border-dashed border-white/10 rounded-lg">
            Preencha os campos para ver o preview
          </div>
        ) : (
          <div
            className="rounded-md overflow-hidden"
            style={{ borderLeft: `4px solid ${borderColor}` }}
          >
            <div className="bg-[#2b2d31] p-3">
              {/* Banner no topo */}
              {data.bannerUrl && (data.bannerPosition === "top" || !data.bannerPosition) && !data.onlyBanner && (
                <img
                  src={data.bannerUrl}
                  alt="Banner"
                  className="w-full rounded mb-3 max-h-36 object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {/* Só banner */}
              {data.onlyBanner && data.bannerUrl && (
                <img
                  src={data.bannerUrl}
                  alt="Banner"
                  className="w-full rounded max-h-40 object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {!data.onlyBanner && (
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    {data.title && (
                      <p className="font-semibold text-white text-[15px] mb-1 leading-tight">
                        <DiscordText text={data.title} />
                      </p>
                    )}
                    {data.description && (
                      <p className="text-[#dbdee1] text-sm whitespace-pre-wrap break-words leading-[1.375]">
                        <DiscordText text={data.description} />
                      </p>
                    )}
                  </div>
                  {data.thumbUrl && (
                    <img
                      src={data.thumbUrl}
                      alt="Thumbnail"
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
              )}

              {/* Divisor */}
              {data.useDivider && !data.onlyBanner && (
                <div className="h-px bg-white/10 my-2" />
              )}

              {/* Banner no rodapé */}
              {data.bannerUrl && data.bannerPosition === "bottom" && !data.onlyBanner && (
                <img
                  src={data.bannerUrl}
                  alt="Banner"
                  className="w-full rounded mt-3 max-h-36 object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {/* Footer */}
              {data.footer && !data.onlyBanner && (
                <p className="text-[#949ba4] text-[11px] mt-2">{data.footer}</p>
              )}
            </div>
          </div>
        )}

        {/* Button */}
        {data.button && (data.button.label || data.button.emoji) && (
          <div className="mt-2">
            <button
              type="button"
              className={`px-4 py-1.5 rounded text-white text-sm font-medium transition-colors cursor-default ${buttonClass}`}
            >
              {data.button.emoji && <span className="mr-1">{data.button.emoji}</span>}
              {data.button.label || "Botão"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
