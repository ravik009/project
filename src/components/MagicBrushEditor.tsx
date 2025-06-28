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

  const redrawAll = useCallback(() => {
    if (loading || !mainCanvasRef.current || !bgCanvasRef.current || !originalImageEl.current || !initialMaskEl.current) return;

    const mainCtx = mainCanvasRef.current.getContext('2d')!;
    const bgCtx = bgCanvasRef.current.getContext('2d')!;
    const maskCtx = maskCanvas.current.getContext('2d')!;
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;

    // --- Background ---
    bgCtx.clearRect(0, 0, width, height);
    if (backgroundImage) {
        bgCtx.drawImage(backgroundImage, 0, 0, width, height);
    } else {
        bgCtx.fillStyle = backgroundColor;
        bgCtx.fillRect(0, 0, width, height);
    }

    // --- Recreate the mask from initial state + all strokes ---
    maskCtx.clearRect(0, 0, width, height);
    maskCtx.drawImage(initialMaskEl.current, 0, 0, width, height);
    
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    strokes.forEach(stroke => {
        maskCtx.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
        maskCtx.strokeStyle = 'rgba(0,0,0,1)';
        maskCtx.lineWidth = stroke.size;
        
        maskCtx.beginPath();
        if (stroke.points.length > 0) {
            maskCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                maskCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            maskCtx.stroke();
        }
    });
    maskCtx.globalCompositeOperation = 'source-over';

    // --- Create final subject shape by masking the original image ---
    const subjectCanvas = document.createElement('canvas');
    subjectCanvas.width = width;
    subjectCanvas.height = height;
    const subjectCtx = subjectCanvas.getContext('2d')!;
    subjectCtx.drawImage(originalImageEl.current, 0, 0, width, height);
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
  
  const getPos = (e: React.MouseEvent) => {
    if (!mainCanvasRef.current) return { x: 0, y: 0 };
    const rect = mainCanvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  const handleBrushPreviewMove = (e: React.MouseEvent) => {
    if (!mainCanvasRef.current) return;
    const rect = mainCanvasRef.current.getBoundingClientRect();
    setBrushPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (e.button !== 0 || loading || error) return;
    e.preventDefault();
    setIsDrawing(true);
    currentStrokeRef.current = [getPos(e)];
  };

  const draw = (e: React.MouseEvent) => {
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

  return (
    <div className="fixed inset-0 bg-gray-200 z-50 flex font-sans">
      <div className="flex-1 flex flex-col">
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
        <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-gray-100">
          <div className="relative" style={{width: canvasSize.width, height: canvasSize.height, visibility: loading || error ? 'hidden' : 'visible'}}>
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
              <canvas ref={mainCanvasRef} width={canvasSize.width} height={canvasSize.height} className="absolute top-0 left-0 cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
              
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
          </div>
        </div>
      </div>
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          <div className="p-3 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold mb-2 text-gray-800">Background</h3>
            <div className="space-y-2">
              <ColorInput label="Color" value={backgroundColor} onChange={(c) => { setBackgroundColor(c); setBackgroundImage(null); }} />
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
  );
};