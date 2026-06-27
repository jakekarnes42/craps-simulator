import { floorToPrecision, TablePrecision } from "./Money";
import { OddsBetStrategy, OddsBetStrategyType } from "./Strategies";

export function calculateOddsBetAmount({
    controllingBetValue,
    strategy,
    avoidRounding,
    precision,
    dont,
    point
}: {
    controllingBetValue: number;
    strategy: OddsBetStrategy;
    avoidRounding: boolean;
    precision: TablePrecision;
    dont: boolean;
    point: number;
}): number {
    switch (strategy.type) {
        case OddsBetStrategyType.NONE:
            return 0;
        case OddsBetStrategyType.SETAMOUNT:
            return avoidRounding ? calculateOddsBetAmountAvoidRounding(strategy.amount, dont, point) : floorToPrecision(strategy.amount, precision);
        case OddsBetStrategyType.MULTIPLIER: {
            const raw = controllingBetValue * strategy.multiplier;
            return avoidRounding ? calculateOddsBetAmountAvoidRounding(raw, dont, point) : floorToPrecision(raw, precision);
        }
        case OddsBetStrategyType.TABLEMAX:
            if (dont) return floorToPrecision(6 * controllingBetValue, precision);
            if (point === 4 || point === 10) return floorToPrecision(3 * controllingBetValue, precision);
            if (point === 5 || point === 9) return floorToPrecision(4 * controllingBetValue, precision);
            if (point === 6 || point === 8) return floorToPrecision(5 * controllingBetValue, precision);
            return 0;
    }
}

export function calculateOddsBetAmountAvoidRounding(plannedBet: number, dont: boolean, point: number): number {
    if (!dont) {
        switch (point) {
            case 4:
            case 10:
                return Math.ceil(plannedBet);
            case 5:
            case 9:
                return ceilToNearestMultiple(plannedBet, 2);
            case 6:
            case 8:
                return ceilToNearestMultiple(plannedBet, 5);
            default:
                throw new Error("Unexpected point value when calculating odds bet to avoid rounding: " + point);
        }
    }

    switch (point) {
        case 4:
        case 10:
            return ceilToNearestMultiple(plannedBet, 2);
        case 5:
        case 9:
            return ceilToNearestMultiple(plannedBet, 3);
        case 6:
        case 8:
            return ceilToNearestMultiple(plannedBet, 6);
        default:
            throw new Error("Unexpected point value when calculating odds bet to avoid rounding: " + point);
    }
}

export function calculatePassOddsPayout(point: number, odds: number, precision: TablePrecision): number {
    if (point === 4 || point === 10) return floorToPrecision(2 * odds, precision);
    if (point === 5 || point === 9) return floorToPrecision(1.5 * odds, precision);
    if (point === 6 || point === 8) return floorToPrecision(1.2 * odds, precision);
    return 0;
}

export function calculateDontOddsPayout(point: number, odds: number, precision: TablePrecision): number {
    if (point === 4 || point === 10) return floorToPrecision(odds / 2, precision);
    if (point === 5 || point === 9) return floorToPrecision((2 / 3) * odds, precision);
    if (point === 6 || point === 8) return floorToPrecision((5 / 6) * odds, precision);
    return 0;
}

function ceilToNearestMultiple(original: number, divisor: number) {
    if (original % divisor === 0) return original;
    return divisor * (Math.floor(original / divisor) + 1);
}
