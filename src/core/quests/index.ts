import type { Quest } from "../quest.ts"
import { lostRover } from "./lost-rover.ts"

export { lostRover }

/** All quests of the library. */
export const quests: readonly Quest[] = [lostRover]
