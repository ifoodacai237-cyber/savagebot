---
name: Sniper de usernames — fórum + rate limit
description: Requisitos pra postar cards de username disponível num fórum do Discord e limites da API não-oficial de checagem.
---

## Cards precisam ser embed clássico, não Components V2
O preview de post do fórum (visão "Ordenar e ver", lista/galeria no mobile) só lê `content`/`embeds` da mensagem. Mensagens Components V2 (`ContainerBuilder`/`TextDisplayBuilder`) não têm esses campos e aparecem em branco no preview. Usar `EmbedBuilder` sem `setColor()` reproduz o visual "sem barra lateral colorida".

## Fórum deve estar em ListView
`defaultForumLayout: ForumLayoutType.Galeria` (padrão) só mostra miniatura de imagem — como os posts do sniper não têm imagem, os cards ficam em branco nessa view. Forçar `ForumLayoutType.ListView` na criação e no `.edit()` de fóruns já existentes.

## Threads dentro de fórum não aparecem no seletor nativo de canal
O componente de opção de canal (`ChannelOption`) do Discord não lista threads de um fórum, só o fórum em si. Solução: ao escolher um fórum num comando, buscar as threads via API (`fetchActive`/`fetchArchived`) e mostrar num `StringSelectMenu` (dropdown) separado.

## Rate limit punitivo no endpoint de checagem de username
`POST /unique-username/username-attempt-unauthed` (checagem não-autenticada de disponibilidade) tem um bucket de rate limit muito mais severo que o normal: ao estourar, o `retry_after` retornado é da ordem de **~1300+ segundos (>20 minutos)**, não segundos como a maioria dos 429 do Discord.

**Why:** confirmado empiricamente — uma rajada de ~40 chamadas com ~0.3s de intervalo entre elas disparou um bloqueio de ~23min nesse endpoint a partir do IP de teste. Isso é bem mais punitivo que o esperado e pode zerar o throughput de um sniper por muito tempo se ele tentar "acelerar" reduzindo o delay entre chamadas.

**How to apply:** manter pelo menos ~1.5s de intervalo entre chamadas sequenciais a esse endpoint. Pra aumentar o throughput de um sniper, prefira eliminar pausas ociosas *entre lotes/categorias* (que não fazem chamadas) em vez de reduzir o intervalo *entre chamadas* — ganha velocidade sem se aproximar do limite punitivo.
