'use client';

import React from 'react';
import { Focus } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import Slider from '@/components/ui/Slider';
import { useEditorStore } from '@/lib/store';

export default function DetailPanel() {
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
        <AccordionPanel title="Detail" icon={<Focus size={16} />}>
            <div onMouseUp={handleChangeComplete} onTouchEnd={handleChangeComplete}>
                <Slider
                    label="Sharpness"
                    value={adjustments.sharpness}
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('sharpness', v)}
                    onReset={() => resetAdjustment('sharpness')}
                />
                <Slider
                    label="Clarity"
                    value={adjustments.clarity}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('clarity', v)}
                    onReset={() => resetAdjustment('clarity')}
                />
                <Slider
                    label="Noise Reduction"
                    value={adjustments.noiseReduction}
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('noiseReduction', v)}
                    onReset={() => resetAdjustment('noiseReduction')}
                />
            </div>
        </AccordionPanel>
    );
}
