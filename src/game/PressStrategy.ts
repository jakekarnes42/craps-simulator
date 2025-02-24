export enum PressStrategyType {
    NO_PRESS = "No Press",
    PRESS_UNTIL = "Press Until Amount",
    HALF_PRESS = "Half Press",
    FULL_PRESS = "Full Press",
    POWER_PRESS = "Power Press"
}

export type PressStrategy = {
    type: PressStrategyType;
    value: number;
};
