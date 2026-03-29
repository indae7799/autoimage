import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Download, Loader2, ImagePlus, Check } from 'lucide-react';
import { removeBackground } from '../services/api';

export default function BgRemoveModal({ isOpen, onClose, onInsert }) {
    const [dragOver, setDragOver] = useState(false);
    const [sourceImage, setSourceImage] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const reset = () => {
        setSourceImage(null);
        setResultImage(null);
        setError(null);
        setLoading(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const processImage = useCallback(async (file) => {
        setError(null);
        setSourceImage(URL.createObjectURL(file));
        setLoading(true);
        try {
            const resultUrl = await removeBackground(file);
            setResultImage(resultUrl);
        } catch (err) {
            console.error('Background removal failed:', err);
            setError(err.response?.data?.detail || err.message || '배경 제거 실패. 서버에 rembg가 설치되어 있는지 확인해주세요.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            processImage(file);
        }
    }, [processImage]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) processImage(file);
    };

    const handleInsert = () => {
        if (resultImage && onInsert) {
            onInsert(resultImage);
        }
        handleClose();
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const a = document.createElement('a');
        a.href = resultImage;
        a.download = 'removed_bg.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[20000] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <ImagePlus size={16} className="text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">누끼따기 (배경 제거)</h3>
                            <p className="text-[10px] text-slate-400">이미지를 드래그하거나 선택하세요</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!sourceImage ? (
                        /* Drop Zone */
                        <div
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
                                ${dragOver
                                    ? 'border-purple-400 bg-purple-50 scale-[1.02]'
                                    : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={40} className={`mx-auto mb-4 ${dragOver ? 'text-purple-500' : 'text-slate-300'}`} />
                            <p className="text-sm font-bold text-slate-600 mb-1">이미지를 여기에 드래그 & 드롭</p>
                            <p className="text-xs text-slate-400">또는 클릭하여 파일 선택</p>
                            <p className="text-[10px] text-slate-300 mt-3">PNG, JPG, WEBP 지원</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    ) : (
                        /* Preview */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Source */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">원본</span>
                                    <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                        <img src={sourceImage} alt="원본" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                                {/* Result */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">결과</span>
                                    <div className="aspect-square rounded-xl overflow-hidden border border-purple-200 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjFmNWY5Ii8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMWY1ZjkiLz48L3N2Zz4=')]">
                                        {loading ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/80">
                                                <Loader2 size={32} className="animate-spin text-purple-500 mb-3" />
                                                <span className="text-xs font-bold text-purple-600">배경 제거 중...</span>
                                                <span className="text-[10px] text-slate-400 mt-1">잠시만 기다려주세요</span>
                                            </div>
                                        ) : error ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-4">
                                                <span className="text-xs font-bold text-red-500 text-center">{error}</span>
                                            </div>
                                        ) : resultImage ? (
                                            <img src={resultImage} alt="결과" className="w-full h-full object-contain" />
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {/* Error retry */}
                            {error && (
                                <button onClick={reset}
                                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors">
                                    다시 시도
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {resultImage && !loading && (
                    <div className="flex gap-3 px-6 pb-6">
                        <button onClick={reset}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors">
                            다른 이미지
                        </button>
                        <button onClick={handleDownload}
                            className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors">
                            <Download size={14} /> 다운로드
                        </button>
                        <button onClick={handleInsert}
                            className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors">
                            <Check size={14} /> 에디터에 삽입
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
