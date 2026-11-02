import { functionController } from "../../../functions/controller"
import { GetBLocksInfo, getOffsetType } from "../selectArea"
import { system, Vector3 } from "@minecraft/server"
import { defaultFaceDirection } from "../../../variables"
import { apiDurability } from "../../item/durability"
import { apiBlock } from "../apiBlock"

export const veinShapeGetTunnel = new class VeinShapeGetTunnel {
  getBlocks(info: GetBLocksInfo, sideRange: number, heightRange: number, depthRange?: number): void {
    const { blockIds, blockFace, origin, item, config } = info

    const maxWidth = Math.floor(sideRange /2)
    const maxHeight = Math.floor(heightRange /2)
    const maxDepth = depthRange ? (depthRange -1) : Infinity
    const is1x2 = heightRange == 2

    const faceDirection = apiBlock.getFaceDregress(blockFace)
    const direction = defaultFaceDirection[faceDirection]
    if(direction == undefined) return
    const isVertical = direction.y != 0

    const durability = apiDurability.getDurability(item, true)
    const maxSize = durability == Infinity || durability > config.maxSize ? config.maxSize : durability
    if(maxSize < 1) return

    const preOffsets = getOffsetType(info)

    // Cardinal directions keep the tunnel axis-aligned, so its bounds can be
    // calculated once instead of transforming each candidate into tunnel coordinates.
    const minimum = { x: origin.x - maxWidth, y: origin.y - maxHeight, z: origin.z - maxWidth }
    const maximum = { x: origin.x + maxWidth, y: origin.y + maxHeight, z: origin.z + maxWidth }
    const depthAxis = direction.x ? "x" : direction.y ? "y" : "z"
    minimum[depthAxis] = origin[depthAxis] + (direction[depthAxis] < 0 ? -maxDepth : 0)
    maximum[depthAxis] = origin[depthAxis] + (direction[depthAxis] > 0 ? maxDepth : 0)
    // A horizontal 1x2 tunnel includes the block below the origin, not above it.
    if(!isVertical && is1x2) maximum.y = origin.y

    // Only valid tunnel blocks enter this BFS queue, in selection order.
    // A full queue already contains the result; the remaining frontier need not expand.
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
          visited.add(offsetKey)

          // Check geometry before calling the engine for blocks we cannot select.
          if(offsetX < minimum.x || offsetX > maximum.x ||
             offsetY < minimum.y || offsetY > maximum.y ||
             offsetZ < minimum.z || offsetZ > maximum.z) continue

          const block = origin.dimension.getBlock({x: offsetX, y: offsetY, z: offsetZ})
          if(!block) continue
          if(!blockIds.includes(block.typeId)) continue

          blocks.push({x: offsetX, y: offsetY, z: offsetZ})
          if(blocks.length >= maxSize) break
        }
        yield
      }

      functionController(info, blocks.slice(0, maxSize))
    }())
  }
}
