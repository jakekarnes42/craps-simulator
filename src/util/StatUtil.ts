/** Simple structure to hold summary stats. */
export type SummaryStats = {
    mean: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
};

/**
 * Compute essential summary stats for an array of numbers.
 */
export function computeSummaryStats(data: number[]): SummaryStats {
    if (!data.length) {
        return { mean: 0, median: 0, min: 0, max: 0, standardDeviation: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Mean
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / data.length;

    // Median
    let median = 0;
    if (sorted.length % 2 === 0) {
        const mid = sorted.length / 2;
        median = (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        median = sorted[Math.floor(sorted.length / 2)];
    }

    // Standard Deviation
    const variance =
        data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / data.length;
    const standardDeviation = Math.sqrt(variance);

    return {
        mean,
        median,
        min,
        max,
        standardDeviation,
    };
}

/**
 * Bin data into histogram buckets. 
 * Returns an array like: [{ binLabel, count }, ...].
 */
export function computeHistogramData(
    data: number[],
    binCount: number = 10
): Array<{ binLabel: string; count: number }> {
    if (data.length === 0) return [];

    // Determine range
    const min = Math.min(...data);
    const max = Math.max(...data);

    // If all bankrolls are identical, just one bin
    if (min === max) {
        return [{ binLabel: `${min}`, count: data.length }];
    }

    const binSize = (max - min) / binCount;
    // Initialize bins
    const bins = new Array(binCount).fill(0).map(() => ({ count: 0 }));

    // Count each data point into the right bin
    for (const val of data) {
        // which bin does val fall into?
        const binIndex =
            val === max
                ? binCount - 1 // edge case for max
                : Math.floor((val - min) / binSize);
        bins[binIndex].count += 1;
    }

    // Construct labels
    return bins.map((b, i) => {
        const rangeStart = Math.round(min + i * binSize);
        const rangeEnd = Math.round(min + (i + 1) * binSize);
        return {
            binLabel: `${rangeStart} - ${rangeEnd}`,
            count: b.count,
        };
    });
}

export function median(numbers: Array<number>) {
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}
