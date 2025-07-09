"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw, Download } from 'lucide-react';

interface GraphingPadProps {
  onDrawingChange: (imageData: string) => void;
  disabled?: boolean;
}

export default function GraphingPad({ onDrawingChange, disabled = false }: GraphingPadProps) {
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

    // Set canvas size (larger for graphing)
    canvas.width = 600;
    canvas.height = 400;

    // Set initial styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setContext(ctx);
    drawGrid(ctx);
  }, []);

  useEffect(() => {
    if (context) {
      context.lineWidth = brushSize;
      context.strokeStyle = isErasing ? '#ffffff' : '#000000';
    }
  }, [context, brushSize, isErasing]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const gridSize = 20; // 20px grid squares

    ctx.save();
    ctx.strokeStyle = '#e5e7eb'; // Light gray for grid
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // X-axis (horizontal line in middle)
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Y-axis (vertical line in middle)
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Draw axis numbers
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // X-axis numbers (every 2 grid units = 40px)
    for (let i = -7; i <= 7; i++) {
      const x = width / 2 + i * 40;
      if (x >= 0 && x <= width) {
        ctx.fillText(i.toString(), x, height / 2 + 15);
      }
    }

    // Y-axis numbers
    ctx.textAlign = 'right';
    for (let i = -5; i <= 5; i++) {
      const y = height / 2 - i * 40;
      if (y >= 0 && y <= height) {
        ctx.fillText(i.toString(), width / 2 - 5, y + 4);
      }
    }

    ctx.restore();
  };

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
    drawGrid(context);
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
    link.download = 'math-graph.png';
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

      {/* Graphing Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{ 
            width: '600px', 
            height: '400px',
            backgroundColor: '#ffffff'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Graphing Instructions:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Use the coordinate grid to plot points or draw functions</li>
          <li>The center is at (0,0) with numbered axes</li>
          <li>Each grid square represents 1 unit</li>
          <li>Use the eraser to correct mistakes</li>
          <li>You can save your graph if needed</li>
        </ul>
      </div>
    </div>
  );
} 