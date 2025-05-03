'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  faPaintBrush, faEraser, faUndo, faRedo, faTrashAlt, 
  faCog, faPlus, faTrash, faEye, faEyeSlash, 
  faLock, faLockOpen, faSlidersH, faTimes, faSquare, 
  faCircle, faPalette, faLayerGroup, faVectorSquare, faFileDownload 
} from '@fortawesome/free-solid-svg-icons';
import { 
  faTwitter, faInstagram, faGithub, faDribbble 
} from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Layer {
  name: string;
  visible: boolean;
  locked: boolean;
  canvas: HTMLCanvasElement;
}

interface Position {
  x: number;
  y: number;
}

interface CanvasState {
  layers: {
    data: string;
    visible: boolean;
    locked: boolean;
    name: string;
  }[];
  activeLayerIndex: number;
}

const CanvasDraw = () => {
  const [showApp, setShowApp] = useState(false);
  const [currentTool, setCurrentTool] = useState('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  const [canvasBg, setCanvasBg] = useState('#ffffff');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });
  const startPosition = useRef<Position>({ x: 0, y: 0 });
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  useEffect(() => {
    if (!showApp) return;

    const initCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth - 40;
      canvas.height = container.clientHeight - 40;

      const initialLayer = {
        name: 'Layer 1',
        visible: true,
        locked: false,
        canvas: document.createElement('canvas')
      };
      initialLayer.canvas.width = canvas.width;
      initialLayer.canvas.height = canvas.height;
      setLayers([initialLayer]);
    };

    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [showApp]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background color
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all visible layers
    layers.forEach(layer => {
      if (layer.visible) {
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });
  }, [layers, canvasBg]);

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    const layerStates = layers.map(layer => ({
      data: layer.canvas.toDataURL(),
      visible: layer.visible,
      locked: layer.locked,
      name: layer.name
    }));
  
    const state: CanvasState = {
      layers: layerStates,
      activeLayerIndex
    };
  
    undoStack.current.push(JSON.stringify(state));
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, [layers, activeLayerIndex, renderCanvas]);
  

  const getCoordinates = (e: MouseEvent | TouchEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    if (layers[activeLayerIndex]?.locked) return;
    isDrawing.current = true;
    const coords = getCoordinates(e);
    lastPosition.current = coords;
    startPosition.current = coords;
  };

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current || layers[activeLayerIndex]?.locked) return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const layerCtx = layers[activeLayerIndex].canvas.getContext('2d');
    if (!ctx || !layerCtx) return;
  
    const coords = getCoordinates(e);
  
    switch(currentTool) {
      case 'brush':
        layerCtx.lineJoin = 'round';
        layerCtx.lineCap = 'round';
        layerCtx.strokeStyle = currentColor;
        layerCtx.lineWidth = brushSize;
        layerCtx.beginPath();
        layerCtx.moveTo(lastPosition.current.x, lastPosition.current.y);
        layerCtx.lineTo(coords.x, coords.y);
        layerCtx.stroke();
        break;
  
      case 'eraser':
        layerCtx.lineJoin = 'round';
        layerCtx.lineCap = 'round';
        layerCtx.strokeStyle = '#ffffff';
        layerCtx.lineWidth = brushSize;
        layerCtx.beginPath();
        layerCtx.moveTo(lastPosition.current.x, lastPosition.current.y);
        layerCtx.lineTo(coords.x, coords.y);
        layerCtx.stroke();
        break;
  
      case 'rectangle':
        renderCanvas();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.beginPath();
        ctx.rect(
          startPosition.current.x,
          startPosition.current.y,
          coords.x - startPosition.current.x,
          coords.y - startPosition.current.y
        );
        ctx.stroke();
        break;
  
      case 'circle':
        renderCanvas();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.beginPath();
        const radius = Math.sqrt(
          Math.pow(coords.x - startPosition.current.x, 2) +
          Math.pow(coords.y - startPosition.current.y, 2)
        );
        ctx.arc(
          startPosition.current.x,
          startPosition.current.y,
          radius,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        break;
    }
  
    lastPosition.current = coords;
    if (currentTool !== 'rectangle' && currentTool !== 'circle') {
      renderCanvas();
    }
  }, [currentTool, layers, activeLayerIndex, brushSize, currentColor,]);
  

  
// 5. Update the stopDrawing function
// Removed duplicate renderCanvas declaration

