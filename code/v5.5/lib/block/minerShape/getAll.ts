import { functionController } from "../../../functions/controller"
import { GetBLocksInfo, getOffsetType } from "../selectArea"
import { system, Vector3 } from "@minecraft/server"
import { apiDurability } from "../../item/durability"

export const veinShapeGetAll = new class VeinShapeGetAll {
  getBlocks(info: GetBLocksInfo): void {
    const { blockIds, origin, config } = info

    const durability = apiDurability.getDurability(info.item, true)
    const maxSize = durability == Infinity || durability > config.maxSize ? config.maxSize : durability
    if(maxSize < 1) return

    const preOffsets = getOffsetType(info)

    // BFS discovers blocks in result order, so the queue doubles as the selection.
    // Once it is full, further expansion cannot change the selected prefix.
    const blocks: Vector3[] = [origin.location]
    const visited = new Set<number>()
    visited.add((origin.x << 20) ^ (origin.y << 10) ^ origin.z)

    system.runJob(function* BFS(): Generator<void> {
      for(let index = 0; index < blocks.length && blocks.length < maxSize; index++){
        const center = blocks[index]
        if(!center) continue

        for(const offset of preOffsets){
          const offsetX = center.x + offset[0], offsetY = center.y + offset[1], offsetZ = center.z + offset[2]
          const offsetKey = (offsetX << 20) ^ (offsetY << 10) ^ offsetZ

          if(visited.has(offsetKey)) continue
          // Remember rejected positions too, so other neighbors do not repeat the API read.
          visited.add(offsetKey)

          const block = origin.dimension.getBlock({x: offsetX, y: offsetY, z: offsetZ})
          if(!block) continue
          if(!blockIds.includes(block.typeId)) continue

          blocks.push(block.location)
          if(blocks.length >= maxSize) break
        }
        yield
      }

      functionController(info, blocks.slice(0, maxSize))
    }())
  }
}
