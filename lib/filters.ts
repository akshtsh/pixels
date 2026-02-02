import { AdjustmentState } from './store';

export function computeFilterString(adjustments: AdjustmentState): string {
    const filters: string[] = [];

    // Brightness: 0 = 100% (no change), range -100 to 100 maps to 0% to 200%
    const brightness = 1 + adjustments.brightness / 100;
    filters.push(`brightness(${brightness})`);

    // Contrast: 0 = 100% (no change), range -100 to 100 maps to 0% to 200%
    const contrast = 1 + adjustments.contrast / 100;
    filters.push(`contrast(${contrast})`);

    // Saturation: 0 = 100% (no change), range -100 to 100 maps to 0% to 200%
    const saturation = 1 + adjustments.saturation / 100;
    filters.push(`saturate(${saturation})`);

    // Exposure simulation using brightness
    const exposure = 1 + adjustments.exposure / 50;
    filters.push(`brightness(${exposure})`);

    // Temperature (warmth) - using sepia and hue-rotate combination
    if (adjustments.temperature !== 0) {
        const temp = adjustments.temperature;
        if (temp > 0) {
            // Warmer - add sepia and reduce
            filters.push(`sepia(${temp / 200})`);
        } else {
            // Cooler - shift hue towards blue
            filters.push(`hue-rotate(${temp / 2}deg)`);
        }
    }

    // Tint using hue-rotate
    if (adjustments.tint !== 0) {
        filters.push(`hue-rotate(${adjustments.tint}deg)`);
    }

    // Highlights and Shadows simulation
    // These are approximations using additional brightness/contrast
    const highlightMod = 1 + adjustments.highlights / 200;
    const shadowMod = 1 + adjustments.shadows / 200;

    // Apply subtle adjustments
    if (adjustments.highlights !== 0 || adjustments.shadows !== 0) {
        const combinedBrightness = (highlightMod + shadowMod) / 2;
        filters.push(`brightness(${combinedBrightness})`);
    }

    // Black point - affects the darkest parts
    if (adjustments.blackPoint !== 0) {
        const blackPointContrast = 1 + adjustments.blackPoint / 100;
        filters.push(`contrast(${blackPointContrast})`);
    }

    // Vibrance - similar to saturation but more subtle
    if (adjustments.vibrance !== 0) {
        const vibrance = 1 + adjustments.vibrance / 150;
        filters.push(`saturate(${vibrance})`);
    }

    // Brilliance - combination of brightness and contrast
    if (adjustments.brilliance !== 0) {
        const brilliance = 1 + adjustments.brilliance / 150;
        filters.push(`brightness(${brilliance})`);
        filters.push(`contrast(${1 + adjustments.brilliance / 300})`);
    }

    // Blur for noise reduction (inverse - more reduction = more blur)
    if (adjustments.noiseReduction > 0) {
        const blur = adjustments.noiseReduction / 50;
        filters.push(`blur(${blur}px)`);
    }

    return filters.join(' ');
}

export function computeCanvasStyles(adjustments: AdjustmentState): React.CSSProperties {
    const styles: React.CSSProperties = {
        filter: computeFilterString(adjustments),
        transform: `rotate(${adjustments.straighten}deg) rotate(${adjustments.rotation}deg)`,
        transformOrigin: 'center center',
    };

    return styles;
}

// Vignette is applied as a radial gradient overlay
export function computeVignetteStyle(vignette: number): React.CSSProperties {
    if (vignette === 0) return {};

    const intensity = Math.abs(vignette) / 100;
    const color = vignette > 0 ? '0,0,0' : '255,255,255';

    return {
        background: `radial-gradient(ellipse at center, transparent 0%, transparent ${60 - intensity * 30}%, rgba(${color},${intensity * 0.8}) 100%)`,
    };
}

// Film grain is applied as an animated noise overlay
export function getGrainOpacity(grain: number): number {
    return grain / 100 * 0.3;
}
