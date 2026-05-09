import { getDB } from './db';

export interface AppSettings {
  defaultTimerMin?: number;
  fadeOutOnTimerSec: number;
  masterVolume: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  fadeOutOnTimerSec: 30,
  masterVolume: 0.7
};

const SETTINGS_KEY = 'app';

export class SettingsRepo {
  async load(): Promise<AppSettings> {
    const db = await getDB();
    const row = await db.get('settings', SETTINGS_KEY);
    if (!row) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) };
  }

  async save(patch: Partial<AppSettings>): Promise<void> {
    const db = await getDB();
    const current = await this.load();
    const merged = { ...current, ...patch };
    await db.put('settings', { key: SETTINGS_KEY, value: merged });
  }
}

export const settingsRepo = new SettingsRepo();
