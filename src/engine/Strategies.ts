export enum OddsBetStrategyType {
    NONE = 'None',
    SETAMOUNT = 'Set Amount',
    MULTIPLIER = 'Multiplier',
    TABLEMAX = 'Max 3-4-5X'
}

export type OddsBetStrategy =
    | { type: OddsBetStrategyType.NONE }
    | { type: OddsBetStrategyType.SETAMOUNT; amount: number }
    | { type: OddsBetStrategyType.MULTIPLIER; multiplier: number }
    | { type: OddsBetStrategyType.TABLEMAX };

export enum PressStrategyType {
    NO_PRESS = 'No Press',
    PRESS_UNTIL = 'Press Until Amount',
    HALF_PRESS = 'Half Press',
    FULL_PRESS = 'Full Press',
    POWER_PRESS = 'Power Press'
}

export type PressStrategy =
    | { type: PressStrategyType.NO_PRESS }
    | { type: PressStrategyType.PRESS_UNTIL; target: number }
    | { type: PressStrategyType.HALF_PRESS }
    | { type: PressStrategyType.FULL_PRESS }
    | { type: PressStrategyType.POWER_PRESS };
