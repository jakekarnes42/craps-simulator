import { Configuration } from "./Configuration";
import { OddsBetStrategy, OddsBetStrategyType } from "./OddsBetStrategy"
import { RoundingType } from "./RoundingType"

interface GameStateProps {
    configuration: Configuration;
    rollNum: number;
    bankroll: number;
    point: number;
    pointIsOn: boolean;
    currentBets: BetCollection;
}

export interface Bet {
    bet: number;
    odds: number | null;
}

export interface ComeBet extends Bet {
    comePoint: number | null
}

export type BetCollection = {
    passLineBet: Bet | null;
    dontPassBet: Bet | null;
    comeBets: Array<ComeBet>;
    dontComeBets: Array<ComeBet>;
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

    constructor(
        {
            configuration,
            rollNum,
            bankroll,
            point,
            pointIsOn,
            currentBets
        }: GameStateProps) {
        this.configuration = configuration;
        this.rollNum = rollNum;
        this.bankroll = bankroll;
        this.point = point;
        this.pointIsOn = pointIsOn;
        this.currentBets = currentBets;
    }

    static init(configuration: Configuration) {
        if (configuration.getInvalidFields().length != 0 || configuration.initialBankroll === null) {
            throw new Error(`Cannot start game from invalid configuration: ${JSON.stringify(configuration)}`);

        }

        return new GameState(
            {
                configuration: configuration,
                rollNum: 0,
                bankroll: configuration.initialBankroll,
                point: 0,
                pointIsOn: false,
                currentBets: { passLineBet: null, dontPassBet: null, comeBets: [], dontComeBets: [] }
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

        //No limit reached, play on!
        return null;
    }

    hasCurrentBet() {
        //TODO add more bets
        return this.currentBets.passLineBet !== null || this.currentBets.dontPassBet !== null || this.currentBets.comeBets.length > 0 || this.currentBets.dontComeBets.length > 0;
    }

    minBetAmount() {
        //TODO add more bets
        const passBetAmount = this.configuration.passBet ? this.configuration.passBet : 0;
        const dontPassBetAmount = this.configuration.dontPassBet ? this.configuration.dontPassBet : 0;
        const comeBetAmount = this.configuration.comeBet ? this.configuration.comeBet : 0;
        const dontComeBetAmount = this.configuration.dontComeBet ? this.configuration.dontComeBet : 0;

        const validBets = [passBetAmount, dontPassBetAmount, comeBetAmount, dontComeBetAmount].filter(bet => bet !== 0);

        if (validBets.length === 0) {
            throw new Error("Unexpected configuration. Some bet must be set.");
        }

        return Math.min(...validBets);
    }



}