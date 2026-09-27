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

    // Direct Konva node references for 120fps smooth visual tracking without React re-renders
    const topOverlayRef = useRef<Konva.Rect>(null);
    const bottomOverlayRef = useRef<Konva.Rect>(null);
    const leftOverlayRef = useRef<Konva.Rect>(null);
    const rightOverlayRef = useRef<Konva.Rect>(null);
    const vLine1Ref = useRef<Konva.Rect>(null);
    const vLine2Ref = useRef<Konva.Rect>(null);
    const hLine1Ref = useRef<Konva.Rect>(null);
    const hLine2Ref = useRef<Konva.Rect>(null);

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const initialX = (crop.x / 100) * scaledWidth;
    const initialY = (crop.y / 100) * scaledHeight;
    const initialW = (crop.width / 100) * scaledWidth;
    const initialH = (crop.height / 100) * scaledHeight;

    const updateVisuals = () => {
        const node = shapeRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        let nx = node.x();
        let ny = node.y();
        let nw = Math.abs(node.width() * scaleX);
        let nh = Math.abs(node.height() * scaleY);

        if (scaleX < 0) nx -= nw;
        if (scaleY < 0) ny -= nh;

        // Visual overlays clamp to bounds
        const topH = Math.max(0, Math.min(scaledHeight, ny));
        topOverlayRef.current?.height(topH);

        const botY = Math.max(0, Math.min(scaledHeight, ny + nh));
        bottomOverlayRef.current?.y(botY);
        bottomOverlayRef.current?.height(Math.max(0, scaledHeight - botY));

        const leftW = Math.max(0, Math.min(scaledWidth, nx));
        leftOverlayRef.current?.y(Math.max(0, ny));
        leftOverlayRef.current?.width(leftW);
        leftOverlayRef.current?.height(Math.max(0, Math.min(scaledHeight - ny, nh)));

        const rightX = Math.max(0, Math.min(scaledWidth, nx + nw));
        rightOverlayRef.current?.x(rightX);
        rightOverlayRef.current?.y(Math.max(0, ny));
        rightOverlayRef.current?.width(Math.max(0, scaledWidth - rightX));
        rightOverlayRef.current?.height(Math.max(0, Math.min(scaledHeight - ny, nh)));

        // Update rule-of-thirds grid lines
        const thirdW = nw / 3;
        const thirdH = nh / 3;

        vLine1Ref.current?.position({ x: nx + thirdW, y: ny });
        vLine1Ref.current?.height(nh);

        vLine2Ref.current?.position({ x: nx + thirdW * 2, y: ny });
        vLine2Ref.current?.height(nh);

        hLine1Ref.current?.position({ x: nx, y: ny + thirdH });
        hLine1Ref.current?.width(nw);

        hLine2Ref.current?.position({ x: nx, y: ny + thirdH * 2 });
        hLine2Ref.current?.width(nw);

        node.getLayer()?.batchDraw();
    };

    // Sync shape position and transformer when crop props change from external UI (e.g. aspect ratio buttons)
    useEffect(() => {
        const nx = (crop.x / 100) * scaledWidth;
        const ny = (crop.y / 100) * scaledHeight;
        const nw = (crop.width / 100) * scaledWidth;
        const nh = (crop.height / 100) * scaledHeight;

        if (shapeRef.current) {
            shapeRef.current.position({ x: nx, y: ny });
            shapeRef.current.width(nw);
            shapeRef.current.height(nh);
            shapeRef.current.scaleX(1);
            shapeRef.current.scaleY(1);
        }

        if (trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
        }

        updateVisuals();
    }, [crop.x, crop.y, crop.width, crop.height, scaledWidth, scaledHeight]);

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

    const handleDragMove = () => {
        updateVisuals();
    };

    const handleDragEnd = () => {
        const node = shapeRef.current;
        if (!node) return;

        const newX = Math.max(0, Math.min(scaledWidth - node.width(), node.x()));
        const newY = Math.max(0, Math.min(scaledHeight - node.height(), node.y()));

        node.position({ x: newX, y: newY });
        updateVisuals();

        onUpdate({
            x: (newX / scaledWidth) * 100,
            y: (newY / scaledHeight) * 100,
        });
    };

    const handleTransform = () => {
        updateVisuals();
    };

    const handleTransformEnd = () => {
        const node = shapeRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        let finalW = Math.abs(node.width() * scaleX);
        let finalH = Math.abs(node.height() * scaleY);
        let finalX = node.x();
        let finalY = node.y();

        if (scaleX < 0) {
            finalX -= finalW;
        }
        if (scaleY < 0) {
            finalY -= finalH;
        }

        // Clamp to image dimensions
        finalX = Math.max(0, Math.min(scaledWidth - 20, finalX));
        finalY = Math.max(0, Math.min(scaledHeight - 20, finalY));
        finalW = Math.max(20, Math.min(scaledWidth - finalX, finalW));
        finalH = Math.max(20, Math.min(scaledHeight - finalY, finalH));

        node.width(finalW);
        node.height(finalH);
        node.position({ x: finalX, y: finalY });

        if (trRef.current) {
            trRef.current.nodes([node]);
        }
        updateVisuals();

        onUpdate({
            x: (finalX / scaledWidth) * 100,
            y: (finalY / scaledHeight) * 100,
            width: (finalW / scaledWidth) * 100,
            height: (finalH / scaledHeight) * 100,
        });
    };

    const thirdW = initialW / 3;
    const thirdH = initialH / 3;

    return (
        <Group>
            {/* Dimmed backdrop around crop box (4 rects) */}
            <Group listening={false}>
                <Rect ref={topOverlayRef} x={0} y={0} width={scaledWidth} height={Math.max(0, initialY)} fill="black" opacity={0.6} />
                <Rect
                    ref={bottomOverlayRef}
                    x={0}
                    y={Math.min(scaledHeight, initialY + initialH)}
                    width={scaledWidth}
                    height={Math.max(0, scaledHeight - (initialY + initialH))}
                    fill="black"
                    opacity={0.6}
                />
                <Rect
                    ref={leftOverlayRef}
                    x={0}
                    y={Math.max(0, initialY)}
                    width={Math.max(0, initialX)}
                    height={initialH}
                    fill="black"
                    opacity={0.6}
                />
                <Rect
                    ref={rightOverlayRef}
                    x={Math.min(scaledWidth, initialX + initialW)}
                    y={Math.max(0, initialY)}
                    width={Math.max(0, scaledWidth - (initialX + initialW))}
                    height={initialH}
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
                fill="rgba(255, 255, 255, 0.001)"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                draggable
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onTransform={handleTransform}
                onTransformEnd={handleTransformEnd}
                dragBoundFunc={(pos) => {
                    const node = shapeRef.current;
                    const curW = node ? Math.abs(node.width() * node.scaleX()) : initialW;
                    const curH = node ? Math.abs(node.height() * node.scaleY()) : initialH;
                    const newX = Math.max(0, Math.min(scaledWidth - curW, pos.x));
                    const newY = Math.max(0, Math.min(scaledHeight - curH, pos.y));
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
                <Rect ref={vLine1Ref} x={initialX + thirdW} y={initialY} width={1} height={initialH} fill="white" />
                <Rect ref={vLine2Ref} x={initialX + thirdW * 2} y={initialY} width={1} height={initialH} fill="white" />
                <Rect ref={hLine1Ref} x={initialX} y={initialY + thirdH} width={initialW} height={1} fill="white" />
                <Rect ref={hLine2Ref} x={initialX} y={initialY + thirdH * 2} width={initialW} height={1} fill="white" />
            </Group>

            {/* Transformer with bold, responsive, neobrutalist yellow-gold handles for ALL 8 directions */}
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
                boundBoxFunc={(oldBox, newBox) => {
                    if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
                        return oldBox;
                    }
                    return newBox;
                }}
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
