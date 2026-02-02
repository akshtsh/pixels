'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/lib/store';
import { computeCanvasStyles, computeVignetteStyle, getGrainOpacity } from '@/lib/filters';
import { cn } from '@/lib/utils';
import { Upload, ImageIcon, ZoomIn, ZoomOut, Maximize, Eye } from 'lucide-react';

// Dynamic import of the Konva wrapper to disable SSR for the entire canvas logic
const KonvaWrapper = dynamic(() => import('./canvas/KonvaWrapper'), { ssr: false });

// HEIC Converter (dynamic import to avoid SSR issues)
const loadHeic2Any = () => import('heic2any');

export default function Canvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const image = useEditorStore((state) => state.image);
    const adjustments = useEditorStore((state) => state.adjustments);
    const setImage = useEditorStore((state) => state.setImage);
    const crop = useEditorStore((state) => state.crop);
    const updateCrop = useEditorStore((state) => state.updateCrop);

    const [isDragging, setIsDragging] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);

    // Compare mode (press and hold to see original)
    const [showOriginal, setShowOriginal] = useState(false);

    // Initial fit to screen, but allow overflow
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current && image.originalWidth) {
                const { clientWidth, clientHeight } = containerRef.current;

                // Only calculate initial scale if we haven't touched it (or maybe just once on image load?)
                // For now, let's just default to fitting the ORIGINAL image to screen if it's huge, 
                // but allow it to be larger if the user zooms.
                // Actually, the user wants "variable and as big as uploaded".
                // Let's set initial scale to 1 if it fits, or fit down if it's too big?
                // Or just start with "Fit" but don't re-trigger on crop?

                // Calculate fit scale for full image
                const scaleX = (clientWidth - 40) / image.originalWidth;
                const scaleY = (clientHeight - 40) / image.originalHeight;
                const fitScale = Math.min(scaleX, scaleY, 1);

                // If scale is unset (1), set it to fitScale?
                // Or just rely on user zoom?
                // Let's set the base externalScale to 1 always, and let KonvaWrapper handle Zoom?
                // KonvaWrapper multiplies externalScale * zoom.
                // If we set externalScale = 1, then zoom=1 means 100%.
                // If we set externalScale = fitScale, then zoom=1 means Fit.

                // Let's stick with fitScale as base, but NOT update it on crop.
                if (scale === 1) { // Only set if default?
                    setScale(fitScale);
                }
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [image.originalWidth, image.originalHeight]); // Removed crop dependency

    const processFile = useCallback(async (file: File) => {
        let blob: Blob = file;
        let fileName = file.name;

        // Check for HEIC/HEIF
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
            file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

        if (isHeic) {
            try {
                const heic2any = (await loadHeic2Any()).default;
                const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
                blob = Array.isArray(converted) ? converted[0] : converted;
                fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            } catch (err) {
                console.error('HEIC conversion failed:', err);
                // Fall through to try loading as-is
            }
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                setImage(event.target?.result as string, img.width, img.height, fileName);
                // Reset scale on new image? Handled by useEffect dependency?
                // We might need to force reset scale.
                // But useEffect [image.originalWidth] handles it.
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(blob);
    }, [setImage]);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
                await processFile(file);
            }
        },
        [processFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    const containerStyle = showOriginal ? {} : computeCanvasStyles(adjustments);

    return (
        <div
            ref={containerRef}
            className={cn(
                'flex-1 flex items-center justify-center relative overflow-auto bg-[#dab495]', // Beige background
                isDragging && 'bg-editor-surface'
            )}
            style={{
                backgroundImage: 'radial-gradient(#000000 1.5px, transparent 1.5px)', // Black dots
                backgroundSize: '24px 24px'
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {image.src ? (
                <>
                    <div className="relative shadow-2xl ring-1 ring-white/10">
                        <div style={containerStyle}>
                            <KonvaWrapper
                                imageSrc={image.src}
                                originalWidth={image.originalWidth}
                                originalHeight={image.originalHeight}
                                scale={scale}
                                showOriginal={showOriginal}
                                crop={crop}
                                onUpdateCrop={updateCrop}
                                rotation={adjustments.rotation}
                                straighten={adjustments.straighten}
                                straightenScale={adjustments.straightenScale}
                            />
                        </div>

                        {!showOriginal && adjustments.vignette !== 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={computeVignetteStyle(adjustments.vignette)}
                            />
                        )}

                        {!showOriginal && adjustments.grain > 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                                style={{
                                    opacity: getGrainOpacity(adjustments.grain),
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                }}
                            />
                        )}
                    </div>

                    {/* Floating Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-editor-surface/90 backdrop-blur-sm border border-editor-border rounded-lg shadow-lg">
                        <button
                            className="p-2 hover:bg-editor-borderLight rounded transition-colors text-editor-text"
                            title="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <button
                            className="p-2 hover:bg-editor-borderLight rounded transition-colors text-editor-text"
                            title="Fit to Screen"
                        >
                            <Maximize size={18} />
                        </button>
                        <button
                            className="p-2 hover:bg-editor-borderLight rounded transition-colors text-editor-text"
                            title="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <div className="w-px h-6 bg-editor-border mx-1" />
                        <button
                            className={cn(
                                "p-2 rounded transition-colors",
                                showOriginal ? "bg-editor-accent text-white" : "hover:bg-editor-borderLight text-editor-text"
                            )}
                            title="Compare (hold to see original)"
                            onMouseDown={() => setShowOriginal(true)}
                            onMouseUp={() => setShowOriginal(false)}
                            onMouseLeave={() => setShowOriginal(false)}
                        >
                            <Eye size={18} />
                        </button>
                    </div>
                </>
            ) : (
                <label
                    className={cn(
                        'flex flex-col items-center justify-center gap-4 p-12 rounded-lg cursor-pointer',
                        'border-2 border-dashed transition-all duration-200',
                        isDragging
                            ? 'border-editor-accent bg-editor-accent/10'
                            : 'border-editor-border hover:border-editor-borderLight hover:bg-editor-surface/50'
                    )}
                >
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-editor-surface">
                        {isDragging ? <Upload size={28} className="text-editor-accent" /> : <ImageIcon size={28} className="text-editor-textMuted" />}
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-editor-text">
                            {isDragging ? 'Drop your image here' : 'Drop an image or click to upload'}
                        </p>
                        <p className="text-xs text-editor-textMuted mt-1">
                            Supports JPEG, PNG, HEIC, and more
                        </p>
                    </div>
                    <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
            )}
        </div>
    );
}
