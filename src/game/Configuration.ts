import { round } from "../util/Util";
import { OddsBetStrategy, OddsBetStrategyType } from "./OddsBetStrategy";
import { PressStrategy } from "./PressStrategy";
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
    numberBet4: number | null;
    numberBet5: number | null;
    numberBet6: number | null;
    numberBet8: number | null;
    numberBet9: number | null;
    numberBet10: number | null;
    placeNumberBetsDuringComeOut: boolean;
    leaveNumberBetsWorkingDuringComeOut: boolean;
    omitNumberBetOnPoint: boolean;
    pressLimit: number | null;
    pressStrategy: PressStrategy;
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
    readonly numberBet4: number | null;
    readonly numberBet5: number | null;
    readonly numberBet6: number | null;
    readonly numberBet8: number | null;
    readonly numberBet9: number | null;
    readonly numberBet10: number | null;
    readonly placeNumberBetsDuringComeOut: boolean;
    readonly leaveNumberBetsWorkingDuringComeOut: boolean;
    readonly omitNumberBetOnPoint: boolean;
    readonly pressLimit: number | null;
    readonly pressStrategy: PressStrategy;
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
            numberBet4,
            numberBet5,
            numberBet6,
            numberBet8,
            numberBet9,
            numberBet10,
            placeNumberBetsDuringComeOut,
            leaveNumberBetsWorkingDuringComeOut,
            omitNumberBetOnPoint,
            pressLimit,
            pressStrategy,
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
        this.numberBet4 = numberBet4 != null ? round(numberBet4, rounding) : null;
        this.numberBet5 = numberBet5 != null ? round(numberBet5, rounding) : null;
        this.numberBet6 = numberBet6 != null ? round(numberBet6, rounding) : null;
        this.numberBet8 = numberBet8 != null ? round(numberBet8, rounding) : null;
        this.numberBet9 = numberBet9 != null ? round(numberBet9, rounding) : null;
        this.numberBet10 = numberBet10 != null ? round(numberBet10, rounding) : null;
        this.placeNumberBetsDuringComeOut = placeNumberBetsDuringComeOut ?? false;
        this.leaveNumberBetsWorkingDuringComeOut = leaveNumberBetsWorkingDuringComeOut ?? false;
        this.omitNumberBetOnPoint = omitNumberBetOnPoint ?? true;
        this.pressLimit = pressLimit != null ? pressLimit : null;
        this.pressStrategy = pressStrategy || PressStrategy.NO_PRESS;
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
                numberBet4: null,
                numberBet5: null,
                numberBet6: null,
                numberBet8: null,
                numberBet9: null,
                numberBet10: null,
                placeNumberBetsDuringComeOut: false,
                leaveNumberBetsWorkingDuringComeOut: false,
                omitNumberBetOnPoint: true,
                pressLimit: null, // Unlimited by default
                pressStrategy: PressStrategy.NO_PRESS,
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

    public setNumberBet4(value: number | null): Configuration {
        return new Configuration(Object.assign({}, this, { numberBet4: value }));
    }

    public setNumberBet5(value: number | null): Configuration {
        return new Configuration(Object.assign({}, this, { numberBet5: value }));
    }

    public setNumberBet6(value: number | null): Configuration {
        return new Configuration(Object.assign({}, this, { numberBet6: value }));
    }

    public setNumberBet8(value: number | null): Configuration {
        return new Configuration(Object.assign({}, this, { numberBet8: value }));
    }

    public setNumberBet9(value: number | null): Configuration {
        return new Configuration(Object.assign({}, this, { numberBet9: value }));
    }

    public setNumberBet10(value: number | null): Configuration {
        return new Configuration(Object.assign({}, this, { numberBet10: value }));
    }

    public setPlaceNumberBetsDuringComeOut(value: boolean): Configuration {
        return new Configuration({ ...this, placeNumberBetsDuringComeOut: value });
    }

    public setLeaveNumberBetsWorkingDuringComeOut(value: boolean): Configuration {
        return new Configuration({ ...this, leaveNumberBetsWorkingDuringComeOut: value });
    }

    public setOmitNumberBetOnPoint(value: boolean): Configuration {
        return new Configuration({ ...this, omitNumberBetOnPoint: value });
    }

    public setPressLimit(value: number | null): Configuration {
        return new Configuration({ ...this, pressLimit: value });
    }

    public setPressStrategy(value: PressStrategy): Configuration {
        return new Configuration({ ...this, pressStrategy: value });
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

    public isPressLimitValid(): boolean {
        return this.pressLimit === null || this.pressLimit >= 1;
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
        if (!this.isPressLimitValid()) {
            fieldNames.push('Press Limit (must be empty for unlimited or 1 or greater)');
        }
        //Check that we have at least one bet:
        if (this.passBet === null && this.comeBet === null && this.dontPassBet === null && this.dontComeBet === null && this.numberBet4 === null && this.numberBet5 === null && this.numberBet6 === null && this.numberBet8 === null && this.numberBet9 === null && this.numberBet10 === null) {
            fieldNames.push('At least one bet must be configured.');
        }
        return fieldNames;
    }

}