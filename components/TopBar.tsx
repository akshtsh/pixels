'use client';

import React from 'react';
import { Upload, RotateCcw, Download, Undo2, Redo2 } from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function TopBar() {
    const setImage = useEditorStore((state) => state.setImage);
    const globalReset = useEditorStore((state) => state.globalReset);
    const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen);
    const image = useEditorStore((state) => state.image);
    const undo = useEditorStore((state) => state.undo);
    const redo = useEditorStore((state) => state.redo);
    const canUndo = useEditorStore((state) => state.canUndo);
    const canRedo = useEditorStore((state) => state.canRedo);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(event.target?.result as string, img.width, img.height, file.name);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <header className="flex items-center justify-between h-14 px-4 bg-editor-surface border-b-2 border-editor-border shadow-sm z-50 relative">
            {/* Left: Logo/Title */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-editor-surface border-2 border-editor-border shadow-[2px_2px_0_0_#000] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/pixels-logo.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-xl font-black lowercase tracking-tighter text-editor-text transform -skew-x-6">
                    pixels
                </h1>
            </div>

            {/* Center: Undo/Redo */}
            <div className="flex items-center gap-2 bg-white px-2 py-1 border-2 border-editor-border shadow-[2px_2px_0_0_#000]">
                <button
                    onClick={undo}
                    disabled={!canUndo()}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 border-2',
                        'transition-all duration-150',
                        canUndo()
                            ? 'border-editor-border bg-yellow-300 hover:bg-yellow-400 text-editor-text shadow-[1px_1px_0_0_#000] hover:translate-y-px hover:shadow-none'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                    title="Undo"
                >
                    <Undo2 size={16} />
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo()}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 border-2',
                        'transition-all duration-150',
                        canRedo()
                            ? 'border-editor-border bg-yellow-300 hover:bg-yellow-400 text-editor-text shadow-[1px_1px_0_0_#000] hover:translate-y-px hover:shadow-none'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                    title="Redo"
                >
                    <Redo2 size={16} />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* Upload */}
                <label
                    className={cn(
                        'flex items-center gap-2 px-4 py-1.5 cursor-pointer',
                        'bg-white border-2 border-editor-border shadow-[3px_3px_0_0_#000]',
                        'text-sm font-bold uppercase tracking-wide text-editor-text',
                        'hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-blue-50',
                        'transition-all duration-150'
                    )}
                >
                    <Upload size={16} />
                    <span>Upload</span>
                    <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>

                {/* Global Reset */}
                <button
                    onClick={globalReset}
                    disabled={!image.src}
                    className={cn(
                        'flex items-center gap-2 px-4 py-1.5',
                        'border-2 border-editor-border shadow-[3px_3px_0_0_#000]',
                        'text-sm font-bold uppercase tracking-wide',
                        'transition-all duration-150',
                        image.src
                            ? 'bg-white text-editor-text hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-red-50'
                            : 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
                    )}
                >
                    <RotateCcw size={16} />
                    <span>Reset</span>
                </button>

                {/* Export */}
                <button
                    onClick={() => setExportModalOpen(true)}
                    disabled={!image.src}
                    className={cn(
                        'flex items-center gap-2 px-4 py-1.5',
                        'border-2 border-editor-border shadow-[3px_3px_0_0_#000]',
                        'text-sm font-bold uppercase tracking-wide',
                        'transition-all duration-150',
                        image.src
                            ? 'bg-editor-accent text-white hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] hover:bg-red-600'
                            : 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
                    )}
                >
                    <Download size={16} />
                    <span>Export</span>
                </button>
            </div>
        </header>
    );
}
