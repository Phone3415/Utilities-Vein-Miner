import { world, Block, GameMode, Player, ItemStack } from "@minecraft/server"
import { apiDeleteBlocks } from "../player/deleteBlocks"
import { blocksWithExperience, canDropNone } from "../../variables"

export const apiBlock = new class apiBlock {
  formatId(id: string): string[] {
    if(id == "unlit_redstone_torch") return ["minecraft:redstone_torch", id]
    if(id.includes("lit_")) return [id.replace("lit_", ""), id]
    return [id]
  }

  getFaceDregress(face: string): 0 | 1 | 2 | 3 | 4 | 5 {
    return facesList[face ?? "Down"] ?? 0
  }

  isValidDrop(player: Player, block: Block, item?: ItemStack, cancel = true): boolean {
    if(!cancel) return true
    if(player.getGameMode() == GameMode.Creative) return true
    if(apiDeleteBlocks.get(player).has(block.typeId)) return true
    if(canDropNone.has(block.typeId)) return true
    if(block.getTags().includes("bedrock_awakening:block_has_chance_drop")) return true
    const loot = world.getLootTableManager().generateLootFromBlock(block, item)
    return (loot?.length ?? 0) > 0
  }

  getXpRange(block: Block | undefined): [number, number] {
    if(!block) return [0, 0]

    const cache = blocksWithExperience[block.typeId]
    if(cache) return [cache[0], cache[1]]

    const tags = block.getTags().find(value => value.startsWith("bedrock_awakening:experience_drop:"))
    if(!tags) return [0, 0]

    const [min, max] = tags.replace("bedrock_awakening:experience_drop:", "").split("-").map(Number)
    if(min == undefined || max == undefined) return [0, 0]

    blocksWithExperience[block.typeId] = [min, max]
    return [min, max]
  }
}

const facesList: { [key: string]: 0 | 1 | 2 | 3 | 4 | 5 } = {
  "North": 2,
  "East": 3,
  "South": 0,
  "West": 1,
  "Up": 5,
  "Down": 4
}
