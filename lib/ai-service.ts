// We use the CDN version via window.transformers to allow for browser-only execution without build errors
declare global {
    interface Window {
        transformers: any;
    }
}

class AIService {
    private static instance: AIService;
    private segmentationModel: any = null;
    private segmentationProcessor: any = null;
    private isModelLoading = false;

    private constructor() { }

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    // Helper to wait for the script to load
    private async waitForTransformers(): Promise<any> {
        if (typeof window === 'undefined') return null; // Server side check

        let retries = 0;
        while (!window.transformers && retries < 50) { // Wait up to 5s
            await new Promise(r => setTimeout(r, 100));
            retries++;
        }

        if (!window.transformers) {
            throw new Error('Transformers.js CDN script failed to load');
        }
        return window.transformers;
    }

    public async loadSegmentationModel(): Promise<void> {
        if (this.segmentationModel || this.isModelLoading) return;

        this.isModelLoading = true;
        try {
            const { AutoModel, AutoProcessor } = await this.waitForTransformers();

            this.segmentationModel = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
                quantized: true,
            });
            this.segmentationProcessor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4');
        } catch (error) {
            console.error('Failed to load segmentation model:', error);
        } finally {
            this.isModelLoading = false;
        }
    }

    public async generateSubjectMask(imageUrl: string): Promise<string> {
        if (!this.segmentationModel || !this.segmentationProcessor) {
            await this.loadSegmentationModel();
        }
        if (!this.segmentationModel) return '';

        const { RawImage } = window.transformers;
        const image = await RawImage.fromURL(imageUrl);
        const { pixel_values } = await this.segmentationProcessor(image);
        const { output } = await this.segmentationModel({ input: pixel_values });

        // Post-processing
        const mask = await RawImage.fromTensor(output[0].mul(255));

        return mask.toCanvas().toDataURL();
    }
}

export const aiService = AIService.getInstance();
