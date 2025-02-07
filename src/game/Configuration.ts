import { round } from "../util/Util";
import { OddsBetStrategy, OddsBetStrategyType } from "./OddsBetStrategy";
import { RoundingType } from "./RoundingType";

interface ConfigurationProps {
    initialBankroll: number | null;
    bankrollMinimum: number | null;
    bankrollMaximum: number | null;
    maximumRolls: number | null;
    passBet: number | null;
    passBetOddsStrategy: OddsBetStrategy;
    comeBet: number | null;
    maxComeBets: number;
    comeBetOddsStrategy: OddsBetStrategy;
    comeBetOddsWorkingComeOut: boolean;
    dontPassBet: number | null;
    dontPassBetOddsStrategy: OddsBetStrategy;
    dontComeBet: number | null;
    maxDontComeBets: number;
    dontComeBetOddsStrategy: OddsBetStrategy;
    dontComeBetOddsWorkingComeOut: boolean;
    avoidRounding: boolean;
    rounding: RoundingType;
    simulationCount: number | null;
}

export class Configuration {
    readonly initialBankroll: number | null;
    readonly bankrollMinimum: number | null;
    readonly bankrollMaximum: number | null;
    readonly maximumRolls: number | null;
    readonly passBet: number | null;
    readonly passBetOddsStrategy: OddsBetStrategy;
    readonly comeBet: number | null;
    readonly maxComeBets: number;
    readonly comeBetOddsStrategy: OddsBetStrategy;
    readonly comeBetOddsWorkingComeOut: boolean;
    readonly dontPassBet: number | null;
    readonly dontPassBetOddsStrategy: OddsBetStrategy;
    readonly dontComeBet: number | null;
    readonly maxDontComeBets: number;
    readonly dontComeBetOddsStrategy: OddsBetStrategy;
    readonly dontComeBetOddsWorkingComeOut: boolean;
    readonly avoidRounding: boolean;
    readonly rounding: RoundingType;
    readonly simulationCount: number | null;

    constructor(
        {
            initialBankroll,
            bankrollMinimum,
            bankrollMaximum,
            maximumRolls,
            passBet,
            passBetOddsStrategy,
            comeBet,
            maxComeBets,
            comeBetOddsStrategy,
            comeBetOddsWorkingComeOut,
            dontPassBet,
            dontPassBetOddsStrategy,
            dontComeBet,
            maxDontComeBets,
            dontComeBetOddsStrategy,
            dontComeBetOddsWorkingComeOut,
            avoidRounding,
            rounding,
            simulationCount
        }: ConfigurationProps) {
        this.initialBankroll = initialBankroll ? round(initialBankroll, rounding) : initialBankroll;
        this.bankrollMinimum = bankrollMinimum ? round(bankrollMinimum, rounding) : bankrollMinimum;
        this.bankrollMaximum = bankrollMaximum ? round(bankrollMaximum, rounding) : bankrollMaximum;
        this.maximumRolls = maximumRolls ? round(maximumRolls, RoundingType.DOLLAR) : maximumRolls;
        this.passBet = passBet ? round(passBet, rounding) : passBet;
        this.passBetOddsStrategy = passBetOddsStrategy;
        this.comeBet = comeBet ? round(comeBet, rounding) : comeBet;
        this.maxComeBets = maxComeBets ? round(maxComeBets, RoundingType.DOLLAR) : maxComeBets;
        this.comeBetOddsStrategy = comeBetOddsStrategy;
        this.comeBetOddsWorkingComeOut = comeBetOddsWorkingComeOut;
        this.dontPassBet = dontPassBet ? round(dontPassBet, rounding) : dontPassBet;
        this.dontPassBetOddsStrategy = dontPassBetOddsStrategy;
        this.dontComeBet = dontComeBet ? round(dontComeBet, rounding) : dontComeBet;
        this.maxDontComeBets = maxDontComeBets ? round(maxDontComeBets, RoundingType.DOLLAR) : maxDontComeBets;
        this.dontComeBetOddsStrategy = dontComeBetOddsStrategy;
        this.dontComeBetOddsWorkingComeOut = dontComeBetOddsWorkingComeOut;
        this.avoidRounding = avoidRounding;
        this.rounding = rounding;
        this.simulationCount = simulationCount ? round(simulationCount, RoundingType.DOLLAR) : simulationCount;
    }

