---
name: Radio — Streams Diretos (FFmpeg)
description: Por que o rádio usa ilovemusic.de em vez de YouTube/play-dl, e como o streaming funciona.
---

## Problema
`play-dl` falha em Replit/servidor com erro "Sign in to confirm you're not a bot" ao tentar fazer stream do YouTube. Isso é bloqueio do YouTube contra IPs de data center.

## Solução Rádio
Usar streams de rádio internet diretos (Icecast/SHOUTcast) via FFmpeg com StreamType.OggOpus.

**Providers funcionando:**
- `https://streams.ilovemusic.de/iloveradioN.mp3` — rádio online com músicas reais
- `https://ice2.somafm.com/<station>-128-mp3` — SomaFM (indie, jazz, metal)
- `https://stream.laut.fm/<genre>` — laut.fm (reggae)

| Canal | Gênero |
|-------|--------|
| iloveradio1  | Dance/EDM |
| iloveradio2  | Pop |
| iloveradio5  | Hip Hop |
| iloveradio6  | R&B |
| iloveradio7  | Rock |
| iloveradio15 | Latin |
| iloveradio17 | Lo-Fi / Chill |
| iloveradio18 | Phonk/Trap |
| iloveradio19 | Deep House |
| stream.laut.fm/reggae | Reggae |
| somafm indiepop | Indie |
| somafm metal | Metal |
| somafm sonicuniverse | Jazz |

**IMPORTANTE:** NÃO usar SomaFM dronezone/deepspaceone/lush para Dance/Deep House/R&B — são ambient, não músicas reais.

## Solução Música (YouTube links)
yt-dlp instalado via nix (versão 2025). Funciona com spawn em Node.js.
- `yt-dlp --format bestaudio -o - URL` piped para ffmpeg
- Veja musicManager.js e comando musica.js

**Why:** FFmpeg tem suporte nativo a HTTP streams com reconnect. StreamType.OggOpus é mais eficiente que Raw.

**How to apply:** Rádio usa spawnRadioStream() em radioManager.js. Música usa spawnMusicStream() em musicManager.js, não play-dl.
