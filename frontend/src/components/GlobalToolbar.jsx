import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    Copy, Trash2, Type, Image as ImageIcon, Plus, Layers,
    Scissors, Undo2, Redo2, Palette, Move,
    Square, Circle, Minus, FlipHorizontal, FlipVertical,
    Lock, Unlock, Eye, EyeOff, ArrowUp, ArrowDown,
    Maximize, Minimize, RotateCw, Crop, Pipette,
    Triangle, Frame, XCircle
} from 'lucide-react';

const FONTS = [
    { name: '── 한국어 ──', value: '_separator_kr', disabled: true },
    { name: 'Pretendard', value: 'Pretendard' },
    { name: 'Noto Sans KR', value: "'Noto Sans KR', sans-serif" },
    { name: '나눔명조', value: "'Nanum Myeongjo', serif" },
    { name: '나눔고딕', value: "'Nanum Gothic', sans-serif" },
    { name: '블랙한산스', value: "'Black Han Sans', sans-serif" },
    { name: 'Gothic A1', value: "'Gothic A1', sans-serif" },
    { name: '도현', value: "'Do Hyeon', sans-serif" },
    { name: '주아', value: "'Jua', sans-serif" },
    { name: '감자꽃', value: "'Gamja Flower', cursive" },
    { name: '개구', value: "'Gaegu', cursive" },
    { name: '하이멜로디', value: "'Hi Melody', cursive" },
    { name: '송명', value: "'Song Myung', serif" },
    { name: '풀스토리', value: "'Poor Story', cursive" },
    { name: '나눔펜스크립트', value: "'Nanum Pen Script', cursive" },
    { name: '고운돋움', value: "'Gowun Dodum', sans-serif" },
    { name: '고운바탕', value: "'Gowun Batang', serif" },
    { name: '── English ──', value: '_separator_en', disabled: true },
    { name: 'Inter', value: "'Inter', sans-serif" },
    { name: 'Roboto', value: "'Roboto', sans-serif" },
    { name: 'Montserrat', value: "'Montserrat', sans-serif" },
    { name: 'Playfair Display', value: "'Playfair Display', serif" },
    { name: 'Poppins', value: "'Poppins', sans-serif" },
    { name: 'Lato', value: "'Lato', sans-serif" },
    { name: 'Oswald', value: "'Oswald', sans-serif" },
    { name: 'Raleway', value: "'Raleway', sans-serif" },
    { name: 'Quicksand', value: "'Quicksand', sans-serif" },
    { name: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
    { name: 'Dancing Script', value: "'Dancing Script', cursive" },
    { name: 'Pacifico', value: "'Pacifico', cursive" },
];

const SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 128];

const ToolButton = ({ active, onClick, children, title, danger, disabled, className: extraClass }) => (
    <button
        onMouseDown={(e) => {
            // Prevent focus loss to keep text selection active
            e.preventDefault();
        }}
        onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(e);
        }}
        title={title}
        disabled={disabled}
        className={cn(
            "p-1.5 rounded-md transition-all duration-100 flex items-center justify-center min-w-[30px] h-[30px] select-none",
            active ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
            danger && "hover:bg-red-50 hover:text-red-500",
            disabled && "opacity-30 pointer-events-none",
            extraClass
        )}
    >
        {children}
    </button>
);

const Divider = () => <div className="w-px h-6 bg-slate-200 mx-0.5 flex-shrink-0" />;

const SliderPopup = ({ label, value, min, max, step, unit, onChange, children }) => (
    <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
            <span className="text-[10px] font-bold text-blue-600">{value}{unit}</span>
        </div>
        <input
            type="range" min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        {children}
    </div>
);

