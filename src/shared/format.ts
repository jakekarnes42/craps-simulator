export const SLOW_SECONDS_PER_ROLL = 60;
export const AVG_SECONDS_PER_ROLL = 45;
export const FAST_SECONDS_PER_ROLL = 30;

export enum TableSpeed {
    Slow = SLOW_SECONDS_PER_ROLL * 1000,
    Average = AVG_SECONDS_PER_ROLL * 1000,
    Fast = FAST_SECONDS_PER_ROLL * 1000
}

export function formatDecimal(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

export function formatMoney(value: number): string {
    return `$${Math.abs(value).toFixed(2)}`;
}

export function formatSignedMoney(value: number): string {
    if (value === 0) return '$0.00';
    return `${value > 0 ? '+' : '-'}${formatMoney(value)}`;
}

export function formatTableTime(rolls: number, speed: TableSpeed = TableSpeed.Average): string {
    const totalMinutes = Math.round((rolls * speed) / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

export function moneyTone(value: number): string {
    if (value > 0) return 'is-positive';
    if (value < 0) return 'is-negative';
    return 'is-neutral';
}
