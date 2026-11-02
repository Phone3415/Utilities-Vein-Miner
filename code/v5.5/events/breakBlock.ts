import { world, system, BlockComponentTypes, EquipmentSlot, ItemComponentTypes } from "@minecraft/server"
import { autoEnableAll, worksOnlyForOres } from "../variables"
import { apiDeleteBlocks } from "../lib/player/deleteBlocks"
import { apiEquippable } from "../lib/player/equippable"
import { setTurnOff } from "../functions/turnOffTimer"
import { getBlocks } from "../lib/block/selectArea"
import { apiBlock } from "../lib/block/apiBlock"
import { apiConfig } from "../lib/player/config"

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  const { player, block } = ev
  if(!player.isSneaking) return

  const config = apiConfig.get(player)
  if(config.functionType == "off") return

  const blockIds = apiBlock.formatId(block.typeId)
  const tags = new Set(block.getTags())
  if(tags.has("bedrock_awakening:script_no_break")) return
  if(block.getComponent(BlockComponentTypes.Inventory)) return
  if(config.onlyOreLog){
    const id = blockIds[0]
    if(!(id && worksOnlyForOres.has(id)) && !tags.has("bedrock_awakening:ore") && !tags.has("bedrock_awakening:log") && !tags.has("log")) return
  }
  const item = apiEquippable.getItemSlot(player, EquipmentSlot.Mainhand)
  if(!apiBlock.isValidDrop(player, block, item, config.cancelNoDrop)) return

  if(apiDeleteBlocks.get(player).has(blockIds[0] ?? "")){
    const durability = item?.getComponent(ItemComponentTypes.Durability)
    if((durability?.damage ?? 0) +1 >= (durability?.maxDurability ?? 0)) return
    ev.cancel = true
    system.run(() => { block.setType("minecraft:air") })
  }

  if(config.turnOff != 0) setTurnOff(player, config.turnOff)

  const customType = config.autoAll && autoEnableAll.includes(blockIds[0] ?? "") ? "all" : undefined
  const functionType = customType ?? config.functionType
  // Vein and stair shapes do not use the viewed face.
  const needsBlockFace = functionType !== "all" && functionType !== "mining_tunnel" && functionType !== "escape_tunnel"

  getBlocks({
    type: "break",
    player,
    block,
    blockIds,
    blockFace: needsBlockFace ? player.getBlockFromViewDirection({maxDistance: 10})?.face ?? "Up" : "Up",
    origin: block,
    config,
    item,
  }, customType)
})
