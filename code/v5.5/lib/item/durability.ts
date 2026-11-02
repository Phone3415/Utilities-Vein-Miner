import {
  world,
  ItemStack,
  EquipmentSlot,
  GameMode,
  Player,
  ItemDurabilityComponent,
} from "@minecraft/server";
import { apiEquippable } from "../player/equippable";
import { apiWarn } from "../player/warn";

export const apiDurability = new (class apiDurability {
  //Reduce Minecraft API called and possible infinite recursion.
  //Reuse data more often
  getDurability(item?: ItemStack, allowEnchant = false): number {
    const durability = item?.getComponent("durability");
    if (!durability) return Infinity;

    const remaining = durability.maxDurability - durability.damage;
    if (!allowEnchant || remaining === 0) return remaining;

    const unbreakingLevel = this.getUnbreakingLevel(item);
    if (unbreakingLevel > 0) {
      return (
        remaining + remaining / this.calculateUnbreakingChange(unbreakingLevel)
      );
    }

    return remaining;
  }

  calculateUnbreakingChange(enchantLevel: number): number {
    return 1 / (enchantLevel + 1);
  }

  getUnbreakingLevel(item?: ItemStack): number {
    return (
      item?.getComponent("enchantable")?.getEnchantment("unbreaking")?.level ??
      0
    );
  }

  //Rename for clarity and split the code so it easier to trace.
  reduceDurability(
    player: Player,
    item: ItemStack,
    damage = 1,
    noBreak = false,
  ): boolean {
    if (player.getGameMode() === GameMode.Creative) return true;

    const equippable = player.getComponent("equippable");
    if (!equippable) return false;

    const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
    if (!mainhandItem) return false;
    if (mainhandItem.typeId !== item.typeId) return false;

    const { component: durability, damage: durabilityDamage } =
      this.calculateDamage(item, damage);

    //If damage is 0, exit and don't call Minecraft API.
    if (durability === null || durabilityDamage === 0) return true;

    //Repeatedly calculated so store it in variable and reuse!
    const currentDamage = durability.damage + durabilityDamage;
    const damageExceed = currentDamage >= durability.maxDurability + 1;

    if (damageExceed) {
      if (noBreak) {
        durability.damage = durability.maxDurability;
        this.setItem(player, item);
        return true;
      }

      apiWarn.notify(player, "", { sound: "utilities_vein_miner.warn.break" });
      this.setItem(player, undefined);
      return true;
    }

    durability.damage = currentDamage;
    this.setItem(player, item);
    return true;
  }

  setItem(player: Player, item: ItemStack | undefined) {
    apiEquippable.setItem(player, item, EquipmentSlot.Mainhand);
  }

  calculateDamage(
    item: ItemStack,
    damage: number = 1,
  ): { component: ItemDurabilityComponent | null; damage: number } {
    const durability = item.getComponent("durability");
    if (!durability) return { component: null, damage: 0 };

    const unbreakingLevel = this.getUnbreakingLevel(item);
    const unbreakingChance = this.calculateUnbreakingChange(unbreakingLevel);
    damage = Math.max(Math.floor(damage * unbreakingChance), 0);

    if (damage < 1) damage = Math.random() < unbreakingChance ? 1 : 0;

    return { component: durability, damage };
  }
})();
