import { RoundingType } from "../game/RoundingType";

const humanizeDuration = require('humanize-duration');

export const SLOW_SECONDS_PER_ROLL = 60;
export const AVG_SECONDS_PER_ROLL = 45;
export const FAST_SECONDS_PER_ROLL = 30;

export enum TableSpeed {
    //Table Speed <-> number of seconds per roll * milliseconds
    //These are just estimates that can be adjusted with better data
    Slow = SLOW_SECONDS_PER_ROLL * 1000,
    Average = AVG_SECONDS_PER_ROLL * 1000,
    Fast = FAST_SECONDS_PER_ROLL * 1000
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
                return ceilToNearestMultiple(plannedBet, 2);
            case 6:
            case 8:
                //The payout value will be calculated as 1.2*bet, so we need a number divisble by 5
                return ceilToNearestMultiple(plannedBet, 5);
            default:
                throw new Error("Unexpected point value when calculating odds bet to avoid rounding: " + point);
        }
    } else {
        //Don't pass or don't come bet odds calculation
        switch (point) {
            case 4:
            case 10:
                //The payout value will be calculated as bet / 2, so we need a number divisble by 2
                return ceilToNearestMultiple(plannedBet, 2);
            case 5:
            case 9:
                //The payout value will be calculated as bet * 2/3, so we need a number divisble by 3
                return ceilToNearestMultiple(plannedBet, 3);
            case 6:
            case 8:
                //The payout value will be calculated as bet*5/6, so we need a number divisble by 6
                return ceilToNearestMultiple(plannedBet, 6);
            default:
                throw new Error("Unexpected point value when calculating odds bet to avoid rounding: " + point);
        }
    }
}

export function calculateNumberBetAvoidRounding(
    plannedBet: number,
    number: 4 | 5 | 6 | 8 | 9 | 10
): number {
    // If the user’s “planned bet” is zero or negative, skip.
    if (plannedBet <= 0) {
        return plannedBet;
    }

    switch (number) {
        case 4:
        case 10:
            // Always use ratio = 39/20 for 4/10 => to avoid fractional payoff, 
            // the bet must be a multiple of 20.
            return ceilToNearestMultiple(plannedBet, 20);

        case 5:
        case 9:
            // Pays 7:5 => bet must be multiple of 5
            return ceilToNearestMultiple(plannedBet, 5);

        case 6:
        case 8:
            // Pays 7:6 => bet must be multiple of 6
            return ceilToNearestMultiple(plannedBet, 6);
    }
}

function ceilToNearestMultiple(original: number, divisor: number) {
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

/**
 * For "Power Press," we pick the largest multiple that doesn't exceed `amount`.
 * E.g. multiples of 6 for 6/8; multiples of 5 for 5/9; multiples of 20 or 5 for 4/10, etc.
 */
export function floorDownToProperUnit(
    amount: number,
    number: 4 | 5 | 6 | 8 | 9 | 10
): number {
    if (number === 6 || number === 8) {
        return amount - (amount % 6);
    }
    if (number === 5 || number === 9) {
        return amount - (amount % 5);
    }
    // For 4 & 10: if >= 20 => buy bets in increments of 20, else place bet increments of 5
    if (number === 4 || number === 10) {
        if (amount >= 20) {
            return amount - (amount % 20);
        } else {
            return amount - (amount % 5);
        }
    }
    return amount;
}