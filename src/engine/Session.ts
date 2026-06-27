import { Configuration } from "./Configuration";
import { BetCollection, GameState, GameStateSnapshot, LimitReached, NumberBet } from "./GameState";
import { applyNumberBetPress, calculateNumberBetPayoff, CrapsNumber, isCrapsNumber, NUMBER_BET_PLACEMENT_ORDER } from "./NumberBets";
import { calculateDontOddsPayout, calculateOddsBetAmount, calculatePassOddsPayout } from "./OddsBets";

export enum BetType {
    PASSLINE = "Pass Line Bet",
    PASSLINE_ODDS = "Pass Line Odds Bet",
    DONTPASS = "Don't Pass Bet",
    DONTPASS_ODDS = "Don't Pass Odds Bet",
    COME = "Come Bet",
    COME_ODDS = "Come Odds Bet",
    DONTCOME = "Don't Come Bet",
    DONTCOME_ODDS = "Don't Come Odds Bet",
    NUMBER_BET = "Number Bet"
}

export enum BetOutcome {
    WIN = "Win",
    LOSS = "Loss",
    PUSH = "Push"
}

export type PlacedBet = {
    type: BetType;
    bet: number;
    number?: CrapsNumber;
};

export type ResolvedBet = {
    placedBet: PlacedBet;
    outcome: BetOutcome;
    payout: number;
};

export type RollResult = {
    initialState: GameState;
    newBets: Array<PlacedBet>;
    placedBetState: GameState;
    roll: number;
    resolvedBets: Array<ResolvedBet>;
    resultingState: GameState;
};

export type BetAttribution = Record<BetType, { wagered: number; won: number; lost: number }>;

export interface SessionAnalytics {
    finalState: GameState;
    stopReason: LimitReached;
    rollCount: number;
    maxDrawdown: number;
    betAttribution: BetAttribution;
}

export type SessionAnalyticsSnapshot = Omit<SessionAnalytics, "finalState"> & {
    finalState: GameStateSnapshot;
};

export function createEmptyBetAttribution(): BetAttribution {
    return Object.fromEntries(
        Object.values(BetType).map((type) => [type, { wagered: 0, won: 0, lost: 0 }])
    ) as BetAttribution;
}

export function executeSingleRoll(initialState: GameState): RollResult {
    if (initialState.isDone()) {
        return executeRoll(initialState, 0);
    }

    const firstDie = rollDie();
    const secondDie = rollDie();

    return executeRoll(initialState, firstDie + secondDie);
}

export function executeRoll(initialState: GameState, roll: number): RollResult {
    if (initialState.isDone()) {
        return {
            initialState,
            newBets: [],
            placedBetState: initialState,
            roll: 0,
            resolvedBets: [],
            resultingState: initialState
        };
    }

    const { placedBetState, newBets } = placeBets(initialState);
    const { resultingState, resolvedBets } = resolveBets(placedBetState, roll);

    return {
        initialState,
        newBets,
        placedBetState,
        roll,
        resolvedBets,
        resultingState
    };
}

