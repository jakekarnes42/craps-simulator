import { round } from "../util/Util";
import { GameState } from "./GameState";
import { OddsBetStrategy, OddsBetStrategyType } from "./OddsBetStrategy";
import { RoundingType } from "./RoundingType";


export enum BetType {
    PASSLINE = "Pass Line Bet",
    PASSLINE_ODDS = "Pass Line Odds Bet",
    DONTPASS = "Don't Pass Bet",
    DONTPASS_ODDS = "Don't Pass Odds Bet",
    COME = "Come Bet",
    COME_ODDS = "Come Odds Bet",
    DONTCOME = "Don't Come Bet",
    DONTCOME_ODDS = "Don't Come Odds Bet"
}

export enum BetOutcome {
    WIN = "Win",
    LOSS = "Loss",
    PUSH = "Push"
}

export type PlacedBet = {
    type: BetType
    bet: number
}

export type ResolvedBet = {
    placedBet: PlacedBet
    outcome: BetOutcome
    payout: number
}

export type RollResult = {
    initialState: GameState,
    newBets: Array<PlacedBet>,
    placedBetState: GameState,
    roll: number,
    resolvedBets: Array<ResolvedBet>,
    resultingState: GameState
}

export function executeSingleRoll(initialState: GameState): RollResult {
    //First, check if the game is over. If so, do nothing.
    if (initialState.isDone()) {
        return { initialState, newBets: [], placedBetState: initialState, roll: 0, resolvedBets: [], resultingState: initialState };
    }

    //Phase 1: Place bets according to configuration
    const { placedBetState, newBets } = placeBets(initialState);

    //Phase 2: Roll!
    const firstDie = rollDie();
    const secondDie = rollDie();
    const roll = firstDie + secondDie;

    //Phase 3: Resolve Bets
    const { resultingState, resolvedBets } = resolveBets(placedBetState, roll);

    return { initialState, newBets, placedBetState, roll, resolvedBets, resultingState };

};

