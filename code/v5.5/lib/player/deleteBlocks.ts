import { Player } from "@minecraft/server";

// Use WeakMap to avoid memory leaks.
const deleteBlocksCache = new WeakMap<Player, Set<string>>();
const DELETE_BLOCKS_KEY = "utilities_vein_miner:delete_blocks";

export const apiDeleteBlocks = new (class ApiDeleteBlocks {
  allBlocks = [
    "minecraft:stone",
    "minecraft:dirt",
    "minecraft:gravel",
    "minecraft:deepslate",
    "minecraft:andesite",
    "minecraft:diorite",
    "minecraft:granite",
    "minecraft:tuff",
  ];

  get(player: Player): Set<string> {
    const cached = deleteBlocksCache.get(player);
    if (cached) return cached;

    const dynamic = player.getDynamicProperty(DELETE_BLOCKS_KEY);
    if (typeof dynamic !== "string") {
      const defaultSet = new Set<string>();
      deleteBlocksCache.set(player, defaultSet);
      return defaultSet;
    }

    try {
      const array = JSON.parse(dynamic);
      if (Array.isArray(array) && this.isValid(array)) {
        const set = new Set(array);
        deleteBlocksCache.set(player, set);
        return set;
      }
    } catch {}

    const fallbackSet = new Set(this.allBlocks);
    deleteBlocksCache.set(player, fallbackSet);
    return fallbackSet;
  }

  set(player: Player, value: string[] | Set<string>): void {
    const set = value instanceof Set ? value : new Set(value);
    const array = Array.isArray(value) ? value : [...value];

    deleteBlocksCache.set(player, set);
    player.setDynamicProperty(DELETE_BLOCKS_KEY, JSON.stringify(array));
  }

  clear(player: Player): void {
    deleteBlocksCache.delete(player);
  }

  private isValid(arr: any[]): arr is string[] {
    return Array.isArray(arr) && arr.every((value) => typeof value === "string");
  }
})();