function placeBets(
    initialState: GameState
): { placedBetState: GameState; newBets: Array<PlacedBet> } {
    if (initialState.limitReached() !== null) {
        return { placedBetState: initialState, newBets: [] };
    }

    const newBets: PlacedBet[] = [];
    let bankroll = initialState.bankroll;
    const pointIsOn = initialState.pointIsOn;
    const point = initialState.point;
    let currentBets = cloneBetCollection(initialState.currentBets);
    const cfg = initialState.configuration;
    const cashedOutNumbers = initialState.cashedOutNumbers ? [...initialState.cashedOutNumbers] : [];

    const oddsResult = placeOddsBets(initialState, bankroll, currentBets);
    bankroll = oddsResult.bankroll;
    currentBets = oddsResult.currentBets;
    newBets.push(...oddsResult.newBets);

    if (!initialState.pointIsOn) {
        if (cfg.passBet && cfg.passBet > 0 && canPlaceBet(bankroll, cfg.passBet, cfg.bankrollMinimum)) {
            bankroll -= cfg.passBet;
            currentBets.passLineBet = { bet: cfg.passBet, odds: null };
            newBets.push({ type: BetType.PASSLINE, bet: cfg.passBet });
        }
        if (cfg.dontPassBet && cfg.dontPassBet > 0 && canPlaceBet(bankroll, cfg.dontPassBet, cfg.bankrollMinimum)) {
            bankroll -= cfg.dontPassBet;
            currentBets.dontPassBet = { bet: cfg.dontPassBet, odds: null };
            newBets.push({ type: BetType.DONTPASS, bet: cfg.dontPassBet });
        }
    } else {
        if (
            cfg.comeBet &&
            cfg.comeBet > 0 &&
            currentBets.comeBets.length < cfg.maxComeBets &&
            canPlaceBet(bankroll, cfg.comeBet, cfg.bankrollMinimum)
        ) {
            bankroll -= cfg.comeBet;
            currentBets.comeBets.push({ bet: cfg.comeBet, odds: null, comePoint: null });
            newBets.push({ type: BetType.COME, bet: cfg.comeBet });
        }
        if (
            cfg.dontComeBet &&
            cfg.dontComeBet > 0 &&
            currentBets.dontComeBets.length < cfg.maxDontComeBets &&
            canPlaceBet(bankroll, cfg.dontComeBet, cfg.bankrollMinimum)
        ) {
            bankroll -= cfg.dontComeBet;
            currentBets.dontComeBets.push({ bet: cfg.dontComeBet, odds: null, comePoint: null });
            newBets.push({ type: BetType.DONTCOME, bet: cfg.dontComeBet });
        }
    }

    if (!pointIsOn) {
        if (cfg.placeNumberBetsDuringComeOut) {
            const result = placeNewNumberBetsForCycle(cfg, pointIsOn, point, cashedOutNumbers, currentBets, bankroll);
            newBets.push(...result.newBets);
            currentBets = result.currentBets;
            bankroll = result.bankroll;
        }
        cashedOutNumbers.length = 0;
    } else {
        const result = placeNewNumberBetsForCycle(cfg, pointIsOn, point, cashedOutNumbers, currentBets, bankroll, true);
        newBets.push(...result.newBets);
        currentBets = result.currentBets;
        bankroll = result.bankroll;
    }

    const placedBetState = new GameState({
        configuration: cfg,
        bankroll,
        currentBets,
        pointIsOn: initialState.pointIsOn,
        point: initialState.point,
        rollNum: initialState.rollNum,
        cashedOutNumbers,
    });

    return { placedBetState, newBets };
}

function placeOddsBets(
    initialState: GameState,
    bankroll: number,
    currentBets: BetCollection
): {
    bankroll: number;
    currentBets: BetCollection;
    newBets: PlacedBet[];
} {
    const newBets: PlacedBet[] = [];
    const cfg = initialState.configuration;
    const isPointOn = initialState.pointIsOn;
    const point = initialState.point;
    const avoidRounding = cfg.avoidRounding;
    const precision = cfg.tablePrecision;

    if (isPointOn && currentBets.passLineBet && currentBets.passLineBet.odds == null) {
        const odds = calculateOddsBetAmount({
            controllingBetValue: currentBets.passLineBet.bet,
            strategy: cfg.passBetOddsStrategy,
            avoidRounding,
            precision,
            dont: false,
            point
        });
        if (odds > 0 && canPlaceBet(bankroll, odds, cfg.bankrollMinimum)) {
            bankroll -= odds;
            currentBets.passLineBet = { ...currentBets.passLineBet, odds };
            newBets.push({ type: BetType.PASSLINE_ODDS, bet: odds });
        }
    }

    if (isPointOn && currentBets.dontPassBet && currentBets.dontPassBet.odds == null) {
        const odds = calculateOddsBetAmount({
            controllingBetValue: currentBets.dontPassBet.bet,
            strategy: cfg.dontPassBetOddsStrategy,
            avoidRounding,
            precision,
            dont: true,
            point
        });
        if (odds > 0 && canPlaceBet(bankroll, odds, cfg.bankrollMinimum)) {
            bankroll -= odds;
            currentBets.dontPassBet = { ...currentBets.dontPassBet, odds };
            newBets.push({ type: BetType.DONTPASS_ODDS, bet: odds });
        }
    }

    for (const c of currentBets.comeBets) {
        if (c.comePoint != null && c.odds == null) {
            if (isPointOn || cfg.comeBetOddsWorkingComeOut) {
                const odds = calculateOddsBetAmount({
                    controllingBetValue: c.bet,
                    strategy: cfg.comeBetOddsStrategy,
                    avoidRounding,
                    precision,
                    dont: false,
                    point: c.comePoint
                });
                if (odds > 0 && canPlaceBet(bankroll, odds, cfg.bankrollMinimum)) {
                    bankroll -= odds;
                    c.odds = odds;
                    newBets.push({ type: BetType.COME_ODDS, bet: odds });
                }
            }
        }
    }

    for (const dc of currentBets.dontComeBets) {
        if (dc.comePoint != null && dc.odds == null) {
            if (isPointOn || cfg.dontComeBetOddsWorkingComeOut) {
                const odds = calculateOddsBetAmount({
                    controllingBetValue: dc.bet,
                    strategy: cfg.dontComeBetOddsStrategy,
                    avoidRounding,
                    precision,
                    dont: true,
                    point: dc.comePoint
                });
                if (odds > 0 && canPlaceBet(bankroll, odds, cfg.bankrollMinimum)) {
                    bankroll -= odds;
                    dc.odds = odds;
                    newBets.push({ type: BetType.DONTCOME_ODDS, bet: odds });
                }
            }
        }
    }

    return { bankroll, currentBets, newBets };
}

