import React, { useState, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
    Image as ImageIcon, Type, Square, Circle, Minus, Triangle,
    Upload, Sparkles, Layers, Copy, Scissors, Wand2,
    PlusCircle, Plus,
    Truck, ShieldCheck, Leaf, Droplets, Sun, Heart,
    CheckCircle2, Clock, Award, Gem, FlaskConical, Flower2,
    Star, Zap, BadgeCheck
} from 'lucide-react';
import BgRemoveModal from './BgRemoveModal';

function DraggableImage({ image, onClick }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: image.id,
        data: { type: 'image', src: image.src }
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => onClick && onClick(image)}
            className={cn(
                "aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative group",
                isDragging && "opacity-50 scale-95"
            )}
        >
            <img src={image.src} alt="Uploaded" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
    );
}

export default function Sidebar({ images, sections, onAddText, onAddHeading, onAddShape, onAddFrame, onAddImage, onImageClick, onAddBadge, onAddPresetText, onAddIcon }) {
    const [activeTab, setActiveTab] = useState('elements');
    const [aiLoading, setAiLoading] = useState(null);
    const [showBgModal, setShowBgModal] = useState(false);
    const fileInputRef = useRef(null);

    // ---- Badge Presets (Premium Design) ----
    const BADGES = [
        { text: 'NEW', Icon: Zap, gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: '6px', padding: '5px 14px', shadow: '0 3px 12px rgba(239,68,68,0.4)', border: 'none' },
        { text: 'BEST', Icon: Award, gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#78350f', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: '6px', padding: '5px 14px', shadow: '0 3px 12px rgba(245,158,11,0.4)', border: 'none' },
        { text: 'HOT', Icon: Zap, gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: '6px', padding: '5px 14px', shadow: '0 3px 12px rgba(236,72,153,0.4)', border: 'none' },
        { text: 'SALE', Icon: null, gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: 3, borderRadius: '4px', padding: '6px 16px', shadow: '0 4px 14px rgba(220,38,38,0.4)', border: 'none' },
        { text: '한정판', Icon: Gem, gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '20px', padding: '5px 16px', shadow: '0 3px 12px rgba(124,58,237,0.35)', border: 'none' },
        { text: '무료배송', Icon: Truck, gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '20px', padding: '5px 16px', shadow: '0 3px 12px rgba(5,150,105,0.35)', border: 'none' },
        { text: '1+1', Icon: null, gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', color: '#fff', fontSize: 14, fontWeight: 900, borderRadius: '50%', padding: '10px', shadow: '0 4px 14px rgba(37,99,235,0.4)', border: '2px solid rgba(255,255,255,0.3)' },
        { text: '★★★★★', Icon: null, gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#78350f', fontSize: 12, fontWeight: 600, borderRadius: '8px', padding: '5px 12px', shadow: '0 3px 10px rgba(251,191,36,0.4)', border: 'none' },
        { text: '추천', Icon: Heart, gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '20px', padding: '5px 16px', shadow: '0 3px 12px rgba(6,182,212,0.35)', border: 'none' },
        { text: '인기', Icon: Sparkles, gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '20px', padding: '5px 16px', shadow: '0 3px 12px rgba(244,63,94,0.35)', border: 'none' },
        { text: '정품보증', Icon: ShieldCheck, gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '8px', padding: '5px 14px', shadow: '0 3px 12px rgba(29,78,216,0.35)', border: 'none' },
        { text: '오늘출발', Icon: Clock, gradient: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '8px', padding: '5px 14px', shadow: '0 3px 12px rgba(13,148,136,0.35)', border: 'none' },
    ];

    // ---- Icon presets (Lucide SVG - professional quality) ----
    const ICONS = [
        { Icon: Truck, name: 'Truck', label: '배송', color: '#3b82f6' },
        { Icon: ShieldCheck, name: 'ShieldCheck', label: '인증', color: '#10b981' },
        { Icon: Leaf, name: 'Leaf', label: '자연성분', color: '#22c55e' },
        { Icon: Droplets, name: 'Droplets', label: '수분', color: '#06b6d4' },
        { Icon: Sun, name: 'Sun', label: 'UV차단', color: '#f59e0b' },
        { Icon: Sparkles, name: 'Sparkles', label: '광채', color: '#a855f7' },
        { Icon: Heart, name: 'Heart', label: '좋아요', color: '#ef4444' },
        { Icon: CheckCircle2, name: 'CheckCircle2', label: '검증', color: '#059669' },
        { Icon: Clock, name: 'Clock', label: '시간', color: '#6366f1' },
        { Icon: Award, name: 'Award', label: '수상', color: '#eab308' },
        { Icon: Flower2, name: 'Flower2', label: '플로럴', color: '#ec4899' },
        { Icon: Gem, name: 'Gem', label: '프리미엄', color: '#8b5cf6' },
        { Icon: FlaskConical, name: 'FlaskConical', label: '성분', color: '#14b8a6' },
        { Icon: BadgeCheck, name: 'BadgeCheck', label: '보증', color: '#2563eb' },
        { Icon: Zap, name: 'Zap', label: '효과', color: '#f97316' },
        { Icon: Star, name: 'Star', label: '별점', color: '#fbbf24' },
    ];

    // ---- Preset Texts (Premium with icon + rich styling) ----
    const PRESET_TEXTS = [
        { text: '무료배송', Icon: Truck, fontSize: 15, fontWeight: 700, color: '#065f46', style: { background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #6ee7b7', boxShadow: '0 2px 8px rgba(16,185,129,0.15)' } },
        { text: '오늘만 특가!', Icon: Zap, fontSize: 16, fontWeight: 800, color: '#991b1b', style: { background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #fca5a5', boxShadow: '0 2px 8px rgba(239,68,68,0.15)' } },
        { text: '100% 정품 보증', Icon: ShieldCheck, fontSize: 14, fontWeight: 700, color: '#1e3a8a', style: { background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #93c5fd', boxShadow: '0 2px 8px rgba(59,130,246,0.15)' } },
        { text: '피부 임상 테스트 완료', Icon: CheckCircle2, fontSize: 13, fontWeight: 600, color: '#5b21b6', style: { background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #c4b5fd', boxShadow: '0 2px 8px rgba(139,92,246,0.15)' } },
        { text: '식약처 인증 완료', Icon: BadgeCheck, fontSize: 13, fontWeight: 600, color: '#115e59', style: { background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #5eead4', boxShadow: '0 2px 8px rgba(20,184,166,0.15)' } },
        { text: '민감성 피부 OK', Icon: Heart, fontSize: 14, fontWeight: 600, color: '#9a3412', style: { background: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #fdba74', boxShadow: '0 2px 8px rgba(249,115,22,0.15)' } },
        { text: '동물실험 NO', Icon: ShieldCheck, fontSize: 14, fontWeight: 700, color: '#831843', style: { background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #f9a8d4', boxShadow: '0 2px 8px rgba(236,72,153,0.15)' } },
        { text: '비건 인증', Icon: Leaf, fontSize: 14, fontWeight: 700, color: '#14532d', style: { background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', padding: '10px 20px', borderRadius: '12px', border: '1px solid #86efac', boxShadow: '0 2px 8px rgba(34,197,94,0.15)' } },
    ];

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    // Handle additional image upload in editor
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0 && onAddImage) {
            files.forEach(file => {
                const url = URL.createObjectURL(file);
                onAddImage({ id: `img-${Math.random().toString(36).substr(2, 9)}`, src: url, file });
            });
        }
        e.target.value = '';
    };

    // AI prompt generation handler
    const handleGeneratePrompt = async () => {
        if (images.length === 0) { alert('먼저 이미지를 업로드해주세요'); return; }
        setAiLoading('prompt');
        try {
            const imgSrc = images[images.length - 1].src;
            const blob = await fetch(imgSrc).then(r => r.blob());
            const file = new File([blob], 'image.png', { type: blob.type });

            const { generatePromptFromImage } = await import('@/services/api');
            const prompt = await generatePromptFromImage(file);
            // prompt is copied to clipboard directly
            copyToClipboard(prompt);
            alert('AI 프롬프트가 클립보드에 복사되었습니다!');
        } catch (err) {
            console.error(err);
            alert('프롬프트 생성 실패: ' + (err.message || '서버 오류'));
        } finally {
            setAiLoading(null);
        }
    };

    // Insert bg-removed image into editor
    const handleBgInsert = (resultUrl) => {
        if (onAddImage) {
            onAddImage({ id: `img-bg-${Math.random().toString(36).substr(2, 9)}`, src: resultUrl });
        }
    };

    const tabs = [
        { id: 'elements', label: '요소', icon: PlusCircle },
        { id: 'upload', label: '업로드', icon: Upload },
        { id: 'ai', label: 'AI', icon: Sparkles },
        { id: 'layers', label: '레이어', icon: Layers },
    ];

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 py-3 flex flex-col items-center gap-0.5 transition-all text-[9px] font-bold uppercase tracking-wide",
                            activeTab === tab.id
                                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto">

                {/* ====== ELEMENTS TAB ====== */}
                {activeTab === 'elements' && (
                    <div className="p-4 space-y-3">
                        {/* --- TEXT --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">텍스트</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onAddText?.()}
                                className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all group"
                            >
                                <Type size={20} className="text-slate-400 group-hover:text-blue-600" />
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600">텍스트 추가</span>
                            </button>
                            <button
                                onClick={() => onAddHeading?.()}
                                className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all group"
                            >
                                <span className="text-lg font-black text-slate-400 group-hover:text-blue-600">H</span>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600">제목 추가</span>
                            </button>
                        </div>

                        {/* --- SHAPES --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">도형</div>
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => onAddShape?.('rectangle')} className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                <Square size={16} className="text-slate-400 group-hover:text-emerald-600" />
                                <span className="text-[9px] font-bold text-slate-500">사각형</span>
                            </button>
                            <button onClick={() => onAddShape?.('circle')} className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                <Circle size={16} className="text-slate-400 group-hover:text-emerald-600" />
                                <span className="text-[9px] font-bold text-slate-500">원형</span>
                            </button>
                            <button onClick={() => onAddShape?.('triangle')} className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                <Triangle size={16} className="text-slate-400 group-hover:text-emerald-600" />
                                <span className="text-[9px] font-bold text-slate-500">삼각형</span>
                            </button>
                            <button onClick={() => onAddShape?.('line')} className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                <Minus size={16} className="text-slate-400 group-hover:text-emerald-600" />
                                <span className="text-[9px] font-bold text-slate-500">구분선</span>
                            </button>
                        </div>

                        {/* --- DIVIDERS --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">디바이더</div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {[
                                { type: 'line', label: '실선', preview: <div className="w-full h-[2px] bg-slate-400" /> },
                                { type: 'line-dashed', label: '점선', preview: <div className="w-full h-[2px] border-b-2 border-dashed border-slate-400" /> },
                                { type: 'line-dotted', label: '도트', preview: <div className="w-full h-[2px] border-b-2 border-dotted border-slate-400" /> },
                                { type: 'line-double', label: '이중선', preview: <div className="space-y-[2px]"><div className="w-full h-[1px] bg-slate-400" /><div className="w-full h-[1px] bg-slate-400" /></div> },
                                { type: 'line-gradient', label: '그라데', preview: <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-slate-400 to-transparent" /> },
                            ].map(d => (
                                <button key={d.type} onClick={() => onAddShape?.(d.type)} className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-100 hover:border-amber-200 transition-all group">
                                    <div className="w-full px-1 flex items-center h-4">{d.preview}</div>
                                    <span className="text-[7px] font-bold text-slate-500">{d.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* --- FRAMES --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">프레임 (이미지 넣기)</div>
                        <p className="text-[9px] text-slate-400 -mt-1 mb-2">이미지를 드래그하여 프레임에 넣으세요</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => onAddFrame?.('circle')} className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-all group">
                                <Circle size={18} className="text-slate-400 group-hover:text-purple-600" />
                                <span className="text-[9px] font-bold text-slate-500">원형</span>
                            </button>
                            <button onClick={() => onAddFrame?.('rounded')} className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-all group">
                                <Square size={18} className="text-slate-400 group-hover:text-purple-600 rounded" />
                                <span className="text-[9px] font-bold text-slate-500">라운드</span>
                            </button>
                            <button onClick={() => onAddFrame?.('arch')} className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-all group">
                                <div className="w-4 h-5 border-2 border-slate-400 group-hover:border-purple-600 rounded-t-full" />
                                <span className="text-[9px] font-bold text-slate-500">아치</span>
                            </button>
                        </div>

                        {/* --- BADGES/STICKERS (Premium) --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">뱃지 / 스티커</div>
                        <div className="grid grid-cols-3 gap-2">
                            {BADGES.map((badge, i) => {
                                const BadgeIcon = badge.Icon;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onAddBadge?.(badge)}
                                        className="hover:scale-110 active:scale-95 transition-all duration-150"
                                        title={`${badge.text} 뱃지 추가`}
                                    >
                                        <span
                                            className="inline-flex items-center justify-center gap-1 text-center whitespace-nowrap"
                                            style={{
                                                fontSize: `${badge.fontSize || 11}px`,
                                                fontWeight: badge.fontWeight || 800,
                                                color: badge.color,
                                                background: badge.gradient,
                                                borderRadius: badge.borderRadius || '6px',
                                                padding: badge.padding || '5px 14px',
                                                letterSpacing: badge.letterSpacing ? `${badge.letterSpacing}px` : undefined,
                                                boxShadow: badge.shadow,
                                                border: badge.border || 'none',
                                            }}
                                        >
                                            {BadgeIcon && <BadgeIcon size={12} strokeWidth={2.5} />}
                                            {badge.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* --- ICONS --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">아이콘</div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {ICONS.map((item, i) => {
                                const ItemIcon = item.Icon;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onAddIcon?.({ name: item.name, label: item.label, color: item.color })}
                                        className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 hover:bg-sky-50 rounded-xl border border-slate-100 hover:border-sky-200 transition-all group hover:scale-105 active:scale-95"
                                        title={item.label}
                                    >
                                        <ItemIcon size={20} className="transition-colors" style={{ color: item.color }} />
                                        <span className="text-[8px] font-bold text-slate-400 group-hover:text-sky-600">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* --- PRESET TEXT (Premium) --- */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">자주 쓰는 문구</div>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESET_TEXTS.map((preset, i) => {
                                const PresetIcon = preset.Icon;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onAddPresetText?.(preset)}
                                        className="text-left rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] hover:shadow-lg"
                                        style={{
                                            background: preset.style?.background || '#f8fafc',
                                            padding: preset.style?.padding || '10px 16px',
                                            borderRadius: preset.style?.borderRadius || '12px',
                                            border: preset.style?.border || '1px solid #e2e8f0',
                                            boxShadow: preset.style?.boxShadow || 'none',
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {PresetIcon && <PresetIcon size={13} style={{ color: preset.color, flexShrink: 0 }} strokeWidth={2.5} />}
                                            <span
                                                className="block truncate"
                                                style={{
                                                    fontSize: '10px',
                                                    fontWeight: preset.fontWeight,
                                                    color: preset.color,
                                                }}
                                            >
                                                {preset.text}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ====== UPLOAD TAB ====== */}
                {activeTab === 'upload' && (
                    <div className="p-4 space-y-4">
                        {/* Upload Button */}
                        <button
                            onClick={handleUploadClick}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                        >
                            <Plus size={16} />
                            이미지 추가 업로드
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            업로드된 이미지 ({images.length}개)
                        </div>
                        <p className="text-[10px] text-slate-400 -mt-2">이미지를 캔버스로 드래그하세요</p>

                        <div className="grid grid-cols-2 gap-2">
                            {images.map((img) => (
                                <DraggableImage key={img.id} image={img} onClick={onImageClick} />
                            ))}
                        </div>
                        {images.length === 0 && (
                            <div className="text-center py-16 text-slate-300">
                                <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">이미지 없음</p>
                                <p className="text-[10px] text-slate-400 mt-1">위 버튼을 클릭하여 이미지를 추가하세요</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ====== AI TAB ====== */}
                {activeTab === 'ai' && (
                    <div className="p-4 space-y-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">AI 도구</div>
                        <div className="space-y-2">
                            {/* 누끼따기 - Opens Modal */}
                            <button onClick={() => setShowBgModal(true)} className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 hover:shadow-md transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                    <Scissors size={16} className="text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[11px] font-bold text-purple-700">누끼따기 (배경 제거)</div>
                                    <div className="text-[9px] text-purple-400">이미지를 드래그&드롭하여 배경을 제거합니다</div>
                                </div>
                            </button>
                            {/* AI 프롬프트 생성 */}
                            <button onClick={handleGeneratePrompt} disabled={aiLoading === 'prompt'} className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:shadow-md transition-all group disabled:opacity-50">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <Wand2 size={16} className="text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[11px] font-bold text-blue-700">{aiLoading === 'prompt' ? '생성 중...' : 'AI 프롬프트 생성'}</div>
                                    <div className="text-[9px] text-blue-400">제품 사진 기반 이미지 프롬프트 자동 생성</div>
                                </div>
                            </button>
                        </div>

                        {/* AI Prompts per section */}
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 mt-4">섹션별 AI 이미지 프롬프트</div>
                        <p className="text-[9px] text-slate-400 -mt-1 mb-2">Midjourney, DALL-E, 나노바나나 등에서 사용하세요</p>
                        {sections.filter(s => s.image_prompt || s.type === 'ingredients' || s.type === 'point').length === 0 && (
                            <p className="text-[10px] text-slate-400 italic py-4 text-center">
                                상세페이지를 생성하면 각 섹션별 프롬프트가 여기에 표시됩니다
                            </p>
                        )}
                        {sections.map((section, idx) => {
                            // Collect all prompts for this section
                            const prompts = [];

                            // Main section prompt
                            if (section.image_prompt) {
                                prompts.push({ label: '메인 이미지', text: section.image_prompt });
                            }

                            // Ingredient sub-prompts (ing1 ~ ing6)
                            if (section.type === 'ingredients') {
                                const itemCount = section.itemCount || 4;
                                for (let i = 1; i <= itemCount; i++) {
                                    const prompt = section[`ing${i}Prompt`] || `Macro photography of pure ${section[`ing${i}Title`] || `ingredient ${i}`}, natural lighting, white background, high detail, 8k resolution`;
                                    prompts.push({ label: `성분 ${i}: ${section[`ing${i}Title`] || ''}`, text: prompt });
                                }
                            }

                            // Point sub-prompts (point1 ~ point3)
                            if (section.type === 'point') {
                                const points = section.points || [];
                                const count = points.length || 3;
                                for (let i = 1; i <= count; i++) {
                                    const prompt = section[`point${i}Prompt`] || `High-end cosmetic photography, visualize the effect of: ${section[`point${i}Title`] || points[i - 1]?.title || `point ${i}`}, photorealistic, soft studio lighting, 8k resolution`;
                                    prompts.push({ label: `포인트 ${i}: ${section[`point${i}Title`] || ''}`, text: prompt });
                                }
                            }

                            if (prompts.length === 0) return null;

                            return (
                                <div key={section.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase border-b border-slate-200 pb-1 mb-1">
                                        {idx + 1}. {section.type} — {section.title?.substring(0, 15) || ''}
                                    </div>
                                    {prompts.map((p, pIdx) => (
                                        <div key={pIdx} className="group">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-[8px] font-bold text-blue-500 uppercase tracking-wide">{p.label}</span>
                                                <button
                                                    onClick={() => { copyToClipboard(p.text); alert('프롬프트가 클립보드에 복사되었습니다!'); }}
                                                    className="p-1 bg-white rounded-md shadow-sm text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="프롬프트 복사"
                                                >
                                                    <Copy size={10} />
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-slate-600 leading-relaxed italic break-words line-clamp-2 group-hover:line-clamp-none transition-all">
                                                "{p.text}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ====== LAYERS TAB ====== */}
                {activeTab === 'layers' && (
                    <div className="p-4 space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">섹션 목록</div>
                        {sections.map((section, idx) => (
                            <div
                                key={section.id}
                                onClick={() => {
                                    const el = document.getElementById(`section-${section.id}`);
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Optional: add a temporary highlight effect
                                        el.classList.add('ring-4', 'ring-blue-500', 'ring-inset', 'transition-all', 'duration-500');
                                        setTimeout(() => {
                                            el.classList.remove('ring-4', 'ring-blue-500', 'ring-inset');
                                        }, 1500);
                                    }
                                }}
                                className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer"
                            >
                                <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-400">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-slate-600 truncate">{section.title || section.type}</div>
                                    <div className="text-[8px] text-slate-400 uppercase">{section.type}</div>
                                </div>
                                {section.assignedImage && (
                                    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                                        <img src={section.assignedImage} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {sections.length === 0 && (
                            <div className="text-center py-10 text-slate-300 text-[10px] font-bold">섹션이 없습니다</div>
                        )}
                    </div>
                )}
            </div>

            {/* BgRemove Modal Portal */}
            <BgRemoveModal
                isOpen={showBgModal}
                onClose={() => setShowBgModal(false)}
                onInsert={handleBgInsert}
            />
        </div>
    );
}
