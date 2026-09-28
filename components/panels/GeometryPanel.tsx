'use client';

import React, { useState } from 'react';
import { Crop, RotateCw, RotateCcw, RulerIcon, Check, X, Scissors } from 'lucide-react';
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
    const applyCrop = useEditorStore((state) => state.applyCrop);
    const resetCrop = useEditorStore((state) => state.resetCrop);
    const image = useEditorStore((state) => state.image);

    const [isApplying, setIsApplying] = useState(false);

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

    const handleStartCrop = () => {
        setCropActive(true);
    };

    const handleApplyCrop = async () => {
        setIsApplying(true);
        try {
            await applyCrop();
        } finally {
            setIsApplying(false);
        }
    };

    const handleCancelCrop = () => {
        resetCrop();
        setCropActive(false);
    };

    // Compute crop dimensions info for display
    const cropW = image.originalWidth ? Math.round((crop.width / 100) * image.originalWidth) : 0;
    const cropH = image.originalHeight ? Math.round((crop.height / 100) * image.originalHeight) : 0;

    return (
        <AccordionPanel title="Geometry" icon={<RulerIcon size={16} />}>
            {/* Crop Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-editor-textMuted font-medium">Crop</span>
                    {!crop.isActive ? (
                        <button
                            onClick={handleStartCrop}
                            disabled={!image.src}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
                                'border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                                'transition-all duration-150',
                                image.src
                                    ? 'bg-white text-editor-text hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-yellow-50'
                                    : 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
                            )}
                        >
                            <Crop size={12} />
                            Crop
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleCancelCrop}
                                className={cn(
                                    'flex items-center gap-1 px-2 py-1.5 text-xs font-medium',
                                    'border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                                    'bg-white text-editor-text',
                                    'hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-red-50',
                                    'transition-all duration-150'
                                )}
                            >
                                <X size={12} />
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyCrop}
                                disabled={isApplying}
                                className={cn(
                                    'flex items-center gap-1 px-2 py-1.5 text-xs font-medium',
                                    'border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                                    'transition-all duration-150',
                                    isApplying
                                        ? 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
                                        : 'bg-green-400 text-editor-text hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-green-500'
                                )}
                            >
                                <Scissors size={12} />
                                {isApplying ? 'Applying...' : 'Apply'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Crop Info (shown when crop is active) */}
                {crop.isActive && (
                    <div className="mb-3 px-2 py-1.5 bg-editor-bg rounded border border-editor-border">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-editor-textMuted">Size</span>
                            <span className="text-editor-text font-mono font-medium">
                                {cropW} × {cropH} px
                            </span>
                        </div>
                    </div>
                )}

                {/* Aspect Ratio Buttons (always visible but more prominent when crop active) */}
                <div className={cn(
                    'grid grid-cols-4 gap-1.5 mb-3 transition-opacity duration-200',
                    !crop.isActive && 'opacity-50'
                )}>
                    {aspectRatios.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => {
                                if (!crop.isActive) setCropActive(true);
                                setCropAspectRatio(ratio.value);
                            }}
                            className={cn(
                                'px-2 py-1.5 text-xs font-medium',
                                'border-2 transition-all duration-150',
                                adjustments.cropAspectRatio === ratio.value
                                    ? 'bg-yellow-300 text-editor-text border-editor-border shadow-[1px_1px_0_0_#000]'
                                    : 'bg-white text-editor-text border-editor-border shadow-[1px_1px_0_0_#000] hover:bg-yellow-50 hover:translate-y-px hover:shadow-none'
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
                        'flex items-center justify-center w-8 h-8',
                        'bg-white border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                        'text-editor-text',
                        'hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-yellow-50',
                        'transition-all duration-150'
                    )}
                    title="Rotate 90° Counter-Clockwise"
                >
                    <RotateCcw size={14} />
                </button>
                <button
                    onClick={() => handleRotate(90)}
                    className={cn(
                        'flex items-center justify-center w-8 h-8',
                        'bg-white border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                        'text-editor-text',
                        'hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-yellow-50',
                        'transition-all duration-150'
                    )}
                    title="Rotate 90° Clockwise"
                >
                    <RotateCw size={14} />
                </button>
            </div>
        </AccordionPanel>
    );
}

