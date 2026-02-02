/**
 * Analyzes image data (histogram) to calculate auto-enhancement values.
 */
export function calculateAutoEnhance(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;

    let min = 255;
    let max = 0;
    let avg = 0;

    // Simple sampling (step 4 for performance)
    for (let i = 0; i < len; i += 4 * 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (lum < min) min = lum;
        if (lum > max) max = lum;
        avg += lum;
    }

    avg /= (len / 16); // adjusted for sampling

    // Heuristics
    // 1. Exposure: Aim for mid-gray (128)
    const exposure = clamp((128 - avg) / 2, -30, 30);

    // 2. Contrast: Expand range if narrow
    const range = max - min;
    const contrast = range < 100 ? clamp((150 - range) / 2, 0, 30) : 0;

    // 3. Highlights/Shadows: Recover if clipped
    const highlights = max > 240 ? -20 : 0;
    const shadows = min < 15 ? 20 : 0;

    return {
        exposure,
        contrast,
        highlights,
        shadows,
        brightness: 0,
        blackPoint: 0,
        saturation: 10,
        brilliance: 5,
    };
}

/**
 * Uses Gray World Assumption to estimate Temp/Tint
 */
export function calculateAutoWB(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;

    let sumR = 0, sumG = 0, sumB = 0;

    for (let i = 0; i < len; i += 4 * 8) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
    }

    const numPixels = len / (4 * 8);
    const avgR = sumR / numPixels;
    const avgG = sumG / numPixels;
    const avgB = sumB / numPixels;

    // Gray World: avgR = avgG = avgB
    // We use G as the anchor

    // Temp: Red vs Blue balance
    // If R > B, image is warm (reduce temp). If B > R, image is cool (increase temp).
    // We want to bring them closer to G or each other.
    const tempOffset = (avgB - avgR) * 1.5;

    // Tint: Green prominence
    // If G is high, magenta is needed (increase tint).
    const tintOffset = (avgG - (avgR + avgB) / 2) * 1.5;

    return {
        temperature: clamp(tempOffset, -50, 50),
        tint: clamp(tintOffset, -50, 50),
    };
}

function clamp(val: number, min: number, max: number) {
    return Math.min(Math.max(val, min), max);
}
