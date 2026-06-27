import { Configuration } from "./Configuration";
import { CRAPS_NUMBERS, CrapsNumber } from "./NumberBets";
import { PressStrategy } from "./Strategies";

export interface Bet {
    bet: number;
    odds: number | null;
}

export interface ComeBet extends Bet {
    comePoint: number | null;
}

export interface NumberBet {
    number: CrapsNumber;
    bet: number;
    winCount: number;
    pressStrategy: PressStrategy;
}

export type BetCollection = {
    passLineBet: Bet | null;
    dontPassBet: Bet | null;
    comeBets: ComeBet[];
    dontComeBets: ComeBet[];
    numberBets: NumberBet[];
}

export function sumBetCollection(bets: BetCollection): number {
    let total = 0;
    if (bets.passLineBet) total += bets.passLineBet.bet + (bets.passLineBet.odds ?? 0);
    if (bets.dontPassBet) total += bets.dontPassBet.bet + (bets.dontPassBet.odds ?? 0);
    bets.comeBets.forEach(bet => total += bet.bet + (bet.odds ?? 0));
    bets.dontComeBets.forEach(bet => total += bet.bet + (bet.odds ?? 0));
    bets.numberBets.forEach(bet => total += bet.bet);
    return total;
}

export enum LimitReached {
    BANKROLL_MAX = "Upper Bankroll Limit",
    BANKROLL_MIN = "Lower Bankroll Limit",
    BUSTED = "Busted",
    MAX_ROLLS = "Roll Limit"
}

export type GameStateSnapshot = {
    rollNum: number;
    bankroll: number;
    point: number;
    pointIsOn: boolean;
    currentBets: BetCollection;
    cashedOutNumbers: CrapsNumber[];
    stopReason: LimitReached | null;
}

export class GameState {
    readonly configuration: Configuration;
    readonly rollNum: number;
    readonly bankroll: number;
    readonly point: number;
    readonly pointIsOn: boolean;
    readonly currentBets: BetCollection;
    readonly cashedOutNumbers: CrapsNumber[];
    readonly stopReason: LimitReached | null;

    constructor(params: {
        configuration: Configuration;
        rollNum: number;
        bankroll: number;
        currentBets: BetCollection;
        point: number;
        pointIsOn: boolean;
        cashedOutNumbers?: CrapsNumber[];
        stopReason?: LimitReached | null;
    }) {
        this.configuration = params.configuration;
        this.rollNum = params.rollNum;
        this.bankroll = params.bankroll;
        this.currentBets = params.currentBets;
        this.point = params.point;
        this.pointIsOn = params.pointIsOn;
        this.cashedOutNumbers = params.cashedOutNumbers ?? [];
        this.stopReason = params.stopReason === LimitReached.BUSTED ? null : params.stopReason ?? null;
    }

    static init(configuration: Configuration) {
        if (configuration.getInvalidFields().length > 0) {
            throw new Error(`Cannot start game from invalid configuration: ${JSON.stringify(configuration)}`);
        }

        return new GameState({
            configuration,
            rollNum: 0,
            bankroll: configuration.initialBankroll!,
            currentBets: { passLineBet: null, dontPassBet: null, comeBets: [], dontComeBets: [], numberBets: [] },
            point: 0,
            pointIsOn: false,
            cashedOutNumbers: []
        });
    }

    static fromSnapshot(configuration: Configuration, snapshot: GameStateSnapshot): GameState {
        return new GameState({
            configuration,
            rollNum: snapshot.rollNum,
            bankroll: snapshot.bankroll,
            point: snapshot.point,
            pointIsOn: snapshot.pointIsOn,
            currentBets: snapshot.currentBets,
            cashedOutNumbers: snapshot.cashedOutNumbers,
            stopReason: snapshot.stopReason,
        });
    }

    toSnapshot(): GameStateSnapshot {
        return {
            rollNum: this.rollNum,
            bankroll: this.bankroll,
            point: this.point,
            pointIsOn: this.pointIsOn,
            currentBets: this.currentBets,
            cashedOutNumbers: this.cashedOutNumbers,
            stopReason: this.stopReason,
        };
    }

    get isActive(): boolean {
        return this.hasCurrentBet();
    }

    isDone(): boolean {
        return this.limitReached() !== null && !this.hasCurrentBet();
    }

    limitReached(): LimitReached | null {
        if (this.stopReason !== null) return this.stopReason;

        if (this.configuration.bankrollMinimum != null && this.configuration.bankrollMinimum > 0 && this.bankroll <= this.configuration.bankrollMinimum) {
            return LimitReached.BANKROLL_MIN;
        }

        if (this.configuration.bankrollMaximum != null && this.bankroll >= this.configuration.bankrollMaximum) {
            return LimitReached.BANKROLL_MAX;
        }

        if (this.configuration.maximumRolls != null && this.rollNum >= this.configuration.maximumRolls) {
            return LimitReached.MAX_ROLLS;
        }

        const minBetAmount = this.minBetAmount();
        if (this.bankroll - minBetAmount < 0) {
            return LimitReached.BUSTED;
        }

        if (this.configuration.bankrollMinimum != null && this.configuration.bankrollMinimum > 0) {
            const availableAboveMinimum = this.bankroll - this.configuration.bankrollMinimum;
            if (availableAboveMinimum > 0 && availableAboveMinimum < minBetAmount) {
                return LimitReached.BANKROLL_MIN;
            }
        }

        return null;
    }

    hasCurrentBet(): boolean {
        const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = this.currentBets;
        return Boolean(passLineBet || dontPassBet || comeBets.length || dontComeBets.length || numberBets.length);
    }

    minBetAmount(): number {
        const cfg = this.configuration;
        const possibleBets: number[] = [];

        if (cfg.passBet && cfg.passBet > 0) possibleBets.push(cfg.passBet);
        if (cfg.dontPassBet && cfg.dontPassBet > 0) possibleBets.push(cfg.dontPassBet);
        if (cfg.comeBet && cfg.comeBet > 0) possibleBets.push(cfg.comeBet);
        if (cfg.dontComeBet && cfg.dontComeBet > 0) possibleBets.push(cfg.dontComeBet);

        for (const number of CRAPS_NUMBERS) {
            const amount = cfg.effectiveNumberBet(number);
            if (amount !== null) possibleBets.push(amount);
        }

        if (possibleBets.length === 0) {
            throw new Error("Unexpected configuration: at least one bet is required.");
        }

        return Math.min(...possibleBets);
    }
}
