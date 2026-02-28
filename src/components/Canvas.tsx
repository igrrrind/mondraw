import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DrawPoint } from '@/types';
import { Eraser, Pencil, Trash2, Undo2, Redo2, PaintBucket, Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/utils/cn';

interface CanvasProps {
    roomId: string;
    isDrawer: boolean;
    pusher: any;
}

export const COLORS = [
    '#000000', '#4B5563', '#9CA3AF', '#FFFFFF',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#38BDF8', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#FDA4AF', '#9D174D',
    '#78350F', '#92400E', '#B45309', '#D97706'
];

const BASIC_COLORS = [
    '#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#FFFFFF'
];

export const SIZES = [2, 8, 20, 40];

export function Canvas({ roomId, isDrawer, pusher }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState(COLORS[0]);
    const [size, setSize] = useState(SIZES[1]);
    const [mode, setMode] = useState<'draw' | 'erase' | 'fill'>('draw');
    const [showColorModal, setShowColorModal] = useState(false);

    // Throttling and History state
    const lastPointRef = useRef<{ x: number, y: number } | null>(null);
    const pointBufferRef = useRef<any[]>([]);
    const lastBroadcastRef = useRef<number>(0);
    const historyRef = useRef<ImageData[]>([]);
    const redoStackRef = useRef<ImageData[]>([]);

    // Save history state
    const saveHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (canvas && ctx) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            historyRef.current.push(data);
            if (historyRef.current.length > 20) historyRef.current.shift(); // Max 20 undo steps
            redoStackRef.current = []; // Clear redo stack on new action
        }
    }, []);

    const undo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && historyRef.current.length > 0) {
            const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            redoStackRef.current.push(currentData);

            const prevData = historyRef.current.pop();
            if (prevData) {
                ctx.putImageData(prevData, 0, 0);
                broadcastFullCanvas();
            }
        }
    }, [pusher, roomId, isDrawer]);

    const redo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && redoStackRef.current.length > 0) {
            const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            historyRef.current.push(currentData);

            const nextData = redoStackRef.current.pop();
            if (nextData) {
                ctx.putImageData(nextData, 0, 0);
                broadcastFullCanvas();
            }
        }
    }, [pusher, roomId, isDrawer]);

    const broadcastFullCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas && pusher && isDrawer) {
            const dataUrl = canvas.toDataURL('image/webp', 0.5);
            const channel = pusher.subscribe(`presence-room-${roomId}`);
            if (channel) {
                channel.trigger('client-full-sync', { dataUrl });
            }
        }
    }, [pusher, roomId, isDrawer]);

    const floodFill = (startX: number, startY: number, fillColor: string) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (!canvas || !ctx) return;

        saveHistory();

        startX = Math.round(startX);
        startY = Math.round(startY);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const targetColor = getPixelColor(data, startX, startY, canvas.width);
        const fillRGB = hexToRgb(fillColor);

        if (colorsMatch(targetColor, fillRGB)) return;

        const stack: [number, number][] = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop()!;

            let currentY = y;
            while (currentY >= 0 && colorsMatch(getPixelColor(data, x, currentY, canvas.width), targetColor)) {
                currentY--;
            }
            currentY++;

            let reachLeft = false;
            let reachRight = false;

            while (currentY < canvas.height && colorsMatch(getPixelColor(data, x, currentY, canvas.width), targetColor)) {
                setPixelColor(data, x, currentY, canvas.width, fillRGB);

                if (x > 0) {
                    if (colorsMatch(getPixelColor(data, x - 1, currentY, canvas.width), targetColor)) {
                        if (!reachLeft) {
                            stack.push([x - 1, currentY]);
                            reachLeft = true;
                        }
                    } else {
                        reachLeft = false;
                    }
                }

                if (x < canvas.width - 1) {
                    if (colorsMatch(getPixelColor(data, x + 1, currentY, canvas.width), targetColor)) {
                        if (!reachRight) {
                            stack.push([x + 1, currentY]);
                            reachRight = true;
                        }
                    } else {
                        reachRight = false;
                    }
                }
                currentY++;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        broadcastFullCanvas();
    };

    const getPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    };

    const setPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number, color: number[]) => {
        const i = (y * width + x) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
    };

    const colorsMatch = (c1: number[], c2: number[]) => {
        return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2];
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    };

    // Setup Pusher Listener for Guessers
    useEffect(() => {
        if (!pusher) return;

        console.log("[Canvas] Setting up listeners for room:", roomId);
        const channel = pusher.subscribe(`presence-room-${roomId}`);

        channel.bind("pusher:subscription_succeeded", () => {
            console.log("[Canvas] Subscription succeeded for channel:", channel.name);
        });

        channel.bind("pusher:subscription_error", (err: any) => {
            console.error("[Canvas] Subscription error:", err);
        });

        const handleDrawEvent = (batches: any[]) => {
            if (isDrawer) return;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            batches.forEach(point => {
                // Decode compact array: [x, y, lx, ly, ci, si, type]
                const [x, y, lastX, lastY, colorIdx, sizeIdx, type] = point;
                const pColor = COLORS[colorIdx] || COLORS[0];
                const pSize = SIZES[sizeIdx] || SIZES[1];
                const isInitial = type === 1;

                ctx.beginPath();
                ctx.strokeStyle = pColor;
                ctx.lineWidth = pSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (isInitial) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                } else {
                    const midX = lastX + (x - lastX) / 2;
                    const midY = lastY + (y - lastY) / 2;
                    ctx.moveTo(lastX, lastY);
                    ctx.quadraticCurveTo(lastX, lastY, midX, midY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            });
        };

        const handleClearEvent = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        const handleFullSync = (data: { dataUrl: string }) => {
            if (isDrawer) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = data.dataUrl;
            }
        };

        channel.bind('client-draw-batch', handleDrawEvent);
        channel.bind('client-clear-canvas', handleClearEvent);
        channel.bind('client-full-sync', handleFullSync);

        return () => {
            console.log("[Canvas] Unbinding listeners");
            channel.unbind('client-draw-batch', handleDrawEvent);
            channel.unbind('client-clear-canvas', handleClearEvent);
            channel.unbind('client-full-sync', handleFullSync);
        };
    }, [roomId, pusher, isDrawer]);

    // Handle Resize
    useEffect(() => {
        const resizeCanvas = () => {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            if (!container || !canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set internal resolution (fixed 1280x720 for consistent coordinates)
            if (canvas.width !== 1280) {
                canvas.width = 1280;
                canvas.height = 720;
                // Set background to white initially
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };

        window.addEventListener('resize', resizeCanvas);
        const observer = new ResizeObserver(resizeCanvas);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        
        resizeCanvas();
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            observer.disconnect();
        };
    }, []);


    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // Calculate actual rendered size and position of the canvas bitmap due to object-fit: contain
        const renderRatio = rect.width / rect.height;
        const canvasRatio = canvas.width / canvas.height;
        
        let renderedWidth = rect.width;
        let renderedHeight = rect.height;
        let offsetX = 0;
        let offsetY = 0;

        if (renderRatio > canvasRatio) {
            // Container is wider than canvas -> letterboxed on sides
            renderedWidth = rect.height * canvasRatio;
            offsetX = (rect.width - renderedWidth) / 2;
        } else {
            // Container is taller than canvas -> letterboxed on top/bottom
            renderedHeight = rect.width / canvasRatio;
            offsetY = (rect.height - renderedHeight) / 2;
        }

        const x = (clientX - rect.left - offsetX) * (canvas.width / renderedWidth);
        const y = (clientY - rect.top - offsetY) * (canvas.height / renderedHeight);

        return { x, y };
    };

    const drawLocal = (x: number, y: number, lastX: number, lastY: number, size: number, color: string, isInitial: boolean) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isInitial) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y);
        } else {
            const midX = lastX + (x - lastX) / 2;
            const midY = lastY + (y - lastY) / 2;
            ctx.moveTo(lastX, lastY);
            ctx.quadraticCurveTo(lastX, lastY, midX, midY);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    };

    const broadcastPoints = () => {
        if (pointBufferRef.current.length > 0 && pusher) {
            const channel = pusher.subscribe(`presence-room-${roomId}`);
            if (channel) {
                const success = channel.trigger('client-draw-batch', pointBufferRef.current);
                if (!success) {
                    console.warn("[Canvas] Failed to trigger client-draw-batch. Ensure client events are enabled in Pusher dashboard.");
                }
            }
            pointBufferRef.current = [];
            lastBroadcastRef.current = Date.now();
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawer) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        if (!coords) return;

        const actualColor = mode === 'erase' ? '#FFFFFF' : color;

        if (mode === 'fill') {
            floodFill(coords.x, coords.y, actualColor);
            return;
        }

        saveHistory();
        setIsDrawing(true);
        lastPointRef.current = coords;
        const colorIdx = COLORS.indexOf(actualColor);
        const sizeIdx = SIZES.indexOf(size);

        drawLocal(coords.x, coords.y, coords.x, coords.y, size, actualColor, true);

        // [x, y, lx, ly, ci, si, type]
        (pointBufferRef.current as any).push([
            Math.round(coords.x),
            Math.round(coords.y),
            Math.round(coords.x),
            Math.round(coords.y),
            colorIdx >= 0 ? colorIdx : 0,
            sizeIdx >= 0 ? sizeIdx : 1,
            1
        ]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !isDrawer) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        if (!coords || !lastPointRef.current) return;

        const actualColor = mode === 'erase' ? '#FFFFFF' : color;
        const colorIdx = COLORS.indexOf(actualColor);
        const sizeIdx = SIZES.indexOf(size);

        drawLocal(coords.x, coords.y, lastPointRef.current.x, lastPointRef.current.y, size, actualColor, false);

        (pointBufferRef.current as any).push([
            Math.round(coords.x),
            Math.round(coords.y),
            Math.round(lastPointRef.current.x),
            Math.round(lastPointRef.current.y),
            colorIdx >= 0 ? colorIdx : 0,
            sizeIdx >= 0 ? sizeIdx : 1,
            0
        ]);

        lastPointRef.current = coords;

        // Throttle broadcasting to every 50ms
        if (Date.now() - lastBroadcastRef.current > 50) {
            // Use requestAnimationFrame so we don't block the UI thread during broadcast
            requestAnimationFrame(broadcastPoints);
        }
    };

    const stopDrawing = () => {
        if (!isDrawer) return;
        setIsDrawing(false);
        lastPointRef.current = null;
        broadcastPoints(); // Flush remaining points
    };


    const clearCanvas = () => {
        if (!isDrawer) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (!pusher) return;
            const channel = pusher.subscribe(`presence-room-${roomId}`);
            if (channel) {
                const success = channel.trigger('client-clear-canvas', {});
                if (!success) {
                    console.warn("[Canvas] Failed to trigger client-clear-canvas. Ensure client events are enabled in Pusher dashboard.");
                }
            }
        }
    };

    return (
        <div className="flex flex-row h-full gap-2 md:gap-4 min-h-0 w-full">
            <div
                ref={containerRef}
                className="flex-1 h-full bg-pd-surface-alt rounded-2xl flex items-center justify-center overflow-hidden touch-none relative shadow-sm"
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    className={cn(
                        "bg-white touch-none shadow-sm w-full h-full object-contain",
                        isDrawer ? "cursor-crosshair" : "cursor-default pointer-events-none"
                    )}
                />

                {!isDrawer && (
                    <div className="absolute inset-0 z-10 pointer-events-none" />
                )}
            </div>

            {isDrawer && (
                <div className="flex flex-col w-14 md:w-16 shrink-0 gap-2 items-center bg-pd-surface p-2 rounded-xl md:rounded-2xl shadow-sm overflow-y-auto">
                    <Button
                        variant={mode === 'draw' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setMode('draw')}
                        className="w-10 h-10 rounded-lg shrink-0"
                        title="Pencil"
                    >
                        <Pencil className="w-5 h-5" />
                    </Button>
                    <Button
                        variant={mode === 'fill' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setMode('fill')}
                        className="w-10 h-10 rounded-lg shrink-0"
                        title="Paint Bucket"
                    >
                        <PaintBucket className="w-5 h-5" />
                    </Button>
                    <Button
                        variant={mode === 'erase' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setMode('erase')}
                        className="w-10 h-10 rounded-lg shrink-0"
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5" />
                    </Button>

                    <div className="w-8 h-[1px] bg-pd-surface-alt/50 my-1 shrink-0" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={undo}
                        className="w-10 h-10 rounded-lg shrink-0"
                        title="Undo"
                    >
                        <Undo2 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={redo}
                        className="w-10 h-10 rounded-lg shrink-0"
                        title="Redo"
                    >
                        <Redo2 className="w-5 h-5" />
                    </Button>

                    <div className="w-8 h-[1px] bg-pd-surface-alt/50 my-1 shrink-0" />

                    {BASIC_COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => { setColor(c); if (mode === 'erase') setMode('draw'); }}
                            className={cn(
                                "w-8 h-8 rounded-full transition-transform hover:scale-110 shrink-0",
                                color === c && mode !== 'erase' ? "scale-110 ring-2 ring-pd-sky ring-offset-2 ring-offset-pd-surface z-10" : "ring-1 ring-pd-surface-alt"
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}

                    <button 
                        onClick={() => setShowColorModal(true)} 
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 text-white hover:scale-110 transition-transform"
                        title="More Colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    <div className="w-8 h-[1px] bg-pd-surface-alt/50 my-1 shrink-0" />

                    {SIZES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-lg hover:bg-pd-surface transition-colors shrink-0",
                                size === s ? "bg-pd-sky text-white shadow-sm" : "text-pd-text"
                            )}
                        >
                            <div className="bg-current rounded-full" style={{ width: Math.max(2, s / 4), height: Math.max(2, s / 4) }} />
                        </button>
                    ))}

                    <div className="flex-1" />

                    <Button variant="destructive" size="icon" onClick={clearCanvas} className="w-10 h-10 rounded-lg shrink-0" title="Clear">
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {showColorModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-pd-surface p-4 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-pd-text">More Colors</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowColorModal(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {COLORS.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => { setColor(c); if (mode === 'erase') setMode('draw'); setShowColorModal(false); }} 
                                    className={cn(
                                        "w-8 h-8 rounded-full ring-1 ring-pd-surface-alt hover:scale-110 transition-transform",
                                        color === c && mode !== 'erase' ? "ring-2 ring-pd-sky ring-offset-2" : ""
                                    )}
                                    style={{ backgroundColor: c }} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
