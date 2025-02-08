import { calculateNumberBetAvoidRounding, calculateOddsBetAmountAvoidRounding, round } from "../util/Util";
import { Configuration } from "./Configuration";
import { BetCollection, GameState, NumberBet } from "./GameState";
import { OddsBetStrategy, OddsBetStrategyType } from "./OddsBetStrategy";
import { PressStrategy } from "./PressStrategy";
import { RoundingType } from "./RoundingType";

/**
 * The available bet types for clarity in placing/resolving. 
 * For number bets, we introduce a new type NUMBER_BET.
 */
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

/**
 * Outcomes for each resolved bet.
 */
export enum BetOutcome {
    WIN = "Win",
    LOSS = "Loss",
    PUSH = "Push"
}

/**
 * PlacedBet is used to track each newly placed bet in a single roll,
 * so that we can display it in the simulation UI if desired.
 */
export type PlacedBet = {
    type: BetType;
    bet: number;
    number?: 4 | 5 | 6 | 8 | 9 | 10;
};

/**
 * ResolvedBet is used after the roll to indicate how a particular bet
 * was resolved: Win, Loss, or Push, along with how much was paid out (if any).
 */
export type ResolvedBet = {
    placedBet: PlacedBet;
    outcome: BetOutcome;
    payout: number;
};

/**
 * RollResult is the full data returned from one roll:
 * - The state of the game before the roll
 * - Any new bets placed
 * - The roll's dice total
 * - Which bets resolved and how
 * - The resulting state of the game after resolution
 */
export type RollResult = {
    initialState: GameState;
    newBets: Array<PlacedBet>;
    placedBetState: GameState;
    roll: number;
    resolvedBets: Array<ResolvedBet>;
    resultingState: GameState;
};

/**
 * Execute a single roll of the dice:
 * 1) Place bets according to the user's strategy.
 * 2) Roll the dice.
 * 3) Resolve the outcome of all bets.
 * Returns a RollResult object containing full details.
 */