const stopDrawing = useCallback(() => {
  if (!isDrawing.current) return;
  isDrawing.current = false;

  const canvas = canvasRef.current;
  const layerCtx = layers[activeLayerIndex]?.canvas.getContext('2d');
  if (!canvas || !layerCtx) return;

  if (currentTool === 'rectangle' || currentTool === 'circle') {
    layerCtx.drawImage(canvas, 0, 0);
  }

  saveCanvasState();
  renderCanvas();
}, [currentTool, layers, activeLayerIndex, saveCanvasState,renderCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => draw(e);
    const handleTouchMove = (e: TouchEvent) => draw(e);
    const handleMouseUp = () => stopDrawing();
    const handleTouchEnd = () => stopDrawing();

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draw, stopDrawing]);

  const addLayer = () => {
    const newLayer = {
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      canvas: document.createElement('canvas')
    };
    newLayer.canvas.width = canvasRef.current?.width || 0;
    newLayer.canvas.height = canvasRef.current?.height || 0;
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerIndex(layers.length);
  };

  const deleteLayer = () => {
    if (layers.length <= 1) return;
    
    const newLayers = layers.filter((_, i) => i !== activeLayerIndex);
    setLayers(newLayers);
    setActiveLayerIndex(prev => Math.max(0, prev - 1));
    
    // Force canvas redraw
    renderCanvas();
    saveCanvasState();

  };