function placeBets(initialState: GameState): { placedBetState: GameState, newBets: Array<PlacedBet> } {
    //First, check if we've already reached a limit
    if (initialState.limitReached() !== null) {
        //We're already at a limit. We don't want to add bets at this point
        return { placedBetState: initialState, newBets: [] };
    } else {
        //Haven't hit a limit. Continue to adding bets. 

        //Collect new bets
        const newBets = new Array<PlacedBet>();

        //Extract out some helpful, static values
        const configuration = initialState.configuration;
        const isPointAlreadyOn = initialState.pointIsOn;
        const existingPoint = initialState.point;
        const rounding = configuration.rounding;

        //Gather mutable state 
        let bankroll = initialState.bankroll;
        let currentBets = initialState.currentBets;

        //Check if we want to place any odds. Odds come before new bets because they have no edge. 
        //Let's destructure our current bets
        //TODO add more bet types
        let { passLineBet: existingPassLineBet, dontPassBet: existingDontPassBet, comeBets: existingComeBets, dontComeBets: existingDontComeBets } = initialState.currentBets;

        //Check if we have an existing pass line bet to see if we can lay odds
        if (existingPassLineBet) {
            //Check if the point is on or off. Can only lay odds if the point is on
            if (isPointAlreadyOn) {
                //Check if we have already laid odds.
                if (existingPassLineBet.odds === null) {
                    //Point is on. There's not an existing odds bet. We could lay odds. What's the odds strategy?
                    const passBetOddsStrategy = configuration.passBetOddsStrategy;
                    if (passBetOddsStrategy.type !== OddsBetStrategyType.NONE) {
                        //We're playing odds on the pass line. What's the amount?
                        const passBetOddsAmount = calculateOddsBetAmount({ controllingBetValue: existingPassLineBet.bet, strategy: configuration.passBetOddsStrategy, rounding, dont: false, point: existingPoint });
                        //Do we have enough to place it? 
                        if (bankroll - passBetOddsAmount >= 0) {
                            //Yes, we have enough to place the bet. Let's place it. 
                            //Deduct the bet amount from our bankroll
                            bankroll -= passBetOddsAmount;
                            //Update our current bet to add odds. 
                            currentBets = { ...currentBets, passLineBet: { bet: existingPassLineBet.bet, odds: passBetOddsAmount } };
                            //Track the newly placed bet
                            newBets.push({ type: BetType.PASSLINE_ODDS, bet: passBetOddsAmount });
                        }
                    }
                }
            }
        }

        //Check if we have an existing don't pass bet to see if we can lay odds
        if (existingDontPassBet) {
            //Check if the point is on or off. Can only lay odds if the point is on
            if (isPointAlreadyOn) {
                //Check if we have already laid odds.
                if (existingDontPassBet.odds === null) {
                    //Point is on. There's not an existing odds bet. We could lay odds. What's the odds strategy?
                    const dontPassBetOddsStrategy = configuration.dontPassBetOddsStrategy;
                    if (dontPassBetOddsStrategy.type !== OddsBetStrategyType.NONE) {
                        //We're playing odds on don't pass. What's the amount?
                        const dontPassBetOddsAmount = calculateOddsBetAmount({ controllingBetValue: existingDontPassBet.bet, strategy: configuration.dontPassBetOddsStrategy, rounding, dont: true, point: existingPoint });
                        //Do we have enough to place it? 
                        if (bankroll - dontPassBetOddsAmount >= 0) {
                            //Yes, we have enough to place the bet. Let's place it. 
                            //Deduct the bet amount from our bankroll
                            bankroll -= dontPassBetOddsAmount;
                            //Update our current bet to add odds. 
                            currentBets = { ...currentBets, dontPassBet: { bet: existingDontPassBet.bet, odds: dontPassBetOddsAmount } };
                            //Track the newly placed bet
                            newBets.push({ type: BetType.PASSLINE_ODDS, bet: dontPassBetOddsAmount });
                        }
                    }
                }
            }
        }

        //Check if we have any existing come bets that we should lay odds on
        const updatedComeBets = [];
        for (const comeBet of existingComeBets) {
            //Check if it's come point has been established
            if (comeBet.comePoint !== null) {
                //The come point is established. Check if there are already odds. 
                if (comeBet.odds === null) {
                    //No existing odds. We could lay odds. What's the odds strategy?
                    const comeBetOddsStrategy = configuration.comeBetOddsStrategy;
                    if (comeBetOddsStrategy.type !== OddsBetStrategyType.NONE) {
                        //We're playing odds on the come bet. What's the amount?
                        const comeBetOddsAmount = calculateOddsBetAmount({ controllingBetValue: comeBet.bet, strategy: configuration.comeBetOddsStrategy, rounding, dont: false, point: comeBet.comePoint });
                        //Do we have enough to place it? 
                        if (bankroll - comeBetOddsAmount >= 0) {
                            //Yes, we have enough to place the bet. Let's place it. 
                            //Deduct the bet amount from our bankroll
                            bankroll -= comeBetOddsAmount;
                            //Update our current bet to add odds. 
                            comeBet.odds = comeBetOddsAmount;
                            //Track the newly placed bet
                            newBets.push({ type: BetType.COME_ODDS, bet: comeBetOddsAmount });
                        }
                    }
                }
            }
            //Add the come bets to the array tracking the updated bets
            updatedComeBets.push({ ...comeBet });
        }
        //Update our current bets
        currentBets = { ...currentBets, comeBets: updatedComeBets };

        //Check if we have any existing don't come bets that we should lay odds on
        const updatedDontComeBets = [];
        for (const dontComeBet of existingDontComeBets) {
            //Check if it's don't come point has been established
            if (dontComeBet.comePoint !== null) {
                //The don't come point is established. Check if there are already odds. 
                if (dontComeBet.odds === null) {
                    //No existing odds. We could lay odds. What's the odds strategy?
                    const dontComeBetOddsStrategy = configuration.dontComeBetOddsStrategy;
                    if (dontComeBetOddsStrategy.type !== OddsBetStrategyType.NONE) {
                        //We're playing odds on the don't come bet. What's the amount?
                        const dontComeBetOddsAmount = calculateOddsBetAmount({ controllingBetValue: dontComeBet.bet, strategy: configuration.dontComeBetOddsStrategy, rounding, dont: true, point: dontComeBet.comePoint });
                        //Do we have enough to place it? 
                        if (bankroll - dontComeBetOddsAmount >= 0) {
                            //Yes, we have enough to place the bet. Let's place it. 
                            //Deduct the bet amount from our bankroll
                            bankroll -= dontComeBetOddsAmount;
                            //Update our current bet to add odds. 
                            dontComeBet.odds = dontComeBetOddsAmount;
                            //Track the newly placed bet
                            newBets.push({ type: BetType.DONTCOME_ODDS, bet: dontComeBetOddsAmount });
                        }
                    }
                }
            }
            //Add the don't come bets to the array tracking the updated bets
            updatedDontComeBets.push({ ...dontComeBet });
        }
        //Update our current bets
        currentBets = { ...currentBets, dontComeBets: updatedDontComeBets };

        //Check if the point is on or off. That will determine the types of bets we can make
        if (isPointAlreadyOn) {
            //Point is on. We can place new come / don't come bets

            //COME
            if (configuration.comeBet) {
                //Come bet is configured
                //Check if the existing number of come bets is less than our max number of simultaneous come bets
                if (currentBets.comeBets.length < configuration.maxComeBets) {
                    const comeBetAmount = configuration.comeBet;
                    //Do we have enough to place it? 
                    if (bankroll - comeBetAmount >= 0) {
                        //Yes, we have enough to place the bet. Let's place it. 
                        //Deduct the bet amount from our bankroll
                        bankroll -= comeBetAmount;
                        //Add it to our current bets. 
                        currentBets = { ...currentBets, comeBets: [...currentBets.comeBets, { bet: comeBetAmount, odds: null, comePoint: null }] };
                        //Track the newly placed bet
                        newBets.push({ type: BetType.COME, bet: comeBetAmount });
                    }
                }
            }

            //Don't come
            if (configuration.dontComeBet) {
                //Don't come  bet is configured
                //Check if the existing number of don't come bets is less than our max number of simultaneous don't come bets
                if (currentBets.dontComeBets.length < configuration.maxDontComeBets) {
                    const dontComeBetAmount = configuration.dontComeBet;
                    //Do we have enough to place it? 
                    if (bankroll - dontComeBetAmount >= 0) {
                        //Yes, we have enough to place the bet. Let's place it. 
                        //Deduct the bet amount from our bankroll
                        bankroll -= dontComeBetAmount;
                        //Add it to our current bets. 
                        currentBets = { ...currentBets, dontComeBets: [...currentBets.dontComeBets, { bet: dontComeBetAmount, odds: null, comePoint: null }] };
                        //Track the newly placed bet
                        newBets.push({ type: BetType.DONTCOME, bet: dontComeBetAmount });
                    }
                }
            }

        } else {
            //Point is off. We can place new pass / don't pass bets
            if (configuration.passBet) {
                //Pass line bet is configured. 
                const passBetAmount = configuration.passBet;
                //Do we have enough to place it? 
                if (bankroll - passBetAmount >= 0) {
                    //Yes, we have enough to place the bet. Let's place it. 
                    //Deduct the bet amount from our bankroll
                    bankroll -= passBetAmount;
                    //Add it to our current bets. 
                    currentBets = { ...currentBets, passLineBet: { bet: passBetAmount, odds: null } };
                    //Track the newly placed bet
                    newBets.push({ type: BetType.PASSLINE, bet: passBetAmount });
                }
            }
            if (configuration.dontPassBet) {
                //Don't pass bet is configured. 
                const dontPassBetAmount = configuration.dontPassBet;
                //Do we have enough to place it? 
                if (bankroll - dontPassBetAmount >= 0) {
                    //Yes, we have enough to place the bet. Let's place it. 
                    //Deduct the bet amount from our bankroll
                    bankroll -= dontPassBetAmount;
                    //Add it to our current bets. 
                    currentBets = { ...currentBets, dontPassBet: { bet: dontPassBetAmount, odds: null } };
                    //Track the newly placed bet
                    newBets.push({ type: BetType.DONTPASS, bet: dontPassBetAmount });
                }
            }
        }

        //Return the updated state
        return { placedBetState: new GameState({ ...initialState, bankroll, currentBets }), newBets };
    }
}

