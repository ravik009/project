import React, { useState, useRef, useCallback } from 'react';
import { Download, RotateCcw, Zap, Image as ImageIcon, CheckCircle, Edit3, Sparkles, Star, FileImage, Palette, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { removeBackgroundWithProgress } from './utils/backgroundRemoval';
import { MagicBrushEditor } from './components/MagicBrushEditor';
import { CircularProgress } from './components/ProgressBar';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { DownloadModal } from './components/DownloadModal';
import { UploadZone } from './components/UploadZone';
import UploadAndRemoveBg from './components/UploadAndRemoveBg';
import { BrowserRouter as Router, Link } from 'react-router-dom';
import { MagicReveal } from './components/MagicReveal';
import './components/magic-reveal.css';

interface ProcessedImage {
  original: string;
  processed: string;
  name: string;
}

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMagicTransition, setShowMagicTransition] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showMagic, setShowMagic] = useState(false);

  // Demo images for slider
  const demoImages = [
    {
      src: '/girl1.jpg',
      alt: 'Demo: Woman with transparent background',
    },
    {
      src: '/girl2.webp',
      alt: 'Demo: Smiling woman with transparent background',
    },
    {
      src: '/car-removed.png',
      alt: 'Demo: Car with background removed',
    },
    {
      src: '/logo.jpg',
      alt: 'Demo: Company logo with transparent background',
    },
    {
      src: '/teaser.jpg',
      alt: 'Demo: Teaser image with transparent background',
    },
  ];
  const [demoIndex, setDemoIndex] = useState(0);
  const handlePrevDemo = () => setDemoIndex(i => (i === 0 ? demoImages.length - 1 : i - 1));
  const handleNextDemo = () => setDemoIndex(i => (i === demoImages.length - 1 ? 0 : i + 1));

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    setProgress(newProgress);
    
    if (newProgress <= 15) {
      setProcessingStage('🚀 Initializing AI model...');
    } else if (newProgress <= 35) {
      setProcessingStage('🔍 Analyzing image content...');
    } else if (newProgress <= 55) {
      setProcessingStage('🎯 Detecting foreground objects...');
    } else if (newProgress <= 75) {
      setProcessingStage('✂️ Removing background...');
    } else if (newProgress <= 90) {
      setProcessingStage('✨ Enhancing edges...');
    } else if (newProgress < 100) {
      setProcessingStage('🎨 Finalizing results...');
    } else {
      setProcessingStage('🎉 Background removed successfully!');
    }
  }, []);

  const handleFile = async (file: File) => {
    // Validate file type
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setProcessing(true);
    setProgress(0);
    setProcessingStage('🚀 Starting...');
    
    try {
      const originalUrl = URL.createObjectURL(file);
      const imageBlob = await removeBackgroundWithProgress(file, updateProgress);
      const processedUrl = URL.createObjectURL(imageBlob);
      
      setProgress(100);
      setProcessingStage('🎉 Background removed successfully!');
      
      // Show success animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setProcessedImage({
        original: originalUrl,
        processed: processedUrl,
        name: file.name
      });
      
      setShowMagic(true);
      
    } catch (err) {
      console.error('Background removal failed:', err);
      setError('Failed to remove background. Please try again with a different image.');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setProcessedImage(null);
    setProcessing(false);
    setError(null);
    setShowEditor(false);
    setShowDownloadModal(false);
    setProgress(0);
    setProcessingStage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    setShowDownloadModal(true);
  };

  const handleManualEdit = () => {
    if (processedImage) {
      setShowEditor(true);
    }
  };

  const handleEditorSave = (editedImage: string) => {
    if (processedImage) {
      setProcessedImage({
        ...processedImage,
        processed: editedImage
      });
    }
    setShowEditor(false);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Header with navigation */}
        <header className="relative bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Background Remover Pro
                </h1>
                <p className="text-sm text-gray-600">AI-powered with Magic Brush editing</p>
              </div>
            </div>
            <nav className="flex gap-6 text-sm font-medium">
              <Link to="/" className="hover:text-blue-600">Home</Link>
              <a href="about.html" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">About Us</a>
              <a href="contact.html" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Contact Us</a>
              <a href="terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Terms &amp; Conditions</a>
            </nav>
          </div>
        </header>

        <main className="relative max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {showEditor && processedImage ? (
            <MagicBrushEditor
              originalImage={processedImage.original}
              processedImage={processedImage.processed}
              onSave={handleEditorSave}
              onCancel={handleEditorCancel}
            />
          ) : processing ? (
            /* Enhanced Processing Section */
            <div className="text-center py-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-100 max-w-lg mx-auto animate-in zoom-in-50">
                
                <div className="mb-10">
                  <CircularProgress progress={progress} size={160} />
                </div>

                <h3 className="text-3xl font-bold text-gray-900 mb-4">Processing Your Image</h3>
                <p className="text-lg text-gray-600 mb-8">{processingStage}</p>
                
                <div className="mt-10 text-left">
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 text-sm transition-all duration-500 ${progress > 15 ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${progress > 15 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300'}`}></div>
                      <span className="font-medium">🚀 AI Model Initialization</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm transition-all duration-500 ${progress > 35 ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${progress > 35 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300'}`}></div>
                      <span className="font-medium">🔍 Image Analysis</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm transition-all duration-500 ${progress > 55 ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${progress > 55 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300'}`}></div>
                      <span className="font-medium">🎯 Object Detection</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm transition-all duration-500 ${progress > 75 ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${progress > 75 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300'}`}></div>
                      <span className="font-medium">✂️ Background Removal</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm transition-all duration-500 ${progress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300'}`}></div>
                      <span className="font-medium">🎉 Complete!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : processedImage ? (
            /* Enhanced Results Section */
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Background Removed Successfully!</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-3">Amazing Results!</h2>
                <p className="text-xl text-gray-600">Compare the results and use Magic Brush for perfect editing</p>
              </div>

              {/* Before/After Comparison */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  Before & After Comparison
                </h3>
                {processedImage && (
                  <BeforeAfterSlider
                    beforeImage={processedImage.original}
                    afterImage={processedImage.processed}
                  />
                )}
              </div>

              {/* Premium Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleManualEdit}
                  className="group bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:from-amber-600 hover:to-orange-700 transition-all duration-300 flex items-center gap-3 justify-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <div className="bg-white/20 p-1 rounded-lg group-hover:scale-110 transition-transform">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  Magic Brush Editor
                  <div className="bg-white/20 px-2 py-1 rounded-full text-xs">PRO</div>
                </button>
                <button
                  onClick={handleDownload}
                  className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-3 justify-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <div className="bg-white/20 p-1 rounded-lg group-hover:scale-110 transition-transform">
                    <Download className="w-5 h-5" />
                  </div>
                  Download HD
                </button>
                <button
                  onClick={handleReset}
                  className="group bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-2xl font-bold border-2 border-gray-200 hover:bg-white hover:border-gray-300 transition-all duration-300 flex items-center gap-3 justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <div className="bg-gray-100 p-1 rounded-lg group-hover:scale-110 transition-transform">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  New Image
                </button>
              </div>

              {/* Premium Features Showcase */}
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                  <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-blue-900 mb-2">Multiple Formats</h4>
                  <p className="text-blue-700 text-sm">Download in PNG, JPG, or WebP with custom quality settings</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                  <div className="bg-purple-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-purple-900 mb-2">HD Quality</h4>
                  <p className="text-purple-700 text-sm">High-resolution output with edge enhancement technology</p>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border border-amber-200">
                  <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-amber-900 mb-2">Magic Brush</h4>
                  <p className="text-amber-700 text-sm">Professional editing tools with erase and restore functions</p>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Section */
            <div className="text-center mb-16">
              <div className="mb-8">
                <h2 className="text-5xl font-bold text-gray-900 mb-4 animate-in fade-in slide-in-from-bottom-4">
                  Remove Image Backgrounds
                  <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                    with AI Magic
                  </span>
                </h2>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Upload your image and watch as our advanced AI removes the background instantly. 
                  Then use our Magic Brush tools for pixel-perfect results.
                </p>
              </div>

              <UploadZone
                dragActive={dragActive}
                onDrag={handleDrag}
                onDrop={handleDrop}
                onFileSelect={handleFileInput}
                fileInputRef={fileInputRef}
              />

              {/* Demo Image Slider (now below UploadZone) */}
              <div className="flex flex-col items-center justify-center my-12">
                <h2 className="text-3xl font-bold mb-6 text-center">Demo Results</h2>
                <div className="flex items-center gap-6">
                  <button
                    onClick={handlePrevDemo}
                    className="p-3 rounded-full bg-white shadow hover:bg-blue-100 transition disabled:opacity-50"
                    aria-label="Previous demo image"
                  >
                    <ChevronLeft className="w-6 h-6 text-blue-600" />
                  </button>
                  <div className="w-[320px] sm:w-[400px] md:w-[500px] lg:w-[600px] aspect-[4/3] bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={demoImages[demoIndex].src}
                      alt={demoImages[demoIndex].alt}
                      className="w-full h-full object-contain rounded-2xl transition-all duration-300"
                      draggable="false"
                    />
                  </div>
                  <button
                    onClick={handleNextDemo}
                    className="p-3 rounded-full bg-white shadow hover:bg-blue-100 transition disabled:opacity-50"
                    aria-label="Next demo image"
                  >
                    <ChevronRight className="w-6 h-6 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Supported Formats Info */}
              <div className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <FileImage className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Supported Formats & Limits</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">JPG, PNG, WebP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Max 10MB file size</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">HD quality output</span>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
                <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">AI Processing</h3>
                  <p className="text-gray-600 leading-relaxed">Advanced neural networks for precise object detection and background removal</p>
                </div>
                
                <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">HD Quality</h3>
                  <p className="text-gray-600 leading-relaxed">Professional-grade background removal with edge enhancement</p>
                </div>
                
                <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                    <Edit3 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">Magic Brush</h3>
                  <p className="text-gray-600 leading-relaxed">Easily erase or restore anything with intelligent brush tools</p>
                </div>
                
                <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">One Click</h3>
                  <p className="text-gray-600 leading-relaxed">Simple and intuitive interface with instant results</p>
                </div>
              </div>
            </div>
          )}

            {showMagicTransition && (
            <MagicReveal
              beforeImage={processedImage?.original}
              afterImage={processedImage?.processed}
              duration={1500}
              onAnimationEnd={() => setShowMagicTransition(false)}
            />
          )}
        </main>

        {/* Enhanced Footer */}
        <footer className="relative bg-gradient-to-r from-gray-900 to-gray-800 text-white mt-20">
          <div className="max-w-7xl mx-auto px-4 py-16">
            {/* Footer content removed as per user request */}
          </div>
        </footer>

        {/* Download Modal */}
        {showDownloadModal && processedImage !== null ? (() => {
          const { processed, name } = processedImage;
          return (
            <DownloadModal
              image={processed}
              fileName={name}
              onClose={() => setShowDownloadModal(false)}
            />
          );
        })() : null}
      </div>
    </Router>
  );
}

export default App;