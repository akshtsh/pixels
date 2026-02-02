import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Image, Rect, Group, Transformer } from 'react-konva';
import Konva from 'konva';

interface KonvaWrapperProps {
    imageSrc: string;
    originalWidth: number;
    originalHeight: number;
    scale: number;
    showOriginal?: boolean;
    crop?: {
        isActive: boolean;
        x: number;
        y: number;
        width: number;
        height: number;
        aspectRatio: string;
    };
    onUpdateCrop?: (newCrop: any) => void;
    rotation?: number;
    straighten?: number;
    straightenScale?: number;
}

export default function KonvaWrapper({
    imageSrc,
    originalWidth,
    originalHeight,
    scale: externalScale,
    showOriginal = false,
    crop,
    onUpdateCrop,
    rotation = 0,
    straighten = 0,
    straightenScale = 1
}: KonvaWrapperProps) {
    const stageRef = useRef<Konva.Stage>(null);
    const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);

    // Zoom and Pan state
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (imageSrc) {
            const img = new window.Image();
            img.src = imageSrc;
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                setKonvaImage(img);
            };
        }
    }, [imageSrc]);

    // Reset zoom and position when image changes
    useEffect(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, [imageSrc]);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = stageRef.current;
        if (!stage) return;
        const oldScale = zoom;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - position.x) / oldScale,
            y: (pointer.y - position.y) / oldScale,
        };
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(0.1, Math.min(10, newScale));
        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        setZoom(newScale);
        setPosition(newPos);
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target.name() === 'stage-drag') {
            setPosition({ x: e.target.x(), y: e.target.y() });
        }
    };

    if (!konvaImage) return null;

    // Viewport Logic
    const isEditing = crop?.isActive;

    // Crop values in Pixels (Unrotated Space)
    const cropX = crop ? (crop.x / 100) * originalWidth : 0;
    const cropY = crop ? (crop.y / 100) * originalHeight : 0;
    const cropW = crop ? (crop.width / 100) * originalWidth : originalWidth;
    const cropH = crop ? (crop.height / 100) * originalHeight : originalHeight;

    // Stage Dimensions
    // Result View: Size matches the crop dimensions
    // Edit View: Size matches the FULL Safe Zone (original image size)
    const viewW = isEditing ? originalWidth : cropW;
    const viewH = isEditing ? originalHeight : cropH;

    const stageWidth = viewW * externalScale;
    const stageHeight = viewH * externalScale;

    // Image Position relative to Stage (0,0)
    // If Editing: Safe Zone (0,0) aligns with Stage (0,0).
    // If Result: Safe Zone (cropX, cropY) aligns with Stage (0,0) -> i.e., shift Safe Zone by -cropX, -cropY.
    const shiftX = isEditing ? 0 : -cropX;
    const shiftY = isEditing ? 0 : -cropY;

    // Calculate center of the Safe Zone relative to its top-left (0,0)
    const safeZoneCenterX = originalWidth / 2;
    const safeZoneCenterY = originalHeight / 2;

    // Image Node Position
    // We want the Image Center (Pivot) to be at `shift + safeZoneCenter`.
    const imgX = (shiftX + safeZoneCenterX) * externalScale;
    const imgY = (shiftY + safeZoneCenterY) * externalScale;

    const totalRotation = rotation + straighten;

    return (
        <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            scaleX={zoom} // externalScale is applied manually to coords/sizes to allow flexible "View" logic
            scaleY={zoom}
            x={position.x}
            y={position.y}
            draggable={!isEditing} // Pan stage when not editing crop
            name="stage-drag"
            onWheel={handleWheel}
            onDragEnd={handleDragEnd}
        >
            <Layer>
                {/* Image Group */}
                <Image
                    image={konvaImage}
                    x={imgX}
                    y={imgY}
                    width={originalWidth}
                    height={originalHeight}
                    offsetX={originalWidth / 2}
                    offsetY={originalHeight / 2}
                    rotation={totalRotation}
                    scaleX={straightenScale * externalScale}
                    scaleY={straightenScale * externalScale}
                />

                {/* Crop UI (Only when editing) */}
                {isEditing && crop && onUpdateCrop && (
                    <CropTool
                        width={originalWidth}
                        height={originalHeight}
                        crop={crop}
                        onUpdate={onUpdateCrop}
                        scale={externalScale}
                    />
                )}
            </Layer>
        </Stage>
    );
}

