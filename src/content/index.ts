/**
 * The content library. To add a class, create a file in ./classes and add it
 * to the list below. No engine code changes are needed.
 */
import type { ClassDef } from "./types";
import fighter from "./classes/fighter";
import scout from "./classes/scout";
import mage from "./classes/mage";

export const classes: readonly ClassDef[] = [fighter, scout, mage];
