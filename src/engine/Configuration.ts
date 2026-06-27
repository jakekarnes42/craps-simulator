import { floorToPrecision, TablePrecision } from "./Money";
import { CRAPS_NUMBERS, CrapsNumber, effectiveNumberBetAmount } from "./NumberBets";
import { OddsBetStrategy, OddsBetStrategyType, PressStrategy, PressStrategyType } from "./Strategies";

export interface ConfigurationProps {
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
    numberBets: Record<CrapsNumber, NumberBetConfiguration>;
    pressLimit: number | null;
    placeNumberBetsDuringComeOut: boolean;
    leaveNumberBetsWorkingDuringComeOut: boolean;
    omitNumberBetOnPoint: boolean;
    avoidRounding: boolean;
    tablePrecision: TablePrecision;
    simulationCount: number | null;
}

export type NumberBetConfiguration = {
    amount: number | null;
    pressStrategy: PressStrategy;
};

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
    readonly numberBets: Record<CrapsNumber, NumberBetConfiguration>;
    readonly pressLimit: number | null;
    readonly placeNumberBetsDuringComeOut: boolean;
    readonly leaveNumberBetsWorkingDuringComeOut: boolean;
    readonly omitNumberBetOnPoint: boolean;
    readonly avoidRounding: boolean;
    readonly tablePrecision: TablePrecision;
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
            numberBets,
            pressLimit,
            placeNumberBetsDuringComeOut,
            leaveNumberBetsWorkingDuringComeOut,
            omitNumberBetOnPoint,
            avoidRounding,
            tablePrecision,
            simulationCount
        }: ConfigurationProps) {
        this.initialBankroll = initialBankroll ? floorToPrecision(initialBankroll, tablePrecision) : initialBankroll;
        this.bankrollMinimum = bankrollMinimum ? floorToPrecision(bankrollMinimum, tablePrecision) : bankrollMinimum;
        this.bankrollMaximum = bankrollMaximum ? floorToPrecision(bankrollMaximum, tablePrecision) : bankrollMaximum;
        this.maximumRolls = maximumRolls;
        this.passBet = passBet ? floorToPrecision(passBet, tablePrecision) : passBet;
        this.passBetOddsStrategy = passBetOddsStrategy;
        this.comeBet = comeBet ? floorToPrecision(comeBet, tablePrecision) : comeBet;
        this.maxComeBets = maxComeBets;
        this.comeBetOddsStrategy = comeBetOddsStrategy;
        this.comeBetOddsWorkingComeOut = comeBetOddsWorkingComeOut;
        this.dontPassBet = dontPassBet ? floorToPrecision(dontPassBet, tablePrecision) : dontPassBet;
        this.dontPassBetOddsStrategy = dontPassBetOddsStrategy;
        this.dontComeBet = dontComeBet ? floorToPrecision(dontComeBet, tablePrecision) : dontComeBet;
        this.maxDontComeBets = maxDontComeBets;
        this.dontComeBetOddsStrategy = dontComeBetOddsStrategy;
        this.dontComeBetOddsWorkingComeOut = dontComeBetOddsWorkingComeOut;
        this.numberBets = Object.fromEntries(CRAPS_NUMBERS.map(number => {
            const configured = numberBets[number];
            return [number, {
                amount: configured.amount === null ? null : floorToPrecision(configured.amount, tablePrecision),
                pressStrategy: configured.pressStrategy,
            }];
        })) as Record<CrapsNumber, NumberBetConfiguration>;
        this.pressLimit = pressLimit != null ? pressLimit : null;
        this.placeNumberBetsDuringComeOut = placeNumberBetsDuringComeOut ?? false;
        this.leaveNumberBetsWorkingDuringComeOut = leaveNumberBetsWorkingDuringComeOut ?? false;
        this.omitNumberBetOnPoint = omitNumberBetOnPoint ?? true;
        this.avoidRounding = avoidRounding;
        this.tablePrecision = tablePrecision;
        this.simulationCount = simulationCount;
    }

    static defaultConfiguration() {
        return new Configuration(
            {
                initialBankroll: 300,
                bankrollMinimum: 50,
                bankrollMaximum: 450,
                maximumRolls: 400,
                passBet: 15,
                passBetOddsStrategy: { type: OddsBetStrategyType.NONE },
                comeBet: null,
                maxComeBets: 3,
                comeBetOddsStrategy: { type: OddsBetStrategyType.NONE },
                comeBetOddsWorkingComeOut: false,
                dontPassBet: null,
                dontPassBetOddsStrategy: { type: OddsBetStrategyType.NONE },
                dontComeBet: null,
                maxDontComeBets: 3,
                dontComeBetOddsStrategy: { type: OddsBetStrategyType.NONE },
                dontComeBetOddsWorkingComeOut: true,
                numberBets: Object.fromEntries(CRAPS_NUMBERS.map(number => [
                    number,
                    { amount: null, pressStrategy: { type: PressStrategyType.NO_PRESS } },
                ])) as Record<CrapsNumber, NumberBetConfiguration>,
                pressLimit: null,
                placeNumberBetsDuringComeOut: false,
                leaveNumberBetsWorkingDuringComeOut: false,
                omitNumberBetOnPoint: true,
                avoidRounding: true,
                tablePrecision: TablePrecision.DOLLAR,
                simulationCount: 10_000
            });
    }

    private copy(overrides: Partial<ConfigurationProps>): Configuration {
        return new Configuration({ ...this, ...overrides });
    }

    public setInitialBankroll(value: number | null): Configuration {
        return this.copy({ initialBankroll: value });
    }

    public setBankrollMinimum(value: number | null): Configuration {
        return this.copy({ bankrollMinimum: value });
    }

    public setBankrollMaximum(value: number | null): Configuration {
        return this.copy({ bankrollMaximum: value });
    }

    public setMaximumRolls(value: number | null): Configuration {
        return this.copy({ maximumRolls: value });
    }

    public setPassBet(value: number | null): Configuration {
        return this.copy({ passBet: value });
    }

    public setPassBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return this.copy({ passBetOddsStrategy: value });
    }

    public setComeBet(value: number | null): Configuration {
        return this.copy({ comeBet: value });
    }

    public setMaxComeBets(value: number): Configuration {
        return this.copy({ maxComeBets: value });
    }

    public setComeBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return this.copy({ comeBetOddsStrategy: value });
    }

    public setComeBetOddsWorkingComeOut(value: boolean): Configuration {
        return this.copy({ comeBetOddsWorkingComeOut: value });
    }

    public setDontPassBet(value: number | null): Configuration {
        return this.copy({ dontPassBet: value });
    }

    public setDontPassBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return this.copy({ dontPassBetOddsStrategy: value });
    }

    public setDontComeBet(value: number | null): Configuration {
        return this.copy({ dontComeBet: value });
    }

    public setMaxDontComeBets(value: number): Configuration {
        return this.copy({ maxDontComeBets: value });
    }

    public setDontComeBetOddsStrategy(value: OddsBetStrategy): Configuration {
        return this.copy({ dontComeBetOddsStrategy: value });
    }

    public setDontComeBetOddsWorkingComeOut(value: boolean): Configuration {
        return this.copy({ dontComeBetOddsWorkingComeOut: value });
    }

    public getNumberBet(number: CrapsNumber): number | null {
        return this.numberBets[number].amount;
    }

    public effectiveNumberBet(number: CrapsNumber): number | null {
        return effectiveNumberBetAmount(this.getNumberBet(number), number, this.avoidRounding);
    }

    public setNumberBet(number: CrapsNumber, value: number | null): Configuration {
        return this.copy({
            numberBets: {
                ...this.numberBets,
                [number]: { ...this.numberBets[number], amount: value },
            },
        });
    }

    public getPressStrategy(number: CrapsNumber): PressStrategy {
        return this.numberBets[number].pressStrategy;
    }

    public setPressStrategy(number: CrapsNumber, value: PressStrategy): Configuration {
        return this.copy({
            numberBets: {
                ...this.numberBets,
                [number]: { ...this.numberBets[number], pressStrategy: value },
            },
        });
    }

    public numberBetConfigurations(): Array<{ number: CrapsNumber; amount: number | null; effectiveAmount: number | null; pressStrategy: PressStrategy }> {
        return CRAPS_NUMBERS.map((number) => ({
            number,
            amount: this.numberBets[number].amount,
            effectiveAmount: this.effectiveNumberBet(number),
            pressStrategy: this.numberBets[number].pressStrategy,
        }));
    }

    public setPressLimit(value: number | null): Configuration {
        return this.copy({ pressLimit: value });
    }

    public setPlaceNumberBetsDuringComeOut(value: boolean): Configuration {
        return this.copy({ placeNumberBetsDuringComeOut: value });
    }

    public setLeaveNumberBetsWorkingDuringComeOut(value: boolean): Configuration {
        return this.copy({ leaveNumberBetsWorkingDuringComeOut: value });
    }

    public setOmitNumberBetOnPoint(value: boolean): Configuration {
        return this.copy({ omitNumberBetOnPoint: value });
    }

    public setAvoidRounding(value: boolean): Configuration {
        return this.copy({ avoidRounding: value });
    }

    public setTablePrecision(value: TablePrecision): Configuration {
        return this.copy({ tablePrecision: value });
    }

    public setSimulationCount(value: number | null): Configuration {
        return this.copy({ simulationCount: value });
    }

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
        return this.maximumRolls == null || isPositiveInteger(this.maximumRolls);
    }

    public isSimulationCountValid(): boolean {
        return this.simulationCount != null && isPositiveInteger(this.simulationCount);
    }

    public isPressLimitValid(): boolean {
        return this.pressLimit === null || isPositiveInteger(this.pressLimit);
    }

    public areBetAmountsValid(): boolean {
        return [
            this.passBet,
            this.comeBet,
            this.dontPassBet,
            this.dontComeBet,
            ...CRAPS_NUMBERS.map((number) => this.getNumberBet(number)),
        ].every((value) => value === null || value > 0);
    }

    public areComeBetCountsValid(): boolean {
        return (!this.comeBet || isPositiveInteger(this.maxComeBets))
            && (!this.dontComeBet || isPositiveInteger(this.maxDontComeBets));
    }

    public hasAtLeastOneBet(): boolean {
        return [
            this.passBet,
            this.comeBet,
            this.dontPassBet,
            this.dontComeBet,
            ...CRAPS_NUMBERS.map((number) => this.getNumberBet(number)),
        ].some((value) => value !== null && value > 0);
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
            fieldNames.push('Press Limit (must be empty for unlimited or a positive whole number)');
        }
        if (!this.areBetAmountsValid()) {
            fieldNames.push('Bet amounts must be positive when configured.');
        }
        if (!this.areComeBetCountsValid()) {
            fieldNames.push('Come and Don\'t Come maximum bet counts must be positive whole numbers when those bets are configured.');
        }
        if (!this.hasAtLeastOneBet()) {
            fieldNames.push('At least one bet must be configured.');
        }
        return fieldNames;
    }

}

function isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
}