function CropTool({
    width,
    height,
    crop,
    onUpdate,
    scale
}: {
    width: number;
    height: number;
    crop: {
        isActive: boolean;
        x: number;
        y: number;
        width: number;
        height: number;
        aspectRatio: string;
    };
    onUpdate: (c: any) => void;
    scale: number;
}) {
    const shapeRef = useRef<Konva.Rect>(null);
    const trRef = useRef<Konva.Transformer>(null);

    const x = (crop.x / 100) * width * scale;
    const y = (crop.y / 100) * height * scale;
    const w = (crop.width / 100) * width * scale;
    const h = (crop.height / 100) * height * scale;

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    useEffect(() => {
        if (crop.isActive && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [crop.isActive]);

    // Aspect Ratio Logic
    useEffect(() => {
        if (crop.isActive && crop.aspectRatio !== 'free') {
            const [rW, rH] = crop.aspectRatio.split(':').map(Number);
            const targetRatio = rW / rH;

            // Current implementation: Centered resize to fit ratio
            // Keep the same current area roughly, but force ratio.
            // We usually want to fit the largest possible rect of new ratio inside current 'Safe Zone' OR current Crop Rect?
            // Standard behavior: Reset to largest center crop of that ratio within the IMAGE bounds (Safe Zone).

            // NOTE: The 'width' and 'height' props here are Original Image Dimensions.
            // When user picks a ratio, usually they want a fresh crop of that ratio.

            let newW = width;
            let newH = width / targetRatio;

            if (newH > height) {
                newH = height;
                newW = newH * targetRatio;
            }

            // Center it
            const newX = (width - newW) / 2;
            const newY = (height - newH) / 2;

            onUpdate({
                x: (newX / width) * 100,
                y: (newY / height) * 100,
                width: (newW / width) * 100,
                height: (newH / height) * 100
            });
        }
    }, [crop.aspectRatio, width, height]); // Only trigger when aspect ratio value actually changes.


    if (!crop.isActive) return null;

    const handleDragEnd = () => {
        const node = shapeRef.current;
        if (!node) return;

        const newX = (node.x() / scaledWidth) * 100;
        const newY = (node.y() / scaledHeight) * 100;

        onUpdate({ x: newX, y: newY });
    };

    const handleTransformEnd = () => {
        const node = shapeRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const newW = (node.width() * scaleX / scaledWidth) * 100;
        const newH = (node.height() * scaleY / scaledHeight) * 100;
        const newX = (node.x() / scaledWidth) * 100;
        const newY = (node.y() / scaledHeight) * 100;

        onUpdate({
            x: newX,
            y: newY,
            width: newW,
            height: newH,
        });
    };

    const boundBoxFunc = (oldBox: any, newBox: any) => {
        // Limit to image bounds
        if (newBox.x < 0) {
            newBox.width += newBox.x;
            newBox.x = 0;
        }
        if (newBox.y < 0) {
            newBox.height += newBox.y;
            newBox.y = 0;
        }
        if (newBox.x + newBox.width > scaledWidth) {
            newBox.width = scaledWidth - newBox.x;
        }
        if (newBox.y + newBox.height > scaledHeight) {
            newBox.height = scaledHeight - newBox.y;
        }
        return newBox;
    };

    return (
        <Group>
            <Group opacity={0.6}>
                {/* Simplified Overlay: Just one rect with hole or 4 rects? 
                   Let's stick to 4 rects logic but scaled.
                */}
                <Rect x={0} y={0} width={scaledWidth} height={y} fill="black" listening={false} />
                <Rect x={0} y={y + h} width={scaledWidth} height={scaledHeight - (y + h)} fill="black" listening={false} />
                <Rect x={0} y={y} width={x} height={h} fill="black" listening={false} />
                <Rect x={x + w} y={y} width={scaledWidth - (x + w)} height={h} fill="black" listening={false} />
            </Group>

            <Rect
                ref={shapeRef}
                x={x}
                y={y}
                width={w}
                height={h}
                stroke="white"
                strokeWidth={2}
                dash={[5, 10]}
                draggable
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                dragBoundFunc={(pos) => {
                    const newX = Math.max(0, Math.min(scaledWidth - w, pos.x));
                    const newY = Math.max(0, Math.min(scaledHeight - h, pos.y));
                    return { x: newX, y: newY };
                }}
            />

            <Transformer
                ref={trRef}
                rotateEnabled={false}
                keepRatio={crop.aspectRatio !== 'free'}
                boundBoxFunc={boundBoxFunc}
                ignoreStroke
            />
        </Group>
    );
}
