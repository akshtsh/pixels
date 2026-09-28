import { create } from 'zustand';

export interface AdjustmentState {
    // Light
    exposure: number;
    brilliance: number;
    highlights: number;
    shadows: number;
    contrast: number;
    brightness: number;
    blackPoint: number;
    // Color
    saturation: number;
    vibrance: number;
    temperature: number;
    tint: number;
    // Detail
    sharpness: number;
    clarity: number;
    noiseReduction: number;
    // Effects
    vignette: number;
    grain: number;
    // Geometry
    rotation: number;
    straighten: number;
    straightenScale: number;
    cropAspectRatio: string;
}

export type AdjustmentKey = keyof AdjustmentState;

export type ToolType = 'move' | 'brush' | 'eraser';

export interface Mask {
    id: string;
    name: string;
    type: 'subject' | 'background' | 'brush' | 'ai';
    bitmap?: string; // Data URL of the mask image
    opacity: number;
    isVisible: boolean;
    adjustments: AdjustmentState;
}

export interface CropState {
    isActive: boolean;
    aspectRatio: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BrushState {
    size: number;
    hardness: number; // 0-100
    opacity: number; // 0-100
    color: string;
}

export interface ImageState {
    src: string | null;
    originalWidth: number;
    originalHeight: number;
    fileName: string;
}

interface HistoryEntry {
    image: ImageState;
    crop: CropState;
    adjustments: AdjustmentState;
    masks: Mask[];
    timestamp: number;
}

interface EditorStore {
    // Image
    image: ImageState;
    setImage: (src: string, width: number, height: number, fileName: string) => void;
    clearImage: () => void;

    // Tools
    activeTool: ToolType;
    setActiveTool: (tool: ToolType) => void;
    brush: BrushState;
    setBrush: (brush: Partial<BrushState>) => void;

    // Global Adjustments
    adjustments: AdjustmentState;
    updateAdjustment: (key: AdjustmentKey, value: number | string) => void;
    setAdjustments: (newAdjustments: Partial<AdjustmentState>, pushToHistory?: boolean) => void;
    resetAdjustment: (key: AdjustmentKey) => void;
    globalReset: () => void;

    // Masks
    masks: Mask[];
    activeMaskId: string | null;
    addMask: (mask: Mask) => void;
    updateMask: (id: string, updates: Partial<Mask>) => void;
    removeMask: (id: string) => void;
    setActiveMaskId: (id: string | null) => void;
    updateMaskAdjustment: (maskId: string, key: AdjustmentKey, value: number | string) => void;

    // Crop
    crop: CropState;
    setCropActive: (active: boolean) => void;
    setCropAspectRatio: (ratio: string) => void;
    updateCrop: (crop: Partial<CropState>) => void;
    applyCrop: () => Promise<void>;
    resetCrop: () => void;
    setStraighten: (angle: number) => void;

