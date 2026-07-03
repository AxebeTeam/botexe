import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

const languages: { [key: string]: any } = { ar, en };

export function t(lang: string, key: string, replacements?: { [key: string]: string | number }): string {
  const keys = key.split('.');
  let value: any = languages[lang] || languages['ar'];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') return key;

  if (replacements) {
    let result = value;
    for (const [repKey, repValue] of Object.entries(replacements)) {
      result = result.replace(`{${repKey}}`, String(repValue));
    }
    return result;
  }

  return value;
}

export function getLanguageForGuild(guildId: string | null): string {
  if (!guildId) return 'ar';
  try {
    const db = require('../database/connection').default;
    const guild = db.prepare('SELECT lang FROM guilds WHERE guild_id = ?').get(guildId);
    return guild?.lang || 'ar';
  } catch {
    return 'ar';
  }
}
