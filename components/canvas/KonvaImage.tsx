'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Image as KonvaImageNode } from 'react-konva';
import useImage from 'use-image';
import { computeFilterString } from '@/lib/filters';
import { AdjustmentState } from '@/lib/store';

interface KonvaImageProps {
    src: string;
    adjustments: AdjustmentState;
    filters?: any[]; // Allow passing specific filter objects if needed
}

export default function KonvaImage({ src, adjustments, filters = [] }: KonvaImageProps) {
    const [image] = useImage(src, 'anonymous'); // Use 'anonymous' for CORS
    const imageRef = useRef<any>(null);

    // Apply filters when adjustments change
    useEffect(() => {
        if (image && imageRef.current) {
            imageRef.current.cache();
            imageRef.current.getLayer().batchDraw();
        }
    }, [image, adjustments]);

    // We are currently simulating CSS filters. 
    // Konva has its own filter system (Konva.Filters.Brighten, etc.)
    // However, mapping our CSS-like adjustment values to Konva filters 1:1 can be tricky.
    // For the purpose of "Layer Compositing" in Phase 2, we might want to stick to global CSS filters 
    // for the VIEW port, but for masks, we *need* pixel manipulation or caching.

    // Strategy:
    // 1. We render the base image.
    // 2. We apply "native" Konva filters if possible for performance.
    // 3. OR we rely on the parent container (CSS) if we are just showing the main image.

    // BUT: The requirement is masking.
    // To mask: We need to render the masked part on top or use `globalCompositeOperation`.

    // For now, let's just render the image. The compositing logic happens in the parent Canvas.

    return (
        <KonvaImageNode
            ref={imageRef}
            image={image}
            x={0}
            y={0}
        // If we want to use Konva filters, we would add them here:
        // filters={[Konva.Filters.Brighten, Konva.Filters.Contrast...]}
        // brightness={adjustments.brightness / 100}
        // etc.
        // For this phase, we might still rely on CSS filters wrapper for the GLOBAL image, 
        // but for LOCAL adjustments (masks), we will need detailed compositing.
        />
    );
}
