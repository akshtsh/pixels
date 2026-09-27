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
    zoom?: number;
    onZoomChange?: (zoom: number) => void;
    position?: { x: number; y: number };
    onPositionChange?: (pos: { x: number; y: number }) => void;
    interactive?: boolean;
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
    straightenScale = 1,
    zoom: controlledZoom,
    onZoomChange,
    position: controlledPosition,
    onPositionChange,
    interactive = true,
}: KonvaWrapperProps) {
    const stageRef = useRef<Konva.Stage>(null);
    const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);

    // Zoom and Pan state (internal fallback if not controlled)
    const [internalZoom, setInternalZoom] = useState(1);
    const [internalPosition, setInternalPosition] = useState({ x: 0, y: 0 });

    const zoom = controlledZoom !== undefined ? controlledZoom : internalZoom;
    const position = controlledPosition !== undefined ? controlledPosition : internalPosition;

    const setZoom = (newZoom: number) => {
        setInternalZoom(newZoom);
        onZoomChange?.(newZoom);
    };

    const setPosition = (newPos: { x: number; y: number }) => {
        setInternalPosition(newPos);
        onPositionChange?.(newPos);
    };

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
        if (controlledZoom === undefined) {
            setInternalZoom(1);
        }
        if (controlledPosition === undefined) {
            setInternalPosition({ x: 0, y: 0 });
        }
    }, [imageSrc, controlledZoom, controlledPosition]);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        if (!interactive) return;
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
        if (!interactive) return;
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
    const viewW = isEditing ? originalWidth : cropW;
    const viewH = isEditing ? originalHeight : cropH;

    const stageWidth = viewW * externalScale;
    const stageHeight = viewH * externalScale;

    const shiftX = isEditing ? 0 : -cropX;
    const shiftY = isEditing ? 0 : -cropY;

    const safeZoneCenterX = originalWidth / 2;
    const safeZoneCenterY = originalHeight / 2;

    const imgX = (shiftX + safeZoneCenterX) * externalScale;
    const imgY = (shiftY + safeZoneCenterY) * externalScale;

    const totalRotation = rotation + straighten;

    return (
        <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            scaleX={zoom}
            scaleY={zoom}
            x={position.x}
            y={position.y}
            draggable={interactive && !isEditing}
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

                {/* Crop UI (Only when editing and interactive) */}
                {interactive && isEditing && crop && onUpdateCrop && (
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

    // Handle size based on scale
    const handleSize = Math.max(8, Math.min(14, 10 / scale));
    const edgeHandleLength = Math.max(20, Math.min(36, 28 / scale));

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
    }, [crop.aspectRatio, width, height]);


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
        // Minimum size
        if (newBox.width < 20) newBox.width = 20;
        if (newBox.height < 20) newBox.height = 20;
        return newBox;
    };

    // Rule of thirds grid lines
    const thirdW = w / 3;
    const thirdH = h / 3;

    // Corner handle dimensions
    const cornerLen = Math.min(handleSize * 2.5, w / 4, h / 4);
    const cornerThick = Math.max(2, 3 / scale);

    return (
        <Group>
            {/* Dark overlay (4 rects around crop area) */}
            <Group>
                <Rect x={0} y={0} width={scaledWidth} height={y} fill="black" opacity={0.55} listening={false} />
                <Rect x={0} y={y + h} width={scaledWidth} height={scaledHeight - (y + h)} fill="black" opacity={0.55} listening={false} />
                <Rect x={0} y={y} width={x} height={h} fill="black" opacity={0.55} listening={false} />
                <Rect x={x + w} y={y} width={scaledWidth - (x + w)} height={h} fill="black" opacity={0.55} listening={false} />
            </Group>

            {/* Draggable crop region */}
            <Rect
                ref={shapeRef}
                x={x}
                y={y}
                width={w}
                height={h}
                fill="transparent"
                draggable
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                dragBoundFunc={(pos) => {
                    const newX = Math.max(0, Math.min(scaledWidth - w, pos.x));
                    const newY = Math.max(0, Math.min(scaledHeight - h, pos.y));
                    return { x: newX, y: newY };
                }}
            />

            {/* Crop border */}
            <Rect
                x={x}
                y={y}
                width={w}
                height={h}
                stroke="white"
                strokeWidth={1.5}
                listening={false}
            />

            {/* Rule of thirds grid */}
            <Group listening={false} opacity={0.4}>
                <Rect x={x + thirdW} y={y} width={0.5} height={h} fill="white" />
                <Rect x={x + thirdW * 2} y={y} width={0.5} height={h} fill="white" />
                <Rect x={x} y={y + thirdH} width={w} height={0.5} fill="white" />
                <Rect x={x} y={y + thirdH * 2} width={w} height={0.5} fill="white" />
            </Group>

            {/* Corner handles - L-shaped golden handles */}
            <Group listening={false}>
                {/* Top-Left */}
                <Rect x={x - cornerThick / 2} y={y - cornerThick / 2} width={cornerLen} height={cornerThick} fill="#FFD700" cornerRadius={1} />
                <Rect x={x - cornerThick / 2} y={y - cornerThick / 2} width={cornerThick} height={cornerLen} fill="#FFD700" cornerRadius={1} />

                {/* Top-Right */}
                <Rect x={x + w - cornerLen + cornerThick / 2} y={y - cornerThick / 2} width={cornerLen} height={cornerThick} fill="#FFD700" cornerRadius={1} />
                <Rect x={x + w - cornerThick / 2} y={y - cornerThick / 2} width={cornerThick} height={cornerLen} fill="#FFD700" cornerRadius={1} />

                {/* Bottom-Left */}
                <Rect x={x - cornerThick / 2} y={y + h - cornerThick / 2} width={cornerLen} height={cornerThick} fill="#FFD700" cornerRadius={1} />
                <Rect x={x - cornerThick / 2} y={y + h - cornerLen + cornerThick / 2} width={cornerThick} height={cornerLen} fill="#FFD700" cornerRadius={1} />

                {/* Bottom-Right */}
                <Rect x={x + w - cornerLen + cornerThick / 2} y={y + h - cornerThick / 2} width={cornerLen} height={cornerThick} fill="#FFD700" cornerRadius={1} />
                <Rect x={x + w - cornerThick / 2} y={y + h - cornerLen + cornerThick / 2} width={cornerThick} height={cornerLen} fill="#FFD700" cornerRadius={1} />

                {/* Edge midpoint handles */}
                <Rect x={x + w / 2 - edgeHandleLength / 2} y={y - cornerThick / 2} width={edgeHandleLength} height={cornerThick} fill="#FFD700" cornerRadius={1} />
                <Rect x={x + w / 2 - edgeHandleLength / 2} y={y + h - cornerThick / 2} width={edgeHandleLength} height={cornerThick} fill="#FFD700" cornerRadius={1} />
                <Rect x={x - cornerThick / 2} y={y + h / 2 - edgeHandleLength / 2} width={cornerThick} height={edgeHandleLength} fill="#FFD700" cornerRadius={1} />
                <Rect x={x + w - cornerThick / 2} y={y + h / 2 - edgeHandleLength / 2} width={cornerThick} height={edgeHandleLength} fill="#FFD700" cornerRadius={1} />
            </Group>

            {/* Transformer */}
            <Transformer
                ref={trRef}
                rotateEnabled={false}
                keepRatio={crop.aspectRatio !== 'free'}
                boundBoxFunc={boundBoxFunc}
                ignoreStroke
                borderEnabled={false}
                anchorSize={handleSize}
                anchorStroke="transparent"
                anchorFill="transparent"
                anchorCornerRadius={0}
            />
        </Group>
    );
}