function placeNewNumberBetsForCycle(
    cfg: Configuration,
    pointIsOn: boolean,
    point: number,
    cashedOutNumbers: CrapsNumber[],
    currentBets: BetCollection,
    bankroll: number,
    respectCashedOutNumbers: boolean = false
): { newBets: PlacedBet[]; currentBets: BetCollection; bankroll: number } {
    const newBets: PlacedBet[] = [];
    const numberConfigs = cfg.numberBetConfigurations().sort((a, b) => {
        return NUMBER_BET_PLACEMENT_ORDER.indexOf(a.number) - NUMBER_BET_PLACEMENT_ORDER.indexOf(b.number);
    });

    for (const { number, effectiveAmount, pressStrategy } of numberConfigs) {
        if (effectiveAmount === null) continue;
        if (cfg.omitNumberBetOnPoint && pointIsOn && point === number) continue;
        if (respectCashedOutNumbers && cashedOutNumbers.includes(number)) continue;
        if (currentBets.numberBets.some((nb) => nb.number === number)) continue;

        if (canPlaceBet(bankroll, effectiveAmount, cfg.bankrollMinimum)) {
            bankroll -= effectiveAmount;
            currentBets.numberBets.push({ number, bet: effectiveAmount, winCount: 0, pressStrategy });
            newBets.push({ type: BetType.NUMBER_BET, bet: effectiveAmount, number });
        }
    }
    return { newBets, currentBets, bankroll };
}

function resolveBets(
    placedBetState: GameState,
    roll: number
): { resultingState: GameState; resolvedBets: Array<ResolvedBet> } {
    let bankroll = placedBetState.bankroll;
    let currentBets = cloneBetCollection(placedBetState.currentBets);
    let { pointIsOn, point } = placedBetState;
    const cfg = placedBetState.configuration;

    let resolvedBets: ResolvedBet[] = [];

    const lineResult = resolveLineAndComeBets(
        placedBetState,
        roll,
        bankroll,
        currentBets,
        pointIsOn,
        point
    );
    bankroll = lineResult.bankroll;
    currentBets = lineResult.currentBets;
    pointIsOn = lineResult.pointIsOn;
    point = lineResult.point;
    resolvedBets.push(...lineResult.resolvedBets);

    let cashedOutNumbers = [...placedBetState.cashedOutNumbers];
    const numberBetsAreWorking = pointIsOn || cfg.leaveNumberBetsWorkingDuringComeOut;

    if (numberBetsAreWorking) {
        const numberResult = resolveNumberBets(roll, bankroll, currentBets, resolvedBets, cfg);
        bankroll = numberResult.bankroll;
        currentBets = numberResult.currentBets;
        resolvedBets = numberResult.resolvedBets;
        cashedOutNumbers = [...numberResult.cashedOut];
    }

    const rollNum = placedBetState.rollNum + 1;

    if (pointIsOn) {
        if (roll === point || roll === 7) {
            pointIsOn = false;
            point = 0;
        }
    } else {
        if (isCrapsNumber(roll)) {
            pointIsOn = true;
            point = roll;

            if (cfg.omitNumberBetOnPoint) {
                const pointBet = currentBets.numberBets.find(numberBet => numberBet.number === point);
                if (pointBet) {
                    bankroll += pointBet.bet;
                    currentBets.numberBets = currentBets.numberBets.filter(numberBet => numberBet.number !== point);
                }
            }
        }
    }

    const updatedComeBets = [];
    for (const c of currentBets.comeBets) {
        if (c.comePoint == null && isCrapsNumber(roll)) {
            c.comePoint = roll;
        }
        updatedComeBets.push({ ...c });
    }
    currentBets.comeBets = updatedComeBets;

    const updatedDontComeBets = [];
    for (const dc of currentBets.dontComeBets) {
        if (dc.comePoint == null && isCrapsNumber(roll)) {
            dc.comePoint = roll;
        }
        updatedDontComeBets.push({ ...dc });
    }
    currentBets.dontComeBets = updatedDontComeBets;

    const stopReason = placedBetState.limitReached();
    const stopReasonToCarry = stopReason === LimitReached.BUSTED ? null : stopReason;

    const resultingState = new GameState({
        configuration: cfg,
        bankroll,
        currentBets,
        rollNum,
        pointIsOn,
        point,
        cashedOutNumbers,
        stopReason: stopReasonToCarry,
    });

    return { resultingState, resolvedBets };
}

