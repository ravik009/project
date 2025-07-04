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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-6xl w-full flex flex-col items-center border-4 border-transparent bg-clip-padding"
        style={{
          borderImage: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6) 1',
          boxShadow: '0 8px 32px 0 rgba(99,102,241,0.15), 0 1.5px 8px 0 rgba(236,72,153,0.10)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Download Options</h3>
              <p className="text-sm text-gray-600">Choose format and quality</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={image}
                alt="Preview"
                className="w-auto h-auto max-w-192 max-h-192 object-contain rounded-2xl border-4 border-gray-200 mx-auto"
                style={{ width: '100%', maxWidth: '768px', maxHeight: '768px' }}
              />
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                HD
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Output Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedFormat('png')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedFormat === 'png'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <FileImage className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">PNG</div>
                <div className="text-xs opacity-75">Transparent</div>
              </button>
              
              <button
                onClick={() => setSelectedFormat('jpg')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedFormat === 'jpg'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <FileImage className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">JPG</div>
                <div className="text-xs opacity-75">Smaller size</div>
              </button>
              
              <button
                onClick={() => setSelectedFormat('webp')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedFormat === 'webp'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <FileImage className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">WebP</div>
                <div className="text-xs opacity-75">Modern</div>
              </button>
            </div>
          </div>

          {/* Quality Settings */}
          {selectedFormat !== 'png' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Quality</label>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">{quality}%</span>
                </div>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          )}

          {/* Premium Features */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Premium Features</span>
            </div>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Watermark-free downloads</li>
              <li>• Maximum resolution output</li>
              <li>• Advanced edge enhancement</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download {selectedFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};