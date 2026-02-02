'use client';

import React from 'react';
import { Sun } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import Slider from '@/components/ui/Slider';
import { useEditorStore } from '@/lib/store';

export default function LightPanel() {
    const adjustments = useEditorStore((state) => state.adjustments);
    const updateAdjustment = useEditorStore((state) => state.updateAdjustment);
    const resetAdjustment = useEditorStore((state) => state.resetAdjustment);
    const pushHistory = useEditorStore((state) => state.pushHistory);

    const handleChange = (key: keyof typeof adjustments, value: number) => {
        updateAdjustment(key, value);
    };

    const handleChangeComplete = () => {
        pushHistory();
    };

    return (
        <AccordionPanel title="Light" icon={<Sun size={16} />} defaultOpen>
            <div onMouseUp={handleChangeComplete} onTouchEnd={handleChangeComplete}>
                <Slider
                    label="Exposure"
                    value={adjustments.exposure}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('exposure', v)}
                    onReset={() => resetAdjustment('exposure')}
                />
                <Slider
                    label="Brilliance"
                    value={adjustments.brilliance}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('brilliance', v)}
                    onReset={() => resetAdjustment('brilliance')}
                />
                <Slider
                    label="Highlights"
                    value={adjustments.highlights}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('highlights', v)}
                    onReset={() => resetAdjustment('highlights')}
                />
                <Slider
                    label="Shadows"
                    value={adjustments.shadows}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('shadows', v)}
                    onReset={() => resetAdjustment('shadows')}
                />
                <Slider
                    label="Contrast"
                    value={adjustments.contrast}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('contrast', v)}
                    onReset={() => resetAdjustment('contrast')}
                />
                <Slider
                    label="Brightness"
                    value={adjustments.brightness}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('brightness', v)}
                    onReset={() => resetAdjustment('brightness')}
                />
                <Slider
                    label="Black Point"
                    value={adjustments.blackPoint}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('blackPoint', v)}
                    onReset={() => resetAdjustment('blackPoint')}
                />
            </div>
        </AccordionPanel>
    );
}
