
import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (base64: string) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, className = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    // Limit size to ~1MB for localStorage safety in this prototype
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Image is too large. Please choose an image under 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
        {label}
      </label>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative cursor-pointer group rounded-3xl border-2 border-dashed transition-all duration-300 min-h-[160px] flex flex-col items-center justify-center p-4
          ${value ? 'border-transparent bg-slate-50' : 'border-slate-200 hover:border-rose-400 bg-white'}
          ${isDragging ? 'border-rose-500 bg-rose-50 scale-[0.98]' : ''}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={onFileChange} 
        />

        {value ? (
          <div className="w-full h-full relative group/preview">
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-2xl shadow-sm"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-3">
              <button 
                type="button"
                className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform"
              >
                Change Image
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 p-6">
            <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-rose-500 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Upload an image</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Drag and drop or click to browse</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
