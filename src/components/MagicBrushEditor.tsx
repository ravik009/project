import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, Trash2, Undo, Redo } from 'lucide-react';

// Interfaces
interface MagicBrushEditorProps {
  originalImage: string;
  processedImage: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
}
type BrushMode = 'erase' | 'restore';
interface Point { x: number; y: number; }
interface Stroke { points: Point[]; mode: BrushMode; size: number; }

// Helper to load an image
const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  if (!src) {
    reject(new Error("Image source is empty."));
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Failed to load image.`));
  img.src = src;
});

// A small color input component
const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <div className="flex items-center gap-2 border border-gray-300 rounded-md px-2">
      <span className="text-sm font-mono text-gray-500 hidden sm:inline">{value}</span>
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer" 
      />
    </div>
  </div>
);

export const MagicBrushEditor: React.FC<MagicBrushEditorProps> = ({
  originalImage,
  processedImage,
  onSave,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [brushMode, setBrushMode] = useState<BrushMode>('restore');
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // States for Brush Preview
  const [isBrushPreviewVisible, setIsBrushPreviewVisible] = useState(false);
  const [brushPosition, setBrushPosition] = useState({ x: 0, y: 0 });

  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(0);
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Point[]>([]);

  const originalImageEl = useRef<HTMLImageElement>();
  const initialMaskEl = useRef<HTMLImageElement>();
  const maskCanvas = useRef(document.createElement('canvas'));
  const finalImageCanvas = useRef(document.createElement('canvas'));

  const [isTransparent, setIsTransparent] = useState(false);

  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const redrawAll = useCallback(() => {
    if (loading || !mainCanvasRef.current || !bgCanvasRef.current || !originalImageEl.current || !initialMaskEl.current) return;

    const mainCtx = mainCanvasRef.current.getContext('2d')!;
    const bgCtx = bgCanvasRef.current.getContext('2d')!;
    const maskCtx = maskCanvas.current.getContext('2d')!;
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;

    // Helper to get centered draw params
    function getCenteredParams(img: HTMLImageElement | HTMLCanvasElement, cWidth: number, cHeight: number) {
      const imgAspect = img.width / img.height;
      const canvasAspect = cWidth / cHeight;
      let drawWidth, drawHeight, offsetX, offsetY;
      if (imgAspect > canvasAspect) {
        drawWidth = cWidth;
        drawHeight = cWidth / imgAspect;
        offsetX = 0;
        offsetY = (cHeight - drawHeight) / 2;
      } else {
        drawHeight = cHeight;
        drawWidth = cHeight * imgAspect;
        offsetX = (cWidth - drawWidth) / 2;
        offsetY = 0;
      }
      return { drawWidth, drawHeight, offsetX, offsetY };
    }

    // --- Background ---
    bgCtx.clearRect(0, 0, width, height);
    if (backgroundImage) {
      const { drawWidth, drawHeight, offsetX, offsetY } = getCenteredParams(backgroundImage, width, height);
      bgCtx.drawImage(backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
    } else if (backgroundColor) {
      bgCtx.fillStyle = backgroundColor;
      bgCtx.fillRect(0, 0, width, height);
    } // else: fully transparent

    // --- Recreate the mask from initial state + all strokes ---
    maskCtx.clearRect(0, 0, width, height);
    // Center the processed image (initial mask)
    const { drawWidth: maskW, drawHeight: maskH, offsetX: maskX, offsetY: maskY } = getCenteredParams(initialMaskEl.current, width, height);
    maskCtx.drawImage(initialMaskEl.current, maskX, maskY, maskW, maskH);
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    strokes.forEach(stroke => {
      maskCtx.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
      stroke.points.forEach(point => {
        const r = stroke.size / 2;
        const grad = maskCtx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        maskCtx.beginPath();
        maskCtx.arc(point.x, point.y, r, 0, 2 * Math.PI);
        maskCtx.closePath();
        maskCtx.fillStyle = grad;
        maskCtx.fill();
      });
    });
    maskCtx.globalCompositeOperation = 'source-over';

    // --- Create final subject shape by masking the original image ---
    const subjectCanvas = document.createElement('canvas');
    subjectCanvas.width = width;
    subjectCanvas.height = height;
    const subjectCtx = subjectCanvas.getContext('2d')!;
    // Center the original image
    const { drawWidth: subjW, drawHeight: subjH, offsetX: subjX, offsetY: subjY } = getCenteredParams(originalImageEl.current, width, height);
    subjectCtx.drawImage(originalImageEl.current, subjX, subjY, subjW, subjH);
    subjectCtx.globalCompositeOperation = 'destination-in';
    subjectCtx.drawImage(maskCanvas.current, 0, 0);

    // --- START COMPOSITION ON MAIN CANVAS ---
    mainCtx.clearRect(0, 0, width, height);

    // PASS 1: Shadow
    mainCtx.save();
    if (shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0) {
      mainCtx.shadowColor = 'rgba(0,0,0,0.5)';
      mainCtx.shadowBlur = shadowBlur;
      mainCtx.shadowOffsetX = shadowOffsetX;
      mainCtx.shadowOffsetY = shadowOffsetY;
      mainCtx.drawImage(subjectCanvas, 0, 0);
    }
    mainCtx.restore();

    // PASS 2: Outline
    if (outlineWidth > 0) {
      const outlineSilhouette = document.createElement('canvas');
      outlineSilhouette.width = width;
      outlineSilhouette.height = height;
      const outlineCtx = outlineSilhouette.getContext('2d')!;
      outlineCtx.drawImage(subjectCanvas, 0, 0);
      outlineCtx.globalCompositeOperation = 'source-in';
      outlineCtx.fillStyle = outlineColor;
      outlineCtx.fillRect(0, 0, width, height);

      const d = outlineWidth;
      mainCtx.drawImage(outlineSilhouette, -d, 0);
      mainCtx.drawImage(outlineSilhouette, d, 0);
      mainCtx.drawImage(outlineSilhouette, 0, -d);
      mainCtx.drawImage(outlineSilhouette, 0, d);
    }

    // PASS 3: Final Subject on top
    mainCtx.drawImage(subjectCanvas, 0, 0);

  }, [backgroundColor, backgroundImage, canvasSize, loading, strokes, shadowBlur, shadowOffsetX, shadowOffsetY, outlineWidth, outlineColor]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
        setLoading(true);
        setError(null);
        if (!containerRef.current) return;

        try {
            const [originalImg, processedImg] = await Promise.all([
              loadImage(originalImage), 
              loadImage(processedImage)
            ]);
            
            if (!isMounted) return;

            originalImageEl.current = originalImg;
            initialMaskEl.current = processedImg;
            
            const { width, height } = originalImg;
            const container = containerRef.current;
            const containerWidth = container.clientWidth - 64;
            const containerHeight = container.clientHeight - 64;
            const ratio = Math.min(containerWidth / width, containerHeight / height, 1);
            const w = Math.floor(width * ratio);
            const h = Math.floor(height * ratio);

            setCanvasSize({ width: w, height: h });
            
            [mainCanvasRef, bgCanvasRef].forEach(ref => {
              if(ref.current) { ref.current.width = w; ref.current.height = h; }
            });
            maskCanvas.current.width = w;
            maskCanvas.current.height = h;
            finalImageCanvas.current.width = w;
            finalImageCanvas.current.height = h;
            
            setStrokes([]);
            setRedoStack([]);

        } catch (e: any) {
            if (isMounted) setError(e.message || "An unknown error occurred.");
        } finally {
            if (isMounted) setLoading(false);
        }
    };
    init();
    return () => { isMounted = false; };
  }, [originalImage, processedImage]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);
  
  // Utility: Unified getPos for mouse/touch
  function getPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number };
  function getPos(e: React.TouchEvent<HTMLCanvasElement>): { x: number; y: number };
  function getPos(e: any) {
    if (!mainCanvasRef.current) return { x: 0, y: 0 };
    const rect = mainCanvasRef.current.getBoundingClientRect();
    if (e.touches) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) / zoom,
        y: (touch.clientY - rect.top) / zoom,
      };
    } else {
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    }
  }

  const handleBrushPreviewMove = (e: React.MouseEvent) => {
    if (!mainCanvasRef.current) return;
    const rect = mainCanvasRef.current.getBoundingClientRect();
    setBrushPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || loading || error) return;
    e.preventDefault();
    setIsDrawing(true);
    currentStrokeRef.current = [getPos(e)];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || loading || error) return;
    e.preventDefault();
    const newPoint = getPos(e);
    currentStrokeRef.current.push(newPoint);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      const newStroke = { points: currentStrokeRef.current, mode: brushMode, size: brushSize };
      setStrokes(s => [...s, newStroke]);
      setRedoStack([]);
    }
    currentStrokeRef.current = [];
  };
  
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setRedoStack(r => [lastStroke, ...r]);
    setStrokes(s => s.slice(0, -1));
  };
  
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const strokeToRedo = redoStack[0];
    setStrokes(s => [...s, strokeToRedo]);
    setRedoStack(r => r.slice(1));
  };

  const handleSave = () => {
    const finalCtx = finalImageCanvas.current.getContext('2d')!;
    finalCtx.clearRect(0, 0, finalCtx.canvas.width, finalCtx.canvas.height);
    finalCtx.drawImage(bgCanvasRef.current!, 0, 0);
    finalCtx.drawImage(mainCanvasRef.current!, 0, 0);
    onSave(finalImageCanvas.current.toDataURL('image/png', 1.0));
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      loadImage(URL.createObjectURL(file)).then(img => {
          setBackgroundImage(img);
          setBackgroundColor('');
      }).catch(() => {
          setError('Failed to load background image');
      });
    }
  };

  const handleToggleTransparent = () => {
    setIsTransparent(prev => {
      const newVal = !prev;
      if (newVal) {
        setBackgroundColor('');
        setBackgroundImage(null);
      } else {
        if (!backgroundImage) setBackgroundColor('#ffffff');
      }
      return newVal;
    });
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (loading || error) return;
    e.preventDefault();
    setIsDrawing(true);
    currentStrokeRef.current = [getPos(e)];
    setIsBrushPreviewVisible(true);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || loading || error) return;
    e.preventDefault();
    const newPoint = getPos(e);
    currentStrokeRef.current.push(newPoint);
    // For live brush preview
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (rect) {
      const touch = e.touches[0] || e.changedTouches[0];
      setBrushPosition({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  };
  const handleTouchEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setIsBrushPreviewVisible(false);
    if (currentStrokeRef.current.length > 0) {
      const newStroke = { points: currentStrokeRef.current, mode: brushMode, size: brushSize };
      setStrokes(s => [...s, newStroke]);
      setRedoStack([]);
    }
    currentStrokeRef.current = [];
  };

  useEffect(() => {
    if (!isDrawing || !overlayCanvasRef.current) {
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        ctx && ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
      return;
    }
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    ctx.save();
    ctx.globalCompositeOperation = brushMode === 'erase' ? 'destination-out' : 'source-over';
    // Draw feathered circles for each point in currentStrokeRef
    currentStrokeRef.current.forEach(point => {
      const r = brushSize / 2;
      const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r);
      grad.addColorStop(0, 'rgba(0,0,0,0.7)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(point.x, point.y, r, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    });
    ctx.restore();
  }, [isDrawing, brushMode, brushSize, canvasSize, currentStrokeRef.current]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 min-h-screen flex-col"
    >
      {/* Animated Accent Bar */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-pulse rounded-b-2xl shadow-lg z-10" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-10 w-full flex flex-col items-center border-4 border-transparent bg-clip-padding max-h-screen overflow-auto"
        style={{
          borderImage: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6) 1',
          boxShadow: '0 8px 32px 0 rgba(99,102,241,0.15), 0 1.5px 8px 0 rgba(236,72,153,0.10)'
        }}
      >
        {/* Brush Mode Selector with Glow */}
        <div className="flex gap-4 mb-6 items-center justify-center">
          <button
            onClick={() => setBrushMode('restore')}
            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 shadow-md ${brushMode === 'restore' ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white shadow-xl ring-2 ring-purple-300' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
          >
            Restore
          </button>
          <button
            onClick={() => setBrushMode('erase')}
            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 shadow-md ${brushMode === 'erase' ? 'bg-gradient-to-r from-pink-400 to-orange-400 text-white shadow-xl ring-2 ring-pink-200' : 'bg-gray-100 text-gray-700 hover:bg-pink-100'}`}
          >
            Erase
          </button>
        </div>
        {/* Main editor and tool panel side by side */}
        <div className="flex flex-row w-full gap-12">
          {/* Editor Canvas Area */}
          <div className="flex-grow w-full h-full flex items-center justify-center p-8 overflow-hidden bg-gray-100 rounded-2xl">
            <div className="relative flex items-center justify-center w-full h-full" style={{width: canvasSize.width, height: canvasSize.height, visibility: loading || error ? 'hidden' : 'visible'}}>
              {loading && <div className="absolute inset-0 flex items-center justify-center text-gray-700">Loading Editor...</div>}
              {error && <div className="absolute inset-0 flex items-center justify-center text-red-600 p-4 bg-red-50 rounded-lg"><strong>Error:</strong> {error}</div>}
              <div 
                className="absolute inset-0" 
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                onMouseEnter={() => setIsBrushPreviewVisible(true)}
                onMouseLeave={() => setIsBrushPreviewVisible(false)}
                onMouseMove={handleBrushPreviewMove}
              >
                <canvas ref={bgCanvasRef} width={canvasSize.width} height={canvasSize.height} className="absolute top-0 left-0" />
                <canvas
                  ref={mainCanvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                />
                
                {isBrushPreviewVisible && !isDrawing && (
                  <div
                    className="absolute rounded-full border-2 pointer-events-none"
                    style={{
                        width: brushSize,
                        height: brushSize,
                        left: brushPosition.x - brushSize / 2,
                        top: brushPosition.y - brushSize / 2,
                        borderColor: brushMode === 'erase' ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)',
                        transition: 'width 0.1s, height 0.1s',
                        transform: `scale(${1 / zoom})` // Counter-scale to keep preview size consistent on screen
                    }}
                  />
                )}
              </div>
              <canvas
                ref={overlayCanvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ zIndex: 20 }}
              />
            </div>
          </div>
          {/* Tool Options Panel */}
          <div className="flex-[1] w-80 bg-white border-l flex flex-col rounded-2xl shadow-md">
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold mb-2 text-gray-800">Background</h3>
                <div className="space-y-2">
                  <ColorInput label="Color" value={backgroundColor} onChange={(c) => { setBackgroundColor(c); setBackgroundImage(null); }} />
                  <button
                    className={`w-full py-2 rounded-md text-sm font-medium transition-colors ${backgroundColor === '' && !backgroundImage ? 'bg-gray-800 text-white shadow-sm' : 'bg-gray-200 hover:bg-gray-300'}`}
                    onClick={handleToggleTransparent}
                  >
                    {isTransparent ? 'Normal' : 'Transparent'}
                  </button>
                  <label className="flex items-center justify-center text-sm font-medium gap-2 px-3 py-2 bg-white border rounded-md cursor-pointer hover:bg-gray-100">
                    <ImageIcon size={16}/> Upload Image 
                    <input type="file" className="hidden" accept="image/*" onChange={handleBgImageUpload}/>
                  </label>
                  {backgroundImage && <button onClick={() => { setBackgroundImage(null); setBackgroundColor('#ffffff'); }} className="text-xs text-red-500 hover:underline mt-1 flex items-center gap-1"><Trash2 size={12}/>Remove Image</button>}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold mb-2 text-gray-800">Outline</h3>
                <div className="space-y-2"><ColorInput label="Color" value={outlineColor} onChange={setOutlineColor} />
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">Width: {outlineWidth}px</label><input type="range" min="0" max="30" value={outlineWidth} onChange={e => setOutlineWidth(Number(e.target.value))} className="w-full" /></div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold mb-2 text-gray-800">Shadow</h3>
                <div className="space-y-2">
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">Blur: {shadowBlur}px</label><input type="range" min="0" max="50" value={shadowBlur} onChange={e => setShadowBlur(Number(e.target.value))} className="w-full" /></div>
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">X-Offset: {shadowOffsetX}px</label><input type="range" min="-50" max="50" value={shadowOffsetX} onChange={e => setShadowOffsetX(Number(e.target.value))} className="w-full" /></div>
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">Y-Offset: {shadowOffsetY}px</label><input type="range" min="-50" max="50" value={shadowOffsetY} onChange={e => setShadowOffsetY(Number(e.target.value))} className="w-full" /></div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold mb-2 text-gray-800">Brush Tools</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setBrushMode('erase')} className={`py-2 rounded-md text-sm font-medium transition-colors ${brushMode === 'erase' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-200 hover:bg-gray-300'}`}>Erase</button>
                    <button onClick={() => setBrushMode('restore')} className={`py-2 rounded-md text-sm font-medium transition-colors ${brushMode === 'restore' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-200 hover:bg-gray-300'}`}>Restore</button>
                  </div>
                  <div><label className="text-sm font-medium text-gray-700 block mb-1">Size: {brushSize}px</label><input type="range" min="1" max="150" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20}/></button>
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={strokes.length === 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"><Undo size={20}/></button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"><Redo size={20}/></button>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-2 hover:bg-gray-100 rounded-lg" title="Zoom Out"><ZoomOut size={20}/></button>
            <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))} className="p-2 hover:bg-gray-100 rounded-lg" title="Zoom In"><ZoomIn size={20}/></button>
            <button onClick={() => setZoom(1)} className="p-2 hover:bg-gray-100 rounded-lg" title="Reset Zoom"><RotateCcw size={20}/></button>
          </div>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Apply & Close</button>
        </div>
      </div>
    </div>
  );
};