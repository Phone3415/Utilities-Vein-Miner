import {
  world,
  system,
  BlockComponentTypes,
  EquipmentSlot,
  Player,
} from "@minecraft/server";
import { autoEnableAll, worksOnlyForOres } from "../variables";
import { apiEquippable } from "../lib/player/equippable";
import { borderFunctions } from "../functions/preview";
import { setTurnOff } from "../functions/turnOffTimer";
import { getBlocks } from "../lib/block/selectArea";
import { apiBlock } from "../lib/block/apiBlock";
import { apiConfig } from "../lib/player/config";

world.afterEvents.entityHitBlock.subscribe(
  ({ damagingEntity: entity, hitBlock: block, blockFace }) => {
    if (!(entity instanceof Player)) return;
    const player = entity;
    const config = apiConfig.get(player);

    if (config.showSelection) system.runJob(borderFunctions.remove(player));

    if (!player.isSneaking) return;
    if (config.functionType == "off") return;
    if (block.typeId == "minecraft:air") return;
    if (block.typeId == "minecraft:bedrock") return;
    const tags = new Set(block.getTags());
    if (tags.has("bedrock_awakening:script_no_break")) return;
    if (block.getComponent(BlockComponentTypes.Inventory)) return;
    const blockIds = apiBlock.formatId(block.typeId);
    if (config.onlyOreLog) {
      const id = blockIds[0];
      if (
        !(id && worksOnlyForOres.has(id)) &&
        !tags.has("bedrock_awakening:ore") &&
        !tags.has("bedrock_awakening:log") &&
        !tags.has("log")
      )
        return;
    }
    const item = apiEquippable.getItemSlot(player, EquipmentSlot.Mainhand);
    if (!apiBlock.isValidDrop(player, block, item, config.cancelNoDrop)) return;

    if (config.turnOff !== 0) setTurnOff(player, config.turnOff);

    getBlocks(
      {
        type: "preview",
        player: player,
        block: block,
        blockIds: blockIds,
        blockFace,
        origin: block,
        config: config,
        item,
      },
      config.autoAll
        ? autoEnableAll.includes(blockIds[0] ?? "")
          ? "all"
          : undefined
        : undefined,
    );
  },
);
