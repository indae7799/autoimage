import React, { useState } from 'react';
import { toBlob } from 'html-to-image';
import JSZip from 'jszip';
import { Download, Loader2, FolderInput } from 'lucide-react';

export default function DownloadControl({ sections }) {
    const [title, setTitle] = useState("상세페이지");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDownload = async () => {
        if (!sections || sections.length === 0) {
            alert("섹션이 없습니다.");
            return;
        }

        setIsGenerating(true);
        setProgress(0);

        try {
            const zip = new JSZip();
            const folder = zip.folder(title || "상세페이지");

            // Find all section elements
            // We assume sections are rendered with IDs or typical class structures we can target
            // Ideally, the parent component renders sections with specific IDs like `section-${id}`

            const sectionElements = document.querySelectorAll('[data-section-type]');

            if (sectionElements.length === 0) {
                throw new Error("렌더링된 섹션을 찾을 수 없습니다.");
            }

            for (let i = 0; i < sectionElements.length; i++) {
                const element = sectionElements[i];

                const targetWidth = 860;
                const scale = targetWidth / element.offsetWidth;

                // Capture high-res image
                const blob = await toBlob(element, {
                    pixelRatio: 2, // Retina quality
                    backgroundColor: '#ffffff', // Ensure white background for transparent parts if any
                    width: targetWidth,
                    height: element.offsetHeight * scale,
                    style: {
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        width: `${element.offsetWidth}px`,
                        height: `${element.offsetHeight}px`
                    },
                    fontEmbedCSS: '', // Skip CSS rule fetching for external web fonts to fix CORS error
                    filter: (node) => {
                        if (node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
                            return false;
                        }
                        return true;
                    }
                });

                // File naming: 1.png, 2.png, etc.
                const fileName = `${i + 1}.png`;
                folder.file(fileName, blob);

                setProgress(Math.round(((i + 1) / sectionElements.length) * 100));
            }

            // Generate ZIP
            const content = await zip.generateAsync({ type: "blob" });

            // Trigger Download
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || "상세페이지"}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Download failed:", error);
            alert("다운로드 중 오류가 발생했습니다: " + error.message);
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm mb-6 sticky top-4 z-[1000]">
            <div className="flex items-center gap-2 mb-1">
                <FolderInput size={18} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-700">폴더명 설정 (제목)</span>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력해주세요"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
                />
                <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a2e22] text-white text-sm font-bold rounded-lg hover:bg-[#2f4f3b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            {progress}%
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            다운로드
                        </>
                    )}
                </button>
            </div>
            <p className="text-[11px] text-slate-400">
                * 각 섹션이 별도 이미지(1.png, 2.png...)로 저장되어 설정한 폴더명으로 ZIP 다운로드됩니다.
            </p>
        </div>
    );
}
