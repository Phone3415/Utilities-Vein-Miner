import { world, system, Player } from "@minecraft/server";
import { apiConfig } from "../lib/player/config";
import { apiWarn } from "../lib/player/warn";
import { borderFunctions } from "./preview";

// Stores active native timeout IDs: playerId -> runId
export const activeTimeouts = new Map<string, number>();

/** @deprecated Retained for backwards compatibility */
export const TimerTurnOff = activeTimeouts;

// Time in minutes mapped to game ticks (1 second = 20 ticks)
const timeoutTicks: Record<number, number> = {
  1: 1 * 60 * 20, // 1 minute  = 1,200 ticks
  2: 2 * 60 * 20, // 2 minutes = 2,400 ticks
  3: 5 * 60 * 20, // 5 minutes = 6,000 ticks
  4: 10 * 60 * 20, // 10 minutes = 12,000 ticks
};

export function setTurnOff(player: Player, timerIndex?: number): void {
  // Clear any existing timeout for this player
  const existingId = activeTimeouts.get(player.id);
  if (existingId !== undefined) {
    system.clearRun(existingId);
    activeTimeouts.delete(player.id);
  }

  const index = timerIndex ?? apiConfig.get(player).turnOff;

  // If index is 0 ("no" / disabled) or invalid, do not schedule a timer
  if (index === 0) return;
  const durationTicks = timeoutTicks[index];

  // Schedule a single native callback when the countdown expires
  const runId = system.runTimeout(() => {
    activeTimeouts.delete(player.id);

    if (!player.isValid) return;

    // Turn off vein miner
    const config = apiConfig.get(player);
    config.functionType = "off";
    apiConfig.set(player, config);

    // Remove any preview outline currently showing
    system.runJob(borderFunctions.remove(player));

    // Notify the player on the action bar
    apiWarn.notify(player, "warning.utilities_vein_miner:turned_off", {
      type: "action_bar",
    });
  }, durationTicks);

  activeTimeouts.set(player.id, runId);
}
