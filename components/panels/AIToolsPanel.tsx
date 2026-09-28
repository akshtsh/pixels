'use client';

import React, { useState } from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import { useEditorStore } from '@/lib/store';
import { calculateAutoEnhance, calculateAutoWB } from '@/lib/image-processing';
import { cn } from '@/lib/utils';

export default function AIToolsPanel() {
    const image = useEditorStore((state) => state.image);
    const setAdjustments = useEditorStore((state) => state.setAdjustments);

    const [isEnhancing, setIsEnhancing] = useState(false);

    const handleAutoEnhance = async () => {
        if (!image.src) return;
        setIsEnhancing(true);

        try {
            // Create an offscreen canvas to analyze the image histogram & color channels
            const img = new Image();
            img.src = image.src;
            img.crossOrigin = 'Anonymous';
            await new Promise((r) => (img.onload = r));

            const canvas = document.createElement('canvas');
            const targetW = 320;
            canvas.width = targetW;
            canvas.height = Math.round((targetW / img.width) * img.height);
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const enhanceVals = calculateAutoEnhance(ctx, canvas.width, canvas.height);
                const wbVals = calculateAutoWB(ctx, canvas.width, canvas.height);

                // Apply enhanced values in a single atomic update and push to undo history
                setAdjustments(
                    {
                        ...enhanceVals,
                        ...wbVals,
                    },
                    true
                );
            }
        } catch (err) {
            console.error('Auto enhance failed:', err);
        } finally {
            setIsEnhancing(false);
        }
    };

    return (
        <AccordionPanel title="AI Tools" icon={<Wand2 size={16} />} defaultOpen>
            <div className="flex flex-col gap-2">
                <button
                    onClick={handleAutoEnhance}
                    disabled={!image.src || isEnhancing}
                    className={cn(
                        'flex items-center justify-center gap-2 p-3 font-bold text-xs uppercase tracking-wider',
                        'border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                        'transition-all duration-150',
                        image.src && !isEnhancing
                            ? 'bg-yellow-300 hover:bg-yellow-400 text-editor-text hover:translate-y-px hover:shadow-[1px_1px_0_0_#000] active:translate-y-0.5 active:shadow-none'
                            : 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
                    )}
                >
                    <Sparkles size={16} className={isEnhancing ? 'animate-spin' : ''} />
                    <span>{isEnhancing ? 'Enhancing...' : 'Auto Enhance'}</span>
                </button>
            </div>
        </AccordionPanel>
    );
}
