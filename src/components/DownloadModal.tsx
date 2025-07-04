import React, { useState } from 'react';
import { X, Download, FileImage, Settings, Crown } from 'lucide-react';

interface DownloadModalProps {
  image: string;
  fileName: string;
  onClose: () => void;
}

type ImageFormat = 'png' | 'jpg' | 'webp';

export const DownloadModal: React.FC<DownloadModalProps> = ({
  image,
  fileName,
  onClose
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState(95);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Create canvas to convert image format
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        if (ctx) {
          // For JPG, add white background
          if (selectedFormat === 'jpg') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Convert to desired format
          const mimeType = selectedFormat === 'jpg' ? 'image/jpeg' : `image/${selectedFormat}`;
          const qualityValue = selectedFormat === 'png' ? 1 : quality / 100;
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `bg-removed-${fileName.replace(/\.[^/.]+$/, '')}.${selectedFormat}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
            setIsDownloading(false);
            onClose();
          }, mimeType, qualityValue);
        }
      };
      
      img.src = image;
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center z-50 p-0">
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-0 w-screen h-screen flex flex-col items-center border-4 border-transparent bg-clip-padding max-w-3xl mx-auto"
        style={{
          borderImage: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6) 1',
          boxShadow: '0 8px 32px 0 rgba(99,102,241,0.15), 0 1.5px 8px 0 rgba(236,72,153,0.10)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 w-full">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Download Options</h3>
              <p className="text-sm text-gray-500">Safe, watermark-free, HD quality output</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 flex-1 w-full overflow-auto">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
              <img
                src={image}
                alt="Preview"
                className="w-auto h-auto max-w-[500px] max-h-[400px] object-contain rounded-xl"
              />
              <div className="absolute top-2 right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow">
                HD
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Output Format</label>
            <div className="grid grid-cols-3 gap-4">
              {/* PNG */}
              <button
                onClick={() => setSelectedFormat('png')}
                className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center shadow-sm ${
                  selectedFormat === 'png'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <FileImage className="w-7 h-7 mb-2 text-blue-500" />
                <span className="font-medium">PNG</span>
                <span className="text-xs text-gray-500">Transparent</span>
              </button>
              {/* JPG */}
              <button
                onClick={() => setSelectedFormat('jpg')}
                className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center shadow-sm ${
                  selectedFormat === 'jpg'
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <FileImage className="w-7 h-7 mb-2 text-purple-500" />
                <span className="font-medium">JPG</span>
                <span className="text-xs text-gray-500">Smaller size</span>
              </button>
              {/* WebP */}
              <button
                onClick={() => setSelectedFormat('webp')}
                className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center shadow-sm ${
                  selectedFormat === 'webp'
                    ? 'border-green-500 bg-green-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
              >
                <FileImage className="w-7 h-7 mb-2 text-green-500" />
                <span className="font-medium">WebP</span>
                <span className="text-xs text-gray-500">Modern</span>
              </button>
            </div>
          </div>

          {/* Quality Slider */}
          {selectedFormat !== 'png' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Quality</label>
                <span className="text-sm font-medium text-gray-900">{quality}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>📉 Smaller file</span>
                <span>📈 Best quality</span>
              </div>
            </div>
          )}

          {/* Premium Features */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200 shadow flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-500" />
            <div>
              <div className="font-semibold text-amber-800">Premium Features</div>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Watermark-free downloads</li>
                <li>• Maximum resolution output</li>
                <li>• Advanced edge enhancement</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 flex gap-4 w-full bg-white/80 backdrop-blur">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download {selectedFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};