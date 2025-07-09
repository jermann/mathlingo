"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw, Download, Upload } from 'lucide-react';

interface DrawingPadProps {
  onDrawingChange: (imageData: string) => void;
  disabled?: boolean;
}

export default function DrawingPad({ onDrawingChange, disabled = false }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [brushSize, setBrushSize] = useState(3);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set initial styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setContext(ctx);
  }, []);

  useEffect(() => {
    if (context) {
      context.lineWidth = brushSize;
      context.strokeStyle = isErasing ? '#ffffff' : '#000000';
    }
  }, [context, brushSize, isErasing]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (disabled) return;
    
    setIsDrawing(false);
    if (context) {
      context.closePath();
    }
    // Convert canvas to image data and notify parent
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      onDrawingChange(imageData);
    }
  };

  const clearCanvas = () => {
    if (disabled || !context) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    onDrawingChange('');
  };

  const toggleEraser = () => {
    if (disabled) return;
    setIsErasing(!isErasing);
  };

  const changeBrushSize = (size: number) => {
    if (disabled) return;
    setBrushSize(size);
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'math-drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Drawing Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>
        
        <Button
          variant={isErasing ? "default" : "outline"}
          size="sm"
          onClick={toggleEraser}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <Eraser className="w-4 h-4" />
          Eraser
        </Button>

        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">Brush:</span>
          <Button
            variant={brushSize === 2 ? "default" : "outline"}
            size="sm"
            onClick={() => changeBrushSize(2)}
            disabled={disabled}
            className="w-8 h-8 p-0"
          >
            •
          </Button>
          <Button
            variant={brushSize === 3 ? "default" : "outline"}
            size="sm"
            onClick={() => changeBrushSize(3)}
            disabled={disabled}
            className="w-8 h-8 p-0"
          >
            •
          </Button>
          <Button
            variant={brushSize === 5 ? "default" : "outline"}
            size="sm"
            onClick={() => changeBrushSize(5)}
            disabled={disabled}
            className="w-8 h-8 p-0"
          >
            •
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={downloadDrawing}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Save
        </Button>
      </div>

      {/* Drawing Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{ 
            width: '400px', 
            height: '200px',
            backgroundColor: '#ffffff'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Drawing Instructions:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Draw your mathematical expression clearly</li>
          <li>Use the eraser to correct mistakes</li>
          <li>Try to keep your writing neat and readable</li>
          <li>You can save your drawing if needed</li>
        </ul>
      </div>
    </div>
  );
} 