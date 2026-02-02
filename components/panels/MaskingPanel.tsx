'use client';

import React, { useState } from 'react';
import { Layers, Plus, PersonStanding, Image as ImageIcon } from 'lucide-react';
import AccordionPanel from '@/components/ui/AccordionPanel';
import { useEditorStore } from '@/lib/store';
import { aiService } from '@/lib/ai-service';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

export default function MaskingPanel() {
    const image = useEditorStore((state) => state.image);
    const masks = useEditorStore((state) => state.masks);
    const addMask = useEditorStore((state) => state.addMask);
    const activeMaskId = useEditorStore((state) => state.activeMaskId);
    const setActiveMaskId = useEditorStore((state) => state.setActiveMaskId);
    const removeMask = useEditorStore((state) => state.removeMask);

    const [isProcessing, setIsProcessing] = useState(false);

    const handleSelectSubject = async () => {
        if (!image.src) return;
        setIsProcessing(true);
        try {
            // Generate mask
            const maskDataUrl = await aiService.generateSubjectMask(image.src);

            addMask({
                id: nanoid(),
                name: 'Subject',
                type: 'subject',
                bitmap: maskDataUrl,
                opacity: 100,
                isVisible: true,
                adjustments: {
                    // Initialize with no adjustments
                    exposure: 0, brilliance: 0, highlights: 0, shadows: 0,
                    contrast: 0, brightness: 0, blackPoint: 0,
                    saturation: 0, vibrance: 0, temperature: 0, tint: 0,
                    sharpness: 0, clarity: 0, noiseReduction: 0,
                    vignette: 0, grain: 0,
                    rotation: 0, straighten: 0, straightenScale: 1, cropAspectRatio: 'free'
                }
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AccordionPanel title="Masking" icon={<Layers size={16} />}>
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                    onClick={handleSelectSubject}
                    disabled={!image.src || isProcessing}
                    className="flex flex-col items-center justify-center p-3 gap-2 rounded bg-editor-surface border border-editor-border hover:bg-editor-surfaceHover transition-colors"
                >
                    {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <PersonStanding size={20} className="text-editor-accent" />
                    )}
                    <span className="text-xs font-medium text-editor-text">Select Subject</span>
                </button>

                <button
                    disabled={!image.src} // Placeholder for Background selection
                    className="flex flex-col items-center justify-center p-3 gap-2 rounded bg-editor-surface border border-editor-border hover:bg-editor-surfaceHover transition-colors opacity-50 cursor-not-allowed"
                >
                    <ImageIcon size={20} className="text-editor-textMuted" />
                    <span className="text-xs font-medium text-editor-text">Select Background</span>
                </button>
            </div>

            {/* Mask List */}
            <div className="space-y-1">
                {masks.length === 0 && (
                    <p className="text-xs text-editor-textDim text-center py-2">No masks created</p>
                )}

                {masks.map(mask => (
                    <div
                        key={mask.id}
                        onClick={() => setActiveMaskId(mask.id)}
                        className={cn(
                            "flex items-center justify-between px-3 py-2 rounded cursor-pointer",
                            activeMaskId === mask.id ? "bg-editor-accent/10 border border-editor-accent/50" : "bg-editor-surface border border-editor-border hover:bg-editor-surfaceHover"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-editor-text">{mask.name}</span>
                            <span className="text-[10px] text-editor-textDim px-1.5 py-0.5 bg-editor-bg rounded capitalize">{mask.type}</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeMask(mask.id);
                            }}
                            className="p-1 hover:bg-red-500/20 rounded text-editor-textDim hover:text-red-400"
                        >
                            <Plus size={14} className="rotate-45" />
                        </button>
                    </div>
                ))}
            </div>
        </AccordionPanel>
    );
}
