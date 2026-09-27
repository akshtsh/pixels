'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/lib/store';
import { computeCanvasStyles, computeVignetteStyle, getGrainOpacity } from '@/lib/filters';
import { cn } from '@/lib/utils';
import { Upload, ImageIcon, ZoomIn, ZoomOut, Maximize, Eye, Columns } from 'lucide-react';

// Dynamic import of Konva wrapper to disable SSR
const KonvaWrapper = dynamic(() => import('./canvas/KonvaWrapper'), { ssr: false });

// HEIC Converter
const loadHeic2Any = () => import('heic2any');

export default function Canvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const image = useEditorStore((state) => state.image);
    const adjustments = useEditorStore((state) => state.adjustments);
    const setImage = useEditorStore((state) => state.setImage);
    const crop = useEditorStore((state) => state.crop);
    const updateCrop = useEditorStore((state) => state.updateCrop);

    const [isDragging, setIsDragging] = useState(false);
    const [scale, setScale] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Compare mode
    const [showOriginal, setShowOriginal] = useState(false);
    const [splitCompare, setSplitCompare] = useState(false);
    const [splitPos, setSplitPos] = useState(50); // 0 to 100%
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const splitContainerRef = useRef<HTMLDivElement>(null);

    // Auto-fit function
    const handleFitToScreen = useCallback(() => {
        if (containerRef.current && image.originalWidth && image.originalHeight) {
            const { clientWidth, clientHeight } = containerRef.current;
            const padding = 64; // comfortable breathing margin
            const availW = Math.max(100, clientWidth - padding);
            const availH = Math.max(100, clientHeight - padding);

            const scaleX = availW / image.originalWidth;
            const scaleY = availH / image.originalHeight;
            const fitScale = Math.min(scaleX, scaleY, 1);

            setScale(fitScale);
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [image.originalWidth, image.originalHeight]);

    // Recalculate auto-fit when image changes or dimensions change
    useEffect(() => {
        if (image.src && image.originalWidth && image.originalHeight) {
            handleFitToScreen();
        }
    }, [image.src, image.originalWidth, image.originalHeight, handleFitToScreen]);

    // Window resize handler
    useEffect(() => {
        const onResize = () => {
            if (zoom === 1) {
                handleFitToScreen();
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [zoom, handleFitToScreen]);

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(8, Number((prev * 1.25).toFixed(2))));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(0.15, Number((prev / 1.25).toFixed(2))));
    };

    const handleResetZoom100 = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    // Split slider drag handling
    const handleSplitMove = useCallback(
        (clientX: number) => {
            if (!splitContainerRef.current) return;
            const rect = splitContainerRef.current.getBoundingClientRect();
            const relX = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (relX / rect.width) * 100));
            setSplitPos(percentage);
        },
        []
    );

    const handleSplitMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSplit(true);
        handleSplitMove(e.clientX);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDraggingSplit) {
                handleSplitMove(e.clientX);
            }
        };
        const onMouseUp = () => {
            if (isDraggingSplit) {
                setIsDraggingSplit(false);
            }
        };

        if (isDraggingSplit) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDraggingSplit, handleSplitMove]);

    const processFile = useCallback(
        async (file: File) => {
            let blob: Blob = file;
            let fileName = file.name;

            const isHeic =
                file.type === 'image/heic' ||
                file.type === 'image/heif' ||
                file.name.toLowerCase().endsWith('.heic') ||
                file.name.toLowerCase().endsWith('.heif');

            if (isHeic) {
                try {
                    const heic2any = (await loadHeic2Any()).default;
                    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
                    blob = Array.isArray(converted) ? converted[0] : converted;
                    fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
                } catch (err) {
                    console.error('HEIC conversion failed:', err);
                }
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new window.Image();
                img.onload = () => {
                    setImage(event.target?.result as string, img.width, img.height, fileName);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
        },
        [setImage]
    );

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (
                file &&
                (file.type.startsWith('image/') ||
                    file.name.toLowerCase().endsWith('.heic') ||
                    file.name.toLowerCase().endsWith('.heif'))
            ) {
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
                'flex-1 flex items-center justify-center relative overflow-hidden bg-[#dab495] select-none',
                isDragging && 'bg-editor-surface'
            )}
            style={{
                backgroundImage: 'radial-gradient(#000000 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {image.src ? (
                <>
                    <div
                        ref={splitContainerRef}
                        className="relative shadow-[4px_4px_0_0_#000] border-2 border-editor-border bg-black/10 overflow-hidden"
                    >
                        {/* Normal / Single Mode or Original Side of Split Mode */}
                        <div style={splitCompare ? {} : containerStyle}>
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
                                zoom={zoom}
                                onZoomChange={setZoom}
                                position={position}
                                onPositionChange={setPosition}
                                interactive={!isDraggingSplit}
                            />
                        </div>

                        {/* Effects overlays in Single Mode */}
                        {!splitCompare && !showOriginal && adjustments.vignette !== 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={computeVignetteStyle(adjustments.vignette)}
                            />
                        )}

                        {!splitCompare && !showOriginal && adjustments.grain > 0 && (
                            <div
                                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                                style={{
                                    opacity: getGrainOpacity(adjustments.grain),
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                }}
                            />
                        )}

                        {/* Split Compare Mode: Edited Overlay with Clip-Path */}
                        {splitCompare && (
                            <>
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        clipPath: `inset(0 0 0 ${splitPos}%)`,
                                    }}
                                >
                                    <div style={containerStyle} className="w-full h-full">
                                        <KonvaWrapper
                                            imageSrc={image.src}
                                            originalWidth={image.originalWidth}
                                            originalHeight={image.originalHeight}
                                            scale={scale}
                                            crop={crop}
                                            rotation={adjustments.rotation}
                                            straighten={adjustments.straighten}
                                            straightenScale={adjustments.straightenScale}
                                            zoom={zoom}
                                            position={position}
                                            interactive={false}
                                        />
                                    </div>

                                    {adjustments.vignette !== 0 && (
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={computeVignetteStyle(adjustments.vignette)}
                                        />
                                    )}

                                    {adjustments.grain > 0 && (
                                        <div
                                            className="absolute inset-0 pointer-events-none mix-blend-overlay"
                                            style={{
                                                opacity: getGrainOpacity(adjustments.grain),
                                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Split Slider Divider Line & Handle */}
                                <div
                                    className="absolute top-0 bottom-0 z-30 cursor-ew-resize group"
                                    style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
                                    onMouseDown={handleSplitMouseDown}
                                >
                                    {/* Line */}
                                    <div className="w-1 h-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.8)] mx-auto" />

                                    {/* Center Handle Button */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-yellow-300 border-2 border-black shadow-[2px_2px_0_0_#000] cursor-ew-resize transition-transform duration-100 group-hover:scale-110">
                                        <div className="flex items-center text-[10px] font-black text-black select-none pointer-events-none">
                                            ◀▶
                                        </div>
                                    </div>

                                    {/* Badges on left and right */}
                                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider rounded pointer-events-none border border-white/20">
                                        Before
                                    </div>
                                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-yellow-300 text-black text-[10px] font-bold uppercase tracking-wider rounded pointer-events-none border border-black shadow-[1px_1px_0_0_#000]">
                                        After
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Floating Navigation Controls */}
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-editor-surface border-2 border-editor-border shadow-[3px_3px_0_0_#000] z-40">
                        {/* Zoom Out */}
                        <button
                            onClick={handleZoomOut}
                            className="p-1.5 bg-white border border-editor-border hover:bg-yellow-100 transition-colors text-editor-text shadow-[1px_1px_0_0_#000] active:translate-y-px active:shadow-none"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>

                        {/* Fit to Screen / Auto-fit */}
                        <button
                            onClick={handleFitToScreen}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-editor-border hover:bg-yellow-100 transition-colors text-editor-text text-xs font-bold uppercase shadow-[1px_1px_0_0_#000] active:translate-y-px active:shadow-none"
                            title="Fit to Screen (Auto-Fit)"
                        >
                            <Maximize size={14} />
                            <span>Auto Fit</span>
                        </button>

                        {/* Zoom In */}
                        <button
                            onClick={handleZoomIn}
                            className="p-1.5 bg-white border border-editor-border hover:bg-yellow-100 transition-colors text-editor-text shadow-[1px_1px_0_0_#000] active:translate-y-px active:shadow-none"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>

                        {/* Zoom Level Indicator */}
                        <button
                            onClick={handleResetZoom100}
                            className="px-2 py-1 text-xs font-mono font-bold bg-yellow-100 border border-editor-border text-editor-text hover:bg-yellow-200 transition-colors shadow-[1px_1px_0_0_#000]"
                            title="Click to reset zoom to 100%"
                        >
                            {Math.round(zoom * 100)}%
                        </button>

                        <div className="w-0.5 h-6 bg-editor-border mx-1" />

                        {/* Hold to Compare (Eye) */}
                        <button
                            className={cn(
                                'p-1.5 border border-editor-border transition-all duration-150 shadow-[1px_1px_0_0_#000]',
                                showOriginal
                                    ? 'bg-editor-accent text-white shadow-none translate-y-px'
                                    : 'bg-white hover:bg-yellow-100 text-editor-text'
                            )}
                            title="Compare: Hold to see Original"
                            onMouseDown={() => setShowOriginal(true)}
                            onMouseUp={() => setShowOriginal(false)}
                            onMouseLeave={() => setShowOriginal(false)}
                            onTouchStart={() => setShowOriginal(true)}
                            onTouchEnd={() => setShowOriginal(false)}
                        >
                            <Eye size={16} />
                        </button>

                        {/* Split Slider Compare Mode Toggle */}
                        <button
                            onClick={() => setSplitCompare((prev) => !prev)}
                            className={cn(
                                'flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase border border-editor-border transition-all duration-150 shadow-[1px_1px_0_0_#000]',
                                splitCompare
                                    ? 'bg-yellow-300 text-editor-text'
                                    : 'bg-white hover:bg-yellow-100 text-editor-text'
                            )}
                            title="Before & After Split Slider"
                        >
                            <Columns size={14} />
                            <span>{splitCompare ? 'Exit Split' : 'Split View'}</span>
                        </button>
                    </div>
                </>
            ) : (
                <label
                    className={cn(
                        'flex flex-col items-center justify-center gap-4 p-12 cursor-pointer bg-editor-surface',
                        'border-4 border-dashed border-editor-border shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-y-0.5',
                        'transition-all duration-200',
                        isDragging && 'bg-yellow-100 border-editor-accent'
                    )}
                >
                    <div className="flex items-center justify-center w-20 h-20 bg-yellow-300 border-2 border-editor-border shadow-[3px_3px_0_0_#000]">
                        {isDragging ? (
                            <Upload size={36} className="text-editor-text" />
                        ) : (
                            <ImageIcon size={36} className="text-editor-text" />
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-base font-black uppercase tracking-wider text-editor-text">
                            {isDragging ? 'Drop Image Here' : 'Drop Image or Click to Upload'}
                        </p>
                        <p className="text-xs font-semibold text-editor-textMuted mt-1">
                            Supports JPEG, PNG, WEBP, HEIC, and more
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
