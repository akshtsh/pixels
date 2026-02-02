'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import Slider from '@/components/ui/Slider';
import { useEditorStore } from '@/lib/store';

export default function EffectsPanel() {
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
        <AccordionPanel title="Effects" icon={<Sparkles size={16} />}>
            <div onMouseUp={handleChangeComplete} onTouchEnd={handleChangeComplete}>
                <Slider
                    label="Vignette"
                    value={adjustments.vignette}
                    min={-100}
                    max={100}
                    onChange={(v) => handleChange('vignette', v)}
                    onReset={() => resetAdjustment('vignette')}
                />
                <Slider
                    label="Film Grain"
                    value={adjustments.grain}
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('grain', v)}
                    onReset={() => resetAdjustment('grain')}
                />
            </div>
        </AccordionPanel>
    );
}
