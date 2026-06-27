export type HistogramBin = {
    binLabel: string;
    count: number;
    rangeStart: number;
    rangeEnd: number;
};

export type DistributionStats = {
    min: number;
    max: number;
    mean: number;
    median: number;
    standardDeviation: number;
    p10: number;
    q1: number;
    q3: number;
    p90: number;
    histogram: HistogramBin[];
};

export function computeDistributionStats(data: number[], binCount: number = 10): DistributionStats {
    if (data.length === 0) {
        return {
            min: 0,
            max: 0,
            mean: 0,
            median: 0,
            standardDeviation: 0,
            p10: 0,
            q1: 0,
            q3: 0,
            p90: 0,
            histogram: [],
        };
    }

    let sum = 0;
    let sumSq = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const value of data) {
        sum += value;
        sumSq += value * value;
        if (value < min) min = value;
        if (value > max) max = value;
    }

    const mean = sum / data.length;
    const variance = sumSq / data.length - mean * mean;
    const sorted = [...data].sort((a, b) => a - b);

    return {
        min,
        max,
        mean,
        median: percentileFromSorted(sorted, 50),
        standardDeviation: Math.sqrt(Math.max(0, variance)),
        p10: percentileFromSorted(sorted, 10),
        q1: percentileFromSorted(sorted, 25),
        q3: percentileFromSorted(sorted, 75),
        p90: percentileFromSorted(sorted, 90),
        histogram: computeHistogram(sorted, min, max, binCount),
    };
}

function percentileFromSorted(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];

    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeHistogram(sorted: number[], min: number, max: number, binCount: number): HistogramBin[] {
    if (sorted.length === 0) return [];
    if (min === max) {
        return [{ binLabel: `${min}`, count: sorted.length, rangeStart: min, rangeEnd: max }];
    }

    const binSize = (max - min) / binCount;
    const bins = new Array(binCount).fill(0).map(() => ({ count: 0 }));

    for (const value of sorted) {
        const binIndex = value === max ? binCount - 1 : Math.floor((value - min) / binSize);
        bins[binIndex].count++;
    }

    return bins.map((bin, index) => {
        const rangeStart = Math.round(min + index * binSize);
        const rangeEnd = Math.round(min + (index + 1) * binSize);
        return {
            binLabel: `${rangeStart} - ${rangeEnd}`,
            count: bin.count,
            rangeStart,
            rangeEnd,
        };
    });
}
