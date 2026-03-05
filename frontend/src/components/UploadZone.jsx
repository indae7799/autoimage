import React from 'react';
// import { useDropzone } from 'react-dropzone'; // Removed unused import to fix build // Need to install react-dropzone or use html5 drag-drop
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

// We didn't install react-dropzone yet, I'll use simple HTML5 for now or install it.
// User checking... I installed @dnd-kit/core but that's for sorting. 
// It's better to verify if I can install 'react-dropzone' quickly.
// For now, I'll build a simple native one to avoid more installs if possible, or just install it.
// actually react-dropzone is standard. I'll ask to install it or just use input type=file

export default function UploadZone({ onFilesSelected, className }) {
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <div className={cn("border-2 border-dashed border-sage-light rounded-xl p-10 text-center bg-sage-pale hover:bg-sage-bg transition-colors cursor-pointer relative", className)}>
            <input
                type="file"
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sage-dark shadow-sm">
                    <UploadCloud size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-sage-dark">이미지 업로드</h3>
                    <p className="text-sm text-sage-dark/60 mt-1">
                        제품 사진을 5~10장 드래그하거나 클릭하여 선택하세요
                    </p>
                </div>
                <p className="text-xs text-sage-dark/40">
                    JPG, PNG 지원 · 자동 분석 시작
                </p>
            </div>
        </div>
    );
}