    /* Provides the default configuration for the site */
    static defaultConfiguration() {
        return new Configuration(
            {
                initialBankroll: 300,
                bankrollMinimum: 50,
                bankrollMaximum: 450,
                maximumRolls: 400,
                passBet: 15,
                passBetOddsStrategy: { type: OddsBetStrategyType.NONE, value: 1 },
                comeBet: null,
                maxComeBets: 3,
                comeBetOddsStrategy: { type: OddsBetStrategyType.NONE, value: 1 },
                comeBetOddsWorkingComeOut: false,
                dontPassBet: null,
                dontPassBetOddsStrategy: { type: OddsBetStrategyType.NONE, value: 1 },
                dontComeBet: null,
                maxDontComeBets: 3,
                dontComeBetOddsStrategy: { type: OddsBetStrategyType.NONE, value: 1 },
                dontComeBetOddsWorkingComeOut: false,
                avoidRounding: true,
                rounding: RoundingType.DOLLAR,
                simulationCount: 10_000
            });
    }

    //All the setters return a new copy, with the specified value updated. 

    public setInitialBankroll(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { initialBankroll: value }));
    }

    public setBankrollMinimum(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { bankrollMinimum: value }));
    }

    public setBankrollMaximum(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { bankrollMaximum: value }));
    }

    public setMaximumRolls(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { maximumRolls: value }));
    }

    public setPassBet(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { passBet: value }));
    }

    public setPassBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return new Configuration(Object.assign(this, { passBetOddsStrategy: value }));
    }

    public setComeBet(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { comeBet: value }));
    }

    public setMaxComeBets(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { maxComeBets: value }));
    }

    public setComeBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return new Configuration(Object.assign(this, { comeBetOddsStrategy: value }));
    }

    public setComeBetOddsWorkingComeOut(value: boolean): Configuration {
        return new Configuration(Object.assign(this, { comeBetOddsWorkingComeOut: value }));
    }

    public setDontPassBet(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { dontPassBet: value }));
    }

    public setDontPassBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return new Configuration(Object.assign(this, { dontPassBetOddsStrategy: value }));
    }

    public setDontComeBet(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { dontComeBet: value }));
    }

    public setMaxDontComeBets(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { maxDontComeBets: value }));
    }

    public setDontComeBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return new Configuration(Object.assign(this, { dontComeBetOddsStrategy: value }));
    }

    public setDontComeBetOddsWorkingComeOut(value: boolean): Configuration {
        return new Configuration(Object.assign(this, { dontComeBetOddsWorkingComeOut: value }));
    }

    public setAvoidRounding(value: boolean): Configuration {
        return new Configuration(Object.assign(this, { avoidRounding: value }));
    }

    public setRounding(value: RoundingType): Configuration {
        return new Configuration(Object.assign(this, { rounding: value }));
    }

    public setSimulationCount(value: number | null): Configuration {
        return new Configuration(Object.assign(this, { simulationCount: value }));
    }

    //For numeric fields that could be misconfigured, provide a validity check to make sure it has a valid value. 

    public isInitialBankrollValid(): boolean {
        return this.initialBankroll != null && this.initialBankroll > 0;
    }

    public isBankrollMinimumValid(): boolean {
        return (this.initialBankroll != null) && (this.bankrollMinimum == null || (this.bankrollMinimum >= 0 && this.bankrollMinimum < this.initialBankroll));
    }

    public isBankrollMaximumValid(): boolean {
        return (this.initialBankroll != null) && (this.bankrollMaximum == null || this.bankrollMaximum > this.initialBankroll);
    }

    public isMaximumRollsValid(): boolean {
        return this.maximumRolls == null || this.maximumRolls > 0;
    }

    public isSimulationCountValid(): boolean {
        return this.simulationCount != null && this.simulationCount > 0;
    }

    public getInvalidFields(): string[] {
        const fieldNames = [];
        if (!this.isInitialBankrollValid()) {
            fieldNames.push('Initial Bankroll');
        }
        if (!this.isBankrollMinimumValid()) {
            fieldNames.push('Bankroll Minimum');
        }
        if (!this.isBankrollMaximumValid()) {
            fieldNames.push('Bankroll Maximum');
        }
        if (!this.isMaximumRollsValid()) {
            fieldNames.push('Maximum Rolls');
        }
        if (!this.isSimulationCountValid()) {
            fieldNames.push('Simulation Count');
        }
        //Check that we have at least one bet:
        if (this.passBet === null && this.comeBet === null && this.dontPassBet === null && this.dontComeBet === null) {
            fieldNames.push('At least one bet must be configured.');
        }
        return fieldNames;
    }

}