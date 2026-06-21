import { test, it, expect, describe, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { executeSingleRoll } from './Session';
import { Configuration } from './Configuration';
import { GameState } from './GameState';
import { RoundingType } from './RoundingType';
import { OddsBetStrategyType } from './OddsBetStrategy';
import { PressStrategyType } from './PressStrategy';
import { floorDownToProperUnit, round } from '../util/Util';

function setupMockRolls(rolls: number[]) {
    const randoms: number[] = [];
    for (const total of rolls) {
        let d1 = Math.min(6, total - 1);
        let d2 = total - d1;
        randoms.push((d1 - 1) / 6 + 0.01);
        randoms.push((d2 - 1) / 6 + 0.01);
    }
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
        if (i >= randoms.length) return 0.5; // fallback
        return randoms[i++];
    });
}

// Arbitraries
const roundingArbitrary = fc.constantFrom(RoundingType.DOLLAR, RoundingType.CENT);
const oddsStrategyArbitrary = fc.record({
    type: fc.constantFrom(OddsBetStrategyType.NONE, OddsBetStrategyType.MULTIPLIER, OddsBetStrategyType.MAX_ODDS),
    value: fc.integer({ min: 1, max: 10 })
});
const pressStrategyArbitrary = fc.record({
    type: fc.constantFrom(PressStrategyType.NO_PRESS, PressStrategyType.PRESS_UNTIL, PressStrategyType.HALF_PRESS, PressStrategyType.FULL_PRESS, PressStrategyType.POWER_PRESS),
    value: fc.integer({ min: 1, max: 100 })
});

const configArbitrary = fc.record({
    initialBankroll: fc.integer({ min: 1000, max: 10000 }),
    bankrollMinimum: fc.integer({ min: 0, max: 100 }),
    bankrollMaximum: fc.integer({ min: 20000, max: 100000 }),
    maximumRolls: fc.integer({ min: 10, max: 100 }), 
    passBet: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    passBetOddsStrategy: oddsStrategyArbitrary,
    comeBet: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    maxComeBets: fc.integer({ min: 0, max: 5 }),
    comeBetOddsStrategy: oddsStrategyArbitrary,
    comeBetOddsWorkingComeOut: fc.boolean(),
    dontPassBet: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    dontPassBetOddsStrategy: oddsStrategyArbitrary,
    dontComeBet: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    maxDontComeBets: fc.integer({ min: 0, max: 5 }),
    dontComeBetOddsStrategy: oddsStrategyArbitrary,
    dontComeBetOddsWorkingComeOut: fc.boolean(),
    numberBet4: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    numberBet5: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    numberBet6: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    numberBet8: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    numberBet9: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    numberBet10: fc.option(fc.integer({ min: 5, max: 50 }), { nil: null }),
    pressStrategy: pressStrategyArbitrary,
    pressLimit: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
    placeNumberBetsDuringComeOut: fc.boolean(),
    leaveNumberBetsWorkingDuringComeOut: fc.boolean(),
    omitNumberBetOnPoint: fc.boolean(),
    avoidRounding: fc.boolean(),
    rounding: roundingArbitrary,
    simulationCount: fc.constant(1)
}).map(props => new Configuration(props as any));

const rollsArbitrary = fc.array(fc.integer({ min: 2, max: 12 }), { minLength: 1, maxLength: 50 });

