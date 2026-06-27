import { floorToPrecision, TablePrecision } from "./Money";
import { PressStrategy, PressStrategyType } from "./Strategies";

export const CRAPS_NUMBERS = [4, 5, 6, 8, 9, 10] as const;
export type CrapsNumber = typeof CRAPS_NUMBERS[number];
export const NUMBER_BET_PLACEMENT_ORDER: readonly CrapsNumber[] = [6, 8, 5, 9, 4, 10];

export type NumberBetPressResult = {
    updatedBetSize: number;
    netToBankroll: number;
    pressIncrease: number;
};

export function isCrapsNumber(value: number): value is CrapsNumber {
    return (CRAPS_NUMBERS as readonly number[]).includes(value);
}

export function numberBetUnit(number: CrapsNumber): number {
    if (number === 6 || number === 8) return 6;
    if (number === 5 || number === 9) return 5;
    return 20;
}

export function effectiveNumberBetAmount(
    plannedBet: number | null,
    number: CrapsNumber,
    avoidRounding: boolean
): number | null {
    if (plannedBet === null || plannedBet <= 0) return null;
    return avoidRounding ? ceilToNearestMultiple(plannedBet, numberBetUnit(number)) : plannedBet;
}

export function floorDownToNumberBetUnit(amount: number, number: CrapsNumber): number {
    const unit = numberBetUnit(number);
    return amount - (amount % unit);
}

export function calculateNumberBetPayoff(
    bet: number,
    number: CrapsNumber,
    precision: TablePrecision
): number {
    if (number === 4 || number === 10) return floorToPrecision(bet * 39 / 20, precision);
    if (number === 5 || number === 9) return floorToPrecision(bet * 7 / 5, precision);
    return floorToPrecision(bet * (7 / 6), precision);
}

export function applyNumberBetPress(
    avoidRounding: boolean,
    currentBet: number,
    payoff: number,
    number: CrapsNumber,
    strategy: PressStrategy
): NumberBetPressResult {
    const totalAvailable = currentBet + payoff;

    const settle = (targetBet: number): NumberBetPressResult => {
        const updatedBetSize = avoidRounding ? floorDownToNumberBetUnit(targetBet, number) : targetBet;
        return {
            updatedBetSize,
            pressIncrease: updatedBetSize - currentBet,
            netToBankroll: totalAvailable - updatedBetSize,
        };
    };

    switch (strategy.type) {
        case PressStrategyType.NO_PRESS:
            return {
                updatedBetSize: currentBet,
                pressIncrease: 0,
                netToBankroll: payoff,
            };
        case PressStrategyType.PRESS_UNTIL:
            if (strategy.target <= currentBet) {
                return {
                    updatedBetSize: currentBet,
                    pressIncrease: 0,
                    netToBankroll: payoff,
                };
            }
            return settle(Math.min(totalAvailable, strategy.target));
        case PressStrategyType.HALF_PRESS:
            return settle(currentBet + payoff / 2);
        case PressStrategyType.FULL_PRESS:
            return settle(totalAvailable);
        case PressStrategyType.POWER_PRESS: {
            const updatedBetSize = Math.max(currentBet, floorDownToNumberBetUnit(totalAvailable, number));
            return {
                updatedBetSize,
                pressIncrease: updatedBetSize - currentBet,
                netToBankroll: totalAvailable - updatedBetSize,
            };
        }
    }
}

function ceilToNearestMultiple(original: number, divisor: number): number {
    if (original % divisor === 0) return original;
    return divisor * (Math.floor(original / divisor) + 1);
}
