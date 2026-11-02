import { system, world } from "@minecraft/server";
import { activeTimeouts } from "../functions/turnOffTimer";

// Clean up when a player leaves the server
world.beforeEvents.playerLeave.subscribe(({ player }) => {
  const existingId = activeTimeouts.get(player.id);
  if (existingId !== undefined) {
    system.clearRun(existingId);
    activeTimeouts.delete(player.id);
  }
});
