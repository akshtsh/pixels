'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '@/lib/store';
import { computeFilterString, getGrainOpacity } from '@/lib/filters';
import { cn } from '@/lib/utils';

export default function ExportModal() {
    const exportModalOpen = useEditorStore((state) => state.exportModalOpen);
    const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen);
    const image = useEditorStore((state) => state.image);
    const adjustments = useEditorStore((state) => state.adjustments);

    const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
    const [quality, setQuality] = useState(92);
    const [filename, setFilename] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (exportModalOpen && image.fileName) {
            const baseName = image.fileName.replace(/\.[^/.]+$/, '');
            setFilename(`${baseName}_edited`);
        }
    }, [exportModalOpen, image.fileName]);

    const handleExport = async () => {
        if (!image.src || !canvasRef.current) return;

        setIsExporting(true);

        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Create image
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = image.src!;
            });

            // Calculate crop values
            const cropState = useEditorStore.getState().crop;
            const cropX = (cropState.x / 100) * img.width;
            const cropY = (cropState.y / 100) * img.height;
            const cropW = (cropState.width / 100) * img.width;
            const cropH = (cropState.height / 100) * img.height;

            // Set canvas to cropped size
            canvas.width = Math.round(cropW);
            canvas.height = Math.round(cropH);

            // Apply transformations
            ctx.save();

            // Apply rotation and straighten relative to cropped center
            const totalRotation = ((adjustments.rotation + adjustments.straighten) * Math.PI) / 180;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(totalRotation);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            // Apply filter
            const filterStr = computeFilterString(adjustments);
            ctx.filter = filterStr;

            // Draw only the cropped region
            ctx.drawImage(
                img,
                Math.round(cropX), Math.round(cropY), Math.round(cropW), Math.round(cropH),
                0, 0, Math.round(cropW), Math.round(cropH)
            );
            ctx.restore();

            // Apply vignette if needed
            if (adjustments.vignette !== 0) {
                const intensity = Math.min(1, Math.abs(adjustments.vignette) / 100);
                const gradient = ctx.createRadialGradient(
                    canvas.width / 2,
                    canvas.height / 2,
                    0,
                    canvas.width / 2,
                    canvas.height / 2,
                    Math.max(canvas.width, canvas.height) / 1.4
                );

                if (adjustments.vignette > 0) {
                    gradient.addColorStop(0, 'rgba(0,0,0,0)');
                    gradient.addColorStop(0.55, 'rgba(0,0,0,0)');
                    gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.85})`);
                } else {
                    gradient.addColorStop(0, 'rgba(255,255,255,0)');
                    gradient.addColorStop(0.55, 'rgba(255,255,255,0)');
                    gradient.addColorStop(1, `rgba(255,255,255,${intensity * 0.6})`);
                }

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Apply film grain if needed
            if (adjustments.grain > 0) {
                const grainCanvas = document.createElement('canvas');
                grainCanvas.width = canvas.width;
                grainCanvas.height = canvas.height;
                const gCtx = grainCanvas.getContext('2d');
                if (gCtx) {
                    const imgData = gCtx.createImageData(canvas.width, canvas.height);
                    const buffer = new Uint32Array(imgData.data.buffer);
                    const grainOpacity = getGrainOpacity(adjustments.grain);
                    const alpha = Math.round(grainOpacity * 255);
                    for (let i = 0; i < buffer.length; i++) {
                        const gray = (Math.random() * 255) | 0;
                        buffer[i] = (alpha << 24) | (gray << 16) | (gray << 8) | gray;
                    }
                    gCtx.putImageData(imgData, 0, 0);
                    ctx.save();
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.drawImage(grainCanvas, 0, 0);
                    ctx.restore();
                }
            }

            // Export
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const qualityValue = format === 'jpeg' ? quality / 100 : undefined;

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${filename || 'image'}.${format}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        setExportModalOpen(false);
                    }
                    setIsExporting(false);
                },
                mimeType,
                qualityValue
            );
        } catch (error) {
            console.error('Export failed:', error);
            setIsExporting(false);
        }
    };

    return (
        <AnimatePresence>
            {exportModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                        onClick={() => setExportModalOpen(false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 select-none"
                    >
                        <div className="bg-editor-surface border-2 border-editor-border shadow-[6px_6px_0_0_#000]">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-editor-border bg-yellow-300">
                                <h2 className="text-sm font-black uppercase tracking-wider text-editor-text">
                                    Export Image
                                </h2>
                                <button
                                    onClick={() => setExportModalOpen(false)}
                                    className="p-1 border border-editor-border bg-white hover:bg-red-200 transition-colors shadow-[1px_1px_0_0_#000]"
                                >
                                    <X size={14} className="text-editor-text" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="px-4 py-4 space-y-4">
                                {/* Filename */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-editor-text mb-1.5">
                                        Filename
                                    </label>
                                    <input
                                        type="text"
                                        value={filename}
                                        onChange={(e) => setFilename(e.target.value)}
                                        className={cn(
                                            'w-full px-3 py-2 text-sm font-mono',
                                            'bg-white border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                                            'text-editor-text focus:outline-none focus:bg-yellow-50',
                                            'transition-colors duration-150'
                                        )}
                                        placeholder="Enter filename"
                                    />
                                </div>

                                {/* Format */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-editor-text mb-1.5">
                                        Format
                                    </label>
                                    <div className="flex gap-2">
                                        {(['jpeg', 'png'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFormat(f)}
                                                className={cn(
                                                    'flex-1 py-2 text-xs font-black uppercase tracking-wider border-2 border-editor-border shadow-[2px_2px_0_0_#000]',
                                                    'transition-all duration-150',
                                                    format === f
                                                        ? 'bg-yellow-300 text-editor-text shadow-[1px_1px_0_0_#000] translate-y-px'
                                                        : 'bg-white text-editor-text hover:bg-yellow-50'
                                                )}
                                            >
                                                {f.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Quality (JPEG only) */}
                                {format === 'jpeg' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-editor-text">
                                                Quality
                                            </label>
                                            <span className="text-xs font-mono font-bold text-editor-text">
                                                {quality}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            value={quality}
                                            onChange={(e) => setQuality(parseInt(e.target.value))}
                                            min={1}
                                            max={100}
                                            className="w-full"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-3 border-t-2 border-editor-border bg-yellow-50">
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting || !filename}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2 py-2.5',
                                        'text-xs font-black uppercase tracking-wider border-2 border-editor-border shadow-[3px_3px_0_0_#000]',
                                        'transition-all duration-150',
                                        isExporting || !filename
                                            ? 'bg-gray-200 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
                                            : 'bg-editor-accent text-white hover:bg-red-600 hover:translate-y-px hover:shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none'
                                    )}
                                >
                                    <Download size={16} />
                                    <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hidden canvas for export */}
                    <canvas ref={canvasRef} className="hidden" />
                </>
            )}
        </AnimatePresence>
    );
}
