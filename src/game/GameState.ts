import { Configuration } from "./Configuration";
import { BetCollection, BetType } from "./Session";
import { calculateNumberBetAvoidRounding } from "../util/Util";

interface GameStateProps {
    configuration: Configuration;
    rollNum: number;
    bankroll: number;
    point: number;
    pointIsOn: boolean;
    currentBets: BetCollection;
    cashedOutNumbers: Array<4 | 5 | 6 | 8 | 9 | 10>;
}

export interface Bet {
    bet: number;
    odds: number | null;
}

export interface ComeBet extends Bet {
    comePoint: number | null
}

export interface NumberBet {
    number: 4 | 5 | 6 | 8 | 9 | 10;
    bet: number;
    winCount: number; //Tracks how many times this particular number bet has won consecutively.
}

export type BetCollection = {
    passLineBet: Bet | null;
    dontPassBet: Bet | null;
    comeBets: Array<ComeBet>;
    dontComeBets: Array<ComeBet>;
    numberBets: Array<NumberBet>;
}

export enum LimitReached {
    BANKROLL_MAX = "Upper Bankroll Limit",
    BANKROLL_MIN = "Lower Bankroll Limit",
    BUSTED = "Busted",
    MAX_ROLLS = "Roll Limit"
}

export class GameState {
    readonly configuration: Configuration;
    readonly rollNum: number;
    readonly bankroll: number;
    readonly point: number;
    readonly pointIsOn: boolean;
    readonly currentBets: BetCollection;
    readonly cashedOutNumbers: Array<4 | 5 | 6 | 8 | 9 | 10>;

    constructor(params: {
        configuration: Configuration;
        rollNum: number;
        bankroll: number;
        currentBets: BetCollection;
        point: number;
        pointIsOn: boolean;
        cashedOutNumbers?: Array<4 | 5 | 6 | 8 | 9 | 10>;
    }) {
        this.configuration = params.configuration;
        this.rollNum = params.rollNum;
        this.bankroll = params.bankroll;
        this.currentBets = params.currentBets;
        this.point = params.point;
        this.pointIsOn = params.pointIsOn;
        this.cashedOutNumbers = params.cashedOutNumbers ?? [];
    }

    static init(configuration: Configuration) {
        if (configuration.getInvalidFields().length > 0) {
            throw new Error(`Cannot start game from invalid configuration: ${JSON.stringify(configuration)}`);
        }

        return new GameState({
            configuration,
            rollNum: 0,
            bankroll: configuration.initialBankroll,
            currentBets: { passLineBet: null, dontPassBet: null, comeBets: [], dontComeBets: [], numberBets: [] },
            point: 0,
            pointIsOn: false,
            cashedOutNumbers: []
        });
    }

    /**
     * Are there ANY active bets on the table right now?
     */
    get isActive(): boolean {
        return this.hasCurrentBet();
    }

    /**
     * Determines if the simulation is completely over.
     */
    isDone(): boolean {
        //If we haven't hit a limit, we keep playing.
        if (this.limitReached() === null) return false;

        //We've hit a limit. We can only stop if we have no more bets on the table.
        return !this.hasCurrentBet();
    }

    /**
     * Determines if the simulation should stop because a configured limit was hit
     */
    limitReached(): LimitReached | null {

        //The minimum is set and we hit it
        if (this.configuration.bankrollMinimum != null && this.configuration.bankrollMinimum > 0 && this.bankroll <= this.configuration.bankrollMinimum) {
            return LimitReached.BANKROLL_MIN;
        }

        //The maximum value is set and we hit it
        if (this.configuration.bankrollMaximum != null && this.bankroll >= this.configuration.bankrollMaximum) {
            return LimitReached.BANKROLL_MAX;
        }

        //The maximum value is set and we hit it
        if (this.configuration.maximumRolls != null && this.rollNum >= this.configuration.maximumRolls) {
            return LimitReached.MAX_ROLLS;
        }

        //So we didn't hit any of the configured limit. We need to see if we have enough funds to even play, or if we've busted.
        //Check if our current bankroll would allow us to even place the smallest bet we're configured to make. 
        //That is, do we even have enough money to place the smallest bet we're configured to make.
        if (this.bankroll - this.minBetAmount() < 0) {
            //Nope, we don't have enough funds to place even our smallest bet.
            return LimitReached.BUSTED;
        }

        // 5. Enough to be > minimum but not enough to place any bet
        if (this.configuration.bankrollMinimum != null && this.configuration.bankrollMinimum > 0) {
            const difference = this.bankroll - this.configuration.bankrollMinimum;
            if (difference > 0 && difference < this.minBetAmount()) {
                // We can't place a bet without going below the minimum → effectively “walk away.”
                return LimitReached.BANKROLL_MIN;
            }
        }


        //No limit reached, play on!
        return null;
    }

    hasCurrentBet(): boolean {
        const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = this.currentBets;
        if (passLineBet || dontPassBet) return true;
        if (comeBets.length > 0 || dontComeBets.length > 0) return true;
        if (numberBets.length > 0) return true; // <--- include number bets
        return false;
    }

    minBetAmount(): number {
        const cfg = this.configuration;

        // We only look at configured bets that are > 0
        const possibleBets: number[] = [];

        if (cfg.passBet && cfg.passBet > 0) possibleBets.push(cfg.passBet);
        if (cfg.dontPassBet && cfg.dontPassBet > 0) possibleBets.push(cfg.dontPassBet);
        if (cfg.comeBet && cfg.comeBet > 0) possibleBets.push(cfg.comeBet);
        if (cfg.dontComeBet && cfg.dontComeBet > 0) possibleBets.push(cfg.dontComeBet);

        // Number bets. We should consider the smallest among 4,5,6,8,9,10 if set
        const numBets = [
            { val: cfg.numberBet4, num: 4 }, { val: cfg.numberBet5, num: 5 },
            { val: cfg.numberBet6, num: 6 }, { val: cfg.numberBet8, num: 8 },
            { val: cfg.numberBet9, num: 9 }, { val: cfg.numberBet10, num: 10 }
        ];

        for (const nb of numBets) {
            if (nb.val && nb.val > 0) {
                let cost = nb.val;
                if (cfg.avoidRounding) {
                    cost = calculateNumberBetAvoidRounding(cost, nb.num as any);
                }
                possibleBets.push(cost);
            }
        }

        if (possibleBets.length === 0) {
            // If truly nothing is > 0, then there's no minimal bet. But
            // realistically you'd never get here because your config was invalid
            // if *all* bets were 0 or null. We might just return 0 or throw:
            throw new Error("Unexpected configuration: all bets are zero/null. At least one bet is required.");
        }

        return Math.min(...possibleBets);
    }



}