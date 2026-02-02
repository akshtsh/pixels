'use client';

import React, { useState, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '@/lib/store';
import { computeFilterString, computeVignetteStyle, getGrainOpacity } from '@/lib/filters';
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

    React.useEffect(() => {
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

            // Set canvas size
            canvas.width = img.width;
            canvas.height = img.height;

            // Apply transformations
            ctx.save();

            // Apply rotation and straighten
            const totalRotation = (adjustments.rotation + adjustments.straighten) * Math.PI / 180;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(totalRotation);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            // Apply CSS filter
            ctx.filter = computeFilterString(adjustments);

            // Draw image
            ctx.drawImage(img, 0, 0);
            ctx.restore();

            // Apply vignette if needed
            if (adjustments.vignette !== 0) {
                const intensity = Math.abs(adjustments.vignette) / 100;
                const gradient = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, 0,
                    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5
                );

                if (adjustments.vignette > 0) {
                    gradient.addColorStop(0, 'rgba(0,0,0,0)');
                    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
                    gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.8})`);
                } else {
                    gradient.addColorStop(0, 'rgba(255,255,255,0)');
                    gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
                    gradient.addColorStop(1, `rgba(255,255,255,${intensity * 0.5})`);
                }

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
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
                        className="fixed inset-0 bg-black/60 z-40"
                        onClick={() => setExportModalOpen(false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96"
                    >
                        <div className="bg-editor-surface rounded-lg shadow-xl border border-editor-border">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-editor-border">
                                <h2 className="text-sm font-semibold text-editor-text">Export Image</h2>
                                <button
                                    onClick={() => setExportModalOpen(false)}
                                    className="p-1 rounded hover:bg-editor-surfaceHover transition-colors"
                                >
                                    <X size={16} className="text-editor-textMuted" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="px-4 py-4 space-y-4">
                                {/* Filename */}
                                <div>
                                    <label className="block text-xs text-editor-textMuted mb-1.5">
                                        Filename
                                    </label>
                                    <input
                                        type="text"
                                        value={filename}
                                        onChange={(e) => setFilename(e.target.value)}
                                        className={cn(
                                            'w-full px-3 py-2 rounded text-sm',
                                            'bg-editor-bg border border-editor-border',
                                            'text-editor-text focus:border-editor-accent focus:outline-none',
                                            'transition-colors duration-150'
                                        )}
                                        placeholder="Enter filename"
                                    />
                                </div>

                                {/* Format */}
                                <div>
                                    <label className="block text-xs text-editor-textMuted mb-1.5">
                                        Format
                                    </label>
                                    <div className="flex gap-2">
                                        {(['jpeg', 'png'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFormat(f)}
                                                className={cn(
                                                    'flex-1 py-2 rounded text-sm font-medium',
                                                    'transition-colors duration-150',
                                                    format === f
                                                        ? 'bg-editor-accent text-white'
                                                        : 'bg-editor-border text-white hover:bg-editor-borderLight'
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
                                            <label className="text-xs text-editor-textMuted">Quality</label>
                                            <span className="text-xs text-editor-text">{quality}%</span>
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
                            <div className="px-4 py-3 border-t border-editor-border">
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting || !filename}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2 py-2.5 rounded',
                                        'text-sm font-medium transition-colors duration-150',
                                        isExporting || !filename
                                            ? 'bg-editor-border text-editor-textDim cursor-not-allowed'
                                            : 'bg-editor-accent text-white hover:bg-editor-accentHover'
                                    )}
                                >
                                    <Download size={16} />
                                    {isExporting ? 'Exporting...' : 'Export'}
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
