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

    // Zoom and Pan state
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

    const isEditing = crop?.isActive;

    // Stage dimensions always match the current image dimensions scaled
    const stageWidth = originalWidth * externalScale;
    const stageHeight = originalHeight * externalScale;

    // Center image on the stage
    const imgX = (originalWidth / 2) * externalScale;
    const imgY = (originalHeight / 2) * externalScale;

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
    scale,
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

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const initialX = (crop.x / 100) * scaledWidth;
    const initialY = (crop.y / 100) * scaledHeight;
    const initialW = (crop.width / 100) * scaledWidth;
    const initialH = (crop.height / 100) * scaledHeight;

    // Local state for smooth 60fps real-time updates without React store thrashing
    const [liveBox, setLiveBox] = useState({
        x: initialX,
        y: initialY,
        width: initialW,
        height: initialH,
    });

    // Keep liveBox synced when crop props change (e.g., aspect ratio clicked)
    useEffect(() => {
        const nx = (crop.x / 100) * scaledWidth;
        const ny = (crop.y / 100) * scaledHeight;
        const nw = (crop.width / 100) * scaledWidth;
        const nh = (crop.height / 100) * scaledHeight;
        setLiveBox({ x: nx, y: ny, width: nw, height: nh });

        if (shapeRef.current) {
            shapeRef.current.position({ x: nx, y: ny });
            shapeRef.current.width(nw);
            shapeRef.current.height(nh);
            shapeRef.current.scaleX(1);
            shapeRef.current.scaleY(1);
        }
    }, [crop.x, crop.y, crop.width, crop.height, scaledWidth, scaledHeight]);

    // Attach transformer to shape
    useEffect(() => {
        if (crop.isActive && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [crop.isActive, crop.aspectRatio]);

    // Aspect Ratio Logic
    useEffect(() => {
        if (crop.isActive && crop.aspectRatio !== 'free') {
            const [rW, rH] = crop.aspectRatio.split(':').map(Number);
            if (!rW || !rH) return;
            const targetRatio = rW / rH;

            let newW = width;
            let newH = width / targetRatio;

            if (newH > height) {
                newH = height;
                newW = newH * targetRatio;
            }

            // Center
            const newX = (width - newW) / 2;
            const newY = (height - newH) / 2;

            onUpdate({
                x: (newX / width) * 100,
                y: (newY / height) * 100,
                width: (newW / width) * 100,
                height: (newH / height) * 100,
            });
        }
    }, [crop.aspectRatio, width, height]);

    if (!crop.isActive) return null;

    // Real-time update during drag
    const handleDragMove = () => {
        const node = shapeRef.current;
        if (!node) return;
        setLiveBox({
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
        });
    };

    const handleDragEnd = () => {
        const node = shapeRef.current;
        if (!node) return;

        const newX = Math.max(0, Math.min(scaledWidth, node.x()));
        const newY = Math.max(0, Math.min(scaledHeight, node.y()));

        onUpdate({
            x: (newX / scaledWidth) * 100,
            y: (newY / scaledHeight) * 100,
        });
    };

    // Real-time update during resize / transform
    const handleTransform = () => {
        const node = shapeRef.current;
        if (!node) return;
        setLiveBox({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * node.scaleX()),
            height: Math.max(20, node.height() * node.scaleY()),
        });
    };

    const handleTransformEnd = () => {
        const node = shapeRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const finalW = Math.max(20, node.width() * scaleX);
        const finalH = Math.max(20, node.height() * scaleY);
        const finalX = Math.max(0, Math.min(scaledWidth - finalW, node.x()));
        const finalY = Math.max(0, Math.min(scaledHeight - finalH, node.y()));

        node.width(finalW);
        node.height(finalH);
        node.x(finalX);
        node.y(finalY);

        onUpdate({
            x: (finalX / scaledWidth) * 100,
            y: (finalY / scaledHeight) * 100,
            width: (finalW / scaledWidth) * 100,
            height: (finalH / scaledHeight) * 100,
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
        if (newBox.width < 24) newBox.width = 24;
        if (newBox.height < 24) newBox.height = 24;
        return newBox;
    };

    // Thirds grid lines based on liveBox
    const thirdW = liveBox.width / 3;
    const thirdH = liveBox.height / 3;

    return (
        <Group>
            {/* Dimmed backdrop around crop box (4 rects) */}
            <Group listening={false}>
                <Rect x={0} y={0} width={scaledWidth} height={Math.max(0, liveBox.y)} fill="black" opacity={0.6} />
                <Rect
                    x={0}
                    y={Math.min(scaledHeight, liveBox.y + liveBox.height)}
                    width={scaledWidth}
                    height={Math.max(0, scaledHeight - (liveBox.y + liveBox.height))}
                    fill="black"
                    opacity={0.6}
                />
                <Rect
                    x={0}
                    y={Math.max(0, liveBox.y)}
                    width={Math.max(0, liveBox.x)}
                    height={Math.max(0, liveBox.height)}
                    fill="black"
                    opacity={0.6}
                />
                <Rect
                    x={Math.min(scaledWidth, liveBox.x + liveBox.width)}
                    y={Math.max(0, liveBox.y)}
                    width={Math.max(0, scaledWidth - (liveBox.x + liveBox.width))}
                    height={Math.max(0, liveBox.height)}
                    fill="black"
                    opacity={0.6}
                />
            </Group>

            {/* Draggable interactive crop region */}
            <Rect
                ref={shapeRef}
                x={initialX}
                y={initialY}
                width={initialW}
                height={initialH}
                fill="rgba(255, 255, 255, 0.001)" // Non-zero alpha guarantees pointer hit detection everywhere inside
                stroke="#FFFFFF"
                strokeWidth={1.5}
                draggable
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onTransform={handleTransform}
                onTransformEnd={handleTransformEnd}
                dragBoundFunc={(pos) => {
                    const newX = Math.max(0, Math.min(scaledWidth - liveBox.width, pos.x));
                    const newY = Math.max(0, Math.min(scaledHeight - liveBox.height, pos.y));
                    return { x: newX, y: newY };
                }}
                onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'move';
                }}
                onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                }}
            />

            {/* Rule of thirds grid inside crop box */}
            <Group listening={false} opacity={0.45}>
                <Rect x={liveBox.x + thirdW} y={liveBox.y} width={1} height={liveBox.height} fill="white" />
                <Rect x={liveBox.x + thirdW * 2} y={liveBox.y} width={1} height={liveBox.height} fill="white" />
                <Rect x={liveBox.x} y={liveBox.y + thirdH} width={liveBox.width} height={1} fill="white" />
                <Rect x={liveBox.x} y={liveBox.y + thirdH * 2} width={liveBox.width} height={1} fill="white" />
            </Group>

            {/* Transformer with bold, responsive, neobrutalist yellow-gold handles */}
            <Transformer
                ref={trRef}
                rotateEnabled={false}
                keepRatio={crop.aspectRatio !== 'free'}
                enabledAnchors={
                    crop.aspectRatio === 'free'
                        ? [
                              'top-left',
                              'top-center',
                              'top-right',
                              'middle-right',
                              'bottom-right',
                              'bottom-center',
                              'bottom-left',
                              'middle-left',
                          ]
                        : ['top-left', 'top-right', 'bottom-right', 'bottom-left']
                }
                boundBoxFunc={boundBoxFunc}
                anchorSize={16}
                anchorStroke="#000000"
                anchorStrokeWidth={2}
                anchorFill="#FFD700"
                anchorCornerRadius={2}
                borderStroke="#FFFFFF"
                borderStrokeWidth={2}
                borderDash={[6, 4]}
            />
        </Group>
    );
}
