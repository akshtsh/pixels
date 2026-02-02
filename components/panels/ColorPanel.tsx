'use client';

import React from 'react';
import { Palette } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import Slider from '@/components/ui/Slider';
import { useEditorStore } from '@/lib/store';

export default function ColorPanel() {
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
        <AccordionPanel title="Color" icon={<Palette size={16} />}>
            <div onMouseUp={handleChangeComplete} onTouchEnd={handleChangeComplete}>
                <Slider
                    label="Saturation"
                    value={adjustments.saturation}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('saturation', v)}
                    onReset={() => resetAdjustment('saturation')}
                />
                <Slider
                    label="Vibrance"
                    value={adjustments.vibrance}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('vibrance', v)}
                    onReset={() => resetAdjustment('vibrance')}
                />
                <Slider
                    label="Temperature"
                    value={adjustments.temperature}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('temperature', v)}
                    onReset={() => resetAdjustment('temperature')}
                />
                <Slider
                    label="Tint"
                    value={adjustments.tint}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('tint', v)}
                    onReset={() => resetAdjustment('tint')}
                />
            </div>
        </AccordionPanel>
    );
}