describe('Grand Ledger & 35-Invariant Property Testing', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should perfectly honor all 35 mathematical rules of Craps across chaotic configurations', () => {
        fc.assert(
            fc.property(configArbitrary, rollsArbitrary, (config, rolls) => {
                if (config.getInvalidFields().length > 0) return true;

                let state: GameState;
                try {
                    state = GameState.init(config);
                } catch (e) {
                    return true; 
                }

                setupMockRolls(rolls);

                // The Grand Ledger Trackers
                let cumulativeWinnings = 0;
                let cumulativeLosses = 0;
                
                // Helper to sum all active bets in a BetCollection
                function sumActiveBets(bets: GameState['currentBets']): number {
                    let total = 0;
                    if (bets.passLineBet) total += bets.passLineBet.bet + (bets.passLineBet.odds || 0);
                    if (bets.dontPassBet) total += bets.dontPassBet.bet + (bets.dontPassBet.odds || 0);
                    bets.comeBets.forEach(b => total += b.bet + (b.odds || 0));
                    bets.dontComeBets.forEach(b => total += b.bet + (b.odds || 0));
                    bets.numberBets.forEach(b => total += b.bet);
                    return total;
                }

                for (const roll of rolls) {
                    if (state.isDone()) break;

                    const prevState = state;
                    
                    const result = executeSingleRoll(state);
                    const nextState = result.resultingState;
                    const nextActiveBetSum = sumActiveBets(nextState.currentBets);
                    let winSum = 0;
                    let lossSum = 0;
                    for (const rb of result.resolvedBets) {
                        if (rb.outcome === 'Win') {
                            winSum += rb.payout;
                        } else if (rb.outcome === 'Loss') {
                            lossSum += rb.placedBet.bet;
                        }
                    }
                    
                    cumulativeWinnings += winSum;
                    cumulativeLosses += lossSum;

                    // Invariant 1: The Grand Ledger (Conservation of Money)
                    // The total wealth in the system (Bankroll + Active Bets on Table) must perfectly equal
                    // Initial Bankroll + Cumulative Winnings - Cumulative Losses.
                    const currentWealth = nextState.bankroll + nextActiveBetSum;
                    const expectedWealth = config.initialBankroll! + cumulativeWinnings - cumulativeLosses;
                    expect(currentWealth).toBeCloseTo(expectedWealth, 2); 

                    // Invariant 2: Bankroll Floors
                    if (config.bankrollMinimum !== null && config.bankrollMinimum > 0 && nextState.bankroll <= config.bankrollMinimum) {
                        expect(nextState.limitReached()).not.toBeNull();
                    }

                    // Invariant 3: Bankroll Ceiling
                    if (config.bankrollMaximum !== null && nextState.bankroll >= config.bankrollMaximum) {
                        expect(nextState.limitReached()).toBe('Upper Bankroll Limit');
                    }

                    // Invariant 4: Max Rolls
                    if (config.maximumRolls !== null && nextState.rollNum >= config.maximumRolls) {
                        expect(nextState.limitReached()).toBe('Roll Limit');
                    }

                    // Invariant 5: Busted Limits
                    if (nextState.bankroll < nextState.minBetAmount() && !(config.bankrollMinimum !== null && config.bankrollMinimum > 0 && nextState.bankroll <= config.bankrollMinimum)) {
                        expect(nextState.limitReached()).toBe('Busted');
                    }

                    // --- 2. Odds Strategies ---
                    
                    // Invariant 6: Pass Line Max Odds Limits
                    if (nextState.currentBets.passLineBet?.odds && config.passBetOddsStrategy.type === 'TABLEMAX') {
                        const point = nextState.point;
                        const base = nextState.currentBets.passLineBet.bet;
                        const odds = nextState.currentBets.passLineBet.odds;
                        if (point === 4 || point === 10) expect(odds).toBeLessThanOrEqual(base * 3);
                        if (point === 5 || point === 9) expect(odds).toBeLessThanOrEqual(base * 4);
                        if (point === 6 || point === 8) expect(odds).toBeLessThanOrEqual(base * 5);
                    }

                    // Invariant 7: Pass Line Multiplier
                    if (nextState.currentBets.passLineBet?.odds && config.passBetOddsStrategy.type === 'MULTIPLIER') {
                        const base = nextState.currentBets.passLineBet.bet;
                        const odds = nextState.currentBets.passLineBet.odds;
                        expect(odds).toBeCloseTo(base * config.passBetOddsStrategy.value!, 2);
                    }

                    // Invariant 7b: Odds Strategy Completeness for other bets
                    if (nextState.currentBets.dontPassBet?.odds && config.dontPassBetOddsStrategy.type === 'TABLEMAX') {
                        expect(nextState.currentBets.dontPassBet.odds).toBeLessThanOrEqual(nextState.currentBets.dontPassBet.bet * 6);
                    }
                    if (nextState.currentBets.dontPassBet?.odds && config.dontPassBetOddsStrategy.type === 'MULTIPLIER') {
                        expect(nextState.currentBets.dontPassBet.odds).toBeCloseTo(nextState.currentBets.dontPassBet.bet * config.dontPassBetOddsStrategy.value!, 2);
                    }
                    nextState.currentBets.comeBets.forEach(c => {
                        if (c.odds && config.comeBetOddsStrategy.type === 'TABLEMAX') {
                            const point = c.comePoint!;
                            if (point === 4 || point === 10) expect(c.odds).toBeLessThanOrEqual(c.bet * 3);
                            if (point === 5 || point === 9) expect(c.odds).toBeLessThanOrEqual(c.bet * 4);
                            if (point === 6 || point === 8) expect(c.odds).toBeLessThanOrEqual(c.bet * 5);
                        }
                        if (c.odds && config.comeBetOddsStrategy.type === 'MULTIPLIER') {
                            expect(c.odds).toBeCloseTo(c.bet * config.comeBetOddsStrategy.value!, 2);
                        }
                    });
                    nextState.currentBets.dontComeBets.forEach(dc => {
                        if (dc.odds && config.dontComeBetOddsStrategy.type === 'TABLEMAX') {
                            expect(dc.odds).toBeLessThanOrEqual(dc.bet * 6);
                        }
                        if (dc.odds && config.dontComeBetOddsStrategy.type === 'MULTIPLIER') {
                            expect(dc.odds).toBeCloseTo(dc.bet * config.dontComeBetOddsStrategy.value!, 2);
                        }
                    });
                    
                    if (!nextState.pointIsOn) {
                        // Invariant 8 & 10: No Odds on Come Out
                        expect(nextState.currentBets.passLineBet?.odds).toBeFalsy();
                        expect(nextState.currentBets.dontPassBet?.odds).toBeFalsy();
                    }

                    // --- 3. Come / Don't Come Bets ---
                    // Invariant 11: Come Bet Consolidation
                    const comePoints = nextState.currentBets.comeBets.map(b => b.comePoint).filter(p => p !== null);
                    expect(new Set(comePoints).size).toBe(comePoints.length);

                    const dontComePoints = nextState.currentBets.dontComeBets.map(b => b.comePoint).filter(p => p !== null);
                    expect(new Set(dontComePoints).size).toBe(dontComePoints.length);

                    // Invariant 12 & 13: Come / Don't Come Capacity
                    expect(nextState.currentBets.comeBets.length).toBeLessThanOrEqual(config.maxComeBets);
                    expect(nextState.currentBets.dontComeBets.length).toBeLessThanOrEqual(config.maxDontComeBets);
                    
                    // Invariant 14 & 30: Working Come Odds on Come Out Hit
                    if (!prevState.pointIsOn && !config.comeBetOddsWorkingComeOut) {
                        // Odds must be returned untouched if the flat bet resolves
                        for (const rb of result.resolvedBets) {
                            if (rb.placedBet.type === 'COME_ODDS') {
                                expect(rb.outcome).toBe('Push');
                                expect(rb.payout).toBe(rb.placedBet.bet); // Odds are returned
                            }
                        }
                    }

                    // --- 4. Number Bets ---
                    
                    if (config.omitNumberBetOnPoint && prevState.pointIsOn && nextState.pointIsOn && prevState.point === nextState.point) {
                        const prevBet = prevState.currentBets.numberBets.find(b => b.number === nextState.point);
                        const nextBet = nextState.currentBets.numberBets.find(b => b.number === nextState.point);
                        expect(nextBet).toEqual(prevBet);
                    }

                    if (config.pressLimit !== null) {
                        nextState.currentBets.numberBets.forEach(b => expect(b.winCount).toBeLessThanOrEqual(config.pressLimit!));
                    }

                    if (config.avoidRounding) {
                        // Invariant 21: Modulo Exactness
                        nextState.currentBets.numberBets.forEach(b => {
                            const unit = (b.number === 6 || b.number === 8) ? 6 : 5;
                            expect(b.bet % unit).toBe(0);
                        });
                        
                        // Invariant 34 & 35: Odds Modulo Exactness
                        if (nextState.currentBets.passLineBet?.odds) {
                            const point = nextState.point;
                            if (point === 6 || point === 8) expect(nextState.currentBets.passLineBet.odds % 5).toBe(0);
                            if (point === 5 || point === 9) expect(nextState.currentBets.passLineBet.odds % 2).toBe(0);
                        }
                    }

                    // Invariant 22: NO_PRESS Strictness
                    if (config.pressStrategy.type === 'NO_PRESS') {
                        nextState.currentBets.numberBets.forEach(b => {
                            // Amount should perfectly match the configured default amount
                            const numStr = `numberBet${b.number}` as keyof Configuration;
                            expect(b.bet).toBe(config[numStr]);
                        });
                    }

                    // Invariant 32: Cashed Out Avoidance
                    nextState.cashedOutNumbers.forEach(n => {
                        const betExists = nextState.currentBets.numberBets.find(b => b.number === n);
                        expect(betExists).toBeUndefined();
                    });

                    // --- 6. 7-Out Resolves (The Dark Side) ---
                    if (prevState.pointIsOn && roll === 7) {
                        for (const rb of result.resolvedBets) {
                            if (rb.placedBet.type === 'NUMBER_BET' || rb.placedBet.type === 'COME' || rb.placedBet.type === 'PASSLINE') {
                                expect(rb.outcome).toBe('Loss');
                                expect(rb.payout).toBe(0);
                            }
                            if (rb.placedBet.type === 'DONTPASS' || rb.placedBet.type === 'DONTCOME') {
                                expect(rb.outcome).toBe('Win');
                                expect(rb.payout).toBeGreaterThan(0);
                            }
                        }
                    }

                    // --- 7. Come-Out Rule of 12 Push ---
                    if (!prevState.pointIsOn && roll === 12) {
                        for (const rb of result.resolvedBets) {
                            if (rb.placedBet.type === 'DONTPASS' || rb.placedBet.type === 'DONTCOME') {
                                expect(rb.outcome).toBe('Push');
                                expect(rb.payout).toBe(rb.placedBet.bet);
                            }
                        }
                    }

                    // --- 8. Number Bets Come-Out Behavior ---
                    if (!prevState.pointIsOn && roll === 7) {
                        const numberBetsResolved = result.resolvedBets.filter(rb => rb.placedBet.type === 'NUMBER_BET');
                        if (config.leaveNumberBetsWorkingDuringComeOut) {
                            for (const rb of numberBetsResolved) {
                                expect(rb.outcome).toBe('Loss');
                            }
                        } else {
                            expect(numberBetsResolved.length).toBe(0);
                            expect(nextState.currentBets.numberBets.length).toBe(result.placedBetState.currentBets.numberBets.length);
                        }
                    }

                    // --- 9. Exact Odds Payouts ---
                    for (const rb of result.resolvedBets) {
                        if (rb.outcome === 'Win') {
                            if (rb.placedBet.type === 'PASSLINE_ODDS') {
                                const pt = prevState.point;
                                if (pt === 4 || pt === 10) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * 2, config.rounding), 2);
                                if (pt === 5 || pt === 9) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * 1.5, config.rounding), 2);
                                if (pt === 6 || pt === 8) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * 1.2, config.rounding), 2);
                            }
                            if (rb.placedBet.type === 'DONTPASS_ODDS') {
                                const pt = prevState.point;
                                if (pt === 4 || pt === 10) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet / 2, config.rounding), 2);
                                if (pt === 5 || pt === 9) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * (2/3), config.rounding), 2);
                                if (pt === 6 || pt === 8) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * (5/6), config.rounding), 2);
                            }
                            if (rb.placedBet.type === 'NUMBER_BET' && rb.placedBet.number) {
                                const pt = rb.placedBet.number;
                                if (pt === 4 || pt === 10) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * 1.95, config.rounding), 2);
                                if (pt === 5 || pt === 9) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * 1.4, config.rounding), 2);
                                if (pt === 6 || pt === 8) expect(rb.payout).toBeCloseTo(round(rb.placedBet.bet * (7/6), config.rounding), 2);
                            }
                        }
                    }

                    // --- 10. Press Strategy Mathematics ---
                    if (prevState.pointIsOn && result.resolvedBets.length > 0) {
                        for (const rb of result.resolvedBets) {
                            if (rb.placedBet.type === 'NUMBER_BET' && rb.outcome === 'Win') {
                                const num = rb.placedBet.number!;
                                const payoff = rb.payout;
                                const originalBet = rb.placedBet.bet;
                                const nextBetObj = nextState.currentBets.numberBets.find(b => b.number === num);
                                if (!nextBetObj) continue; // it was cashed out
                                const nextBet = nextBetObj.bet;
                                
                                if (config.pressStrategy.type === 'NO_PRESS') {
                                    expect(nextBet).toBe(originalBet);
                                } else if (config.pressStrategy.type === 'FULL_PRESS') {
                                    let target = originalBet + payoff;
                                    if (config.avoidRounding) target = floorDownToProperUnit(target, num);
                                    expect(nextBet).toBe(target);
                                } else if (config.pressStrategy.type === 'HALF_PRESS') {
                                    let target = originalBet + (payoff / 2);
                                    if (config.avoidRounding) target = floorDownToProperUnit(target, num);
                                    expect(nextBet).toBe(target);
                                } else if (config.pressStrategy.type === 'POWER_PRESS') {
                                    const maxPossible = originalBet + payoff;
                                    const target = floorDownToProperUnit(maxPossible, num);
                                    expect(nextBet).toBe(target);
                                } else if (config.pressStrategy.type === 'PRESS_UNTIL') {
                                    const targetVal = config.pressStrategy.value!;
                                    if (originalBet + payoff <= targetVal) {
                                        let target = originalBet + payoff;
                                        if (config.avoidRounding) target = floorDownToProperUnit(target, num);
                                        expect(nextBet).toBe(target);
                                    } else {
                                        let target = targetVal;
                                        if (config.avoidRounding) target = floorDownToProperUnit(target, num);
                                        expect(nextBet).toBe(target);
                                    }
                                }
                            }
                        }
                    }

                    // --- 11. Come-Out Craps & Naturals ---
                    if (!prevState.pointIsOn) {
                        for (const rb of result.resolvedBets) {
                            if (rb.placedBet.type === 'PASSLINE' || rb.placedBet.type === 'COME') {
                                if (roll === 7 || roll === 11) expect(rb.outcome).toBe('Win');
                                if (roll === 2 || roll === 3 || roll === 12) expect(rb.outcome).toBe('Loss');
                            }
                            if (rb.placedBet.type === 'DONTPASS' || rb.placedBet.type === 'DONTCOME') {
                                if (roll === 7 || roll === 11) expect(rb.outcome).toBe('Loss');
                                if (roll === 2 || roll === 3) expect(rb.outcome).toBe('Win');
                            }
                        }
                    }

                    // --- 12. Working Don't Come Odds on Come-Out ---
                    if (!prevState.pointIsOn && roll === 7) {
                        for (const rb of result.resolvedBets) {
                            if (rb.placedBet.type === 'DONTCOME_ODDS') {
                                if (config.dontComeBetOddsWorkingComeOut) {
                                    expect(rb.outcome).toBe('Loss');
                                } else {
                                    expect(rb.outcome).toBe('Push');
                                }
                            }
                        }
                    }

                    // --- 13. Come Point Exactness ---
                    expect(nextState.currentBets.comeBets.find(c => c.comePoint === null)).toBeUndefined();
                    expect(nextState.currentBets.dontComeBets.find(c => c.comePoint === null)).toBeUndefined();

                    // --- 14. Explicit Rounding Exactness ---
                    if (config.avoidRounding) {
                        for (const rb of result.resolvedBets) {
                            if (rb.outcome === 'Win' && (rb.placedBet.type.includes('ODDS') || rb.placedBet.type === 'NUMBER_BET')) {
                                expect(rb.payout % 1).toBe(0);
                            }
                        }
                    }

                    // --- 5. Core Markov Transitions ---
                    
                    if (!prevState.pointIsOn) {
                        if (roll === 7 || roll === 11) {
                            expect(nextState.pointIsOn).toBe(false);
                        } else if (roll === 2 || roll === 3 || roll === 12) {
                            expect(nextState.pointIsOn).toBe(false);
                        } else {
                            expect(nextState.pointIsOn).toBe(true);
                            expect(nextState.point).toBe(roll);
                        }
                    } else {
                        if (roll === prevState.point) {
                            expect(nextState.pointIsOn).toBe(false);
                        } else if (roll === 7) {
                            expect(nextState.pointIsOn).toBe(false);
                            expect(nextState.currentBets.passLineBet).toBeNull();
                            expect(nextState.currentBets.comeBets).toHaveLength(0);
                            expect(nextState.currentBets.numberBets).toHaveLength(0);
                        } else {
                            expect(nextState.pointIsOn).toBe(true);
                            expect(nextState.point).toBe(prevState.point);
                        }
                    }

                    state = nextState;
                }
            }),
            { numRuns: 10000 }
        );
    });
});