export default function GlobalToolbar({
    selectedElement,
    onStyleUpdate,
    onDuplicate,
    onDelete,
    onAddText,
    onAddShape,
    onAddFrame,
    onAddSection,
    onRemoveBg,
    onResetImagePos,
    onLayerUp,
    onLayerDown,
    onFlipH,
    onFlipV,
    onLockToggle,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    colorPalette,
    zoom,
    onZoomChange,
    onCrop,
    paintMode,
    onPaintModeToggle,
    pickedColor,
}) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
    const [showSpacingPanel, setShowSpacingPanel] = useState(false);
    const [showFontPicker, setShowFontPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [hexInput, setHexInput] = useState('');
    const [bgHexInput, setBgHexInput] = useState('');
    const [shapeHexInput, setShapeHexInput] = useState('');
    const [borderHexInput, setBorderHexInput] = useState('');
    const colorRef = useRef(null);
    const bgColorRef = useRef(null);

    const spacingRef = useRef(null);
    const spacingPanelRef = useRef(null);
    const lastRangeRef = useRef(null);

    const style = selectedElement?.style || {};
    const type = selectedElement?.type; // 'text' | 'image' | 'shape' | 'frame' | null
    const isLocked = selectedElement?.locked;

    // Track text selection continuously so we can restore it if clicking the toolbar loses focus
    useEffect(() => {
        const handleSelectionChange = () => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (!range.collapsed) {
                    let container = range.commonAncestorContainer;
                    if (container.nodeType === 3) container = container.parentNode;
                    if (container && container.closest && container.closest('[contenteditable="true"], [contentEditable="true"], [data-editing-field]')) {
                        lastRangeRef.current = range.cloneRange();
                    }
                }
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    // Helper: apply style only to selected text if editing, else update whole block
    const handleStyleUpdate = (property, value) => {
        let sel = window.getSelection();
        let rangeToUse = null;

        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            rangeToUse = sel.getRangeAt(0);
        } else if (lastRangeRef.current && !lastRangeRef.current.collapsed) {
            // Restore selection from memory if we lost it (e.g. clicked native color picker)
            rangeToUse = lastRangeRef.current;
            sel.removeAllRanges();
            sel.addRange(rangeToUse);
        }

        const hasSelection = !!rangeToUse;

        console.log('[handleStyleUpdate]', { property, value, hasSelection, type, rangeToUse });

        // Attempt inline rich text styling via execCommand if we have text selected
        if (hasSelection && type === 'text') {
            let container = rangeToUse.commonAncestorContainer;
            if (container.nodeType === 3) container = container.parentNode;
            const editorEl = container.closest('[contenteditable="true"], [contentEditable="true"], [data-editing-field]');

            console.log('[handleStyleUpdate] editorEl found:', !!editorEl, container);

            if (editorEl) {
                // Ensure focus is squarely on the element
                if (document.activeElement !== editorEl) {
                    editorEl.focus();
                }

                if (property === 'fontWeight') {
                    document.execCommand('bold', false, null);
                } else if (property === 'fontStyle') {
                    document.execCommand('italic', false, null);
                } else if (property === 'textDecoration') {
                    if (value === 'underline') document.execCommand('underline', false, null);
                    else if (value === 'line-through') document.execCommand('strikeThrough', false, null);
                    else {
                        document.execCommand('underline', false, null);
                        document.execCommand('strikeThrough', false, null);
                    }
                } else if (property === 'color') {
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand('foreColor', false, value);
                } else if (property === 'textBg' || property === 'backgroundColor') {
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand('hiliteColor', false, value === 'transparent' ? 'rgba(0,0,0,0)' : value);
                } else if (property === 'fontSize') {
                    document.execCommand('styleWithCSS', false, false);
                    document.execCommand('fontSize', false, '7');
                    // execCommand fontSize is limited to 1-7. Replace size=7 with actual px
                    const fonts = editorEl.querySelectorAll('font[size="7"]');
                    fonts.forEach(f => {
                        f.removeAttribute('size');
                        f.style.fontSize = `${value}px`;
                    });
                } else if (property === 'fontFamily') {
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand('fontName', false, value);
                } else if (property === 'align') {
                    // Alignment usually applies to the block, not inline text, but we can try
                    const cmd = value === 'text-center' ? 'justifyCenter' : value === 'text-right' ? 'justifyRight' : 'justifyLeft';
                    document.execCommand(cmd, false, null);
                }

                // Update local selection state so the toolbar icons reflect the active style,
                // but SKIP writing back to the React 'sections' state array to prevent React from 
                // tearing down the contentEditable DOM node and wiping the selected text highlight.
                return;
            }
        }

        // Fallback: Default to updating the whole element block style (triggers full React re-render)
        // This is necessary if no text is actively highlighted inside the element.
        onStyleUpdate(property, value, false);
    };

    // Close popups when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (colorRef.current && !colorRef.current.contains(e.target)) setShowColorPicker(false);
            if (bgColorRef.current && !bgColorRef.current.contains(e.target)) setShowBgColorPicker(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Helper: validate and normalize hex color
    const normalizeHex = (val) => {
        let hex = val.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : null;
    };

    return (
        <div
            className="global-toolbar fixed top-16 left-0 w-full bg-white/98 backdrop-blur-xl border-b border-slate-200 shadow-sm z-[9999] flex items-center px-3 h-11 gap-0.5"
            onMouseDown={() => {
                // Remove global preventDefault. Rely strictly on specific buttons handling their own mousedown
            }}
        >
            {/* ---- Undo / Redo ---- */}
            <ToolButton onClick={onUndo} disabled={!canUndo} title="되돌리기 (Ctrl+Z)">
                <Undo2 size={15} />
            </ToolButton>
            <ToolButton onClick={onRedo} disabled={!canRedo} title="다시하기 (Ctrl+Y)">
                <Redo2 size={15} />
            </ToolButton>

            <Divider />

            {/* ---- Add elements ---- */}
            <ToolButton title="텍스트 추가" onClick={onAddText}>
                <Type size={14} />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>
            <ToolButton title="도형 추가" onClick={() => onAddShape?.('rectangle')}>
                <Square size={14} />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>
            <ToolButton title="구분선 추가" onClick={() => onAddShape?.('line')}>
                <Minus size={14} />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>
            <ToolButton title="원형 프레임" onClick={() => onAddFrame?.('circle')}>
                <Circle size={14} />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>
            <ToolButton title="라운드 프레임" onClick={() => onAddFrame?.('rounded')}>
                <Square size={14} className="rounded" />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>
            <ToolButton title="아치 프레임" onClick={() => onAddFrame?.('arch')}>
                <div className="w-3.5 h-3.5 border-2 border-current rounded-t-full" />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>
            <ToolButton title="섹션 추가" onClick={onAddSection}>
                <Layers size={14} />
                <Plus size={9} className="-ml-0.5" />
            </ToolButton>

            <Divider />

            {/* ===================== TEXT TOOLS ===================== */}
            {type === 'text' && (
                <>
                    {/* Font Family Custom Dropdown */}
                    <div className="relative">
                        <div
                            onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(false); setShowBgColorPicker(false); setShowSizePicker(false); setShowFontPicker(!showFontPicker); }}
                            className="text-[11px] font-semibold bg-slate-50 px-2 py-1 flex items-center justify-between rounded-md border border-slate-200 outline-none cursor-pointer w-[140px] hover:border-slate-300 h-[30px] select-none"
                        >
                            <span style={{ fontFamily: style.fontFamily || 'Pretendard', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {FONTS.find(f => f.value === (style.fontFamily || 'Pretendard'))?.name || 'Pretendard'}
                            </span>
                        </div>
                        {showFontPicker && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-[100] w-[180px] max-h-64 overflow-y-auto animate-in fade-in py-1 custom-scrollbar block" onMouseDown={(e) => e.preventDefault()}>
                                {FONTS.map(f => (
                                    <div
                                        key={f.value}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            if (!f.disabled) {
                                                handleStyleUpdate('fontFamily', f.value);
                                                setShowFontPicker(false);
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-2 text-[12px] cursor-pointer hover:bg-slate-50 select-none",
                                            f.disabled ? "text-slate-400 font-bold bg-slate-50 cursor-default" : "text-slate-700",
                                            (style.fontFamily || 'Pretendard') === f.value && "bg-blue-50 text-blue-600 font-bold"
                                        )}
                                        style={!f.disabled ? { fontFamily: f.value } : {}}
                                    >
                                        {f.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Font Size Custom Dropdown */}
                    <div className="relative">
                        <div
                            onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(false); setShowBgColorPicker(false); setShowFontPicker(false); setShowSizePicker(!showSizePicker); }}
                            className="text-[11px] font-semibold bg-slate-50 px-2 py-1 flex items-center justify-center rounded-md border border-slate-200 outline-none cursor-pointer w-[60px] hover:border-slate-300 h-[30px] select-none text-center"
                        >
                            <span>{style.fontSize || 16}px</span>
                        </div>
                        {showSizePicker && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-[100] w-[80px] max-h-64 overflow-y-auto animate-in fade-in py-1 custom-scrollbar block" onMouseDown={(e) => e.preventDefault()}>
                                {SIZES.map(s => (
                                    <div
                                        key={s}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            handleStyleUpdate('fontSize', s);
                                            setShowSizePicker(false);
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 text-[12px] cursor-pointer hover:bg-slate-50 text-center select-none text-slate-700",
                                            (style.fontSize || 16) === s && "bg-blue-50 text-blue-600 font-bold"
                                        )}
                                    >
                                        {s}px
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Divider />

                    {/* Bold / Italic / Underline / Strikethrough */}
                    <ToolButton
                        active={style.fontWeight >= 700}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleStyleUpdate('fontWeight', style.fontWeight >= 700 ? 400 : 800)}
                        title="굵게 (B)"
                    ><Bold size={15} /></ToolButton>

                    <ToolButton
                        active={style.fontStyle === 'italic'}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleStyleUpdate('fontStyle', style.fontStyle === 'italic' ? 'normal' : 'italic')}
                        title="기울임 (I)"
                    ><Italic size={15} /></ToolButton>

                    <ToolButton
                        active={style.textDecoration === 'underline'}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleStyleUpdate('textDecoration', style.textDecoration === 'underline' ? 'none' : 'underline')}
                        title="밑줄 (U)"
                    ><Underline size={15} /></ToolButton>

                    <ToolButton
                        active={style.textDecoration === 'line-through'}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleStyleUpdate('textDecoration', style.textDecoration === 'line-through' ? 'none' : 'line-through')}
                        title="취소선"
                    ><Strikethrough size={15} /></ToolButton>

                    <Divider />

                    {/* Alignment */}
                    <ToolButton active={!style.align || style.align === 'text-left'} onClick={() => handleStyleUpdate('align', 'text-left')} title="왼쪽 정렬">
                        <AlignLeft size={15} />
                    </ToolButton>
                    <ToolButton active={style.align === 'text-center'} onClick={() => handleStyleUpdate('align', 'text-center')} title="가운데 정렬">
                        <AlignCenter size={15} />
                    </ToolButton>
                    <ToolButton active={style.align === 'text-right'} onClick={() => handleStyleUpdate('align', 'text-right')} title="오른쪽 정렬">
                        <AlignRight size={15} />
                    </ToolButton>

                    <Divider />

                    {/* Text Color */}
                    <div className="relative" ref={colorRef}>
                        <ToolButton
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); setShowSpacingPanel(false); }}
                            title="글자 색상"
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black leading-none">A</span>
                                <div className="w-4 h-1 rounded-full mt-0.5" style={{ backgroundColor: style.color || '#000' }} />
                            </div>
                        </ToolButton>
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] w-52 animate-in fade-in slide-in-from-top-1 duration-150" onMouseDown={(e) => e.preventDefault()}>
                                {colorPalette && (colorPalette.primary || colorPalette.secondary || colorPalette.accent) && (
                                    <div className="mb-3 pb-2 border-b border-slate-100">
                                        <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest block mb-1.5">AI Palette</span>
                                        <div className="flex gap-1.5">
                                            {[colorPalette.primary, colorPalette.secondary, colorPalette.accent].filter(Boolean).map((c, i) => (
                                                <button key={i} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleStyleUpdate('color', c); setShowColorPicker(false); }} className="w-7 h-7 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-1 flex-wrap mb-2">
                                    {['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                                        '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
                                        '#ec4899', '#14b8a6', '#6366f1', '#a855f7', '#f43f5e', '#0ea5e9'].map(c => (
                                            <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleStyleUpdate('color', c); setShowColorPicker(false); }}
                                                className="w-5 h-5 rounded border border-slate-200 hover:scale-125 transition-transform"
                                                style={{ backgroundColor: c }} />
                                        ))}
                                </div>
                                <input type="color" value={style.color || '#000000'} onChange={(e) => handleStyleUpdate('color', e.target.value)}
                                    className="w-full h-7 cursor-pointer rounded overflow-hidden border-0" />
                                <div className="flex items-center gap-1.5 mt-2" onMouseDown={(e) => e.preventDefault()}>
                                    <span className="text-[9px] font-bold text-slate-400">#</span>
                                    <input
                                        type="text"
                                        placeholder="ff0000"
                                        value={hexInput}
                                        onChange={(e) => setHexInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const valid = normalizeHex(hexInput);
                                                if (valid) { handleStyleUpdate('color', valid); setShowColorPicker(false); setHexInput(''); }
                                            }
                                        }}
                                        className="flex-1 text-[11px] font-mono px-2 py-1 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-200 bg-slate-50"
                                    />
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            const valid = normalizeHex(hexInput);
                                            if (valid) { handleStyleUpdate('color', valid); setShowColorPicker(false); setHexInput(''); }
                                        }}
                                        className="text-[9px] font-bold bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                                    >적용</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Text Background Color */}
                    <div className="relative" ref={bgColorRef}>
                        <ToolButton onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); setShowSpacingPanel(false); }} title="글자 배경색">
                            <div className="flex flex-col items-center">
                                <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center text-[8px] font-black"
                                    style={{ backgroundColor: style.textBg || 'transparent' }}>
                                    bg
                                </div>
                            </div>
                        </ToolButton>
                        {showBgColorPicker && (
                            <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] w-48 animate-in fade-in slide-in-from-top-1 duration-150" onMouseDown={(e) => e.preventDefault()}>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { handleStyleUpdate('textBg', 'transparent'); setShowBgColorPicker(false); }}
                                    className="w-full text-[10px] font-bold text-slate-500 py-1 mb-2 bg-slate-50 rounded hover:bg-slate-100">없음</button>
                                <div className="flex gap-1 flex-wrap mb-2">
                                    {['#fef3c7', '#fce7f3', '#dbeafe', '#dcfce7', '#f3e8ff', '#fee2e2', '#e0f2fe', '#fef9c3'].map(c => (
                                        <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleStyleUpdate('textBg', c); setShowBgColorPicker(false); }}
                                            className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                                <input type="color" value={style.textBg || '#ffffff'} onChange={(e) => handleStyleUpdate('textBg', e.target.value)}
                                    className="w-full h-7 cursor-pointer rounded overflow-hidden border-0" />
                                <div className="flex items-center gap-1.5 mt-2" onMouseDown={(e) => e.preventDefault()}>
                                    <span className="text-[9px] font-bold text-slate-400">#</span>
                                    <input
                                        type="text"
                                        placeholder="fef3c7"
                                        value={bgHexInput}
                                        onChange={(e) => setBgHexInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const valid = normalizeHex(bgHexInput);
                                                if (valid) { handleStyleUpdate('textBg', valid); setShowBgColorPicker(false); setBgHexInput(''); }
                                            }
                                        }}
                                        className="flex-1 text-[11px] font-mono px-2 py-1 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-200 bg-slate-50"
                                    />
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            const valid = normalizeHex(bgHexInput);
                                            if (valid) { handleStyleUpdate('textBg', valid); setShowBgColorPicker(false); setBgHexInput(''); }
                                        }}
                                        className="text-[9px] font-bold bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                                    >적용</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Divider />

                    {/* Letter Spacing + Line Height */}
                    <div className="relative">
                        <ToolButton onClick={() => { setShowSpacingPanel(!showSpacingPanel); setShowColorPicker(false); setShowBgColorPicker(false); }} title="자간/줄 간격">
                            <span className="text-[9px] font-black tracking-widest">A⇔A</span>
                        </ToolButton>
                        {showSpacingPanel && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] w-52 animate-in fade-in slide-in-from-top-1 duration-150">
                                <SliderPopup label="자간 (Letter Spacing)" value={style.letterSpacing || 0} min={-5} max={20} step={0.5} unit="px"
                                    onChange={(v) => handleStyleUpdate('letterSpacing', v)} />
                                <div className="border-t border-slate-100" />
                                <SliderPopup label="어간 (Word Spacing)" value={style.wordSpacing || 0} min={-10} max={30} step={0.5} unit="px"
                                    onChange={(v) => handleStyleUpdate('wordSpacing', v)} />
                                <div className="border-t border-slate-100" />
                                <SliderPopup label="줄 간격 (Line Height)" value={style.lineHeight || 1.4} min={0.8} max={3} step={0.1} unit=""
                                    onChange={(v) => handleStyleUpdate('lineHeight', v)} />
                                <div className="border-t border-slate-100" />
                                <SliderPopup label="투명도 (Opacity)" value={Math.round((style.opacity ?? 1) * 100)} min={0} max={100} step={5} unit="%"
                                    onChange={(v) => handleStyleUpdate('opacity', v / 100)} />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ===================== IMAGE / SHAPE / FRAME TOOLS ===================== */}
            {(type === 'image' || type === 'shape' || type === 'frame') && (
                <>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                        {type === 'shape' ? <><Triangle className="w-3 h-3" /> 도형</> : type === 'frame' ? <><Frame className="w-3 h-3" /> 프레임</> : <><ImageIcon className="w-3 h-3" /> 이미지</>}
                    </span>
                    {type === 'shape' && (
                        <>
                            <Divider />
                            <div className="relative" ref={bgColorRef}>
                                <ToolButton onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); setShowSpacingPanel(false); }} title="도형 색상">
                                    <div className="flex flex-col items-center">
                                        <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center text-[8px] font-black"
                                            style={{ backgroundColor: style.backgroundColor || 'transparent' }}>
                                        </div>
                                    </div>
                                </ToolButton>
                                {showBgColorPicker && (
                                    <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] w-52 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <button onClick={() => { handleStyleUpdate('backgroundColor', 'transparent'); setShowBgColorPicker(false); }}
                                            className="w-full text-[10px] font-bold text-slate-500 py-1.5 mb-2 bg-slate-50 rounded hover:bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> 채우기 없음 (투명)</button>
                                        <div className="flex gap-1 flex-wrap mb-2">
                                            {['#000000', '#333333', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#cbd5e1', '#e2e8f0'].map(c => (
                                                <button key={c} onClick={() => { handleStyleUpdate('backgroundColor', c); setShowBgColorPicker(false); }}
                                                    className="w-5 h-5 rounded border border-slate-200 hover:scale-125 transition-transform"
                                                    style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <input type="color" value={style.backgroundColor || '#000000'} onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
                                            className="w-full h-7 cursor-pointer rounded overflow-hidden border-0" />
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[9px] font-bold text-slate-400">#</span>
                                            <input
                                                type="text"
                                                placeholder="e2e8f0"
                                                value={shapeHexInput}
                                                onChange={(e) => setShapeHexInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const valid = normalizeHex(shapeHexInput);
                                                        if (valid) { handleStyleUpdate('backgroundColor', valid); setShowBgColorPicker(false); setShapeHexInput(''); }
                                                    }
                                                }}
                                                className="flex-1 text-[11px] font-mono px-2 py-1 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-200 bg-slate-50"
                                            />
                                            <button
                                                onClick={() => {
                                                    const valid = normalizeHex(shapeHexInput);
                                                    if (valid) { handleStyleUpdate('backgroundColor', valid); setShowBgColorPicker(false); setShapeHexInput(''); }
                                                }}
                                                className="text-[9px] font-bold bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                                            >적용</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Border Controls for shapes */}
                    {type === 'shape' && (
                        <>
                            <Divider />
                            <div className="relative">
                                <ToolButton onClick={() => { setShowBorderColorPicker(!showBorderColorPicker); setShowBgColorPicker(false); setShowColorPicker(false); }} title="테두리">
                                    <div className="flex flex-col items-center">
                                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center text-[6px] font-black"
                                            style={{ borderColor: style.borderColor || '#94a3b8', backgroundColor: 'transparent' }}>
                                        </div>
                                    </div>
                                </ToolButton>
                                {showBorderColorPicker && (
                                    <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] w-56 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">테두리 색상</div>
                                        <button onClick={() => { handleStyleUpdate('borderColor', 'transparent'); handleStyleUpdate('borderWidth', 0); setShowBorderColorPicker(false); }}
                                            className="w-full text-[10px] font-bold text-slate-500 py-1.5 mb-2 bg-slate-50 rounded hover:bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> 테두리 없음</button>
                                        <div className="flex gap-1 flex-wrap mb-2">
                                            {['#000000', '#333333', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#cbd5e1', '#ffffff'].map(c => (
                                                <button key={c} onClick={() => { handleStyleUpdate('borderColor', c); if (!style.borderWidth) handleStyleUpdate('borderWidth', 2); }}
                                                    className="w-5 h-5 rounded border border-slate-200 hover:scale-125 transition-transform"
                                                    style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <input type="color" value={style.borderColor || '#94a3b8'} onChange={(e) => { handleStyleUpdate('borderColor', e.target.value); if (!style.borderWidth) handleStyleUpdate('borderWidth', 2); }}
                                            className="w-full h-7 cursor-pointer rounded overflow-hidden border-0" />
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[9px] font-bold text-slate-400">#</span>
                                            <input type="text" placeholder="94a3b8" value={borderHexInput}
                                                onChange={(e) => setBorderHexInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const valid = normalizeHex(borderHexInput);
                                                        if (valid) { handleStyleUpdate('borderColor', valid); if (!style.borderWidth) handleStyleUpdate('borderWidth', 2); setShowBorderColorPicker(false); setBorderHexInput(''); }
                                                    }
                                                }}
                                                className="flex-1 text-[11px] font-mono px-2 py-1 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-200 bg-slate-50"
                                            />
                                        </div>
                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">테두리 굵기</div>
                                            <input type="range" min={0} max={10} step={1}
                                                value={style.borderWidth || 0}
                                                onChange={(e) => { handleStyleUpdate('borderWidth', parseInt(e.target.value)); if (!style.borderColor || style.borderColor === 'transparent') handleStyleUpdate('borderColor', '#94a3b8'); }}
                                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                            <div className="text-[10px] font-bold text-blue-600 text-right">{style.borderWidth || 0}px</div>
                                        </div>
                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">테두리 스타일</div>
                                            <div className="flex gap-1">
                                                {[{ v: 'solid', l: '실선' }, { v: 'dashed', l: '점선' }, { v: 'dotted', l: '도트' }].map(bs => (
                                                    <button key={bs.v}
                                                        onClick={() => { handleStyleUpdate('borderStyle', bs.v); if (!style.borderWidth) handleStyleUpdate('borderWidth', 2); if (!style.borderColor || style.borderColor === 'transparent') handleStyleUpdate('borderColor', '#94a3b8'); }}
                                                        className={cn('flex-1 text-[9px] font-bold py-1 rounded border', (style.borderStyle || 'solid') === bs.v ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500')}
                                                    >{bs.l}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">모서리 둥글기</div>
                                            <input type="range" min={0} max={50} step={1}
                                                value={parseInt(style.borderRadius) || 0}
                                                onChange={(e) => handleStyleUpdate('borderRadius', `${e.target.value}%`)}
                                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                            <div className="text-[10px] font-bold text-blue-600 text-right">{parseInt(style.borderRadius) || 0}%</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <Divider />

                    {/* Object Fit Toggle */}
                    {type === 'image' && (
                        <ToolButton onClick={onResetImagePos} title="이미지 위치 리셋">
                            <Maximize size={14} />
                            <span className="text-[9px] font-bold ml-0.5">리셋</span>
                        </ToolButton>
                    )}

                    {/* Flip */}
                    {type === 'image' && (
                        <>
                            <ToolButton onClick={onFlipH} title="좌우 반전">
                                <FlipHorizontal size={15} />
                            </ToolButton>
                            <ToolButton onClick={onFlipV} title="상하 반전">
                                <FlipVertical size={15} />
                            </ToolButton>
                        </>
                    )}

                    {/* Crop */}
                    {type === 'image' && onCrop && (
                        <ToolButton onClick={onCrop} title="이미지 자르기">
                            <Crop size={15} />
                            <span className="text-[9px] font-bold ml-0.5">자르기</span>
                        </ToolButton>
                    )}

                    <Divider />

                    {/* Layer up/down */}
                    <ToolButton onClick={onLayerUp} title="앞으로">
                        <ArrowUp size={15} />
                    </ToolButton>
                    <ToolButton onClick={onLayerDown} title="뒤로">
                        <ArrowDown size={15} />
                    </ToolButton>

                    <Divider />

                    {/* Opacity slider inline */}
                    <div className="flex items-center gap-1 px-1">
                        <Eye size={12} className="text-slate-400" />
                        <input type="range" min={0} max={100} step={5}
                            value={Math.round((style.opacity ?? 1) * 100)}
                            onChange={(e) => handleStyleUpdate('opacity', parseInt(e.target.value) / 100)}
                            className="w-16 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        <span className="text-[9px] font-bold text-slate-500 w-7">{Math.round((style.opacity ?? 1) * 100)}%</span>
                    </div>

                    {/* Blur slider inline */}
                    {type === 'image' && (
                        <div className="flex items-center gap-1 px-1">
                            <span className="text-[9px] font-bold text-slate-400">B</span>
                            <input type="range" min={0} max={20} step={1}
                                value={style.blur || 0}
                                onChange={(e) => handleStyleUpdate('blur', parseInt(e.target.value))}
                                className="w-14 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                            <span className="text-[9px] font-bold text-slate-500 w-6">{style.blur || 0}px</span>
                        </div>
                    )}

                    <Divider />

                    {/* Remove Background */}
                    {onRemoveBg && (
                        <ToolButton onClick={onRemoveBg} title="배경 제거 (누끼따기)" className="bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700">
                            <Scissors size={14} />
                            <span className="text-[9px] font-bold ml-0.5">누끼</span>
                        </ToolButton>
                    )}
                </>
            )}

            {/* ---- No selection hint ---- */}
            {!type && (
                <span className="text-[11px] text-slate-400 font-medium px-2">요소를 클릭하면 편집 도구가 나타납니다</span>
            )}

            {/* ---- Paint / Eyedropper Tool ---- */}
            <div className="flex items-center gap-0.5 ml-1">
                <Divider />
                <ToolButton
                    active={paintMode === 'pick'}
                    onClick={onPaintModeToggle}
                    title="스포이드 (색상 추출)"
                    className={paintMode === 'pick' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400' : ''}
                >
                    <Pipette size={15} />
                </ToolButton>
                {pickedColor && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded-md border border-slate-200">
                        <div className="w-4 h-4 rounded-sm border border-slate-300" style={{ backgroundColor: pickedColor }} />
                        <span className="text-[9px] font-mono font-bold text-slate-600">{pickedColor}</span>
                    </div>
                )}
            </div>

            {/* ---- Right-side actions ---- */}
            <div className="ml-auto flex items-center gap-0.5">
                {/* Zoom */}
                {zoom !== undefined && (
                    <div className="flex items-center gap-1 mr-2">
                        <ToolButton onClick={() => onZoomChange?.(Math.max(25, (zoom || 100) - 25))} title="축소">
                            <Minimize size={13} />
                        </ToolButton>
                        <span className="text-[10px] font-bold text-slate-500 w-8 text-center">{zoom || 100}%</span>
                        <ToolButton onClick={() => onZoomChange?.(Math.min(200, (zoom || 100) + 25))} title="확대">
                            <Maximize size={13} />
                        </ToolButton>
                    </div>
                )}

                <Divider />

                {selectedElement && (
                    <>
                        <ToolButton onClick={onLockToggle} title={isLocked ? "잠금 해제" : "잠금"}>
                            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </ToolButton>
                        <ToolButton onClick={onDuplicate} title="복제 (Ctrl+D)">
                            <Copy size={14} />
                        </ToolButton>
                        <ToolButton onClick={onDelete} title="삭제 (Delete)" danger>
                            <Trash2 size={14} />
                        </ToolButton>
                    </>
                )}
            </div>
        </div>
    );
}