    // History
    history: HistoryEntry[];
    historyIndex: number;
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    // UI
    exportModalOpen: boolean;
    setExportModalOpen: (open: boolean) => void;
    compareMode: 'none' | 'hold' | 'split';
    setCompareMode: (mode: 'none' | 'hold' | 'split') => void;
    splitSliderPos: number; // 0 to 100
    setSplitSliderPos: (pos: number) => void;
}

export const defaultAdjustments: AdjustmentState = {
    // Light
    exposure: 0,
    brilliance: 0,
    highlights: 0,
    shadows: 0,
    contrast: 0,
    brightness: 0,
    blackPoint: 0,
    // Color
    saturation: 0,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    // Detail
    sharpness: 0,
    clarity: 0,
    noiseReduction: 0,
    // Effects
    vignette: 0,
    grain: 0,
    // Geometry
    rotation: 0,
    straighten: 0,
    straightenScale: 1,
    cropAspectRatio: 'free',
};

const defaultCrop: CropState = {
    isActive: false,
    aspectRatio: 'free',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
};

const defaultBrush: BrushState = {
    size: 50,
    hardness: 50,
    opacity: 100,
    color: 'red',
};

const defaultImage: ImageState = {
    src: null,
    originalWidth: 0,
    originalHeight: 0,
    fileName: '',
};

export const useEditorStore = create<EditorStore>((set, get) => ({
    // Image
    image: defaultImage,
    setImage: (src, width, height, fileName) => {
        const newImage: ImageState = { src, originalWidth: width, originalHeight: height, fileName };
        const newAdjustments = { ...defaultAdjustments };
        const newHistory: HistoryEntry[] = [
            {
                image: newImage,
                crop: { ...defaultCrop },
                adjustments: newAdjustments,
                masks: [],
                timestamp: Date.now(),
            },
        ];

        set({
            image: newImage,
            adjustments: newAdjustments,
            crop: { ...defaultCrop },
            masks: [],
            activeMaskId: null,
            history: newHistory,
            historyIndex: 0,
        });
    },
    clearImage: () => {
        set({
            image: defaultImage,
            adjustments: { ...defaultAdjustments },
            crop: { ...defaultCrop },
            masks: [],
            activeMaskId: null,
            history: [],
            historyIndex: -1,
        });
    },

    // Tools
    activeTool: 'move',
    setActiveTool: (tool) => set({ activeTool: tool }),
    brush: defaultBrush,
    setBrush: (brush) => set((state) => ({ brush: { ...state.brush, ...brush } })),

    // Adjustments
    adjustments: defaultAdjustments,
    updateAdjustment: (key, value) => {
        set((state) => ({
            adjustments: { ...state.adjustments, [key]: value },
        }));
    },
    setAdjustments: (newAdjustments, pushToHistory = true) => {
        set((state) => ({
            adjustments: { ...state.adjustments, ...newAdjustments },
        }));
        if (pushToHistory) {
            get().pushHistory();
        }
    },
    resetAdjustment: (key) => {
        set((state) => ({
            adjustments: { ...state.adjustments, [key]: defaultAdjustments[key] },
        }));
        get().pushHistory();
    },
    globalReset: () => {
        set({
            adjustments: { ...defaultAdjustments },
            crop: { ...defaultCrop },
            masks: [],
            activeMaskId: null,
        });
        get().pushHistory();
    },

    // Masks
    masks: [],
    activeMaskId: null,
    addMask: (mask) => {
        set((state) => ({
            masks: [...state.masks, mask],
            activeMaskId: mask.id,
            activeTool: mask.type === 'brush' ? 'brush' : state.activeTool,
        }));
        get().pushHistory();
    },
    updateMask: (id, updates) => {
        set((state) => ({
            masks: state.masks.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
    },
    removeMask: (id) => {
        set((state) => ({
            masks: state.masks.filter((m) => m.id !== id),
            activeMaskId: state.activeMaskId === id ? null : state.activeMaskId,
        }));
        get().pushHistory();
    },
    setActiveMaskId: (id) => set({ activeMaskId: id }),
    updateMaskAdjustment: (maskId, key, value) => {
        set((state) => ({
            masks: state.masks.map((m) =>
                m.id === maskId
                    ? { ...m, adjustments: { ...m.adjustments, [key]: value } }
                    : m
            ),
        }));
    },

    // Crop
    crop: defaultCrop,
    setCropActive: (active) =>
        set((state) => ({ crop: { ...state.crop, isActive: active } })),
    setCropAspectRatio: (ratio) =>
        set((state) => ({
            crop: { ...state.crop, aspectRatio: ratio },
            adjustments: { ...state.adjustments, cropAspectRatio: ratio },
        })),
    updateCrop: (cropUpdate) =>
        set((state) => ({ crop: { ...state.crop, ...cropUpdate } })),
    applyCrop: async () => {
        const { image, crop } = get();
        if (!image.src) return;

        // Calculate pixel crop values
        const cropX = (crop.x / 100) * image.originalWidth;
        const cropY = (crop.y / 100) * image.originalHeight;
        const cropW = (crop.width / 100) * image.originalWidth;
        const cropH = (crop.height / 100) * image.originalHeight;

        // Skip if crop covers the entire image
        if (
            Math.round(cropX) <= 0 &&
            Math.round(cropY) <= 0 &&
            Math.round(cropW) >= image.originalWidth &&
            Math.round(cropH) >= image.originalHeight
        ) {
            set({ crop: { ...defaultCrop } });
            return;
        }

        if (cropW < 5 || cropH < 5) {
            set({ crop: { ...defaultCrop } });
            return;
        }

        // Create a canvas to render the cropped image
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(cropW);
        canvas.height = Math.round(cropH);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Load the current image
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = image.src!;
        });

        // Draw only the cropped region
        ctx.drawImage(
            img,
            Math.round(cropX), Math.round(cropY), Math.round(cropW), Math.round(cropH),
            0, 0, Math.round(cropW), Math.round(cropH)
        );

        // Convert to data URL
        const croppedSrc = canvas.toDataURL('image/png');

        // Update the image and reset crop
        const newImage: ImageState = {
            src: croppedSrc,
            originalWidth: Math.round(cropW),
            originalHeight: Math.round(cropH),
            fileName: image.fileName,
        };

        set({
            image: newImage,
            crop: { ...defaultCrop },
        });
        get().pushHistory();
    },
    resetCrop: () => {
        set({
            crop: { ...defaultCrop },
            adjustments: { ...get().adjustments, cropAspectRatio: 'free' },
        });
    },
    setStraighten: (angle: number) => {
        set((state) => {
            const { image } = state;
            const W = image.originalWidth;
            const H = image.originalHeight;

            if (!W || !H) return { adjustments: { ...state.adjustments, straighten: angle } };

            const angleRad = (angle * Math.PI) / 180;
            const boundingW = W * Math.abs(Math.cos(angleRad)) + H * Math.abs(Math.sin(angleRad));
            const boundingH = W * Math.abs(Math.sin(angleRad)) + H * Math.abs(Math.cos(angleRad));
            const scale = Math.max(boundingW / W, boundingH / H);

            return {
                adjustments: {
                    ...state.adjustments,
                    straighten: angle,
                    straightenScale: scale,
                },
            };
        });
    },

    // History
    history: [],
    historyIndex: -1,
    pushHistory: () => {
        const { image, crop, adjustments, masks, history, historyIndex } = get();
        if (!image.src) return;

        // Slice history up to current index
        const validHistory = historyIndex >= 0 ? history.slice(0, historyIndex + 1) : [];

        // Add new entry with deep clones (always store inactive crop state in history)
        validHistory.push({
            image: { ...image },
            crop: { ...crop, isActive: false },
            adjustments: { ...adjustments },
            masks: masks ? JSON.parse(JSON.stringify(masks)) : [],
            timestamp: Date.now(),
        });

        // Limit max history entries to 50
        if (validHistory.length > 50) {
            validHistory.shift();
        }

        set({
            history: validHistory,
            historyIndex: validHistory.length - 1,
        });
    },
    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const entry = history[newIndex];
            set({
                image: { ...entry.image },
                crop: entry.crop ? { ...entry.crop, isActive: false } : { ...defaultCrop },
                adjustments: { ...entry.adjustments },
                masks: entry.masks ? JSON.parse(JSON.stringify(entry.masks)) : [],
                historyIndex: newIndex,
            });
        }
    },
    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const entry = history[newIndex];
            set({
                image: { ...entry.image },
                crop: entry.crop ? { ...entry.crop, isActive: false } : { ...defaultCrop },
                adjustments: { ...entry.adjustments },
                masks: entry.masks ? JSON.parse(JSON.stringify(entry.masks)) : [],
                historyIndex: newIndex,
            });
        }
    },
    canUndo: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
    },
    canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex >= 0 && historyIndex < history.length - 1;
    },

    // UI
    exportModalOpen: false,
    setExportModalOpen: (open) => set({ exportModalOpen: open }),
    compareMode: 'none',
    setCompareMode: (mode) => set({ compareMode: mode }),
    splitSliderPos: 50,
    setSplitSliderPos: (pos) => set({ splitSliderPos: Math.min(100, Math.max(0, pos)) }),
}));

export const useAdjustments = () => useEditorStore((state) => state.adjustments);
export const useImage = () => useEditorStore((state) => state.image);
export const useCrop = () => useEditorStore((state) => state.crop);
export const useActiveTool = () => useEditorStore((state) => state.activeTool);
export const useMasks = () => useEditorStore((state) => state.masks);
export const useActiveMaskId = () => useEditorStore((state) => state.activeMaskId);
