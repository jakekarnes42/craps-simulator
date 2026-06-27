export enum TablePrecision {
    DOLLAR = 'Whole Dollars',
    CENT = 'Cents'
}

export function floorToPrecision(value: number, precision: TablePrecision): number {
    const multiplier = precision === TablePrecision.DOLLAR ? 1 : 100;
    const scaledValue = Number((value * multiplier).toPrecision(15));
    return Math.floor(scaledValue + 1e-9) / multiplier;
}
