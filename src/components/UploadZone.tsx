import React from 'react';
import { Upload, FileImage, Zap } from 'lucide-react';

interface UploadZoneProps {
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  dragActive,
  onDrag,
  onDrop,
  onFileSelect,
  fileInputRef
}) => {
  return (
    <div
      className={`relative border-2 border-dashed rounded-3xl p-16 transition-all duration-500 ${
        dragActive
          ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 scale-105 shadow-2xl'
          : 'border-gray-300 bg-white/60 backdrop-blur-sm hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/50 hover:shadow-xl'
      }`}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={onFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center">
        <div className={`relative mb-8 transition-all duration-500 ${dragActive ? 'scale-110' : ''}`}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-2xl shadow-2xl focus:outline-none"
            style={{ cursor: 'pointer' }}
            tabIndex={0}
            aria-label="Upload image"
          >
            <Upload className="w-10 h-10 text-white" />
          </button>
          {dragActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 p-6 rounded-2xl animate-pulse pointer-events-none">
              <Upload className="w-10 h-10 text-white" />
            </div>
          )}
        </div>
        
        <h3 className="text-3xl font-bold text-gray-900 mb-3">
          {dragActive ? 'Drop your image here!' : 'Drop your image here'}
        </h3>
        
        <p className="text-gray-600 mb-6 text-lg">
          or <span className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">click to browse</span>
        </p>
        
        <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4" />
            <span>JPG, PNG, WebP</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <span>Max 10MB</span>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>HD Quality</span>
          </div>
        </div>

        {/* Upload Animation */}
        <div className="flex items-center gap-2 opacity-60">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
};