function resolveLineAndComeBets(
    placedBetState: GameState,
    roll: number,
    bankroll: number,
    currentBets: BetCollection,
    pointIsOn: boolean,
    point: number
): {
    bankroll: number;
    currentBets: BetCollection;
    pointIsOn: boolean;
    point: number;
    resolvedBets: ResolvedBet[];
} {
    const resolvedBets: ResolvedBet[] = [];

    if (currentBets.passLineBet) {
        const pl = currentBets.passLineBet;
        if (pointIsOn) {
            if (roll === point) {
                bankroll += pl.bet;
                bankroll += pl.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.PASSLINE, bet: pl.bet },
                    outcome: BetOutcome.WIN,
                    payout: pl.bet
                });
                if (pl.odds) {
                    const payout = calculatePassOddsPayout(point, pl.odds, placedBetState.configuration.tablePrecision);
                    bankroll += payout;
                    bankroll += pl.odds;
                    resolvedBets.push({
                        placedBet: { type: BetType.PASSLINE_ODDS, bet: pl.odds },
                        outcome: BetOutcome.WIN,
                        payout
                    });
                }
                currentBets.passLineBet = null;
            } else if (roll === 7) {
                resolvedBets.push({
                    placedBet: { type: BetType.PASSLINE, bet: pl.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
                if (pl.odds) {
                    resolvedBets.push({
                        placedBet: { type: BetType.PASSLINE_ODDS, bet: pl.odds },
                        outcome: BetOutcome.LOSS,
                        payout: 0
                    });
                }
                currentBets.passLineBet = null;
            }
        } else {
            if (roll === 7 || roll === 11) {
                bankroll += pl.bet;
                bankroll += pl.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.PASSLINE, bet: pl.bet },
                    outcome: BetOutcome.WIN,
                    payout: pl.bet
                });
                currentBets.passLineBet = null;
            } else if (roll === 2 || roll === 3 || roll === 12) {
                resolvedBets.push({
                    placedBet: { type: BetType.PASSLINE, bet: pl.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
                currentBets.passLineBet = null;
            }
        }
    }

    const updatedComeBets = [];
    for (const c of currentBets.comeBets) {
        if (c.comePoint != null) {
            if (roll === c.comePoint) {
                bankroll += c.bet;
                bankroll += c.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.COME, bet: c.bet },
                    outcome: BetOutcome.WIN,
                    payout: c.bet
                });
                if (c.odds) {
                    if (pointIsOn || placedBetState.configuration.comeBetOddsWorkingComeOut) {
                        const payout = calculatePassOddsPayout(c.comePoint, c.odds, placedBetState.configuration.tablePrecision);
                        bankroll += payout;
                        bankroll += c.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.COME_ODDS, bet: c.odds },
                            outcome: BetOutcome.WIN,
                            payout
                        });
                    } else {
                        bankroll += c.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.COME_ODDS, bet: c.odds },
                            outcome: BetOutcome.PUSH,
                            payout: c.odds
                        });
                    }
                }
            } else if (roll === 7) {
                resolvedBets.push({
                    placedBet: { type: BetType.COME, bet: c.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
                if (c.odds) {
                    if (pointIsOn || placedBetState.configuration.comeBetOddsWorkingComeOut) {
                        resolvedBets.push({
                            placedBet: { type: BetType.COME_ODDS, bet: c.odds },
                            outcome: BetOutcome.LOSS,
                            payout: 0
                        });
                    } else {
                        bankroll += c.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.COME_ODDS, bet: c.odds },
                            outcome: BetOutcome.PUSH,
                            payout: c.odds
                        });
                    }
                }
            } else {
                updatedComeBets.push(c);
            }
        } else {
            if (roll === 7 || roll === 11) {
                bankroll += c.bet;
                bankroll += c.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.COME, bet: c.bet },
                    outcome: BetOutcome.WIN,
                    payout: c.bet
                });
            } else if (roll === 2 || roll === 3 || roll === 12) {
                resolvedBets.push({
                    placedBet: { type: BetType.COME, bet: c.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
            } else {
                updatedComeBets.push(c);
            }
        }
    }
    currentBets.comeBets = updatedComeBets;

    if (currentBets.dontPassBet) {
        const dp = currentBets.dontPassBet;
        if (pointIsOn) {
            if (roll === 7) {
                bankroll += dp.bet;
                bankroll += dp.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTPASS, bet: dp.bet },
                    outcome: BetOutcome.WIN,
                    payout: dp.bet
                });
                if (dp.odds) {
                    const payoff = calculateDontOddsPayout(point, dp.odds, placedBetState.configuration.tablePrecision);
                    bankroll += payoff;
                    bankroll += dp.odds;
                    resolvedBets.push({
                        placedBet: { type: BetType.DONTPASS_ODDS, bet: dp.odds },
                        outcome: BetOutcome.WIN,
                        payout: payoff
                    });
                }
                currentBets.dontPassBet = null;
            } else if (roll === point) {
                resolvedBets.push({
                    placedBet: { type: BetType.DONTPASS, bet: dp.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
                if (dp.odds) {
                    resolvedBets.push({
                        placedBet: { type: BetType.DONTPASS_ODDS, bet: dp.odds },
                        outcome: BetOutcome.LOSS,
                        payout: 0
                    });
                }
                currentBets.dontPassBet = null;
            }
        } else {
            if (roll === 2 || roll === 3) {
                bankroll += dp.bet;
                bankroll += dp.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTPASS, bet: dp.bet },
                    outcome: BetOutcome.WIN,
                    payout: dp.bet
                });
                currentBets.dontPassBet = null;
            } else if (roll === 7 || roll === 11) {
                resolvedBets.push({
                    placedBet: { type: BetType.DONTPASS, bet: dp.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
                currentBets.dontPassBet = null;
            } else if (roll === 12) {
                bankroll += dp.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTPASS, bet: dp.bet },
                    outcome: BetOutcome.PUSH,
                    payout: dp.bet
                });
                currentBets.dontPassBet = null;
            }
        }
    }

    const updatedDontComeBets = [];
    for (const dc of currentBets.dontComeBets) {
        if (dc.comePoint != null) {
            if (roll === 7) {
                bankroll += dc.bet;
                bankroll += dc.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTCOME, bet: dc.bet },
                    outcome: BetOutcome.WIN,
                    payout: dc.bet
                });
                if (dc.odds) {
                    if (pointIsOn || placedBetState.configuration.dontComeBetOddsWorkingComeOut) {
                        const payoff = calculateDontOddsPayout(dc.comePoint, dc.odds, placedBetState.configuration.tablePrecision);
                        bankroll += payoff;
                        bankroll += dc.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.DONTCOME_ODDS, bet: dc.odds },
                            outcome: BetOutcome.WIN,
                            payout: payoff
                        });
                    } else {
                        bankroll += dc.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.DONTCOME_ODDS, bet: dc.odds },
                            outcome: BetOutcome.PUSH,
                            payout: dc.odds
                        });
                    }
                }
            } else if (roll === dc.comePoint) {
                resolvedBets.push({
                    placedBet: { type: BetType.DONTCOME, bet: dc.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
                if (dc.odds) {
                    if (pointIsOn || placedBetState.configuration.dontComeBetOddsWorkingComeOut) {
                        resolvedBets.push({
                            placedBet: { type: BetType.DONTCOME_ODDS, bet: dc.odds },
                            outcome: BetOutcome.LOSS,
                            payout: 0
                        });
                    } else {
                        bankroll += dc.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.DONTCOME_ODDS, bet: dc.odds },
                            outcome: BetOutcome.PUSH,
                            payout: dc.odds
                        });
                    }
                }
            } else {
                updatedDontComeBets.push(dc);
            }
        } else {
            if (roll === 2 || roll === 3) {
                bankroll += dc.bet;
                bankroll += dc.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTCOME, bet: dc.bet },
                    outcome: BetOutcome.WIN,
                    payout: dc.bet
                });
            } else if (roll === 7 || roll === 11) {
                resolvedBets.push({
                    placedBet: { type: BetType.DONTCOME, bet: dc.bet },
                    outcome: BetOutcome.LOSS,
                    payout: 0
                });
            } else if (roll === 12) {
                bankroll += dc.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTCOME, bet: dc.bet },
                    outcome: BetOutcome.PUSH,
                    payout: dc.bet
                });
            } else {
                updatedDontComeBets.push(dc);
            }
        }
    }
    currentBets.dontComeBets = updatedDontComeBets;

    return {
        bankroll,
        currentBets,
        pointIsOn,
        point,
        resolvedBets
    };
}

