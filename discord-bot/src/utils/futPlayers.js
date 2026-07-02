// ─── Banco de dados de jogadores FUT ─────────────────────────────────────────
// Raridades: bronze (55-64) | silver (65-74) | gold (75-84) | black (85-99)
// Posições: GOL, ZAG, LD, LE, MC, MEI, PE, PD, CA
// Séries: base | copa2026 | europe2526 | brasileirao26
// futggId: chave primária da carta no FUT.GG (fut.gg/players/{futggId}/)
//   • Foto: cdn.futgg.com/images/players/{futggId}.png — mesma fonte dos dados da carta
//   • Cache local: src/assets/players/{futggId}.png
//   • Script de sync: scripts/sync-futgg.js
//   • Nome, posição, overall e atributos vêm desta entrada — nunca de buscas separadas

export const FUT_PLAYERS = [

  // ═══════════════════════════════════════════════════════════════
  // BLACK (85-99 OVR) — As melhores cartas
  // ═══════════════════════════════════════════════════════════════

  // GOL — Black
  { id: 1,  name: 'Courtois',       pos: 'GOL', ovr: 91, pac: 50, fin: 11, pas: 80, dri: 74, def: 91, fis: 89, nat: 'BEL', club: 'Real Madrid',  rarity: 'black', series: 'europe2526', sofascoreId: 95934,   futggId: 192448 },
  { id: 2,  name: 'Alisson',        pos: 'GOL', ovr: 90, pac: 51, fin: 14, pas: 78, dri: 73, def: 90, fis: 85, nat: 'BRA', club: 'Liverpool',     rarity: 'black', series: 'europe2526', sofascoreId: 178294,  futggId: 200752 },
  { id: 3,  name: 'Neuer',          pos: 'GOL', ovr: 87, pac: 52, fin: 10, pas: 76, dri: 70, def: 87, fis: 82, nat: 'ALE', club: 'Bayern Munich', rarity: 'black', series: 'europe2526', sofascoreId: 12011,   futggId: 189596 },

  // ZAG — Black
  { id: 4,  name: 'Van Dijk',       pos: 'ZAG', ovr: 90, pac: 75, fin: 40, pas: 70, dri: 72, def: 91, fis: 89, nat: 'HOL', club: 'Liverpool',     rarity: 'black', series: 'europe2526', sofascoreId: 200644,  futggId: 203376 },
  { id: 5,  name: 'Rúben Dias',     pos: 'ZAG', ovr: 89, pac: 72, fin: 35, pas: 68, dri: 70, def: 90, fis: 86, nat: 'POR', club: 'Man City',      rarity: 'black', series: 'europe2526', sofascoreId: 780168,  futggId: 239019 },
  { id: 6,  name: 'Marquinhos',     pos: 'ZAG', ovr: 88, pac: 77, fin: 38, pas: 74, dri: 76, def: 89, fis: 84, nat: 'BRA', club: 'PSG',           rarity: 'black', series: 'europe2526', sofascoreId: 74037,   futggId: 213000 },

  // LD/LE — Black
  { id: 7,  name: 'Hakimi',         pos: 'LD',  ovr: 87, pac: 91, fin: 72, pas: 78, dri: 83, def: 78, fis: 78, nat: 'MAR', club: 'PSG',           rarity: 'black', series: 'europe2526', sofascoreId: 819068,  futggId: 231527 },
  { id: 8,  name: 'Theo Hernández', pos: 'LE',  ovr: 87, pac: 90, fin: 70, pas: 76, dri: 80, def: 75, fis: 80, nat: 'FRA', club: 'AC Milan',      rarity: 'black', series: 'europe2526', sofascoreId: 795337,  futggId: 231443 },

  // MC/MEI — Black
  { id: 9,  name: 'Rodri',          pos: 'MC',  ovr: 91, pac: 72, fin: 68, pas: 87, dri: 85, def: 88, fis: 90, nat: 'ESP', club: 'Man City',      rarity: 'black', series: 'europe2526', sofascoreId: 750965,  futggId: 231866 },
  { id: 10, name: 'De Bruyne',      pos: 'MEI', ovr: 93, pac: 76, fin: 82, pas: 93, dri: 88, def: 62, fis: 78, nat: 'BEL', club: 'Man City',      rarity: 'black', series: 'europe2526', sofascoreId: 70996,   futggId: 192985 },
  { id: 11, name: 'Bellingham',     pos: 'MEI', ovr: 91, pac: 83, fin: 82, pas: 85, dri: 88, def: 72, fis: 85, nat: 'ING', club: 'Real Madrid',   rarity: 'black', series: 'europe2526', sofascoreId: 1101557, futggId: 246669 },
  { id: 12, name: 'Kroos',          pos: 'MC',  ovr: 88, pac: 62, fin: 72, pas: 92, dri: 84, def: 72, fis: 74, nat: 'ALE', club: 'Real Madrid',   rarity: 'black', series: 'europe2526', sofascoreId: 17781,   futggId: 164240 },
  { id: 13, name: 'Pedri',          pos: 'MC',  ovr: 88, pac: 80, fin: 74, pas: 88, dri: 90, def: 72, fis: 70, nat: 'ESP', club: 'Barcelona',     rarity: 'black', series: 'europe2526', sofascoreId: 889012,  futggId: 231677 },

  // PE/PD — Black
  { id: 14, name: 'Mbappé',         pos: 'PE',  ovr: 93, pac: 97, fin: 92, pas: 82, dri: 93, def: 40, fis: 78, nat: 'FRA', club: 'Real Madrid',   rarity: 'black', series: 'europe2526', sofascoreId: 342229,  futggId: 231747 },
  { id: 15, name: 'Vinicius Jr',    pos: 'PE',  ovr: 92, pac: 95, fin: 85, pas: 78, dri: 95, def: 30, fis: 74, nat: 'BRA', club: 'Real Madrid',   rarity: 'black', series: 'europe2526', sofascoreId: 878986,  futggId: 238794 },
  { id: 16, name: 'Saka',           pos: 'PD',  ovr: 87, pac: 88, fin: 83, pas: 82, dri: 88, def: 65, fis: 74, nat: 'ING', club: 'Arsenal',       rarity: 'black', series: 'europe2526', sofascoreId: 913592,  futggId: 244476 },
  { id: 17, name: 'Salah',          pos: 'PD',  ovr: 90, pac: 92, fin: 90, pas: 80, dri: 90, def: 48, fis: 78, nat: 'EGI', club: 'Liverpool',     rarity: 'black', series: 'europe2526', sofascoreId: 78353,   futggId: 209331 },
  { id: 18, name: 'Neymar Jr',      pos: 'PE',  ovr: 89, pac: 88, fin: 85, pas: 84, dri: 94, def: 30, fis: 65, nat: 'BRA', club: 'Al-Hilal',      rarity: 'black', series: 'base',       sofascoreId: 123671,  futggId: 190871 },

  // CA — Black
  { id: 19, name: 'Haaland',        pos: 'CA',  ovr: 93, pac: 88, fin: 94, pas: 65, dri: 80, def: 45, fis: 88, nat: 'NOR', club: 'Man City',      rarity: 'black', series: 'europe2526', sofascoreId: 839956,  futggId: 239085 },
  { id: 20, name: 'Lewandowski',    pos: 'CA',  ovr: 90, pac: 80, fin: 92, pas: 78, dri: 83, def: 44, fis: 82, nat: 'POL', club: 'Barcelona',     rarity: 'black', series: 'europe2526', sofascoreId: 7157,    futggId: 188545 },
  { id: 21, name: 'Harry Kane',     pos: 'CA',  ovr: 90, pac: 73, fin: 91, pas: 82, dri: 80, def: 52, fis: 84, nat: 'ING', club: 'Bayern Munich', rarity: 'black', series: 'europe2526', sofascoreId: 45971,   futggId: 202126 },
  { id: 22, name: 'Benzema',        pos: 'CA',  ovr: 89, pac: 80, fin: 90, pas: 82, dri: 85, def: 42, fis: 78, nat: 'FRA', club: 'Al-Ittihad',   rarity: 'black', series: 'base',       sofascoreId: 1141,    futggId: 182521 },
  { id: 23, name: 'Cristiano',      pos: 'CA',  ovr: 88, pac: 83, fin: 92, pas: 72, dri: 86, def: 30, fis: 84, nat: 'POR', club: 'Al-Nassr',      rarity: 'black', series: 'base',       sofascoreId: 659,     futggId: 20801 },
  { id: 24, name: 'Messi',          pos: 'MEI', ovr: 91, pac: 80, fin: 88, pas: 90, dri: 96, def: 34, fis: 65, nat: 'ARG', club: 'Inter Miami',   rarity: 'black', series: 'base',       sofascoreId: 17892,   futggId: 158023 },

  // Copa 2026 — Black
  { id: 25, name: 'Lamine Yamal',   pos: 'PD',  ovr: 87, pac: 90, fin: 82, pas: 82, dri: 92, def: 38, fis: 68, nat: 'ESP', club: 'Barcelona',     rarity: 'black', series: 'copa2026',   sofascoreId: 1018688, futggId: 271321 },
  { id: 26, name: 'Vinícius Jr',    pos: 'PE',  ovr: 92, pac: 95, fin: 85, pas: 78, dri: 95, def: 30, fis: 74, nat: 'BRA', club: 'Real Madrid',   rarity: 'black', series: 'copa2026',   sofascoreId: 878986,  futggId: 238794 },
  { id: 27, name: 'Mbappé',         pos: 'CA',  ovr: 93, pac: 97, fin: 92, pas: 82, dri: 93, def: 40, fis: 78, nat: 'FRA', club: 'Real Madrid',   rarity: 'black', series: 'copa2026',   sofascoreId: 342229,  futggId: 231747 },
  { id: 28, name: 'Haaland',        pos: 'CA',  ovr: 93, pac: 88, fin: 94, pas: 65, dri: 80, def: 45, fis: 88, nat: 'NOR', club: 'Man City',      rarity: 'black', series: 'copa2026',   sofascoreId: 839956,  futggId: 239085 },

  // ═══════════════════════════════════════════════════════════════
  // GOLD (75-84 OVR)
  // ═══════════════════════════════════════════════════════════════

  // GOL — Gold
  { id: 30, name: 'Ederson',        pos: 'GOL', ovr: 84, pac: 58, fin: 15, pas: 75, dri: 70, def: 83, fis: 82, nat: 'BRA', club: 'Man City',      rarity: 'gold', series: 'europe2526',   sofascoreId: 375778,  futggId: 215914 },
  { id: 31, name: 'Oblak',          pos: 'GOL', ovr: 84, pac: 52, fin: 10, pas: 72, dri: 68, def: 85, fis: 80, nat: 'SVN', club: 'Atlético',      rarity: 'gold', series: 'europe2526',   sofascoreId: 280670,  futggId: 223344 },
  { id: 32, name: 'Ter Stegen',     pos: 'GOL', ovr: 83, pac: 54, fin: 12, pas: 74, dri: 68, def: 83, fis: 79, nat: 'ALE', club: 'Barcelona',     rarity: 'gold', series: 'europe2526',   sofascoreId: 15442,   futggId: 199392 },
  { id: 33, name: 'Onana',          pos: 'GOL', ovr: 81, pac: 56, fin: 10, pas: 68, dri: 65, def: 81, fis: 76, nat: 'CMR', club: 'Man United',    rarity: 'gold', series: 'europe2526',   sofascoreId: 215577,  futggId: 230621 },
  { id: 34, name: 'Lloris',         pos: 'GOL', ovr: 80, pac: 53, fin: 10, pas: 70, dri: 65, def: 80, fis: 76, nat: 'FRA', club: 'LA Galaxy',     rarity: 'gold', series: 'base',         sofascoreId: 8745,    futggId: 179547 },
  { id: 35, name: 'Szczesny',       pos: 'GOL', ovr: 79, pac: 50, fin: 10, pas: 68, dri: 63, def: 79, fis: 75, nat: 'POL', club: 'Barcelona',     rarity: 'gold', series: 'europe2526',   sofascoreId: 31234,   futggId: 204529 },

  // ZAG — Gold
  { id: 36, name: 'Militão',        pos: 'ZAG', ovr: 84, pac: 80, fin: 42, pas: 68, dri: 74, def: 84, fis: 82, nat: 'BRA', club: 'Real Madrid',   rarity: 'gold', series: 'europe2526',   sofascoreId: 779607,  futggId: 231582 },
  { id: 37, name: 'Koulibaly',      pos: 'ZAG', ovr: 83, pac: 76, fin: 36, pas: 62, dri: 70, def: 84, fis: 86, nat: 'SEN', club: 'Al-Hilal',      rarity: 'gold', series: 'base',         sofascoreId: 74044,   futggId: 195722 },
  { id: 38, name: 'Laporte',        pos: 'ZAG', ovr: 83, pac: 72, fin: 40, pas: 70, dri: 72, def: 84, fis: 78, nat: 'FRA', club: 'Al-Nassr',      rarity: 'gold', series: 'base',         sofascoreId: 298097,  futggId: 218353 },
  { id: 39, name: 'Bremer',         pos: 'ZAG', ovr: 82, pac: 74, fin: 38, pas: 65, dri: 70, def: 83, fis: 84, nat: 'BRA', club: 'Juventus',      rarity: 'gold', series: 'europe2526',   sofascoreId: 717419,  futggId: 226177 },
  { id: 40, name: 'Thiago Silva',   pos: 'ZAG', ovr: 81, pac: 68, fin: 35, pas: 68, dri: 70, def: 83, fis: 74, nat: 'BRA', club: 'Fluminense',    rarity: 'gold', series: 'brasileirao26', sofascoreId: 3660, futggId: 164240 },
  { id: 41, name: 'Alaba',          pos: 'ZAG', ovr: 82, pac: 76, fin: 45, pas: 74, dri: 76, def: 82, fis: 78, nat: 'AUT', club: 'Real Madrid',   rarity: 'gold', series: 'europe2526',   sofascoreId: 49321,   futggId: 195864 },
  { id: 42, name: 'Magalhães',      pos: 'ZAG', ovr: 80, pac: 73, fin: 38, pas: 64, dri: 70, def: 81, fis: 80, nat: 'BRA', club: 'Arsenal',       rarity: 'gold', series: 'europe2526',   sofascoreId: 825048,  futggId: 248392 },
  { id: 43, name: 'Bastoni',        pos: 'ZAG', ovr: 82, pac: 74, fin: 40, pas: 72, dri: 74, def: 83, fis: 78, nat: 'ITA', club: 'Inter',         rarity: 'gold', series: 'europe2526',   sofascoreId: 709533,  futggId: 238902 },

  // LD — Gold
  { id: 44, name: 'Trent A-A',      pos: 'LD',  ovr: 84, pac: 84, fin: 74, pas: 88, dri: 82, def: 72, fis: 72, nat: 'ING', club: 'Real Madrid',  rarity: 'gold', series: 'europe2526',   sofascoreId: 553285,  futggId: 228702 },
  { id: 45, name: 'Carvajal',       pos: 'LD',  ovr: 83, pac: 80, fin: 68, pas: 76, dri: 78, def: 80, fis: 74, nat: 'ESP', club: 'Real Madrid',   rarity: 'gold', series: 'europe2526',   sofascoreId: 5545,    futggId: 176580 },
  { id: 46, name: 'Reece James',    pos: 'LD',  ovr: 82, pac: 84, fin: 70, pas: 74, dri: 80, def: 78, fis: 78, nat: 'ING', club: 'Chelsea',       rarity: 'gold', series: 'europe2526',   sofascoreId: 839088,  futggId: 236392 },
  { id: 47, name: 'Dumfries',       pos: 'LD',  ovr: 80, pac: 88, fin: 70, pas: 72, dri: 78, def: 72, fis: 74, nat: 'HOL', club: 'Inter',         rarity: 'gold', series: 'europe2526',   sofascoreId: 428799,  futggId: 247028 },

  // LE — Gold
  { id: 48, name: 'Davies',         pos: 'LE',  ovr: 84, pac: 95, fin: 68, pas: 76, dri: 82, def: 72, fis: 76, nat: 'CAN', club: 'Bayern Munich', rarity: 'gold', series: 'europe2526',   sofascoreId: 785460,  futggId: 231406 },
  { id: 49, name: 'Grimaldo',       pos: 'LE',  ovr: 82, pac: 86, fin: 70, pas: 78, dri: 80, def: 70, fis: 72, nat: 'ESP', club: 'Leverkusen',    rarity: 'gold', series: 'europe2526',   sofascoreId: 105499,  futggId: 243277 },
  { id: 50, name: 'Mendy',          pos: 'LE',  ovr: 80, pac: 88, fin: 64, pas: 72, dri: 76, def: 76, fis: 78, nat: 'FRA', club: 'Real Madrid',   rarity: 'gold', series: 'europe2526',   sofascoreId: 348988,  futggId: 238803 },

  // MC — Gold
  { id: 51, name: 'Casemiro',       pos: 'MC',  ovr: 84, pac: 62, fin: 62, pas: 76, dri: 74, def: 86, fis: 84, nat: 'BRA', club: 'Man United',    rarity: 'gold', series: 'europe2526',   sofascoreId: 38784,   futggId: 193056 },
  { id: 52, name: 'Kanté',          pos: 'MC',  ovr: 84, pac: 78, fin: 62, pas: 76, dri: 78, def: 88, fis: 80, nat: 'FRA', club: 'Al-Ittihad',   rarity: 'gold', series: 'base',         sofascoreId: 107898,  futggId: 186153 },
  { id: 53, name: 'Frenkie De Jong',pos: 'MC',  ovr: 83, pac: 76, fin: 64, pas: 82, dri: 84, def: 74, fis: 76, nat: 'HOL', club: 'Barcelona',     rarity: 'gold', series: 'europe2526',   sofascoreId: 783885,  futggId: 226328 },
  { id: 54, name: 'Modrić',         pos: 'MC',  ovr: 84, pac: 70, fin: 74, pas: 88, dri: 86, def: 70, fis: 68, nat: 'CRO', club: 'Real Madrid',   rarity: 'gold', series: 'europe2526',   sofascoreId: 17779,   futggId: 172871 },
  { id: 55, name: 'Fabinho',        pos: 'MC',  ovr: 82, pac: 66, fin: 60, pas: 74, dri: 72, def: 85, fis: 82, nat: 'BRA', club: 'Al-Ittihad',   rarity: 'gold', series: 'base',         sofascoreId: 211080,  futggId: 222585 },
  { id: 56, name: 'Thuram',         pos: 'MC',  ovr: 82, pac: 80, fin: 68, pas: 78, dri: 80, def: 76, fis: 82, nat: 'FRA', club: 'Inter',         rarity: 'gold', series: 'europe2526',   sofascoreId: 872250,  futggId: 244728 },
  { id: 57, name: 'Vitinha',        pos: 'MC',  ovr: 82, pac: 78, fin: 70, pas: 84, dri: 84, def: 70, fis: 72, nat: 'POR', club: 'PSG',           rarity: 'gold', series: 'europe2526',   sofascoreId: 835012,  futggId: 252033 },

  // MEI — Gold
  { id: 58, name: 'Bruno Fernandes',pos: 'MEI', ovr: 84, pac: 74, fin: 82, pas: 86, dri: 82, def: 60, fis: 74, nat: 'POR', club: 'Man United',   rarity: 'gold', series: 'europe2526',   sofascoreId: 469003,  futggId: 212831 },
  { id: 59, name: 'Phil Foden',     pos: 'MEI', ovr: 84, pac: 82, fin: 82, pas: 84, dri: 88, def: 60, fis: 72, nat: 'ING', club: 'Man City',      rarity: 'gold', series: 'europe2526',   sofascoreId: 729426,  futggId: 237692 },
  { id: 60, name: 'Dybala',         pos: 'MEI', ovr: 82, pac: 80, fin: 82, pas: 80, dri: 88, def: 38, fis: 68, nat: 'ARG', club: 'Roma',          rarity: 'gold', series: 'europe2526',   sofascoreId: 219091,  futggId: 200145 },
  { id: 61, name: 'Isco',           pos: 'MEI', ovr: 80, pac: 74, fin: 76, pas: 84, dri: 88, def: 44, fis: 68, nat: 'ESP', club: 'Sevilla',       rarity: 'gold', series: 'europe2526',   sofascoreId: 15990, futggId: 197781 },

  // PE — Gold
  { id: 62, name: 'Leroy Sané',     pos: 'PE',  ovr: 84, pac: 93, fin: 82, pas: 78, dri: 88, def: 40, fis: 70, nat: 'ALE', club: 'Bayern Munich', rarity: 'gold', series: 'europe2526',   sofascoreId: 290498,  futggId: 224218 },
  { id: 63, name: 'Chiesa',         pos: 'PE',  ovr: 82, pac: 88, fin: 80, pas: 74, dri: 84, def: 48, fis: 74, nat: 'ITA', club: 'Liverpool',     rarity: 'gold', series: 'europe2526',   sofascoreId: 411219,  futggId: 235243 },
  { id: 64, name: 'Antony',         pos: 'PE',  ovr: 78, pac: 86, fin: 76, pas: 70, dri: 84, def: 36, fis: 68, nat: 'BRA', club: 'Man United',    rarity: 'gold', series: 'europe2526',   sofascoreId: 921592,  futggId: 244832 },
  { id: 65, name: 'Diogo Jota',     pos: 'PE',  ovr: 81, pac: 85, fin: 82, pas: 73, dri: 82, def: 42, fis: 74, nat: 'POR', club: 'Liverpool',     rarity: 'gold', series: 'europe2526',   sofascoreId: 489533,  futggId: 231219 },

  // PD — Gold
  { id: 66, name: 'Gnabry',         pos: 'PD',  ovr: 81, pac: 88, fin: 80, pas: 72, dri: 84, def: 40, fis: 72, nat: 'ALE', club: 'Bayern Munich', rarity: 'gold', series: 'europe2526',   sofascoreId: 320934,  futggId: 215985 },
  { id: 67, name: 'Pedro Neto',     pos: 'PD',  ovr: 80, pac: 87, fin: 76, pas: 70, dri: 83, def: 36, fis: 70, nat: 'POR', club: 'Chelsea',       rarity: 'gold', series: 'europe2526',   sofascoreId: 777014,  futggId: 248567 },
  { id: 68, name: 'Coman',          pos: 'PD',  ovr: 81, pac: 90, fin: 78, pas: 72, dri: 84, def: 38, fis: 72, nat: 'FRA', club: 'Bayern Munich', rarity: 'gold', series: 'europe2526',   sofascoreId: 54200,   futggId: 210392 },
  { id: 69, name: 'Pulisic',        pos: 'PD',  ovr: 80, pac: 85, fin: 78, pas: 74, dri: 82, def: 44, fis: 72, nat: 'EUA', club: 'AC Milan',      rarity: 'gold', series: 'europe2526',   sofascoreId: 557805,  futggId: 235244 },

  // CA — Gold
  { id: 70, name: 'Osimhen',        pos: 'CA',  ovr: 84, pac: 88, fin: 86, pas: 68, dri: 80, def: 34, fis: 84, nat: 'NIG', club: 'Galatasaray',   rarity: 'gold', series: 'europe2526',   sofascoreId: 824100,  futggId: 241052 },
  { id: 71, name: 'Lukaku',         pos: 'CA',  ovr: 83, pac: 82, fin: 84, pas: 62, dri: 74, def: 38, fis: 90, nat: 'BEL', club: 'Roma',          rarity: 'gold', series: 'europe2526',   sofascoreId: 126663,  futggId: 192505 },
  { id: 72, name: 'Vlahović',       pos: 'CA',  ovr: 83, pac: 80, fin: 86, pas: 66, dri: 76, def: 40, fis: 84, nat: 'SER', club: 'Juventus',      rarity: 'gold', series: 'europe2526',   sofascoreId: 818781,  futggId: 247500 },
  { id: 73, name: 'Rashford',       pos: 'CA',  ovr: 82, pac: 90, fin: 80, pas: 72, dri: 82, def: 36, fis: 78, nat: 'ING', club: 'Aston Villa',   rarity: 'gold', series: 'europe2526',   sofascoreId: 300615,  futggId: 236670 },
  { id: 74, name: 'Amad Diallo',    pos: 'PE',  ovr: 80, pac: 84, fin: 78, pas: 68, dri: 82, def: 32, fis: 72, nat: 'CIV', club: 'Man United',    rarity: 'gold', series: 'europe2526',   sofascoreId: 897499,  futggId: 258517 },

  // Brasileirão — Gold
  { id: 75, name: 'Arrascaeta',     pos: 'MEI', ovr: 83, pac: 78, fin: 80, pas: 84, dri: 86, def: 44, fis: 68, nat: 'URU', club: 'Flamengo',      rarity: 'gold', series: 'brasileirao26', sofascoreId: 130819,  futggId: 220429 },
  { id: 76, name: 'Pedro',          pos: 'CA',  ovr: 83, pac: 76, fin: 86, pas: 68, dri: 78, def: 36, fis: 82, nat: 'BRA', club: 'Flamengo',      rarity: 'gold', series: 'brasileirao26', sofascoreId: 748068, futggId: 189505 },
  { id: 77, name: 'Raphael Veiga',  pos: 'MEI', ovr: 82, pac: 76, fin: 82, pas: 82, dri: 84, def: 48, fis: 70, nat: 'BRA', club: 'Palmeiras',     rarity: 'gold', series: 'brasileirao26', sofascoreId: 490489, futggId: 250009 },
  { id: 78, name: 'Gabigol',        pos: 'CA',  ovr: 82, pac: 80, fin: 86, pas: 66, dri: 82, def: 28, fis: 74, nat: 'BRA', club: 'Cruzeiro',      rarity: 'gold', series: 'brasileirao26', sofascoreId: 219164, futggId: 212823 },
  { id: 79, name: 'Endrick',        pos: 'CA',  ovr: 80, pac: 84, fin: 82, pas: 66, dri: 82, def: 28, fis: 76, nat: 'BRA', club: 'Real Madrid',   rarity: 'gold', series: 'brasileirao26', sofascoreId: 1133590, futggId: 261141 },
  { id: 80, name: 'Dudu',           pos: 'PE',  ovr: 80, pac: 84, fin: 78, pas: 74, dri: 84, def: 36, fis: 70, nat: 'BRA', club: 'Palmeiras',     rarity: 'gold', series: 'brasileirao26', sofascoreId: 82399, futggId: 258085 },
  { id: 81, name: 'Hulk',           pos: 'CA',  ovr: 80, pac: 78, fin: 84, pas: 64, dri: 76, def: 32, fis: 88, nat: 'BRA', club: 'Atlético-MG',   rarity: 'gold', series: 'brasileirao26', sofascoreId: 34021,   futggId: 177003 },
  { id: 82, name: 'Luciano',        pos: 'CA',  ovr: 79, pac: 82, fin: 82, pas: 68, dri: 80, def: 30, fis: 76, nat: 'BRA', club: 'São Paulo',     rarity: 'gold', series: 'brasileirao26', sofascoreId: 175741, futggId: 230601 },
  { id: 83, name: 'Tiquinho Soares',pos: 'CA',  ovr: 78, pac: 80, fin: 80, pas: 65, dri: 78, def: 28, fis: 78, nat: 'BRA', club: 'Botafogo',      rarity: 'gold', series: 'brasileirao26', sofascoreId: 80547, futggId: 227476 },

  // Copa 2026 — Gold
  { id: 84, name: 'Pedri Copa',     pos: 'MC',  ovr: 84, pac: 80, fin: 74, pas: 88, dri: 90, def: 72, fis: 70, nat: 'ESP', club: 'Barcelona',     rarity: 'gold', series: 'copa2026',     sofascoreId: 889012,  futggId: 231677 },
  { id: 85, name: 'Rodri Copa',     pos: 'MC',  ovr: 84, pac: 72, fin: 68, pas: 87, dri: 85, def: 88, fis: 90, nat: 'ESP', club: 'Man City',      rarity: 'gold', series: 'copa2026',     sofascoreId: 750965,  futggId: 231866 },
  { id: 86, name: 'Bellingham Copa',pos: 'MEI', ovr: 84, pac: 83, fin: 82, pas: 85, dri: 88, def: 72, fis: 85, nat: 'ING', club: 'Real Madrid',  rarity: 'gold', series: 'copa2026',     sofascoreId: 1101557, futggId: 246669 },
  { id: 87, name: 'Hakimi Copa',    pos: 'LD',  ovr: 84, pac: 91, fin: 72, pas: 78, dri: 83, def: 78, fis: 78, nat: 'MAR', club: 'PSG',           rarity: 'gold', series: 'copa2026',     sofascoreId: 819068,  futggId: 231527 },
  { id: 88, name: 'Marquinhos Copa',pos: 'ZAG', ovr: 84, pac: 77, fin: 38, pas: 74, dri: 76, def: 84, fis: 84, nat: 'BRA', club: 'PSG',          rarity: 'gold', series: 'copa2026',     sofascoreId: 74037,   futggId: 213000 },

  // ═══════════════════════════════════════════════════════════════
  // SILVER (65-74 OVR)
  // ═══════════════════════════════════════════════════════════════

  { id: 90,  name: 'Kepa',           pos: 'GOL', ovr: 74, pac: 48, fin: 10, pas: 64, dri: 60, def: 74, fis: 70, nat: 'ESP', club: 'Real Madrid',  rarity: 'silver', series: 'europe2526',   sofascoreId: 273779,  futggId: 226012 },
  { id: 91,  name: 'Fabiański',      pos: 'GOL', ovr: 70, pac: 46, fin: 10, pas: 62, dri: 58, def: 70, fis: 68, nat: 'POL', club: 'West Ham',      rarity: 'silver', series: 'europe2526',   sofascoreId: 46460, futggId: 164835 },
  { id: 92,  name: 'D. Henderson',   pos: 'GOL', ovr: 68, pac: 52, fin: 10, pas: 60, dri: 56, def: 68, fis: 66, nat: 'ING', club: 'Nottm Forest',  rarity: 'silver', series: 'europe2526',   sofascoreId: 197040,  futggId: 233684 },
  { id: 93,  name: 'Lenglet',        pos: 'ZAG', ovr: 72, pac: 68, fin: 32, pas: 60, dri: 64, def: 74, fis: 72, nat: 'FRA', club: 'Aston Villa',   rarity: 'silver', series: 'europe2526',   sofascoreId: 240064, futggId: 220440 },
  { id: 94,  name: 'Ndicka',         pos: 'ZAG', ovr: 73, pac: 74, fin: 30, pas: 60, dri: 64, def: 74, fis: 76, nat: 'FRA', club: 'Roma',          rarity: 'silver', series: 'europe2526',   sofascoreId: 880218, futggId: 236403 },
  { id: 95,  name: 'Todibo',         pos: 'ZAG', ovr: 72, pac: 72, fin: 28, pas: 60, dri: 64, def: 74, fis: 74, nat: 'FRA', club: 'West Ham',      rarity: 'silver', series: 'europe2526',   sofascoreId: 824086,  futggId: 243173 },
  { id: 96,  name: 'Javier Guerra',  pos: 'MC',  ovr: 72, pac: 70, fin: 60, pas: 74, dri: 74, def: 60, fis: 68, nat: 'ESP', club: 'Villarreal',    rarity: 'silver', series: 'europe2526',   sofascoreId: 975009, futggId: 266436 },
  { id: 97,  name: 'Witsel',         pos: 'MC',  ovr: 73, pac: 64, fin: 58, pas: 74, dri: 72, def: 74, fis: 76, nat: 'BEL', club: 'Atlético',      rarity: 'silver', series: 'europe2526',   sofascoreId: 41099,   futggId: 183277 },
  { id: 98,  name: 'Wijnaldum',      pos: 'MC',  ovr: 72, pac: 74, fin: 60, pas: 74, dri: 76, def: 66, fis: 74, nat: 'HOL', club: 'Al-Ettifaq',    rarity: 'silver', series: 'base',         sofascoreId: 168248,  futggId: 210257 },
  { id: 99,  name: 'Aouar',          pos: 'MEI', ovr: 74, pac: 76, fin: 72, pas: 78, dri: 80, def: 50, fis: 66, nat: 'FRA', club: 'Bétis',         rarity: 'silver', series: 'europe2526',   sofascoreId: 580063,  futggId: 238190 },
  { id: 100, name: 'Luis Díaz',      pos: 'PE',  ovr: 74, pac: 88, fin: 74, pas: 70, dri: 82, def: 38, fis: 68, nat: 'COL', club: 'Liverpool',     rarity: 'silver', series: 'europe2526',   sofascoreId: 849981,  futggId: 248219 },
  { id: 101, name: 'Olise',          pos: 'PE',  ovr: 74, pac: 84, fin: 74, pas: 74, dri: 82, def: 36, fis: 68, nat: 'FRA', club: 'Bayern Munich', rarity: 'silver', series: 'europe2526',   sofascoreId: 877283,  futggId: 252018 },
  { id: 102, name: 'Madueke',        pos: 'PD',  ovr: 73, pac: 85, fin: 74, pas: 70, dri: 80, def: 32, fis: 68, nat: 'ING', club: 'Chelsea',       rarity: 'silver', series: 'europe2526',   sofascoreId: 942498,  futggId: 252017 },
  { id: 103, name: 'Toney',          pos: 'CA',  ovr: 74, pac: 72, fin: 78, pas: 64, dri: 72, def: 34, fis: 82, nat: 'ING', club: 'Al-Ahli',       rarity: 'silver', series: 'base',         sofascoreId: 413819,  futggId: 241590 },
  { id: 104, name: 'Balogun',        pos: 'CA',  ovr: 73, pac: 80, fin: 76, pas: 62, dri: 74, def: 30, fis: 74, nat: 'EUA', club: 'Monaco',        rarity: 'silver', series: 'europe2526',   sofascoreId: 842706,  futggId: 255892 },
  { id: 105, name: 'Nusa',           pos: 'PE',  ovr: 74, pac: 90, fin: 74, pas: 72, dri: 82, def: 34, fis: 68, nat: 'NOR', club: 'Club Brugge',   rarity: 'silver', series: 'europe2526',   sofascoreId: 1017697, futggId: 266392 },
  { id: 106, name: 'Jonathan David', pos: 'CA',  ovr: 74, pac: 84, fin: 80, pas: 66, dri: 76, def: 28, fis: 74, nat: 'CAN', club: 'Inter',         rarity: 'silver', series: 'europe2526',   sofascoreId: 691718,  futggId: 245020 },
  { id: 107, name: 'Zaire-Emery',    pos: 'MC',  ovr: 74, pac: 78, fin: 64, pas: 80, dri: 82, def: 64, fis: 72, nat: 'FRA', club: 'PSG',           rarity: 'silver', series: 'europe2526',   sofascoreId: 970473,  futggId: 262004 },
  { id: 108, name: 'Doku',           pos: 'PE',  ovr: 74, pac: 94, fin: 72, pas: 70, dri: 84, def: 36, fis: 68, nat: 'BEL', club: 'Man City',      rarity: 'silver', series: 'europe2526',   sofascoreId: 912025,  futggId: 253012 },
  { id: 109, name: 'Frimpong',       pos: 'LD',  ovr: 74, pac: 92, fin: 68, pas: 72, dri: 80, def: 70, fis: 74, nat: 'HOL', club: 'Leverkusen',    rarity: 'silver', series: 'europe2526',   sofascoreId: 790854,  futggId: 240704 },

  // ═══════════════════════════════════════════════════════════════
  // BRONZE (55-64 OVR)
  // ═══════════════════════════════════════════════════════════════

  { id: 120, name: 'Carabott',       pos: 'GOL', ovr: 62, pac: 44, fin: 8,  pas: 56, dri: 50, def: 62, fis: 60, nat: 'MLT', club: 'Hibernians',    rarity: 'bronze', series: 'base' },
  { id: 121, name: 'Flores',         pos: 'GOL', ovr: 60, pac: 42, fin: 8,  pas: 54, dri: 48, def: 60, fis: 58, nat: 'CHI', club: 'Univ. Chile',   rarity: 'bronze', series: 'base',         sofascoreId: 205428, futggId: 259717 },
  { id: 122, name: 'Araújo Jr',      pos: 'ZAG', ovr: 63, pac: 65, fin: 26, pas: 52, dri: 58, def: 64, fis: 66, nat: 'BRA', club: 'Madureira',     rarity: 'bronze', series: 'brasileirao26' },
  { id: 123, name: 'Ferreira',       pos: 'ZAG', ovr: 61, pac: 62, fin: 24, pas: 50, dri: 56, def: 62, fis: 64, nat: 'BRA', club: 'Criciúma',      rarity: 'bronze', series: 'brasileirao26' },
  { id: 124, name: 'Palmieri',       pos: 'LE',  ovr: 64, pac: 72, fin: 50, pas: 64, dri: 66, def: 60, fis: 68, nat: 'ITA', club: 'Lyon',          rarity: 'bronze', series: 'europe2526',   sofascoreId: 241695, futggId: 210736 },
  { id: 125, name: 'Lodi',           pos: 'LE',  ovr: 63, pac: 74, fin: 48, pas: 62, dri: 64, def: 58, fis: 66, nat: 'BRA', club: 'Atlético-MG',   rarity: 'bronze', series: 'brasileirao26', sofascoreId: 757717, futggId: 251573 },
  { id: 126, name: 'Gomes',          pos: 'MC',  ovr: 63, pac: 68, fin: 54, pas: 66, dri: 68, def: 58, fis: 64, nat: 'POR', club: 'Everton',       rarity: 'bronze', series: 'europe2526',   sofascoreId: 294088,  futggId: 226325 },
  { id: 127, name: 'Neves Jr',       pos: 'MC',  ovr: 62, pac: 70, fin: 54, pas: 66, dri: 68, def: 56, fis: 62, nat: 'BRA', club: 'Juventude',     rarity: 'bronze', series: 'brasileirao26', futggId: 272834 },
  { id: 128, name: 'Volland',        pos: 'CA',  ovr: 64, pac: 76, fin: 68, pas: 62, dri: 72, def: 28, fis: 70, nat: 'ALE', club: 'Monaco',        rarity: 'bronze', series: 'europe2526',   sofascoreId: 185271, futggId: 200610 },
  { id: 129, name: 'Okafor',         pos: 'CA',  ovr: 63, pac: 82, fin: 66, pas: 60, dri: 70, def: 26, fis: 70, nat: 'SUI', club: 'AC Milan',      rarity: 'bronze', series: 'europe2526',   sofascoreId: 877019,  futggId: 256392 },
  { id: 130, name: 'Soteldo',        pos: 'PE',  ovr: 63, pac: 72, fin: 66, pas: 58, dri: 74, def: 22, fis: 62, nat: 'VEN', club: 'Santos',        rarity: 'bronze', series: 'brasileirao26', sofascoreId: 846162, futggId: 233531 },
  { id: 131, name: 'Luiz Henrique',  pos: 'PE',  ovr: 64, pac: 82, fin: 64, pas: 62, dri: 72, def: 28, fis: 62, nat: 'BRA', club: 'Botafogo',      rarity: 'bronze', series: 'brasileirao26', sofascoreId: 832049,  futggId: 258219 },
  { id: 132, name: 'Zé Rafael',      pos: 'MC',  ovr: 63, pac: 68, fin: 56, pas: 68, dri: 68, def: 62, fis: 70, nat: 'BRA', club: 'Bahia',         rarity: 'bronze', series: 'brasileirao26', sofascoreId: 310143, futggId: 221933 },
  { id: 133, name: 'Léo Pereira',    pos: 'ZAG', ovr: 64, pac: 70, fin: 30, pas: 56, dri: 60, def: 66, fis: 70, nat: 'BRA', club: 'Flamengo',      rarity: 'bronze', series: 'brasileirao26', sofascoreId: 602987, futggId: 250001 },
  { id: 134, name: 'Piquerez',       pos: 'LE',  ovr: 64, pac: 78, fin: 52, pas: 64, dri: 66, def: 62, fis: 68, nat: 'URU', club: 'Palmeiras',     rarity: 'bronze', series: 'brasileirao26', sofascoreId: 821060, futggId: 239476 },
  { id: 135, name: 'Patrick',        pos: 'MC',  ovr: 62, pac: 70, fin: 56, pas: 64, dri: 66, def: 58, fis: 68, nat: 'BRA', club: 'Atlético-GO',   rarity: 'bronze', series: 'brasileirao26', futggId: 242180 },
  { id: 136, name: 'Reinaldo',       pos: 'LD',  ovr: 62, pac: 70, fin: 48, pas: 60, dri: 62, def: 60, fis: 64, nat: 'BRA', club: 'Grêmio',        rarity: 'bronze', series: 'brasileirao26', sofascoreId: 123768 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPlayerById(id) {
  return FUT_PLAYERS.find(p => p.id === id) ?? null;
}

export function getPlayersByRarity(rarity) {
  return FUT_PLAYERS.filter(p => p.rarity === rarity && p.active !== false);
}

export function getPlayersBySeries(series) {
  return FUT_PLAYERS.filter(p => p.series === series);
}

export function getPlayersByPosition(positions) {
  const posArr = Array.isArray(positions) ? positions : [positions];
  return FUT_PLAYERS.filter(p => posArr.includes(p.pos));
}

export function rarityColor(rarity) {
  switch (rarity) {
    case 'black':  return '#1a0025';
    case 'gold':   return '#b8860b';
    case 'silver': return '#708090';
    case 'bronze': return '#8B4513';
    default:       return '#555555';
  }
}

export function rarityLabel(rarity) {
  switch (rarity) {
    case 'black':  return '⬛ Mítica';
    case 'gold':   return '🥇 Ouro';
    case 'silver': return '🥈 Prata';
    case 'bronze': return '🥉 Bronze';
    default:       return rarity;
  }
}

export function positionFull(pos) {
  const map = {
    GOL: 'Goleiro', ZAG: 'Zagueiro', LD: 'Lat. Direito', LE: 'Lat. Esquerdo',
    MC: 'Meia Central', MEI: 'Meia', PE: 'Ponta Esq.', PD: 'Ponta Dir.', CA: 'Centroavante',
  };
  return map[pos] ?? pos;
}

// Compatibilidade de posições para a auto-escalação:
// define quais posições de jogador podem preencher cada slot de formação.
export const POSITION_COMPAT = {
  GOL: ['GOL'],
  ZAG: ['ZAG'],
  LD:  ['LD', 'LE'],
  LE:  ['LE', 'LD'],
  MC:  ['MC', 'MEI'],
  MEI: ['MEI', 'MC'],
  PE:  ['PE', 'PD', 'CA'],
  PD:  ['PD', 'PE', 'CA'],
  CA:  ['CA', 'PE', 'PD'],
};