function calculateOddsBetAmount({ controllingBetValue, strategy, rounding, dont, point }: { controllingBetValue: number; strategy: OddsBetStrategy; rounding: RoundingType; dont: boolean; point?: number }): number {
    switch (strategy.type) {
        case OddsBetStrategyType.NONE: return 0;
        case OddsBetStrategyType.SETAMOUNT: return round(strategy.value, rounding);
        case OddsBetStrategyType.MULTIPLIER: return round(strategy.value * controllingBetValue, rounding);
        case OddsBetStrategyType.TABLEMAX: {
            if (dont) {
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
                        throw new Error("Cannot calculate 3-4-5x odds without a point value");
                }
            }
        };
    }
}

function resolveBets(placedBetState: GameState, roll: number): { resultingState: GameState, resolvedBets: Array<ResolvedBet> } {
    //Extract out some helpful, static values
    const rounding = placedBetState.configuration.rounding;

    //Gather mutable state 
    let bankroll = placedBetState.bankroll;
    let currentBets = placedBetState.currentBets;
    let pointIsOn = placedBetState.pointIsOn;
    let point = placedBetState.point;

    //Track resolved bets
    const resolvedBets = new Array<ResolvedBet>();

    //Check each bet type
    if (currentBets.passLineBet) {
        //We have an existing pass line bet. 
        //Check if the point is already on or off
        if (pointIsOn) {
            //We have a pass line bet and the point is on.
            if (roll === point) {
                //The roll matches the point. WIN

                //Pass line payment: 1:1
                bankroll += currentBets.passLineBet.bet;
                //Return original pass line bet
                bankroll += currentBets.passLineBet.bet;

                //Track the pass line bet win
                resolvedBets.push({ placedBet: { type: BetType.PASSLINE, bet: currentBets.passLineBet.bet }, outcome: BetOutcome.WIN, payout: currentBets.passLineBet.bet });

                if (currentBets.passLineBet.odds) {
                    let payout = 0;
                    switch (point) {
                        case 4:
                        case 10:
                            payout = round(2 * currentBets.passLineBet.odds, rounding);
                            break;
                        case 5:
                        case 9:
                            payout = round(1.5 * currentBets.passLineBet.odds, rounding);
                            break;
                        case 6:
                        case 8:
                            payout = round(1.2 * currentBets.passLineBet.odds, rounding);
                            break;
                    }
                    //Add our winnings
                    bankroll += payout;

                    //Return original pass line odds bet
                    bankroll += currentBets.passLineBet.odds;

                    //Track the pass line odds bet win
                    resolvedBets.push({ placedBet: { type: BetType.PASSLINE_ODDS, bet: currentBets.passLineBet.odds }, outcome: BetOutcome.WIN, payout });
                }

                //Clear the passline bet
                currentBets = { ...currentBets, passLineBet: null };
            } else if (roll === 7) {
                //Point is on and a 7 was rolled. Seven out. LOSS
                //The bet was already deducted so we don't need to update the bankroll

                //Track the lost pass line bet
                resolvedBets.push({ placedBet: { type: BetType.PASSLINE, bet: currentBets.passLineBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });

                //Check if there was an odds bet
                if (currentBets.passLineBet.odds) {
                    //Track the lost pass line odds bet 
                    resolvedBets.push({ placedBet: { type: BetType.PASSLINE_ODDS, bet: currentBets.passLineBet.odds }, outcome: BetOutcome.LOSS, payout: 0 });
                }

                //Clear the pass line bet
                currentBets = { ...currentBets, passLineBet: null };
            }
        } else {
            //We have a pass line bet and the point is off. Come out roll.
            switch (roll) {
                case 7:
                case 11:
                    //7 or 11 on come out roll. WIN 
                    //Pass line payment: 1:1
                    bankroll += currentBets.passLineBet.bet;
                    //Return original pass line bet
                    bankroll += currentBets.passLineBet.bet;
                    //Track the pass line bet win
                    resolvedBets.push({ placedBet: { type: BetType.PASSLINE, bet: currentBets.passLineBet.bet }, outcome: BetOutcome.WIN, payout: currentBets.passLineBet.bet });
                    //Clear the pass line bet
                    currentBets = { ...currentBets, passLineBet: null };
                    break;
                case 2:
                case 3:
                case 12:
                    //2, 3 or 12 on come out roll. Crapped out. LOSS 
                    //The bet was already deducted so we don't need to update the bankroll

                    //Track the lost pass line bet
                    resolvedBets.push({ placedBet: { type: BetType.PASSLINE, bet: currentBets.passLineBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });
                    //Clear the pass line bet
                    currentBets = { ...currentBets, passLineBet: null };
                    break;
                default:
                    break;
            }
        }
    }

    //Check come bets
    const updatedComeBets = [];
    for (const comeBet of currentBets.comeBets) {
        //Check if the come point is already set or not
        if (comeBet.comePoint !== null) {
            //We have a come bet and the point is set.
            if (roll === comeBet.comePoint) {
                //The roll matches the point. WIN

                //Come bet payment: 1:1
                bankroll += comeBet.bet;
                //Return original come bet
                bankroll += comeBet.bet;

                //Track the come bet win
                resolvedBets.push({ placedBet: { type: BetType.COME, bet: comeBet.bet }, outcome: BetOutcome.WIN, payout: comeBet.bet });

                if (comeBet.odds) {
                    let payout = 0;
                    switch (point) {
                        case 4:
                        case 10:
                            payout = round(2 * comeBet.odds, rounding);
                            break;
                        case 5:
                        case 9:
                            payout = round(1.5 * comeBet.odds, rounding);
                            break;
                        case 6:
                        case 8:
                            payout = round(1.2 * comeBet.odds, rounding);
                            break;
                    }
                    //Add our winnings
                    bankroll += payout;

                    //Return original come odds bet
                    bankroll += comeBet.odds;

                    //Track the come odds bet win
                    resolvedBets.push({ placedBet: { type: BetType.COME_ODDS, bet: comeBet.odds }, outcome: BetOutcome.WIN, payout });
                }

                //Intentionally do not add this to our updated come bets array to clear that bet
            } else if (roll === 7) {
                //Point is on and a 7 was rolled. Seven out. LOSS
                //The bet was already deducted so we don't need to update the bankroll

                //Track the lost come bet
                resolvedBets.push({ placedBet: { type: BetType.COME, bet: comeBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });

                //Check if there was an odds bet
                if (comeBet.odds) {
                    //Track the lost come odds bet 
                    resolvedBets.push({ placedBet: { type: BetType.COME_ODDS, bet: comeBet.odds }, outcome: BetOutcome.LOSS, payout: 0 });
                }

                //Intentionally do not add this to our updated come bets array to clear the bet
            } else {
                //No status change for this come bet. Push back onto update come bets array
                updatedComeBets.push({ ...comeBet });
            }
        } else {
            //We have a come bet and the point is off. Come out roll.
            switch (roll) {
                case 7:
                case 11:
                    //7 or 11 on come out roll. WIN 
                    //Come bet payment: 1:1
                    bankroll += comeBet.bet;
                    //Return original come bet
                    bankroll += comeBet.bet;
                    //Track the come bet win
                    resolvedBets.push({ placedBet: { type: BetType.COME, bet: comeBet.bet }, outcome: BetOutcome.WIN, payout: comeBet.bet });
                    //Intentionally do not add this to our updated come bets array to clear the bet
                    break;
                case 2:
                case 3:
                case 12:
                    //2, 3 or 12 on come out roll. Crapped out. LOSS 
                    //The bet was already deducted so we don't need to update the bankroll

                    //Track the lost come bet
                    resolvedBets.push({ placedBet: { type: BetType.COME, bet: comeBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });
                    //Intentionally do not add this to our updated come bets array to clear the bet
                    break;
                default:
                    //No status change for this come bet. Push back onto update come bets array
                    updatedComeBets.push({ ...comeBet });
                    break;
            }
        }
    }
    //Update our current bets
    currentBets = { ...currentBets, comeBets: updatedComeBets };

    //Check Don't Pass bet
    if (currentBets.dontPassBet) {
        //We have an existing don't pass bet. 

        //Check if the point is already on or off
        if (pointIsOn) {
            //We have a don't pass bet and the point is on.
            if (roll === 7) {
                //The roll crapped out. WIN for don't pass

                //Don't pass payment: 1:1
                bankroll += currentBets.dontPassBet.bet;
                //Return original don't pass bet
                bankroll += currentBets.dontPassBet.bet;

                //Track the don't pass bet win
                resolvedBets.push({ placedBet: { type: BetType.DONTPASS, bet: currentBets.dontPassBet.bet }, outcome: BetOutcome.WIN, payout: currentBets.dontPassBet.bet });

                if (currentBets.dontPassBet.odds) {
                    let payout = 0;
                    switch (point) {
                        case 4:
                        case 10:
                            payout = round((currentBets.dontPassBet.odds) / 2, rounding);
                            break;
                        case 5:
                        case 9:
                            payout = round((currentBets.dontPassBet.odds * 2) / 3, rounding);
                            break;
                        case 6:
                        case 8:
                            payout = round((currentBets.dontPassBet.odds * 5) / 6, rounding);
                            break;
                    }
                    //Add our winnings
                    bankroll += payout;

                    //Return original don't pass odds bet
                    bankroll += currentBets.dontPassBet.odds;

                    //Track the don't pass odds bet win
                    resolvedBets.push({ placedBet: { type: BetType.DONTPASS_ODDS, bet: currentBets.dontPassBet.odds }, outcome: BetOutcome.WIN, payout });
                }

                //Clear the don't pass bet
                currentBets = { ...currentBets, dontPassBet: null };
            } else if (roll === point) {
                //Point is on and the point was rolled. LOSS for don't pass
                //The bet was already deducted so we don't need to update the bankroll

                //Track the lost don't pass bet
                resolvedBets.push({ placedBet: { type: BetType.DONTPASS, bet: currentBets.dontPassBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });

                //Check if there was an odds bet
                if (currentBets.dontPassBet.odds) {
                    //Track the lost don't pass odds bet 
                    resolvedBets.push({ placedBet: { type: BetType.DONTPASS_ODDS, bet: currentBets.dontPassBet.odds }, outcome: BetOutcome.LOSS, payout: 0 });
                }

                //Clear the don't pass bet
                currentBets = { ...currentBets, dontPassBet: null };
            }
        } else {
            //We have a don't pass bet and the point is off. Come out roll.
            switch (roll) {
                case 2:
                case 3:
                    //2 or 3 on come out roll. WIN 
                    //Don't pass payment: 1:1
                    bankroll += currentBets.dontPassBet.bet;
                    //Return original don't pass bet
                    bankroll += currentBets.dontPassBet.bet;
                    //Track the don't pass bet win
                    resolvedBets.push({ placedBet: { type: BetType.DONTPASS, bet: currentBets.dontPassBet.bet }, outcome: BetOutcome.WIN, payout: currentBets.dontPassBet.bet });
                    //Clear the don't pass bet
                    currentBets = { ...currentBets, dontPassBet: null };
                    break;
                case 7:
                case 11:
                    //7 or 11 on come out roll. LOSS 
                    //The bet was already deducted so we don't need to update the bankroll

                    //Track the lost don't pass bet
                    resolvedBets.push({ placedBet: { type: BetType.DONTPASS, bet: currentBets.dontPassBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });
                    //Clear the don't pass bet
                    currentBets = { ...currentBets, dontPassBet: null };
                    break;
                case 12:
                    //12 on come out roll. Push
                    //The bet was already deducted so we get back our original bet

                    //Return original don't pass bet
                    bankroll += currentBets.dontPassBet.bet;
                    //Track the don't pass bet push
                    resolvedBets.push({ placedBet: { type: BetType.DONTPASS, bet: currentBets.dontPassBet.bet }, outcome: BetOutcome.PUSH, payout: currentBets.dontPassBet.bet });
                    //Clear the don't pass bet
                    currentBets = { ...currentBets, dontPassBet: null };
                    break;
                default:
                    break;
            }
        }
    }

    //Check don't come bets
    const updatedDontComeBets = [];
    for (const dontComeBet of currentBets.dontComeBets) {
        //Check if the don't come point is already set or not
        if (dontComeBet.comePoint !== null) {
            //We have a don't come bet and the point is set.
            if (roll === 7) {
                //The roll crapped out. Win for don't come

                //Don't come payment: 1:1
                bankroll += dontComeBet.bet;
                //Return original don't come bet
                bankroll += dontComeBet.bet;

                //Track the come bet win
                resolvedBets.push({ placedBet: { type: BetType.DONTCOME, bet: dontComeBet.bet }, outcome: BetOutcome.WIN, payout: dontComeBet.bet });


                if (dontComeBet.odds) {
                    let payout = 0;
                    switch (point) {
                        case 4:
                        case 10:
                            payout = round((dontComeBet.odds) / 2, rounding);
                            break;
                        case 5:
                        case 9:
                            payout = round((dontComeBet.odds * 2) / 3, rounding);
                            break;
                        case 6:
                        case 8:
                            payout = round((dontComeBet.odds * 5) / 6, rounding);
                            break;
                    }
                    //Add our winnings
                    bankroll += payout;

                    //Return original come odds bet
                    bankroll += dontComeBet.odds;

                    //Track the come odds bet win
                    resolvedBets.push({ placedBet: { type: BetType.DONTCOME_ODDS, bet: dontComeBet.odds }, outcome: BetOutcome.WIN, payout });
                }

                //Intentionally do not add this to our updated come bets array to clear that bet

            } else if (roll === dontComeBet.comePoint) {
                //Point is on and the point was rolled. LOSS for don't come
                //The bet was already deducted so we don't need to update the bankroll

                //Track the lost come bet
                resolvedBets.push({ placedBet: { type: BetType.DONTCOME, bet: dontComeBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });

                //Check if there was an odds bet
                if (dontComeBet.odds) {
                    //Track the lost don't come odds bet 
                    resolvedBets.push({ placedBet: { type: BetType.DONTCOME_ODDS, bet: dontComeBet.odds }, outcome: BetOutcome.LOSS, payout: 0 });
                }

                //Intentionally do not add this to our updated don't come bets array to clear the bet
            } else {
                //No status change for this don't come bet. Push back onto update come bets array
                updatedDontComeBets.push({ ...dontComeBet });
            }
        } else {
            //We have a don't come bet and the point is off. Come out roll.
            switch (roll) {
                case 2:
                case 3:
                    //2 or 3 on  come out roll. WIN 
                    //Don't Come bet payment: 1:1
                    bankroll += dontComeBet.bet;
                    //Return original don't come bet
                    bankroll += dontComeBet.bet;
                    //Track the don't come bet win
                    resolvedBets.push({ placedBet: { type: BetType.DONTCOME, bet: dontComeBet.bet }, outcome: BetOutcome.WIN, payout: dontComeBet.bet });
                    //Intentionally do not add this to our updated come bets array to clear the bet
                    break;
                case 7:
                case 11:
                    //7 or 11 on come out roll. LOSS 
                    //The bet was already deducted so we don't need to update the bankroll

                    //Track the lost come bet
                    resolvedBets.push({ placedBet: { type: BetType.DONTCOME, bet: dontComeBet.bet }, outcome: BetOutcome.LOSS, payout: 0 });
                    //Intentionally do not add this to our updated come bets array to clear the bet
                    break;
                case 12:
                    //12 on come out roll. Push
                    //The bet was already deducted so we get back our original bet

                    //Return original don't come bet
                    bankroll += dontComeBet.bet;
                    //Track the don't come bet push
                    resolvedBets.push({ placedBet: { type: BetType.DONTCOME, bet: dontComeBet.bet }, outcome: BetOutcome.PUSH, payout: dontComeBet.bet });
                    //Intentionally do not add this to our updated come bets array to clear the bet
                    break;
                default:
                    //No status change for this don't come bet. Push back onto update don't come bets array
                    updatedDontComeBets.push({ ...dontComeBet });
                    break;
            }
        }
    }
    //Update our current bets
    currentBets = { ...currentBets, dontComeBets: updatedDontComeBets };

    //Increment the roll counter
    const rollNum = placedBetState.rollNum + 1;

    //Update point on and point
    if (pointIsOn) {
        //The point is already on. 
        if (roll === point || roll === 7) {
            //We hit the point or crapped out. Turn it off and clear
            pointIsOn = false;
            point = 0;
        }
    } else {
        //The point is off
        if ([4, 5, 6, 8, 9, 10].includes(roll)) {
            //Roll establishes a new point
            pointIsOn = true;
            point = roll;
        }
    }

    //Update come bets points
    const updatedPointComeBets = [];
    for (const comeBet of currentBets.comeBets) {
        //Check if the come point is already set or not
        if (comeBet.comePoint === null) {
            //The point for this come bet is not already set. Set it
            if ([4, 5, 6, 8, 9, 10].includes(roll)) {
                //Roll establishes a new come point
                comeBet.comePoint = roll;
            }
        }
        updatedPointComeBets.push({ ...comeBet })
    }
    //Update our current bets
    currentBets = { ...currentBets, comeBets: updatedPointComeBets };

    //Update don't come bets points
    const updatedPointDontComeBets = [];
    for (const dontComeBet of currentBets.dontComeBets) {
        //Check if the don't come point is already set or not
        if (dontComeBet.comePoint === null) {
            //The point for this don't come bet is not already set. Set it
            if ([4, 5, 6, 8, 9, 10].includes(roll)) {
                //Roll establishes a new don't come point
                dontComeBet.comePoint = roll;
            }
        }
        updatedPointDontComeBets.push({ ...dontComeBet })
    }
    //Update our current bets
    currentBets = { ...currentBets, dontComeBets: updatedPointDontComeBets };


    //Return the updated state
    return { resultingState: new GameState({ configuration: placedBetState.configuration, bankroll, currentBets, rollNum, pointIsOn, point }), resolvedBets };
}

function rollDie() {
    return (getRandomInt(6) + 1);
}

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}