function resolveNumberBets(
    roll: number,
    bankroll: number,
    currentBets: BetCollection,
    resolvedBets: ResolvedBet[],
    cfg: Configuration
): { bankroll: number; currentBets: BetCollection; resolvedBets: ResolvedBet[], cashedOut: CrapsNumber[] } {
    const cashedOut: CrapsNumber[] = [];

    if (roll === 7) {
        for (const nb of currentBets.numberBets) {
            resolvedBets.push({
                placedBet: { type: BetType.NUMBER_BET, bet: nb.bet, number: nb.number },
                outcome: BetOutcome.LOSS,
                payout: 0
            });
        }
        currentBets.numberBets = [];
        return { bankroll, currentBets, resolvedBets, cashedOut };
    }

    const updatedNumberBets: NumberBet[] = [];
    for (const nb of currentBets.numberBets) {
        if (roll === nb.number) {
            const originalBet = nb.bet;
            const payoff = calculateNumberBetPayoff(originalBet, nb.number, cfg.tablePrecision);
            const { updatedBetSize, netToBankroll } = applyNumberBetPress(cfg.avoidRounding, nb.bet, payoff, nb.number, nb.pressStrategy);

            bankroll += netToBankroll;
            nb.winCount++;

            if (cfg.pressLimit !== null && nb.winCount >= cfg.pressLimit) {
                // A press-limit cashout returns the pressed-up bet and prevents replacement until the next come-out.
                bankroll += updatedBetSize;

                resolvedBets.push({
                    placedBet: { type: BetType.NUMBER_BET, bet: originalBet, number: nb.number },
                    outcome: BetOutcome.WIN,
                    payout: payoff,
                });

                cashedOut.push(nb.number);
            } else {
                nb.bet = updatedBetSize;

                resolvedBets.push({
                    placedBet: { type: BetType.NUMBER_BET, bet: originalBet, number: nb.number },
                    outcome: BetOutcome.WIN,
                    payout: payoff,
                });

                updatedNumberBets.push(nb);
            }
        } else {
            updatedNumberBets.push(nb);
        }
    }
    currentBets.numberBets = updatedNumberBets;
    return { bankroll, currentBets, resolvedBets, cashedOut };
}

function cloneBetCollection(bets: BetCollection): BetCollection {
    return {
        passLineBet: bets.passLineBet
            ? { ...bets.passLineBet }
            : null,
        dontPassBet: bets.dontPassBet
            ? { ...bets.dontPassBet }
            : null,
        comeBets: bets.comeBets.map(c => ({ ...c })),
        dontComeBets: bets.dontComeBets.map(dc => ({ ...dc })),
        numberBets: bets.numberBets.map(nb => ({ ...nb }))
    };
}

function canPlaceBet(
    bankroll: number,
    bet: number,
    bankrollMinimum: number | null
): boolean {
    if (bet <= 0) return false;
    if (bet > bankroll) return false;
    if (bankrollMinimum !== null && bankrollMinimum > 0) {
        const prospective = bankroll - bet;
        if (prospective < bankrollMinimum) return false;
    }
    return true;
}

function rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
}