export function executeSingleRoll(initialState: GameState): RollResult {
    //First, check if the game is over. If so, do nothing.
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

    //Phase 1: Place bets (including line bets, come/don't come, odds, and number bets)
    const { placedBetState, newBets } = placeBets(initialState);

    //Phase 2: Roll the dice
    const firstDie = rollDie();
    const secondDie = rollDie();
    const roll = firstDie + secondDie;

    //Phase 3: Resolve bets
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

/**
 * Phase 1: Place bets according to the strategy:
 *  - Pass/Don't Pass if point is off
 *  - Come/Don't Come if point is on
 *  - Lay odds if configured
 *  - Place/Buy bets on the numbers 4,5,6,8,9,10
 */
function placeBets(
    initialState: GameState
): { placedBetState: GameState; newBets: Array<PlacedBet> } {
    //If we've already reached some limit, don't place new bets.
    if (initialState.limitReached() !== null) {
        return { placedBetState: initialState, newBets: [] };
    }

    let newBets: PlacedBet[] = [];
    let bankroll = initialState.bankroll;
    const pointIsOn = initialState.pointIsOn;
    const point = initialState.point;
    let currentBets = cloneBetCollection(initialState.currentBets);
    const cfg = initialState.configuration;
    const cashedOutNumbers = initialState.cashedOutNumbers ? [...initialState.cashedOutNumbers] : [];

    //1) Possibly place odds on existing line bets if point is on
    const oddsResult = placeOddsBets(initialState, bankroll, currentBets);
    bankroll = oddsResult.bankroll;
    currentBets = oddsResult.currentBets;
    newBets.push(...oddsResult.newBets);

    //2) If the point is off, place pass line or don't pass
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
        //If the point is on, place come/don't come if user config wants them
        if (
            cfg.comeBet &&
            cfg.comeBet > 0 &&
            currentBets.comeBets.length < cfg.maxComeBets &&
            canPlaceBet(bankroll, cfg.comeBet, cfg.bankrollMinimum)
        ) {
            if (bankroll >= cfg.comeBet) {
                bankroll -= cfg.comeBet;
                currentBets.comeBets.push({ bet: cfg.comeBet, odds: null, comePoint: null });
                newBets.push({ type: BetType.COME, bet: cfg.comeBet });
            }
        }
        if (
            cfg.dontComeBet &&
            cfg.dontComeBet > 0 &&
            currentBets.dontComeBets.length < cfg.maxDontComeBets &&
            canPlaceBet(bankroll, cfg.dontComeBet, cfg.bankrollMinimum)
        ) {
            if (bankroll >= cfg.dontComeBet) {
                bankroll -= cfg.dontComeBet;
                currentBets.dontComeBets.push({ bet: cfg.dontComeBet, odds: null, comePoint: null });
                newBets.push({ type: BetType.DONTCOME, bet: cfg.dontComeBet });
            }
        }
    }

    // 3) Place or maintain number bets (4,5,6,8,9,10)
    if (!pointIsOn) {
        // On a come‑out roll, only place number bets if allowed.
        if (cfg.placeNumberBetsDuringComeOut) {
            const result = placeNewNumberBetsForCycle(cfg, pointIsOn, point, cashedOutNumbers, currentBets, bankroll);
            newBets.push(...result.newBets);
            currentBets = result.currentBets;
            bankroll = result.bankroll;
        }
        // Clear out cashedOutNumbers since the table resets on come‑out.
        cashedOutNumbers.length = 0;
    } else {
        // When the point is on, do not re‐place any bet that was removed (e.g. due to press limit).
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

/**
 * Helper to place odds on pass/don't pass, come/don't come bets
 * if the user configured an odds strategy.
 */
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
    const rounding = cfg.rounding;

    //--- Pass Line Odds
    if (isPointOn && currentBets.passLineBet && currentBets.passLineBet.odds == null) {
        const strat = cfg.passBetOddsStrategy;
        if (strat.type !== OddsBetStrategyType.NONE) {
            const odds = calculateOddsBetAmount({
                controllingBetValue: currentBets.passLineBet.bet,
                strategy: strat,
                avoidRounding,
                rounding,
                dont: false,
                point
            });
            if (odds > 0 && canPlaceBet(bankroll, odds, cfg.bankrollMinimum)) {
                bankroll -= odds;
                currentBets.passLineBet = { ...currentBets.passLineBet, odds };
                newBets.push({ type: BetType.PASSLINE_ODDS, bet: odds });
            }
        }
    }

    //--- Don't Pass Odds
    if (isPointOn && currentBets.dontPassBet && currentBets.dontPassBet.odds == null) {
        const strat = cfg.dontPassBetOddsStrategy;
        if (strat.type !== OddsBetStrategyType.NONE) {
            const odds = calculateOddsBetAmount({
                controllingBetValue: currentBets.dontPassBet.bet,
                strategy: strat,
                avoidRounding,
                rounding,
                dont: true,
                point
            });
            if (odds > 0 && canPlaceBet(bankroll, odds, cfg.bankrollMinimum)) {
                bankroll -= odds;
                currentBets.dontPassBet = { ...currentBets.dontPassBet, odds };
                newBets.push({ type: BetType.DONTPASS_ODDS, bet: odds });
            }
        }
    }

    //--- Come Bet Odds
    for (const c of currentBets.comeBets) {
        if (c.comePoint != null && c.odds == null) {
            const strat = cfg.comeBetOddsStrategy;
            if (strat.type !== OddsBetStrategyType.NONE) {
                //Check if table is on or if the user wants come odds working on come-out
                if (isPointOn || cfg.comeBetOddsWorkingComeOut) {
                    const odds = calculateOddsBetAmount({
                        controllingBetValue: c.bet,
                        strategy: strat,
                        avoidRounding,
                        rounding,
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
    }

    //--- Don't Come Bet Odds
    for (const dc of currentBets.dontComeBets) {
        if (dc.comePoint != null && dc.odds == null) {
            const strat = cfg.dontComeBetOddsStrategy;
            if (strat.type !== OddsBetStrategyType.NONE) {
                if (isPointOn || cfg.dontComeBetOddsWorkingComeOut) {
                    const odds = calculateOddsBetAmount({
                        controllingBetValue: dc.bet,
                        strategy: strat,
                        avoidRounding,
                        rounding,
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
    }

    return { bankroll, currentBets, newBets };
}

/**
 * Phase 2: Compute how much we are willing to bet on the odds.
 * Checks the chosen OddsBetStrategy in the user's config (None, Set Amount, 
 * Multiplier, or Table Max).
 */
function calculateOddsBetAmount({
    controllingBetValue,
    strategy,
    avoidRounding,
    rounding,
    dont,
    point
}: {
    controllingBetValue: number;
    strategy: OddsBetStrategy;
    avoidRounding: boolean;
    rounding: RoundingType;
    dont: boolean;
    point: number;
}): number {
    switch (strategy.type) {
        case OddsBetStrategyType.NONE:
            return 0;
        case OddsBetStrategyType.SETAMOUNT:
            if (avoidRounding) {
                return calculateOddsBetAmountAvoidRounding(strategy.value, dont, point);
            }
            return round(strategy.value, rounding);
        case OddsBetStrategyType.MULTIPLIER:
            {
                const raw = controllingBetValue * strategy.value;
                if (avoidRounding) {
                    return calculateOddsBetAmountAvoidRounding(raw, dont, point);
                }
                return round(raw, rounding);
            }
        case OddsBetStrategyType.TABLEMAX:
            {
                // Standard Vegas 3-4-5x pass, typically 6x for don't
                if (dont) {
                    // 6x
                    return round(6 * controllingBetValue, rounding);
                } else {
                    switch (point) {
                        case 4:
                        case 10:
                            return round(3 * controllingBetValue, rounding);
                        case 5:
                        case 9:
                            return round(4 * controllingBetValue, rounding);
                        case 6:
                        case 8:
                            return round(5 * controllingBetValue, rounding);
                        default:
                            return 0;
                    }
                }
            }
        default:
            return 0;
    }
}

function placeNewNumberBetsForCycle(
    cfg: Configuration,
    pointIsOn: boolean,
    point: number,
    cashedOutNumbers: Array<4 | 5 | 6 | 8 | 9 | 10>,
    currentBets: BetCollection,
    bankroll: number,
    skipIfCashedOut: boolean = false
): { newBets: PlacedBet[]; currentBets: BetCollection; bankroll: number } {
    let newBets: PlacedBet[] = [];
    const numberConfigs: Array<{ number: 4 | 5 | 6 | 8 | 9 | 10; amount: number | null }> = [
        { number: 6, amount: cfg.numberBet6 },
        { number: 8, amount: cfg.numberBet8 },
        { number: 5, amount: cfg.numberBet5 },
        { number: 9, amount: cfg.numberBet9 },
        { number: 4, amount: cfg.numberBet4 },
        { number: 10, amount: cfg.numberBet10 },
    ];

    for (const { number, amount } of numberConfigs) {
        if (!amount || amount <= 0) continue;
        // If the configuration says to omit a bet when the number equals the point, skip it.
        if (cfg.omitNumberBetOnPoint && pointIsOn && point === number) continue;
        // If we are skipping replacement for cashed‑out bets, then skip numbers that were just cashed out.
        if (skipIfCashedOut && cashedOutNumbers.includes(number)) continue;
        // If a bet on this number already exists, skip.
        const existing = currentBets.numberBets.find((nb) => nb.number === number);
        if (existing) continue;

        let amountWithRounding = amount;
        if (cfg.avoidRounding) {
            amountWithRounding = calculateNumberBetAvoidRounding(amount, number);
        }
        if (canPlaceBet(bankroll, amountWithRounding, cfg.bankrollMinimum)) {
            bankroll -= amountWithRounding;
            currentBets.numberBets.push({ number, wager: amountWithRounding, winCount: 0 });
            newBets.push({ type: BetType.NUMBER_BET, bet: amountWithRounding, number });
        }
    }
    return { newBets, currentBets, bankroll };
}

/**
 * Phase 3: Resolve bets after the roll:
 *  1) Resolve line bets (pass/don't pass) and come/don't come
 *  2) Resolve any number bets if they are "working"
 *  3) Update point as needed
 */
function resolveBets(
    placedBetState: GameState,
    roll: number
): { resultingState: GameState; resolvedBets: Array<ResolvedBet> } {
    let bankroll = placedBetState.bankroll;
    let currentBets = cloneBetCollection(placedBetState.currentBets);
    let { pointIsOn, point } = placedBetState;
    const cfg = placedBetState.configuration;

    let resolvedBets: ResolvedBet[] = [];

    //--- Resolve pass/don't pass, come/don't come
    const lineResult = resolveLineAndComeBets(
        placedBetState,
        roll,
        bankroll,
        currentBets,
        pointIsOn,
        point,
        resolvedBets
    );
    bankroll = lineResult.bankroll;
    currentBets = lineResult.currentBets;
    pointIsOn = lineResult.pointIsOn;
    point = lineResult.point;
    // Instead of reassigning resolvedBets, we push...
    resolvedBets.push(...lineResult.resolvedBets);

    let cashedOutNumbers = [...placedBetState.cashedOutNumbers];

    // Resolve Number Bets
    if (pointIsOn) {
        // When point is on, always resolve number bets.
        const numberResult = resolveNumberBets(roll, bankroll, currentBets, resolvedBets, cfg);
        bankroll = numberResult.bankroll;
        currentBets = numberResult.currentBets;
        resolvedBets = numberResult.resolvedBets;
        cashedOutNumbers = [...numberResult.cashedOut];
    } else {
        // On come‑out roll:
        if (cfg.leaveNumberBetsWorkingDuringComeOut) {
            const numberResult = resolveNumberBets(roll, bankroll, currentBets, resolvedBets, cfg);
            bankroll = numberResult.bankroll;
            currentBets = numberResult.currentBets;
            resolvedBets = numberResult.resolvedBets;
            cashedOutNumbers = [...numberResult.cashedOut];
        } else {
            // Bets are off during the come‑out roll:
            // Do nothing with them — the bets remain on the table unchanged,
            // and they are not resolved (i.e. no win/loss is recorded, bankroll remains unchanged).
        }
    }

    //--- Finally, update come points if needed
    let rollNum = placedBetState.rollNum + 1;

    if (pointIsOn) {
        // If we just rolled the point or a 7, turn the point off
        if (roll === point || roll === 7) {
            pointIsOn = false;
            point = 0;
        }
    } else {
        // If point is off and we rolled 4,5,6,8,9,10 => turn point on
        if ([4, 5, 6, 8, 9, 10].includes(roll)) {
            pointIsOn = true;
            point = roll;
        }
    }

    //--- Update come/don't come bets (their comePoint)
    const updatedComeBets = [];
    for (const c of currentBets.comeBets) {
        if (c.comePoint == null && [4, 5, 6, 8, 9, 10].includes(roll)) {
            c.comePoint = roll;
        }
        updatedComeBets.push({ ...c });
    }
    currentBets.comeBets = updatedComeBets;

    const updatedDontComeBets = [];
    for (const dc of currentBets.dontComeBets) {
        if (dc.comePoint == null && [4, 5, 6, 8, 9, 10].includes(roll)) {
            dc.comePoint = roll;
        }
        updatedDontComeBets.push({ ...dc });
    }
    currentBets.dontComeBets = updatedDontComeBets;

    //--- Build the resulting game state
    const resultingState = new GameState({
        configuration: cfg,
        bankroll,
        currentBets,
        rollNum,
        pointIsOn,
        point,
        cashedOutNumbers,
    });

    return { resultingState, resolvedBets };
}

/**
 * Resolve pass/don't pass, come/don't come bets, updating the bankroll
 * and removing winning/losing bets from the table.
 */
function resolveLineAndComeBets(
    placedBetState: GameState,
    roll: number,
    bankroll: number,
    currentBets: BetCollection,
    pointIsOn: boolean,
    point: number,
    incomingResolvedBets: ResolvedBet[]
): {
    bankroll: number;
    currentBets: BetCollection;
    pointIsOn: boolean;
    point: number;
    resolvedBets: ResolvedBet[];
} {
    // We append new resolved bets to a local array, 
    // then return that array so the caller can handle merging
    let resolvedBets: ResolvedBet[] = [];

    //--- Pass Line
    if (currentBets.passLineBet) {
        const pl = currentBets.passLineBet;
        if (pointIsOn) {
            // If roll = point => pass wins. If roll=7 => pass loses
            if (roll === point) {
                // Base bet
                bankroll += pl.bet; // winnings
                bankroll += pl.bet; // original
                resolvedBets.push({
                    placedBet: { type: BetType.PASSLINE, bet: pl.bet },
                    outcome: BetOutcome.WIN,
                    payout: pl.bet
                });
                // Odds
                if (pl.odds) {
                    let payout = passLineOddsPayout(point, pl.odds, placedBetState.configuration.rounding);
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
                // lose
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
            // come-out roll
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

    //--- Come Bets
    const updatedComeBets = [];
    for (const c of currentBets.comeBets) {
        if (c.comePoint != null) {
            // come point established
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
                        let payout = passLineOddsPayout(c.comePoint, c.odds, placedBetState.configuration.rounding);
                        bankroll += payout;
                        bankroll += c.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.COME_ODDS, bet: c.odds },
                            outcome: BetOutcome.WIN,
                            payout
                        });
                    } else {
                        // if odds are off, push
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
            // come-out for the come bet
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

    //--- Don't Pass
    if (currentBets.dontPassBet) {
        const dp = currentBets.dontPassBet;
        if (pointIsOn) {
            if (roll === 7) {
                // don't pass wins
                bankroll += dp.bet;
                bankroll += dp.bet;
                resolvedBets.push({
                    placedBet: { type: BetType.DONTPASS, bet: dp.bet },
                    outcome: BetOutcome.WIN,
                    payout: dp.bet
                });
                if (dp.odds) {
                    const payoff = dontPassOddsPayout(point, dp.odds, placedBetState.configuration.rounding);
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
                // lose
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
            // come-out
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
                // push
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

    //--- Don't Come
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
                        const payoff = dontPassOddsPayout(dc.comePoint, dc.odds, placedBetState.configuration.rounding);
                        bankroll += payoff;
                        bankroll += dc.odds;
                        resolvedBets.push({
                            placedBet: { type: BetType.DONTCOME_ODDS, bet: dc.odds },
                            outcome: BetOutcome.WIN,
                            payout: payoff
                        });
                    } else {
                        // push
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
            // come-out for don't come
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
                // push
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

/**
 * Resolve any placed number bets (4,5,6,8,9,10).
 * Standard Vegas approach:
 *  - 4/10: buy bet once $20 or above; 2:1 payoff minus 5% vig on the bet, only if it wins
 *    if under $20, place bet pays 9:5
 *  - 5/9: place pays 7:5
 *  - 6/8: place pays 7:6
 * If roll=7 => all lose. 
 */
function resolveNumberBets(
    roll: number,
    bankroll: number,
    currentBets: BetCollection,
    resolvedBets: ResolvedBet[],
    cfg: Configuration
): { bankroll: number; currentBets: BetCollection; resolvedBets: ResolvedBet[], cashedOut: Array<4 | 5 | 6 | 8 | 9 | 10> } {
    const cashedOut: Array<4 | 5 | 6 | 8 | 9 | 10> = [];

    // On a 7, all number bets lose.
    if (roll === 7) {
        for (const nb of currentBets.numberBets) {
            resolvedBets.push({
                placedBet: { type: BetType.NUMBER_BET, bet: nb.wager, number: nb.number },
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
            // The bet won:
            // 1) calculate payoff based on standard place/buy rules
            const payoff = calculateNumberBetPayoff(nb.wager, nb.number, cfg.rounding);

            // 2) apply press strategy to see how much goes back onto the bet
            const { updatedBetSize, netToBankroll } = applyPressStrategy(
                nb.wager,
                payoff,
                nb.number,
                cfg.pressStrategy
            );

            // 3) Add leftover portion to bankroll
            bankroll += netToBankroll;

            // 4) increment the bet’s consecutive‐wins count
            nb.winCount++;

            // 5) check pressLimit to see if we remove it
            if (cfg.pressLimit !== null && nb.winCount >= cfg.pressLimit) {
                // Reached the limit => remove the bet from the table
                // Typically you get the entire final bet back if you remove it
                bankroll += updatedBetSize;

                resolvedBets.push({
                    placedBet: { type: BetType.NUMBER_BET, bet: nb.wager, number: nb.number },
                    outcome: BetOutcome.WIN,
                    payout: payoff,
                });

                cashedOut.push(nb.number);
            } else {
                // Remain on the table pressed up
                nb.wager = updatedBetSize;

                resolvedBets.push({
                    placedBet: { type: BetType.NUMBER_BET, bet: nb.wager, number: nb.number },
                    outcome: BetOutcome.WIN,
                    payout: payoff,
                });

                updatedNumberBets.push(nb);
            }
        } else {
            // Not a winning roll => just keep the bet as is
            updatedNumberBets.push(nb);
        }
    }
    currentBets.numberBets = updatedNumberBets;
    return { bankroll, currentBets, resolvedBets, cashedOut };
}

/**
 * Applies the chosen press strategy to a winning number bet. 
 * 
 * @param currentBet   The bet size prior to this win
 * @param payoff       The amount won on this roll
 * @param number       4,5,6,8,9,10
 * @param strategy     NO_PRESS, HALF_PRESS, FULL_PRESS, POWER_PRESS
 * @returns            updatedBetSize, netToBankroll
 */
function applyPressStrategy(
    currentBet: number,
    payoff: number,
    number: 4 | 5 | 6 | 8 | 9 | 10,
    strategy: PressStrategy
): { updatedBetSize: number; netToBankroll: number } {
    switch (strategy) {
        case PressStrategy.NO_PRESS:
            // All winnings to bankroll
            return {
                updatedBetSize: currentBet,
                netToBankroll: payoff
            };

        case PressStrategy.HALF_PRESS:
            // 50% of payoff to the bet; the rest to bankroll
            const half = payoff / 2;
            return {
                updatedBetSize: currentBet + half,
                netToBankroll: payoff - half
            };

        case PressStrategy.FULL_PRESS:
            // All payoff is reinvested
            return {
                updatedBetSize: currentBet + payoff,
                netToBankroll: 0
            };

        case PressStrategy.POWER_PRESS:
            // Attempt to press the entire payoff but snap to a "clean multiple"
            // so future payouts won't be fractional (and not to exceed payoff).
            const maxPossible = currentBet + payoff;
            const finalPressed = floorDownToProperUnit(maxPossible, number);
            return {
                updatedBetSize: finalPressed,
                netToBankroll: maxPossible - finalPressed
            };

        default:
            // Fallback
            return {
                updatedBetSize: currentBet,
                netToBankroll: payoff
            };
    }
}

/**
 * For "Power Press," we pick the largest multiple that doesn't exceed `amount`.
 * E.g. multiples of 6 for 6/8; multiples of 5 for 5/9; multiples of 20 or 5 for 4/10, etc.
 */
function floorDownToProperUnit(
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

/**
 * Creates a full copy of all bets. 
 * This ensures the new arrays and objects won't mutate old states.
 */
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

/**
 * Calculates the payoff for a bet on 4,5,6,8,9,10 using standard Vegas approach:
 * - For 4 or 10:
 *   - If wager >= $20, treat it like a Buy bet => 2:1 minus 5% vig on the bet if you win
 *   - If wager < $20, treat it like a Place bet => 9:5
 * - For 5 or 9: place pays 7:5
 * - For 6 or 8: place pays 7:6
 *
 * The vig is collected only if the bet wins. 
 */
function calculateNumberBetPayoff(
    wager: number,
    number: number,
    rounding: RoundingType
): number {
    switch (number) {
        case 4:
        case 10:
            if (wager >= 20) {
                //Buy bet -> 2:1 minus 5% vig on the bet
                const rawWin = wager * 2;
                // Usually at least $1 in vig, but it depends. We'll do a standard round approach
                const vig = round(0.05 * wager, rounding);
                return rawWin - vig;
            } else {
                //Place bet -> 9:5
                return round((wager * 9) / 5, rounding);
            }
        case 5:
        case 9:
            //Place bet -> 7:5
            return round((wager * 7) / 5, rounding);
        case 6:
        case 8:
            //Place bet -> 7:6
            return round((wager * 7) / 6, rounding);
        default:
            return 0;
    }
}

/**
 * Helper to compute pass line odds payout for a point (4=2:1,5=3:2,6=6:5, etc.)
 */
function passLineOddsPayout(point: number, odds: number, rounding: RoundingType): number {
    switch (point) {
        case 4:
        case 10:
            return round(2 * odds, rounding);
        case 5:
        case 9:
            return round(1.5 * odds, rounding);
        case 6:
        case 8:
            return round(1.2 * odds, rounding);
        default:
            return 0;
    }
}

/**
 * Helper to compute don't pass/don't come odds payout (4=1:2,5=2:3,6=5:6, etc.)
 */
function dontPassOddsPayout(point: number, odds: number, rounding: RoundingType): number {
    switch (point) {
        case 4:
        case 10:
            return round(odds / 2, rounding);
        case 5:
        case 9:
            return round((2 / 3) * odds, rounding);
        case 6:
        case 8:
            return round((5 / 6) * odds, rounding);
        default:
            return 0;
    }
}

/**
 * A small helper that checks if we can place a bet of size `bet`
 * given the current `bankroll`, taking the configured
 * `bankrollMinimum` into account. Returns `true` if the bet
 * can be placed without dropping below that minimum, otherwise false.
 */
function canPlaceBet(
    bankroll: number,
    bet: number,
    bankrollMinimum: number | null
): boolean {
    if (bet <= 0) return false;             // must be a positive bet
    if (bet > bankroll) return false;       // cannot exceed bankroll entirely
    if (bankrollMinimum !== null && bankrollMinimum > 0) {
        const prospective = bankroll - bet;
        if (prospective < bankrollMinimum) {
            return false; // would drop us below the configured min
        }
    }
    return true;
}

/**
 * Rolls a single six-sided die (1-6).
 */
function rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
}
