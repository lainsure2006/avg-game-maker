/**
 * AVG Engine - 存档系统
 * 使用 localStorage 持久化存档
 */

import type { SaveData, SerializedGameState } from './types';

const STORAGE_KEY = 'avg-engine-saves';
const STORAGE_KEY_ENDINGS = 'avg-engine-endings';
const MAX_SLOTS = 20;

export class SaveSystem {
  private saves: Map<number, SaveData> = new Map();
  /** 已解锁结局：storyId -> Set<endingId> */
  private endings: Map<string, Set<string>> = new Map();

  constructor() {
    this.loadFromStorage();
    this.loadEndings();
  }

  /** 存档 */
  save(
    slotId: number,
    serializedState: SerializedGameState,
    thumbnail: string,
    label: string
  ): void {
    const saveData: SaveData = {
      id: slotId,
      timestamp: Date.now(),
      label,
      thumbnail,
      gameState: serializedState,
    };
    this.saves.set(slotId, saveData);
    this.persist();
  }

  /** 读档 */
  load(slotId: number): SaveData | null {
    return this.saves.get(slotId) || null;
  }

  /** 删除存档 */
  delete(slotId: number): void {
    this.saves.delete(slotId);
    this.persist();
  }

  /** 获取所有存档 */
  getAll(): SaveData[] {
    return Array.from(this.saves.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /** 检查槽位是否有存档 */
  hasSlot(slotId: number): boolean {
    return this.saves.has(slotId);
  }

  /** 从 localStorage 加载 */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as SaveData[];
        this.saves = new Map(data.map(s => [s.id, s]));
      }
    } catch {
      // 数据损坏则重置
      this.saves = new Map();
    }
  }

  /** 持久化到 localStorage */
  private persist(): void {
    try {
      const data = Array.from(this.saves.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('存档存储失败:', e);
    }
  }

  /** 清空所有存档 */
  clearAll(): void {
    this.saves.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  // ========== 结局收集（按故事命名空间） ==========

  /** 解锁某个结局（重复调用安全） */
  unlockEnding(storyId: string, endingId: string): void {
    if (!this.endings.has(storyId)) {
      this.endings.set(storyId, new Set());
    }
    this.endings.get(storyId)!.add(endingId);
    this.persistEndings();
  }

  /** 获取某故事已解锁的结局 id 列表 */
  getUnlockedEndings(storyId: string): string[] {
    const set = this.endings.get(storyId);
    return set ? Array.from(set) : [];
  }

  /** 某结局是否已解锁 */
  isEndingUnlocked(storyId: string, endingId: string): boolean {
    return this.endings.get(storyId)?.has(endingId) ?? false;
  }

  /** 从 localStorage 加载结局记录 */
  private loadEndings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ENDINGS);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, string[]>;
        this.endings = new Map(
          Object.entries(data).map(([k, v]) => [k, new Set(v)])
        );
      }
    } catch {
      this.endings = new Map();
    }
  }

  /** 持久化结局记录到 localStorage */
  private persistEndings(): void {
    try {
      const data: Record<string, string[]> = {};
      this.endings.forEach((set, storyId) => {
        data[storyId] = Array.from(set);
      });
      localStorage.setItem(STORAGE_KEY_ENDINGS, JSON.stringify(data));
    } catch (e) {
      console.warn('结局记录存储失败:', e);
    }
  }
}
