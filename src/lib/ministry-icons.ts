// Mapeamento de ministérios para Fluent Emoji 3D (Microsoft)
// CDN: https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/

const BASE = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets'

// Mapeamento slug → emoji unicode para URL
const MINISTRY_ICON_MAP: Record<string, string> = {
  'som': '🔊',
  'iluminacao': '💡',
  'projecao': '📽️',
  'backstage': '🚪',
  'conexao': '🤝',
  'conexao-alive': '🤝',
  'excelencia': '⭐',
  'intercessao': '🙏',
  'intercessao-alive': '🙏',
  'centurioes': '🛡️',
  'servos': '🙌',
  'fotografia-creative': '📸',
  'stories': '📱',
  'profetico': '🔥',
  'kids': '🧒',
  'ac-soccer': '⚽',
  'ac-volei': '🏐',
  'decoracao': '🎨',
  'ativadas': '👩',
  'forja': '🔨',
  'empoderadas': '👑',
  'strong-brothers': '💪',
  'alive': '⚡',
  'sala-de-cura': '💊',
  'acao-social': '❤️',
  'financas': '💰',
  'bookstore': '📚',
  'exito': '🎯',
  'evangelismo': '📢',
  'membresia': '📋',
  'louvor': '🎵',
  'ac-casais': '💑',
}

export function getMinistryIcon3D(slug: string): string {
  const emoji = MINISTRY_ICON_MAP[slug] || '⛪'
  return `${BASE}/${encodeURIComponent(emoji)}_3d.png`
}

export function getMinistryEmoji(slug: string): string {
  return MINISTRY_ICON_MAP[slug] || '⛪'
}
