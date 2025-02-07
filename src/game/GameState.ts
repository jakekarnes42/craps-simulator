import { Configuration } from "./Configuration";

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
    wager: number;
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

    constructor(
        {
            configuration,
            rollNum,
            bankroll,
            point,
            pointIsOn,
            currentBets,
            cashedOutNumbers,
        }: GameStateProps) {
        this.configuration = configuration;
        this.rollNum = rollNum;
        this.bankroll = bankroll;
        this.point = point;
        this.pointIsOn = pointIsOn;
        this.currentBets = currentBets;
        this.cashedOutNumbers = cashedOutNumbers;
    }

    static init(configuration: Configuration) {
        if (configuration.getInvalidFields().length !== 0 || configuration.initialBankroll === null) {
            throw new Error(`Cannot start game from invalid configuration: ${JSON.stringify(configuration)}`);

        }

        return new GameState(
            {
                configuration: configuration,
                rollNum: 0,
                bankroll: configuration.initialBankroll,
                point: 0,
                pointIsOn: false,
                currentBets: { passLineBet: null, dontPassBet: null, comeBets: [], dontComeBets: [], numberBets: [] },
                cashedOutNumbers: []
            });
    }

    isDone(): boolean {
        //Check if there's a current bet. If there's a current bet, we won't be done. Gotta play it out
        if (this.hasCurrentBet()) {
            return false;
        }

        //Check if we've reached some other limit.
        return this.limitReached() !== null;
    }

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
        const nb4 = cfg.numberBet4 ?? 0;
        const nb5 = cfg.numberBet5 ?? 0;
        const nb6 = cfg.numberBet6 ?? 0;
        const nb8 = cfg.numberBet8 ?? 0;
        const nb9 = cfg.numberBet9 ?? 0;
        const nb10 = cfg.numberBet10 ?? 0;

        [nb4, nb5, nb6, nb8, nb9, nb10].forEach((x) => {
            if (x > 0) possibleBets.push(x);
        });

        if (possibleBets.length === 0) {
            // If truly nothing is > 0, then there's no minimal bet. But
            // realistically you'd never get here because your config was invalid
            // if *all* bets were 0 or null. We might just return 0 or throw:
            throw new Error("Unexpected configuration: all bets are zero/null. At least one bet is required.");
        }

        return Math.min(...possibleBets);
    }



}