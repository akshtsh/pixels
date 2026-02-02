'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    defaultValue?: number;
    onChange: (value: number) => void;
    onReset: () => void;
    onCommit?: () => void; // Called on mouse/touch up to finalize the value
    unit?: string;
}

export default function Slider({
    label,
    value,
    min,
    max,
    step = 1,
    defaultValue = 0,
    onChange,
    onReset,
    onCommit,
    unit = '',
}: SliderProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const isModified = value !== defaultValue;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        if (!isNaN(newValue)) {
            onChange(Math.min(max, Math.max(min, newValue)));
        }
    };

    // Calculate the fill percentage for visual feedback
    const percentage = ((value - min) / (max - min)) * 100;
    const centerPoint = ((0 - min) / (max - min)) * 100;

    return (
        <div
            className="mb-3 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-editor-text">
                    {label}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={value}
                        onChange={handleInputChange}
                        onBlur={onCommit}
                        min={min}
                        max={max}
                        step={step}
                        className={cn(
                            'w-14 px-1 py-0.5 bg-editor-surface text-right text-xs font-mono text-editor-text',
                            'border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                            'outline-none focus:bg-yellow-50',
                            'transition-colors duration-150'
                        )}
                    />
                    <span className="text-xs font-bold text-editor-textDim w-4">{unit}</span>
                    <button
                        onClick={onReset}
                        className={cn(
                            'p-1 bg-editor-surface border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                            'hover:translate-y-px hover:shadow-[1px_1px_0_0_#000] hover:bg-red-100',
                            'transition-all duration-150',
                            isModified ? 'opacity-100' : 'opacity-50 pointer-events-none'
                        )}
                        title="Reset"
                    >
                        <RotateCcw size={10} className="text-editor-text" />
                    </button>
                </div>
            </div>

            <input
                type="range"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onMouseUp={onCommit}
                onTouchEnd={onCommit}
                className="w-full"
            />
        </div>
    );
}
