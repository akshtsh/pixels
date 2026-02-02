'use client';

import React from 'react';
import { Crop, RotateCw, RotateCcw, RulerIcon, Check } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import Slider from '@/components/ui/Slider';
import { useEditorStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const aspectRatios = [
    { label: 'Free', value: 'free' },
    { label: '1:1', value: '1:1' },
    { label: '4:3', value: '4:3' },
    { label: '3:4', value: '3:4' },
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
    { label: '3:2', value: '3:2' },
    { label: '2:3', value: '2:3' },
];

export default function GeometryPanel() {
    const adjustments = useEditorStore((state) => state.adjustments);
    const updateAdjustment = useEditorStore((state) => state.updateAdjustment);
    const resetAdjustment = useEditorStore((state) => state.resetAdjustment);
    const pushHistory = useEditorStore((state) => state.pushHistory);
    const setCropActive = useEditorStore((state) => state.setCropActive);
    const crop = useEditorStore((state) => state.crop);
    const setCropAspectRatio = useEditorStore((state) => state.setCropAspectRatio);
    const setStraighten = useEditorStore((state) => state.setStraighten);

    const handleRotate = (degrees: number) => {
        const newRotation = (adjustments.rotation + degrees) % 360;
        updateAdjustment('rotation', newRotation);
        pushHistory();
    };



    const handleStraightenChange = (value: number) => {
        setStraighten(value);
    };

    const handleChangeComplete = () => {
        pushHistory();
    };

    return (
        <AccordionPanel title="Geometry" icon={<RulerIcon size={16} />}>
            {/* Crop Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-editor-textMuted font-medium">Crop</span>
                    <button
                        onClick={() => setCropActive(!crop.isActive)}
                        className={cn(
                            'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                            'transition-colors duration-150',
                            crop.isActive
                                ? 'bg-editor-accent text-white'
                                : 'bg-editor-border text-white hover:bg-editor-borderLight'
                        )}
                    >
                        <Crop size={12} />
                        {crop.isActive ? 'Done' : 'Crop'}
                    </button>
                </div>

                {/* Aspect Ratio Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {aspectRatios.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => setCropAspectRatio(ratio.value)}
                            className={cn(
                                'px-2 py-1.5 rounded text-xs',
                                'transition-colors duration-150',
                                adjustments.cropAspectRatio === ratio.value
                                    ? 'bg-editor-accent text-white'
                                    : 'bg-editor-border text-white hover:bg-editor-borderLight hover:text-white'
                            )}
                        >
                            {ratio.label}
                        </button>
                    ))}
                </div>
            </div>



            {/* Straighten */}
            <div onMouseUp={handleChangeComplete} onTouchEnd={handleChangeComplete} className="mb-4">
                <Slider
                    label="Straighten"
                    value={adjustments.straighten}
                    min={-45}
                    max={45}
                    step={0.1}
                    unit="°"
                    onChange={handleStraightenChange}
                    onReset={() => resetAdjustment('straighten')}
                />
            </div>

            {/* Rotate Buttons */}
            <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-editor-textMuted font-medium flex-1">Rotate</span>
                <button
                    onClick={() => handleRotate(-90)}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 rounded',
                        'bg-editor-border text-white',
                        'hover:bg-editor-borderLight transition-colors duration-150'
                    )}
                    title="Rotate 90° Counter-Clockwise"
                >
                    <RotateCcw size={14} />
                </button>
                <button
                    onClick={() => handleRotate(90)}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 rounded',
                        'bg-editor-border text-white',
                        'hover:bg-editor-borderLight transition-colors duration-150'
                    )}
                    title="Rotate 90° Clockwise"
                >
                    <RotateCw size={14} />
                </button>
            </div>
        </AccordionPanel>
    );
}
