'use client';

import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import { useEditorStore } from '@/lib/store';
import { calculateAutoEnhance } from '@/lib/image-processing';
import { cn } from '@/lib/utils';

export default function AIToolsPanel() {
    const image = useEditorStore((state) => state.image);
    const updateAdjustment = useEditorStore((state) => state.updateAdjustment);

    const [isEnhancing, setIsEnhancing] = useState(false);

    const handleAutoEnhance = async () => {
        if (!image.src) return;
        setIsEnhancing(true);

        // Create an offscreen canvas to analyze the image
        const img = new Image();
        img.src = image.src;
        img.crossOrigin = 'Anonymous';
        await new Promise((r) => (img.onload = r));

        const canvas = document.createElement('canvas');
        canvas.width = 300; // Downscale for performance
        canvas.height = (300 / img.width) * img.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const output = calculateAutoEnhance(ctx, canvas.width, canvas.height);

            // Apply values
            Object.entries(output).forEach(([key, value]) => {
                // @ts-ignore
                updateAdjustment(key, value);
            });
        }

        setIsEnhancing(false);
    };

    return (
        <AccordionPanel title="AI Tools" icon={<Wand2 size={16} />} defaultOpen>
            <div className="flex flex-col gap-2">
                <button
                    onClick={handleAutoEnhance}
                    disabled={!image.src || isEnhancing}
                    className={cn(
                        'flex items-center justify-center gap-2 p-3 rounded',
                        'bg-editor-surface border border-editor-border',
                        'hover:bg-editor-surfaceHover transition-colors duration-150',
                        isEnhancing && 'opacity-50 cursor-wait'
                    )}
                >
                    <Wand2 size={20} className="text-editor-accent" />
                    <span className="text-xs font-medium text-editor-text">Auto Enhance</span>
                </button>
            </div>
        </AccordionPanel>
    );
}
