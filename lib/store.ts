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
}



const defaultAdjustments: AdjustmentState = {
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
        set({
            image: { src, originalWidth: width, originalHeight: height, fileName },
            adjustments: { ...defaultAdjustments },
            masks: [],
            activeMaskId: null,
            history: [],
            historyIndex: -1,
        });
        get().pushHistory();
    },
    clearImage: () => set({ image: defaultImage }),

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
        // Note: For fine-grained history, we push on slider release (mouseUp) 
        // rather than every change. The panels should call pushHistory.
        // But if they don't, we could debounce here. For now, no auto-push per change.
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
            masks: [],
            activeMaskId: null
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
            activeTool: mask.type === 'brush' ? 'brush' : state.activeTool
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
    setStraighten: (angle: number) => {
        set((state) => {
            const { image } = state;
            const W = image.originalWidth;
            const H = image.originalHeight;

            if (!W || !H) return { adjustments: { ...state.adjustments, straighten: angle } };

            const angleRad = (angle * Math.PI) / 180;

            // 1. Calculate the bounding box of the rotated image
            const boundingW = W * Math.abs(Math.cos(angleRad)) + H * Math.abs(Math.sin(angleRad));
            const boundingH = W * Math.abs(Math.sin(angleRad)) + H * Math.abs(Math.cos(angleRad));

            // 2. Calculate the required scale to fit the original dimensions (Auto-Zoom)
            // Ensure the rotated image COVERS the original WxH box.
            const scale = Math.max(boundingW / W, boundingH / H);

            return {
                adjustments: {
                    ...state.adjustments,
                    straighten: angle,
                    straightenScale: scale
                }
            };
        });
        // Debounce history? Or push on release. GeometryPanel already pushes on release (handleChangeComplete).
        // setStraighten is called during drag.
    },


    // History
    history: [],
    historyIndex: -1,
    pushHistory: () => {
        const { adjustments, masks, history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
            adjustments: { ...adjustments },
            masks: masks ? JSON.parse(JSON.stringify(masks)) : [],
            timestamp: Date.now()
        });
        if (newHistory.length > 50) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
    },
    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const entry = history[newIndex];
            set({
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
                adjustments: { ...entry.adjustments },
                masks: entry.masks ? JSON.parse(JSON.stringify(entry.masks)) : [],
                historyIndex: newIndex,
            });
        }
    },
    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // UI
    exportModalOpen: false,
    setExportModalOpen: (open) => set({ exportModalOpen: open }),
}));

export const useAdjustments = () => useEditorStore((state) => state.adjustments);
export const useImage = () => useEditorStore((state) => state.image);
export const useCrop = () => useEditorStore((state) => state.crop);
export const useActiveTool = () => useEditorStore((state) => state.activeTool);
export const useMasks = () => useEditorStore((state) => state.masks);
export const useActiveMaskId = () => useEditorStore((state) => state.activeMaskId);
