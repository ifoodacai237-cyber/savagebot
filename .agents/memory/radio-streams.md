---
name: Radio — Streams Diretos (FFmpeg) e Música (SoundCloud via play-dl)
description: Por que o rádio usa ilovemusic.de, e como o comando musica agora usa SoundCloud como fonte primária em IPs de servidor.
---

## Problema raiz: YouTube bloqueia IPs de servidor
- Replit local: yt-dlp funciona normalmente
- Railway/qualquer cloud: YouTube bloqueia IPs conhecidos de datacenter, independente do player_client (android, ios, tv_embedded, web_creator — nenhum funciona)
- play-dl também falha no YouTube pelos mesmos motivos

## Solução — Comando /musica (musicManager.js)
**Fonte primária: SoundCloud via play-dl** — SoundCloud NÃO bloqueia IPs de servidor.

Fluxo de resolução:
1. Texto de pesquisa → playdl.search({ source: { soundcloud: 'tracks' } })
2. Link YouTube → tenta play-dl video_info (15s timeout); se falhar, extrai título via YouTube oEmbed API (`youtube.com/oembed?url=...`) depois busca no SoundCloud
3. Link Spotify → extrai título via Spotify oEmbed (`open.spotify.com/oembed?url=...`) depois busca no SoundCloud
4. Link SoundCloud → playdl.stream() direto

Streaming:
- SoundCloud: playdl.stream(url) → createAudioResource(stream, { inputType: type })
- YouTube (fallback): yt-dlp → ffmpeg pipe (OggOpus)

**Why:** IPs de Railway são conhecidos e bloqueados pelo YouTube. SoundCloud tem biblioteca enorme e não usa bot detection para IPs de servidor.

**How to apply:** Toda pesquisa de texto vai pro SoundCloud. YouTube/Spotify viram buscas no SoundCloud via oEmbed para extrair o título.

## Solução Rádio
Usar streams de rádio internet diretos (Icecast/SHOUTcast) via FFmpeg com StreamType.OggOpus.

**Providers funcionando:**
- `https://streams.ilovemusic.de/iloveradioN.mp3` — rádio online com músicas reais
- `https://ice2.somafm.com/<station>-128-mp3` — SomaFM

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

**IMPORTANTE:** NÃO usar SomaFM dronezone/deepspaceone/lush para Dance/Deep House/R&B — são ambient, não músicas reais.
