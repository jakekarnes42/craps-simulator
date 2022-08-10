import { RoundingType } from "../game/RoundingType";

const humanizeDuration = require('humanize-duration');

export enum TableSpeed {
    //Table Speed <-> number of seconds per roll * milliseconds
    //These are just estimates that can be adjusted with better data
    Slow = 45 * 1000,
    Average = 30 * 1000,
    Fast = 24 * 1000
}

export function rollsToReadableDuration(numRolls: number | null, speed: TableSpeed) {
    if (numRolls == null) {
        return "N/A";
    } else {
        return humanizeDuration(speed * numRolls, { units: ["h", "m"], round: true })
    }
}


export function round(value: number, type: RoundingType): number {
    switch (type) {
        case RoundingType.DOLLAR: return Math.floor(value);
        case RoundingType.CENT: {
            var m = Number((value * 100).toPrecision(15));
            return Math.round(m) / 100;
        }
        default: throw new Error("Unexpected rounding type: " + JSON.stringify(type));

    }
}

