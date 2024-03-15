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

export function convertToTwoDecimalPlaceString(num: number) {
    return (Math.round(num * 100) / 100).toFixed(2);
}


export function calculateOddsBetAmountAvoidRounding(plannedBet: number, dont: boolean, point: number): number {
    if (!dont) {
        //Pass or come bet odds calculation
        switch (point) {
            case 4:
            case 10:
                //The payout value will be calculated as 2*bet, so we just need a whole number.
                return Math.ceil(plannedBet);
            case 5:
            case 9:
                //The payout value will be calculated as 1.5*bet, so we need a number divisble by 2
                return closestDisvisibleNumber(plannedBet, 2);
            case 6:
            case 8:
                //The payout value will be calculated as 1.2*bet, so we need a number divisble by 5
                return closestDisvisibleNumber(plannedBet, 5);
            default:
                throw new Error("Unexpected point value when calculating odds bet to avoid rounding: " + point);
        }
    } else {
        //Don't pass or don't come bet odds calculation
        switch (point) {
            case 4:
            case 10:
                //The payout value will be calculated as bet / 2, so we need a number divisble by 2
                return closestDisvisibleNumber(plannedBet, 2);
            case 5:
            case 9:
                //The payout value will be calculated as bet * 2/3, so we need a number divisble by 3
                return closestDisvisibleNumber(plannedBet, 3);
            case 6:
            case 8:
                //The payout value will be calculated as bet*5/6, so we need a number divisble by 6
                return closestDisvisibleNumber(plannedBet, 6);
            default:
                throw new Error("Unexpected point value when calculating odds bet to avoid rounding: " + point);
        }
    }
}

function closestDisvisibleNumber(original: number, divisor: number) {
    //Check if it's already divisble
    if (original % divisor === 0) {
        //This is already divisible. Just use it
        return original;
    } else {
        //Not already divisible, let's find the closet.
        const quotient = Math.floor(original / divisor);
        return divisor * (quotient + 1); // Round up to nearest multiple
    }
}
