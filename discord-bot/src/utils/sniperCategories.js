/**
 * Categorias do sistema de sniper de usernames — usado tanto pelo comando
 * /sniper-config quanto pelo handler do menu de seleção de thread.
 */
export const CATEGORIAS = [
  { value: 'realwordpt', label: '🇧🇷 Palavras PT',   field: 'channelRealwordPt', threadField: 'threadRealwordPt' },
  { value: 'realword',   label: '🌍 Palavras EN',    field: 'channelRealword',   threadField: 'threadRealword'   },
  { value: 'mixed',      label: '🔀 Mixed',          field: 'channelMixed',      threadField: 'threadMixed'      },
  { value: 'sniper',     label: '🎯 Sniper',         field: 'channelSniper',     threadField: 'threadSniper'     },
  { value: 'numbers',    label: '🔢 Números',        field: 'channelNumbers',    threadField: 'threadNumbers'    },
];
