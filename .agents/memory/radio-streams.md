---
name: Radio — Streams Diretos (FFmpeg)
description: Por que o rádio usa ilovemusic.de em vez de YouTube/play-dl, e como o streaming funciona.
---

## Problema
`play-dl` falha em Replit/servidor com erro "Sign in to confirm you're not a bot" ao tentar fazer stream do YouTube. Isso é bloqueio do YouTube contra IPs de data center.

## Solução
Usar streams de rádio internet diretos (Icecast/SHOUTcast) via FFmpeg.

**Provider testado e funcionando:** `https://streams.ilovemusic.de/iloveradioN.mp3`

| Canal | URL | Gênero |
|-------|-----|--------|
| iloveradio1  | dance/funk |
| iloveradio2  | pop        |
| iloveradio5  | hip hop    |
| iloveradio6  | r&b        |
| iloveradio7  | rock       |
| iloveradio15 | latin      |
| iloveradio17 | lofi       |
| iloveradio18 | phonk/trap |

## Como funciona
- `spawn('ffmpeg', ['-reconnect','1','-reconnect_streamed','1','-reconnect_delay_max','5','-i', url, '-f','s16le','-ar','48000','-ac','2','-'])` 
- `createAudioResource(ffmpegProcess.stdout, { inputType: StreamType.Raw })`
- opusscript (instalado) converte PCM → Opus para o Discord

**Why:** FFmpeg tem suporte nativo a HTTP streams com reconnect. StreamType.Raw funciona sem depender de youtube-dl ou yt-dlp.

**How to apply:** Qualquer mudança no radio deve usar spawnRadioStream() em radioManager.js, não play-dl.