// Removed duplicate renderCanvas declaration
  
  
  const undo = () => {
    if (undoStack.current.length <= 1) return;
    
    // Save current state to redo stack
    redoStack.current.push(undoStack.current.pop()!);
    
    // Restore previous state
    const prevState = undoStack.current[undoStack.current.length - 1];
    restoreState(prevState);
  };

  const redo = () => {
  if (redoStack.current.length === 0) return;
  
  const nextState = redoStack.current.pop()!;
  undoStack.current.push(nextState);
  restoreState(nextState);
};

  const restoreState = (stateString: string) => {
    const state: CanvasState = JSON.parse(stateString);
    const restoredLayers = state.layers.map(layer => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = layer.data;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
      };
      return {
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        canvas
      };
    });
    setLayers(restoredLayers);
    setActiveLayerIndex(state.activeLayerIndex);
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'canvas-drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="h-screen w-screen">
      {!showApp ? (
        <div className="landing-container min-h-screen bg-gradient-to-r from-indigo-600 to-purple-600">
          <header className="landing-header fixed top-0 left-0 right-0 z-50 py-4 bg-white/10 backdrop-blur">
            <div className="container mx-auto px-4 flex justify-between items-center">
              <div className="flex items-center">
                <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="white">
                  <path d="M4 5H20M4 5V19H20V5M4 5L8 9M20 5L16 9" strokeWidth="2" 
                        strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 13C9 14.1046 8.10457 15 7 15C5.89543 15 5 14.1046 5 13C5 11.8954 5.89543 11 7 11C8.10457 11 9 11.8954 9 13Z" 
                        strokeWidth="2"/>
                  <path d="M19 13C19 14.1046 18.1046 15 17 15C15.8954 15 15 14.1046 15 13C15 11.8954 15.8954 11 17 11C18.1046 11 19 11.8954 19 13Z" 
                        strokeWidth="2"/>
                  <path d="M14 15L10 15" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <h1 className="text-xl font-bold text-white">Canvas Draw</h1>
              </div>
              <button 
                onClick={() => setShowApp(true)}
                className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-medium hover:bg-opacity-90"
                title="Start Drawing"
              >
                Start Drawing
              </button>
            </div>
          </header>

          <div className="container mx-auto px-4 pt-32 pb-20">
            <div className="flex flex-col lg:flex-row items-center">
              <div className="lg:w-1/2 lg:pr-12 mb-12 lg:mb-0">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Create Digital Art with Ease
                </h1>
                <button 
                  onClick={() => setShowApp(true)}
                  className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg mr-4"
                  title="Start Drawing"
                >
                  Start Drawing
                </button>
              </div>
              <div className="lg:w-1/2">
                <img 
                  src="https://cdn.pixabay.com/photo/2017/08/10/02/05/tiles-shapes-2617112_1280.jpg" 
                  alt="Digital Art" 
                  className="rounded-xl shadow-2xl w-full"
                  width={800}
                  height={600}
                  
                />
              </div>
            </div>
          </div>

          <div className="mt-32 container mx-auto px-4">
            <h2 className="text-3xl font-bold text-white text-center mb-16">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: faPaintBrush, title: 'Intuitive Tools', text: 'Brush, eraser, shapes with adjustable sizes' },
                { icon: faPalette, title: 'Color Palette', text: 'Custom colors and predefined swatches' },
                { icon: faLayerGroup, title: 'Layer System', text: 'Multiple layers with visibility controls' },
                { icon: faUndo, title: 'Undo/Redo', text: 'Unlimited history for mistake correction' },
                { icon: faVectorSquare, title: 'Shapes', text: 'Perfect circles, rectangles, and lines' },
                { icon: faFileDownload, title: 'Export', text: 'Save as PNG for sharing' }
              ].map((feature, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:transform hover:-translate-y-2 transition-all">
                  <div className="bg-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                    <FontAwesomeIcon icon={feature.icon} className="text-white text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <footer className="bg-indigo-900 py-8 text-white mt-32">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M4 5H20M4 5V19H20V5M4 5L8 9M20 5L16 9" strokeWidth="2" 
                            strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h2 className="text-lg font-bold">Canvas Draw</h2>
                  </div>
                  <p className="text-indigo-200 mt-2">© 2024 Canvas Draw. All rights reserved.</p>
                </div>
                <div className="flex space-x-6">
                  {[
                    { icon: faTwitter, name: 'Twitter' },
                    { icon: faInstagram, name: 'Instagram' },
                    { icon: faGithub, name: 'GitHub' },
                    { icon: faDribbble, name: 'Dribbble' }
                  ].map((social, index) => (
                    <a 
                      key={index} 
                      href="#" 
                      className="text-indigo-200 hover:text-white transition-colors"
                      title={social.name}
                    >
                      <FontAwesomeIcon icon={social.icon} className="text-xl" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-4 h-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <svg className="w-8 h-8 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 5H20M4 5V19H20V5M4 5L8 9M20 5L16 9" strokeWidth="2" 
                      strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 13C9 14.1046 8.10457 15 7 15C5.89543 15 5 14.1046 5 13C5 11.8954 5.89543 11 7 11C8.10457 11 9 11.8954 9 13Z" 
                      strokeWidth="2"/>
                <path d="M19 13C19 14.1046 18.1046 15 17 15C15.8954 15 15 14.1046 15 13C15 11.8954 15.8954 11 17 11C18.1046 11 19 11.8954 19 13Z" 
                      strokeWidth="2"/>
                <path d="M14 15L10 15" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h1 className="text-xl font-bold text-gray-800">Canvas Draw</h1>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setShowSettings(true)}
                className="mr-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center text-gray-700"
                title="Settings"
              >
                <FontAwesomeIcon icon={faCog} className="mr-2" />
                Settings
              </button>
              <button 
                onClick={() => setShowApp(false)}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                title="Exit to Landing Page"
              >
                Exit
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)]">
            <div className="toolbar flex lg:flex-col items-center lg:items-start lg:w-auto mb-4 lg:mb-0 lg:mr-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-2">
              {['brush', 'eraser', 'rectangle', 'circle'].map((tool) => (
                <button
                  key={tool}
                  onClick={() => setCurrentTool(tool)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg m-1 transition-colors
                    ${currentTool === tool ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                  title={`${tool.charAt(0).toUpperCase() + tool.slice(1)} Tool`}
                >
                  <FontAwesomeIcon icon={
                    tool === 'brush' ? faPaintBrush :
                    tool === 'eraser' ? faEraser :
                    tool === 'rectangle' ? faSquare : faCircle
                  } />
                </button>
              ))}
              
              <div className="h-px bg-gray-600 w-full my-2" />
              

              <button onClick={saveImage}className="toolbar-item"title="SaveImage">     
                        <FontAwesomeIcon icon={faFileDownload} className="text-gray-300" /></button>

              <button onClick={undo} className="toolbar-item" title="Undo">
                <FontAwesomeIcon icon={faUndo} className="text-gray-300" />
              </button>
              <button onClick={redo} className="toolbar-item" title="Redo">
                <FontAwesomeIcon icon={faRedo} className="text-gray-300" />
              </button>
              <button 
                onClick={() => {
                  if (confirm("Clear current layer?")) {
                    const newLayers = [...layers];
                    const ctx = newLayers[activeLayerIndex].canvas.getContext('2d');
                    ctx?.clearRect(0, 0, 
                      newLayers[activeLayerIndex].canvas.width, 
                      newLayers[activeLayerIndex].canvas.height
                    );
                    setLayers(newLayers);
                  }
                }} 
                className="toolbar-item"
                title="Clear Layer"
              >
                <FontAwesomeIcon icon={faTrashAlt} className="text-gray-300" />
              </button>

              <div className="h-px bg-gray-600 w-full my-2" />

              <button 
                onClick={() => setShowSettings(true)}
                className="relative w-10 h-10 flex items-center justify-center rounded-lg m-1 hover:bg-gray-700"
                title="Color Picker"
              >
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white" 
                  style={{ backgroundColor: currentColor }}
                />
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 flex items-center justify-center rounded-lg m-1 hover:bg-gray-700"
                title="Brush Size"
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ 
                    width: Math.min(brushSize, 24),
                    height: Math.min(brushSize, 24)
                  }}
                />
              </button>
            </div>

            <div 
              ref={containerRef}
              className="canvas-container flex-grow bg-gray-100 rounded-lg relative"
              style={{ height: 'calc(100vh - 180px)' }}
            >
              <canvas
                ref={canvasRef}
                className="bg-white rounded-lg shadow-xl"
                onMouseDown={(e) => startDrawing(e.nativeEvent)}
                onTouchStart={(e) => startDrawing(e.nativeEvent)}
                style={{ backgroundColor: canvasBg }}
              />
            </div>

            <div className={`side-panel lg:ml-4 lg:w-64 bg-white rounded-xl shadow-xl transform transition-transform
              ${showSidePanel ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}>
              <div className="flex border-b">
                {['colors', 'layers'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 p-4 text-center font-medium ${
                      activeTab === tab 
                        ? 'border-b-2 border-indigo-600 text-indigo-600' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title={`${tab.charAt(0).toUpperCase() + tab.slice(1)} Panel`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === 'colors' ? (
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-4">Color Palette</h3>
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff',
                      '#00ffff', '#ff8000', '#8000ff'].map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={`Select ${color}`}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-10 cursor-pointer rounded-lg"
                    title="Custom Color Picker"
                  />
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-medium">Layers</h3>
                    <div>
                      <button 
                        onClick={addLayer} 
                        className="p-2 bg-indigo-600 text-white rounded-lg mr-2 hover:bg-indigo-700"
                        title="Add New Layer"
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                      <button 
                        onClick={deleteLayer} 
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        title="Delete Current Layer"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {layers.map((layer, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex items-center cursor-pointer transition-colors
                          ${index === activeLayerIndex 
                            ? 'bg-indigo-100 border-l-4 border-indigo-600' 
                            : 'bg-gray-50 hover:bg-gray-100'}`}
                        onClick={() => setActiveLayerIndex(index)}
                        title={`Select ${layer.name}`}
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center mr-3">
                          <FontAwesomeIcon icon={faPaintBrush} className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{layer.name}</p>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newLayers = [...layers];
                              newLayers[index].visible = !newLayers[index].visible;
                              setLayers(newLayers);
                            }}
                            className="text-gray-500 hover:text-gray-800 p-1"
                            title="Toggle Visibility"
                          >
                            <FontAwesomeIcon icon={layer.visible ? faEye : faEyeSlash} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newLayers = [...layers];
                              newLayers[index].locked = !newLayers[index].locked;
                              setLayers(newLayers);
                            }}
                            className="text-gray-500 hover:text-gray-800 p-1 ml-1"
                            title="Toggle Lock"
                          >
                            <FontAwesomeIcon icon={layer.locked ? faLock : faLockOpen} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="lg:hidden fixed right-4 bottom-20 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center"
            title="Toggle Side Panel"
          >
            <FontAwesomeIcon icon={faSlidersH} />
          </button>

          {showSettings && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <div className="flex justify-between mb-4">
                  <h2 className="text-2xl font-bold">Settings</h2>
                  <button onClick={() => setShowSettings(false)} title="Close Settings">
                    <FontAwesomeIcon icon={faTimes} className="text-gray-500 hover:text-gray-800" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Canvas Background</h3>
                    <div className="flex gap-2">
                      {['#ffffff', '#f8f9fa', '#e9ecef', '#000000'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setCanvasBg(color)}
                          className={`w-12 h-12 rounded-lg border-2 transition-all
                            ${canvasBg === color ? 'border-indigo-600 scale-105' : 'border-gray-300'}`}
                          style={{ backgroundColor: color }}
                          title={`Set background to ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Brush Settings</h3>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full"
                      title="Adjust Brush Size"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>1px</span>
                      <span>50px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CanvasDraw;