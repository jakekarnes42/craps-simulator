
export enum OddsBetStrategyType {
    NONE = 'None',
    SETAMOUNT = 'Set Amount',
    MULTIPLIER = 'Multiplier',
    TABLEMAX = 'Max 3-4-5X'
}

export type OddsBetStrategy = {
    type: OddsBetStrategyType;
    value: number;
};
