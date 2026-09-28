import { AdjustmentState } from './store';

/**
 * Computes a high-quality CSS filter string from the adjustment state.
 */
export function computeFilterString(adjustments: AdjustmentState): string {
    const filters: string[] = [];

    // 1. Exposure (Brightness multiplier)
    const exposureVal = adjustments.exposure ?? 0;
    if (exposureVal !== 0) {
        const exposure = 1 + exposureVal / 60;
        filters.push(`brightness(${Math.max(0.05, exposure).toFixed(3)})`);
    }

    // 2. Brightness
    const brightnessVal = adjustments.brightness ?? 0;
    if (brightnessVal !== 0) {
        const brightness = 1 + brightnessVal / 100;
        filters.push(`brightness(${Math.max(0.05, brightness).toFixed(3)})`);
    }

    // 3. Contrast
    const contrastVal = adjustments.contrast ?? 0;
    if (contrastVal !== 0) {
        const contrast = 1 + contrastVal / 100;
        filters.push(`contrast(${Math.max(0.05, contrast).toFixed(3)})`);
    }

    // 4. Brilliance (Smart midtone & contrast dynamic punch)
    const brillianceVal = adjustments.brilliance ?? 0;
    if (brillianceVal !== 0) {
        const bBright = 1 + brillianceVal / 160;
        const bContrast = 1 + brillianceVal / 220;
        filters.push(`brightness(${Math.max(0.1, bBright).toFixed(3)})`);
        filters.push(`contrast(${Math.max(0.1, bContrast).toFixed(3)})`);
    }

    // 5. Highlights and Shadows
    const highlightsVal = adjustments.highlights ?? 0;
    const shadowsVal = adjustments.shadows ?? 0;
    if (highlightsVal !== 0 || shadowsVal !== 0) {
        // Highlights compression/boost & Shadow lift/crush
        const hMod = 1 + (highlightsVal / 250);
        const sMod = 1 + (shadowsVal / 250);
        const combined = (hMod + sMod) / 2;
        filters.push(`brightness(${Math.max(0.1, combined).toFixed(3)})`);
        if (shadowsVal > 0) {
            // Shadow recovery softens contrast slightly
            filters.push(`contrast(${Math.max(0.2, 1 - shadowsVal / 400).toFixed(3)})`);
        }
    }

    // 6. Black Point (crushes or lifts dark tones)
    const blackPointVal = adjustments.blackPoint ?? 0;
    if (blackPointVal !== 0) {
        const bpContrast = 1 + blackPointVal / 120;
        const bpBright = 1 - blackPointVal / 350;
        filters.push(`contrast(${Math.max(0.1, bpContrast).toFixed(3)})`);
        filters.push(`brightness(${Math.max(0.1, bpBright).toFixed(3)})`);
    }

    // 7. Saturation
    const satVal = adjustments.saturation ?? 0;
    if (satVal !== 0) {
        const saturation = 1 + satVal / 100;
        filters.push(`saturate(${Math.max(0, saturation).toFixed(3)})`);
    }

    // 8. Vibrance (Gentler saturation curve with contrast boost)
    const vibranceVal = adjustments.vibrance ?? 0;
    if (vibranceVal !== 0) {
        const vibrance = 1 + vibranceVal / 130;
        filters.push(`saturate(${Math.max(0, vibrance).toFixed(3)})`);
    }

    // 9. Temperature (Warmth / Coolness)
    const tempVal = adjustments.temperature ?? 0;
    if (tempVal !== 0) {
        if (tempVal > 0) {
            // Warm tones: subtle sepia + warmth saturation
            const sepia = (tempVal / 180).toFixed(3);
            const warmSat = (1 + tempVal / 300).toFixed(3);
            filters.push(`sepia(${sepia})`);
            filters.push(`saturate(${warmSat})`);
        } else {
            // Cool tones: slight blue-cyan shift without distorting green/reds severely
            const coolAngle = (tempVal * 0.25).toFixed(1);
            const coolSat = (1 - Math.abs(tempVal) / 400).toFixed(3);
            filters.push(`hue-rotate(${coolAngle}deg)`);
            filters.push(`saturate(${coolSat})`);
        }
    }

    // 10. Tint (Green / Magenta shift)
    const tintVal = adjustments.tint ?? 0;
    if (tintVal !== 0) {
        const tintAngle = (tintVal * 0.3).toFixed(1);
        filters.push(`hue-rotate(${tintAngle}deg)`);
    }

    // 11. Clarity (Local contrast enhancement simulation)
    const clarityVal = adjustments.clarity ?? 0;
    if (clarityVal !== 0) {
        const clarityContrast = 1 + clarityVal / 180;
        filters.push(`contrast(${Math.max(0.1, clarityContrast).toFixed(3)})`);
    }

    // 12. Noise Reduction (Smooth blur)
    const noiseRedVal = adjustments.noiseReduction ?? 0;
    if (noiseRedVal > 0) {
        const blurPx = (noiseRedVal / 60).toFixed(2);
        filters.push(`blur(${blurPx}px)`);
    }

    // Return combined filters or 'none'
    return filters.length > 0 ? filters.join(' ') : 'none';
}

/**
 * Computes container styles for previewing
 */
export function computeCanvasStyles(adjustments: AdjustmentState): React.CSSProperties {
    const filter = computeFilterString(adjustments);
    return {
        filter: filter === 'none' ? undefined : filter,
        transform: `rotate(${adjustments.straighten || 0}deg) rotate(${adjustments.rotation || 0}deg)`,
        transformOrigin: 'center center',
        transition: 'filter 75ms ease-out',
    };
}

/**
 * Enhanced vignette styling with realistic optical falloff
 */
export function computeVignetteStyle(vignette: number): React.CSSProperties {
    if (!vignette || vignette === 0) return {};

    const intensity = Math.min(1, Math.abs(vignette) / 100);
    const isDark = vignette > 0;
    const color = isDark ? '0, 0, 0' : '255, 255, 255';
    const innerStop = Math.max(20, Math.round(65 - intensity * 35));
    const midOpacity = (intensity * 0.45).toFixed(3);
    const edgeOpacity = (intensity * 0.9).toFixed(3);

    return {
        background: `radial-gradient(ellipse at center, rgba(${color}, 0) 0%, rgba(${color}, 0) ${innerStop}%, rgba(${color}, ${midOpacity}) ${innerStop + 20}%, rgba(${color}, ${edgeOpacity}) 100%)`,
    };
}

/**
 * Film grain opacity calculation
 */
export function getGrainOpacity(grain: number): number {
    if (!grain || grain <= 0) return 0;
    return Math.min(0.4, (grain / 100) * 0.35);
}
