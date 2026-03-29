import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from './Toast';

export default function ImageUploader({ onImagesSelected, images = [] }) {
  const fileInputRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files).filter(file => {
      // 10MB 제한
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`'${file.name}'의 용량이 10MB를 초과하여 제외되었습니다.`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`'${file.name}'은(는) 이미지 파일이 아닙니다.`);
        return false;
      }
      return true;
    });

    if (fileArray.length === 0) return;

    const newPreviews = fileArray.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file), // Blob 릭 방지를 위해 나중에 해제됨
      name: file.name,
    }));
    
    setPreviews((prev) => [...prev, ...newPreviews]);
    onImagesSelected([...images, ...fileArray]);
    toast.success(`${fileArray.length}장의 이미지를 추가했습니다.`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleRemove = (id) => {
    const previewToRemove = previews.find((p) => p.id === id);
    if (previewToRemove) {
        URL.revokeObjectURL(previewToRemove.url); // 메모리 누수 방지
    }
    
    setPreviews((prev) => prev.filter((p) => p.id !== id));
    const removedIndex = previews.findIndex((p) => p.id === id);
    const newImages = [...images];
    newImages.splice(removedIndex, 1);
    onImagesSelected(newImages);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600 font-medium">
          이미지를 드래그 앤 드롭하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-slate-400 mt-2">
          고해상도 PNG, JPG, WEBP 이미지 권장 (최대 10MB)
        </p>
        {previews.length > 0 && (
          <p className="text-xs font-bold text-blue-500 mt-3 bg-blue-50 inline-block px-3 py-1 rounded-full">
            현재 {previews.length}장 선택됨
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files.length > 0) {
            handleFileSelect(e.target.files);
          }
        }}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {previews.map((preview) => (
            <div key={preview.id} className="relative group">
              <img
                src={preview.url}
                alt={preview.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => handleRemove(preview.id)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
