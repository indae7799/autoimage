import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Image as ImageIcon, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Static Image-Optimized SectionBlock ---
// DESIGN GOAL: Look like a contiguous Photoshop-exported JPEG.
// NO: Hover effects, animations, cursors, shadows, rounded corners, gaps.
// YES: Full bleed, high contrast, static text, seamless stacking.


// Helper: Determine text color based on background color brightness
const getContrastYIQ = (hexcolor) => {
    if (!hexcolor) return '#1a2e22'; // Default dark text
    if (hexcolor.toLowerCase() === 'transparent') return '#1a2e22';

    // If it's a gradient, just return white text by default for premium feel (simplified)
    if (hexcolor.includes('gradient')) return '#ffffff';

    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(c => c + c).join('');
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 150) ? '#1a2e22' : '#ffffff';
};



// Helper: Editable Text (PPT-Style with Resize, Delete, Text Shadow)
const EditableText = ({ section, field, placeholder, align = 'text-left', onUpdate, setGuides, onElementSelect, selectedElement }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [pos, setPos] = useState(section[`${field}Pos`] || { x: 0, y: 0 });
    const [boxWidth, setBoxWidth] = useState(section[`${field}Size`]?.w || null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDir, setResizeDir] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, w: 0, posX: 0 });
    const containerRef = useRef(null);
    const contentEditableRef = useRef(null);
    const lastHtmlRef = useRef(section[field] || "");

    useEffect(() => {
        if (!isEditing) {
            lastHtmlRef.current = section[field] || '';
            // If the element is registered, sync changes so it doesn't stay stale visibly
            if (contentEditableRef.current && contentEditableRef.current.innerHTML !== lastHtmlRef.current) {
                contentEditableRef.current.innerHTML = lastHtmlRef.current.replace(/\n/g, '<br>');
            }
        }
    }, [section[field], isEditing]);

    const style = section[`${field}Style`] || {};
    const fontSize = style.fontSize || (field.includes('title') || field.includes('Title') ? 32 : 16);
    const fontWeight = style.fontWeight || 400;
    const currentAlign = style.align || align;
    const color = style.color || 'inherit';
    const fontFamily = style.fontFamily || 'Pretendard';

    const autoTextShadow = style.textShadow || 'inherit';

    const handleBlur = (e) => {
        // If the user clicked something in the global toolbar, don't exit edit mode
        if (e.relatedTarget && e.relatedTarget.closest('.global-toolbar')) {
            return;
        }
        setIsEditing(false);
        const html = e.currentTarget.innerHTML;
        lastHtmlRef.current = html;
        onUpdate(section.id, field, html);
    };

    const handleSelect = (e) => {
        e?.stopPropagation();

        // If we are editing and have text selected, do not trigger a parent state update, 
        // because React re-rendering will tear down the DOM and clear the selection.
        if (isEditing) {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) return;
        }

        onElementSelect?.(section.id, field, 'text', { ...style, fontSize, fontWeight, align: currentAlign, color, fontFamily });
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onUpdate(section.id, `_DELETE_ELEMENT_${field}`, true);
    };

    // Drag
    const onMouseDown = (e) => {
        if (isEditing || isResizing) return;
        if (e.target.closest('.resize-handle') || e.target.closest('.delete-btn')) return;
        if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
        }
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    };

    useEffect(() => {
        if (!isDragging) return;
        const onMouseMove = (e) => {
            const newPos = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
            setPos(newPos);
            if (containerRef.current && setGuides) {
                const parent = containerRef.current.closest('[data-section-type]');
                if (parent) {
                    const pr = parent.getBoundingClientRect();
                    const er = containerRef.current.getBoundingClientRect();
                    // Vertical center guide (section center)
                    const showCenterV = Math.abs((er.left + er.width / 2 - pr.left) - pr.width / 2) < 6;
                    // Dynamic horizontal guides: compare with other elements
                    const hLines = [];
                    const myTop = er.top - pr.top;
                    const myCenter = myTop + er.height / 2;
                    const myBottom = myTop + er.height;
                    const others = parent.querySelectorAll('[data-draggable-element]');
                    others.forEach(other => {
                        if (other === containerRef.current) return;
                        const or2 = other.getBoundingClientRect();
                        const oTop = or2.top - pr.top;
                        const oCenter = oTop + or2.height / 2;
                        const oBottom = oTop + or2.height;
                        // Check top-top, center-center, bottom-bottom alignments
                        if (Math.abs(myTop - oTop) < 5) hLines.push({ y: oTop });
                        if (Math.abs(myCenter - oCenter) < 5) hLines.push({ y: oCenter });
                        if (Math.abs(myBottom - oBottom) < 5) hLines.push({ y: oBottom });
                        // Also check cross alignments: top-bottom, bottom-top
                        if (Math.abs(myTop - oBottom) < 5) hLines.push({ y: oBottom });
                        if (Math.abs(myBottom - oTop) < 5) hLines.push({ y: oTop });
                    });
                    // Also check section center horizontal
                    if (Math.abs(myCenter - pr.height / 2) < 6) hLines.push({ y: pr.height / 2 });
                    setGuides({ showCenterV, hLines });
                }
            }
        };
        const onMouseUp = () => {
            setIsDragging(false);
            onUpdate(section.id, `${field}Pos`, pos);
            setGuides?.({ showCenterV: false, hLines: [] });
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    }, [isDragging, dragStart, pos, onUpdate, section.id, setGuides, field]);

    // Resize
    const onResizeStart = (e, dir) => {
        e.preventDefault(); e.stopPropagation();
        setIsResizing(true); setResizeDir(dir);
        const w = containerRef.current?.offsetWidth || 200;
        setResizeStart({ x: e.clientX, w, posX: pos.x });
    };

    useEffect(() => {
        if (!isResizing) return;
        const onMouseMove = (e) => {
            const dx = e.clientX - resizeStart.x;
            if (resizeDir === 'right') {
                setBoxWidth(Math.max(60, resizeStart.w + dx));
            } else if (resizeDir === 'left') {
                const nw = Math.max(60, resizeStart.w - dx);
                setBoxWidth(nw);
                setPos(p => ({ ...p, x: resizeStart.posX + (resizeStart.w - nw) }));
            }
        };
        const onMouseUp = () => {
            setIsResizing(false); setResizeDir(null);
            onUpdate(section.id, `${field}Size`, { w: boxWidth });
            onUpdate(section.id, `${field}Pos`, pos);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    }, [isResizing, resizeStart, resizeDir, boxWidth, pos, onUpdate, section.id, field]);

    const isSelected = selectedElement?.sectionId === section.id && selectedElement?.elementId === field;

    // Deletion check
    if (section[`_DELETE_ELEMENT_${field}`]) return null;

    const commonStyle = {
        fontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        textAlign: currentAlign.replace('text-', ''),
        lineHeight: style.lineHeight || 1.4,
        letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : 'normal',
        wordSpacing: style.wordSpacing ? `${style.wordSpacing}px` : 'normal',
        textDecoration: style.textDecoration || 'none',
        fontStyle: style.fontStyle || 'normal',
        opacity: style.opacity ?? 1,
        background: style.background || style.textBg || 'transparent',
        boxShadow: style.boxShadow || 'none',
        border: style.border || 'none',
        borderRadius: style.borderRadius || '0',
        padding: style.padding || undefined,
        textShadow: autoTextShadow,
        width: '100%',
        outline: 'none',
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
        setTimeout(() => {
            if (contentEditableRef.current) {
                contentEditableRef.current.focus();
                // Select node contents to move cursor nicely
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(contentEditableRef.current);
                range.collapse(false); // Move to end
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 0);
    };

    // Replace \n with <br> for HTML rendering.
    const renderHtml = (section[field] || '').replace(/\n/g, '<br>');

    return (
        <div
            ref={containerRef}
            data-element-id={field}
            data-draggable-element="true"
            className={cn("group/text", !isEditing && !isResizing && "cursor-move", (isDragging || isResizing) && "z-[100]")}
            style={{
                position: field.startsWith('custom-text') ? 'absolute' : 'relative',
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: boxWidth ? `${boxWidth}px` : 'auto',
                minWidth: '60px',
                zIndex: style.zIndex || (field.startsWith('custom-text') ? 20 : 1),
            }}
            onMouseDown={onMouseDown}
            onClick={handleSelect}
            onDoubleClick={handleDoubleClick}
        >
            {/* Selection border */}
            <div className={cn("absolute inset-[-4px] border-2 rounded pointer-events-none transition-opacity",
                (isSelected || isEditing) ? "border-blue-500 opacity-100" : "border-transparent group-hover/text:border-blue-300 group-hover/text:opacity-100 opacity-0"
            )} />
            {/* Left resize handle */}
            <div className={cn("resize-handle absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-8 bg-blue-500 rounded-full cursor-ew-resize hover:scale-110 transition-transform",
                (isSelected) ? "opacity-100" : "opacity-0 group-hover/text:opacity-60")}
                style={{ pointerEvents: 'auto' }} onMouseDown={(e) => onResizeStart(e, 'left')} />
            {/* Right resize handle */}
            <div className={cn("resize-handle absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-8 bg-blue-500 rounded-full cursor-ew-resize hover:scale-110 transition-transform",
                (isSelected) ? "opacity-100" : "opacity-0 group-hover/text:opacity-60")}
                style={{ pointerEvents: 'auto' }} onMouseDown={(e) => onResizeStart(e, 'right')} />
            {/* Delete button */}
            <button className={cn("delete-btn absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md z-50",
                (isSelected) ? "opacity-100" : "opacity-0 group-hover/text:opacity-80")}
                style={{ pointerEvents: 'auto' }} onClick={handleDelete} title="삭제">✕</button>

            {/* Core Text Rendering Area (Single Component) */}
            <div
                ref={contentEditableRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                onBlur={handleBlur}
                style={{ ...commonStyle, resize: 'none', overflow: 'hidden', minHeight: '1.4em', cursor: isEditing ? 'text' : 'inherit' }}
                className={cn("whitespace-pre-wrap p-1 outline-none", isEditing && "bg-white/80 backdrop-blur rounded-sm ring-2 ring-blue-400")}
                data-editing-field={field}
                dangerouslySetInnerHTML={{ __html: renderHtml }}
            />
            {/* Placeholder visualization (Only show if empty and not editing) */}
            {!(section[field]) && !isEditing && (
                <div className="absolute inset-0 pointer-events-none p-1 flex items-center" style={{ justifyContent: currentAlign.replace('text-', 'flex-') }}>
                    <span className="opacity-30 italic" style={{ fontSize: `${fontSize}px`, fontFamily }}>{placeholder}</span>
                </div>
            )}
        </div>
    );
};


// Helper: Frame Image Content (Pan/Zoom within frame)
const FrameImageContent = ({ section, field, elOpts, currentStyles, onUpdate }) => {
    const frameSrc = section[`${field}FrameSrc`] || elOpts.frameSrc;
    const [imgTransform, setImgTransform] = useState(section[`${field}ImgTransform`] || { x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const imgTransformRef = useRef(imgTransform);
    useEffect(() => { imgTransformRef.current = imgTransform; }, [imgTransform]);

    const { setNodeRef: setFrameDropRef, isOver: isFrameOver } = useDroppable({
        id: `${section.id}__${field}-frame-drop`,
    });

    const handlePanStart = (e) => {
        if (!frameSrc) return;
        // Only pan when Alt key is held - otherwise let parent drag
        if (!e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        setIsPanning(true);
        setPanStart({ x: e.clientX - imgTransform.x, y: e.clientY - imgTransform.y });
    };

    useEffect(() => {
        if (!isPanning) return;
        const onMove = (e) => {
            setImgTransform(prev => ({
                ...prev,
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            }));
        };
        const onUp = () => {
            setIsPanning(false);
            onUpdate(section.id, `${field}ImgTransform`, imgTransformRef.current);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isPanning, panStart]);

    // Non-passive wheel handler to prevent page scroll
    const frameContainerRef = useRef(null);
    useEffect(() => {
        const el = frameContainerRef.current;
        if (!el || !frameSrc) return;
        const handler = (e) => {
            if (!e.altKey) return; // Only zoom when Alt is held
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setImgTransform(prev => {
                const newScale = Math.max(0.3, Math.min(5, prev.scale + delta));
                const newT = { ...prev, scale: newScale };
                onUpdate(section.id, `${field}ImgTransform`, newT);
                return newT;
            });
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [frameSrc, section.id, field]);

    if (!frameSrc) {
        return (
            <div
                ref={setFrameDropRef}
                className={cn(
                    "w-full h-full flex flex-col items-center justify-center transition-all",
                    isFrameOver && "ring-4 ring-blue-500 ring-inset bg-blue-50/80"
                )}
                style={{
                    backgroundColor: currentStyles.backgroundColor || '#f1f5f9',
                    borderRadius: currentStyles.borderRadius || '0',
                    border: currentStyles.border || '2px dashed #94a3b8',
                    pointerEvents: 'auto',
                }}
            >
                <ImageIcon size={28} className="mb-1.5 opacity-20" />
                <span className="text-[9px] font-bold opacity-30 uppercase">이미지 드래그</span>
            </div>
        );
    }

    return (
        <div
            ref={(node) => { setFrameDropRef(node); frameContainerRef.current = node; }}
            className={cn(
                "w-full h-full overflow-hidden relative cursor-move",
                isPanning && "cursor-grabbing",
                isFrameOver && "ring-4 ring-blue-500 ring-inset",
            )}
            style={{
                borderRadius: currentStyles.borderRadius || '0',
                pointerEvents: 'auto', // Ensure pointer events can reach children
            }}
            onMouseDown={handlePanStart}
        >
            <img
                src={frameSrc}
                className="absolute pointer-events-none select-none"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transformOrigin: 'center center',
                    transform: `translate(${imgTransform.x}px, ${imgTransform.y}px) scale(${imgTransform.scale})`,
                }}
                draggable={false}
            />
            <div data-html2canvas-ignore className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-full opacity-0 group-hover/resizable:opacity-100 transition-opacity pointer-events-none">
                {Math.round(imgTransform.scale * 100)}% · Alt+드래그: 이미지 이동 · Alt+스크롤: 확대/축소
            </div>
            {/* Remove image button - visible on hover for FrameImageContent */}
            <button
                data-html2canvas-ignore
                onPointerDown={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    console.log("Delete Frame Image");
                    onUpdate(section.id, `${field}FrameSrc`, null);
                    onUpdate(section.id, `${field}ImgTransform`, { x: 0, y: 0, scale: 1 });
                }}
                onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    console.log("Delete Frame Image");
                    onUpdate(section.id, `${field}FrameSrc`, null);
                    onUpdate(section.id, `${field}ImgTransform`, { x: 0, y: 0, scale: 1 });
                }}
                onTouchStart={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    console.log("Delete Frame Image");
                    onUpdate(section.id, `${field}FrameSrc`, null);
                    onUpdate(section.id, `${field}ImgTransform`, { x: 0, y: 0, scale: 1 });
                }}
                style={{ pointerEvents: 'auto', zIndex: 999999 }}
                className="absolute bottom-3 right-3 bg-white/95 backdrop-blur shadow-xl border border-red-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 opacity-0 group-hover/resizable:opacity-100"
            >
                <span>✕</span> 이미지 삭제
            </button>
        </div>
    );
};

// Helper: Resizable Draggable Image (True Freedom)
const ResizableImage = ({ section, field, elOpts, onUpdate, setGuides, onElementSelect, selectedElement }) => {
    const { src, width: initialWidth, height: initialHeight, frameType = 'rectangle', isShape } = elOpts;
    const [pos, setPos] = useState(section[`${field}Pos`] || { x: 0, y: 0 });
    const [size, setSize] = useState(section[`${field}Size`] || { w: initialWidth || 200, h: initialHeight || 200 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeInitial, setResizeInitial] = useState({ w: 200, h: 200, mouseX: 0, mouseY: 0 });
    const containerRef = useRef(null);
    const [styles] = useState(section[`${field}Style`] || {});

    useEffect(() => {
        // Values are initialized by useState on mount.
    }, [section[`${field}Pos`], section[`${field}Size`], section[`${field}Style`]]);

    // Drag Handlers
    const onMouseDown = (e) => {
        if (e.target.closest('.resize-handle-dir')) return;
        if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
        }
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
        if (onElementSelect) {
            onElementSelect(section.id, field, isShape ? 'shape' : 'image', styles);
        }
    };

    const onResizeStart = (e, dir = 'se') => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        // Store initial size, position, mouse position and direction for absolute calculation
        setResizeInitial({ w: size.w, h: size.h, mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y, dir });
    };

    const posRef = useRef(pos);
    const sizeRef = useRef(size);
    const resizeInitialRef = useRef(resizeInitial);
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { sizeRef.current = size; }, [size]);
    useEffect(() => { resizeInitialRef.current = resizeInitial; }, [resizeInitial]);

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const onMouseMove = (e) => {
            if (isDragging) {
                let nx = e.clientX - dragStart.x;
                let ny = e.clientY - dragStart.y;
                setPos({ x: nx, y: ny });
                // Calculate guide snapping relative to other elements
                if (containerRef.current && setGuides) {
                    const parent = containerRef.current.closest('[data-section-type]');
                    if (parent) {
                        const pr = parent.getBoundingClientRect();
                        const er = containerRef.current.getBoundingClientRect();
                        const showCenterV = Math.abs((er.left + er.width / 2 - pr.left) - pr.width / 2) < 6;
                        // Dynamic horizontal guides: compare with other elements
                        const hLines = [];
                        const myTop = er.top - pr.top;
                        const myCenter = myTop + er.height / 2;
                        const myBottom = myTop + er.height;
                        const others = parent.querySelectorAll('[data-draggable-element]');
                        others.forEach(other => {
                            if (other === containerRef.current) return;
                            const or2 = other.getBoundingClientRect();
                            const oTop = or2.top - pr.top;
                            const oCenter = oTop + or2.height / 2;
                            const oBottom = oTop + or2.height;
                            if (Math.abs(myTop - oTop) < 5) hLines.push({ y: oTop });
                            if (Math.abs(myCenter - oCenter) < 5) hLines.push({ y: oCenter });
                            if (Math.abs(myBottom - oBottom) < 5) hLines.push({ y: oBottom });
                            if (Math.abs(myTop - oBottom) < 5) hLines.push({ y: oBottom });
                            if (Math.abs(myBottom - oTop) < 5) hLines.push({ y: oTop });
                        });
                        if (Math.abs(myCenter - pr.height / 2) < 6) hLines.push({ y: pr.height / 2 });
                        setGuides({ showCenterV, hLines });
                    } else {
                        setGuides({ showCenterV: Math.abs(nx) < 5, hLines: [] });
                    }
                }
            } else if (isResizing) {
                // Absolute calculation from initial size - prevents erratic jumps
                const ri = resizeInitialRef.current;
                const deltaX = e.clientX - ri.mouseX;
                const deltaY = e.clientY - ri.mouseY;
                const dir = ri.dir || 'se';
                // Lock height for line shapes (dividers)
                const isLine = elOpts.shapeType?.startsWith('line');

                let newW = ri.w, newH = ri.h, newX = ri.posX, newY = ri.posY;

                // Width adjustments
                if (dir.includes('e')) { newW = Math.max(30, ri.w + deltaX); }
                if (dir.includes('w')) { newW = Math.max(30, ri.w - deltaX); newX = ri.posX + deltaX; }
                // Height adjustments (skip for lines)
                if (!isLine) {
                    if (dir.includes('s')) { newH = Math.max(30, ri.h + deltaY); }
                    if (dir.includes('n')) { newH = Math.max(30, ri.h - deltaY); newY = ri.posY + deltaY; }
                }

                setSize({ w: newW, h: isLine ? ri.h : newH });
                if (dir.includes('w') || dir.includes('n')) {
                    setPos({ x: newX, y: isLine ? ri.posY : newY });
                }
            }
        };

        const onMouseUp = () => {
            if (isDragging) {
                onUpdate(section.id, `${field}Pos`, posRef.current);
                setIsDragging(false);
                setGuides({ showCenterV: false, hLines: [] });
            }
            if (isResizing) {
                onUpdate(section.id, `${field}Size`, sizeRef.current);
                onUpdate(section.id, `${field}Pos`, posRef.current);
                setIsResizing(false);
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, isResizing, dragStart, resizeInitial]);

    // Read styles live from section data to avoid stale state
    const currentStyles = section[`${field}Style`] || styles;
    const zIndex = currentStyles.zIndex || 20;
    const opacity = currentStyles.opacity ?? 1;

    // Deletion check (MUST be after all hooks)
    if (section[`_DELETE_ELEMENT_${field}`]) return null;

    const frameClass = {
        'rectangle': 'rounded-none',
        'rounded': 'rounded-3xl',
        'circle': 'rounded-full'
    }[frameType] || 'rounded-none';

    const flipX = currentStyles.scaleX || 1;
    const flipY = currentStyles.scaleY || 1;

    return (
        <div
            ref={containerRef}
            className="absolute group/resizable"
            data-draggable-element="true"
            style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: size.w,
                height: size.h,
                zIndex: zIndex,
                opacity: opacity,
            }}
        >
            <div
                className={cn(
                    "w-full h-full relative cursor-move hover:ring-2 ring-blue-400 overflow-hidden",
                    frameClass,
                    (isDragging || isResizing) && "ring-2 ring-blue-600"
                )}
                onMouseDown={onMouseDown}
                style={{ pointerEvents: 'auto', transform: `scaleX(${flipX}) scaleY(${flipY})` }}
            >
                {src ? (
                    <img src={src} className="w-full h-full object-contain pointer-events-none" />
                ) : elOpts.type === 'frame' ? (
                    <FrameImageContent
                        section={section}
                        field={field}
                        elOpts={elOpts}
                        currentStyles={currentStyles}
                        onUpdate={onUpdate}
                    />
                ) : (
                    <div className="w-full h-full pointer-events-none" style={{
                        backgroundColor: currentStyles.backgroundColor || '#e2e8f0',
                        borderRadius: currentStyles.borderRadius || '0',
                        border: currentStyles.borderWidth
                            ? `${currentStyles.borderWidth}px ${currentStyles.borderStyle || 'solid'} ${currentStyles.borderColor || '#94a3b8'}`
                            : (isShape ? '2px solid rgba(0,0,0,0.1)' : 'none'),
                        borderTop: currentStyles.borderTop || undefined,
                        borderBottom: currentStyles.borderBottom || undefined,
                        background: currentStyles.background || undefined,
                        boxShadow: isShape ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    }} />
                )}

                {/* Delete & Z-index Controls */}
                <div className="absolute top-2 right-2 flex bg-white/90 backdrop-blur shadow-lg rounded-lg p-1 gap-1 opacity-0 group-hover/resizable:opacity-100 transition-opacity z-50">
                    <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); const cs = section[`${field}Style`] || {}; onUpdate(section.id, `${field}Style`, { ...cs, zIndex: (cs.zIndex || 20) + 1 }); }} className="p-1 hover:bg-slate-100 rounded text-[9px] font-bold" title="맨앞으로">▲</button>
                    <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); const cs = section[`${field}Style`] || {}; onUpdate(section.id, `${field}Style`, { ...cs, zIndex: Math.max(10, (cs.zIndex || 20) - 1) }); }} className="p-1 hover:bg-slate-100 rounded text-[9px] font-bold" title="맨뒤로">▼</button>
                    <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, `_DELETE_ELEMENT_${field}`, true); }} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={12} /></button>
                </div>

                {/* Selection Border */}
                {selectedElement?.sectionId === section.id && selectedElement?.elementId === field && (
                    <div className="absolute inset-[-4px] border-2 border-blue-500 rounded pointer-events-none z-[100]"></div>
                )}
            </div>

            {/* Resize Handles - 8 directions */}
            {/* SE corner (primary) */}
            <div
                className={cn(
                    "resize-handle-dir absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'se')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* NE corner */}
            <div
                className={cn(
                    "resize-handle-dir absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-ne-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'ne')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* SW corner */}
            <div
                className={cn(
                    "resize-handle-dir absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-sw-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'sw')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* NW corner */}
            <div
                className={cn(
                    "resize-handle-dir absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nw-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'nw')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* N edge */}
            <div
                className={cn(
                    "resize-handle-dir absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-blue-500 rounded-full cursor-n-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'n')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* S edge */}
            <div
                className={cn(
                    "resize-handle-dir absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-blue-500 rounded-full cursor-s-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 's')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* W edge */}
            <div
                className={cn(
                    "resize-handle-dir absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-6 bg-blue-500 rounded-full cursor-w-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'w')}
                style={{ pointerEvents: 'auto' }}
            />
            {/* E edge */}
            <div
                className={cn(
                    "resize-handle-dir absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-6 bg-blue-500 rounded-full cursor-e-resize shadow-md border-2 border-white z-[101] hover:scale-125 transition-transform",
                    (selectedElement?.sectionId === section.id && selectedElement?.elementId === field) ? "opacity-100" : "opacity-0 group-hover/resizable:opacity-100"
                )}
                onMouseDown={(e) => onResizeStart(e, 'e')}
                style={{ pointerEvents: 'auto' }}
            />
        </div>
    );
};


// Helper: Droppable Image Slot (Multi-Slot Support with Pan/Zoom)
const DroppableImageSlot = ({ section, field = 'assignedImage', className = "w-full h-full", placeholderText = "이미지 영역", onUpdate, objectFit = 'contain', imagePrompt }) => {
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `${section.id}__${field}-slot`,
    });

    const currentImage = section[field];
    const opacity = section[`${field}Opacity`] ?? section.imageOpacity ?? 1;
    const blur = section[`${field}Blur`] ?? section.imageBlur ?? 0;

    // Pan/Zoom state
    const [imgTransform, setImgTransform] = useState(section[`${field}Transform`] || { x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const imgTransformRef = useRef(imgTransform);
    useEffect(() => { imgTransformRef.current = imgTransform; }, [imgTransform]);

    // Sync with section data
    useEffect(() => {
        const saved = section[`${field}Transform`];
        if (saved && (saved.x !== imgTransform.x || saved.y !== imgTransform.y || saved.scale !== imgTransform.scale)) {
            // eslint-disable-next-line
            setImgTransform(saved);
        }
    }, [section[`${field}Transform`]]);

    const handlePanStart = (e) => {
        if (!currentImage) return;
        e.preventDefault();
        e.stopPropagation();
        setIsPanning(true);
        setPanStart({ x: e.clientX - imgTransform.x, y: e.clientY - imgTransform.y });
    };

    useEffect(() => {
        if (!isPanning) return;
        const onMove = (e) => {
            setImgTransform(prev => ({
                ...prev,
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            }));
        };
        const onUp = () => {
            setIsPanning(false);
            onUpdate(section.id, `${field}Transform`, imgTransformRef.current);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isPanning, panStart]);

    // Non-passive wheel handler to prevent page scroll
    const imgContainerRef = useRef(null);
    useEffect(() => {
        const el = imgContainerRef.current;
        if (!el || !currentImage) return;
        const handler = (e) => {
            if (!e.altKey) return; // Only zoom when Alt is held
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const prev = imgTransformRef.current;
            const newScale = Math.max(0.3, Math.min(5, prev.scale + delta));
            const newT = { ...prev, scale: newScale };
            setImgTransform(newT);
            onUpdate(section.id, `${field}Transform`, newT);
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [currentImage, section.id, field]);

    return (
        <div
            ref={setDroppableRef}
            className={cn(
                className,
                "relative overflow-hidden group/img transition-all duration-200",
                isOver && "ring-4 ring-blue-500 ring-inset bg-blue-50/50"
            )}
            style={{ backgroundColor: section.backgroundColor || '#f8fafc' }}
        >
            {currentImage ? (
                <div
                    ref={imgContainerRef}
                    className={cn(
                        "w-full h-full relative overflow-hidden",
                        isPanning && "cursor-grabbing"
                    )}
                    onMouseDown={handlePanStart}
                    style={{ pointerEvents: 'auto' }}
                >
                    <img
                        src={currentImage}
                        alt="Section Visual"
                        className="w-full h-full block select-none"
                        style={{
                            objectFit: objectFit,
                            opacity: opacity,
                            filter: `blur(${blur}px)`,
                            transformOrigin: 'center center',
                            transform: `translate(${imgTransform.x}px, ${imgTransform.y}px) scale(${imgTransform.scale})`,
                        }}
                        draggable={false}
                    />
                    {/* Zoom indicator */}
                    <div data-html2canvas-ignore className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none z-40">
                        {Math.round(imgTransform.scale * 100)}% · Alt+드래그: 이미지 이동 · Alt+스크롤: 확대/축소
                    </div>
                    {/* Remove image button - visible on hover for ALL image slots */}
                    <button
                        data-html2canvas-ignore
                        onPointerDown={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            console.log("Delete image from DroppableImageSlot");
                            onUpdate(section.id, field, null);
                            onUpdate(section.id, `${field}Transform`, { x: 0, y: 0, scale: 1 });
                        }}
                        onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            console.log("Delete image from DroppableImageSlot");
                            onUpdate(section.id, field, null);
                            onUpdate(section.id, `${field}Transform`, { x: 0, y: 0, scale: 1 });
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            console.log("Delete image from DroppableImageSlot");
                            onUpdate(section.id, field, null);
                            onUpdate(section.id, `${field}Transform`, { x: 0, y: 0, scale: 1 });
                        }}
                        style={{ pointerEvents: 'auto' }}
                        className="absolute bottom-3 right-3 z-[99999] bg-white/95 backdrop-blur shadow-xl border border-red-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100"
                    >
                        <span>✕</span> 이미지 삭제
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 bg-slate-50/30 p-8">
                    <ImageIcon size={48} className="mb-2 opacity-20" />
                    <span className="text-xs font-bold opacity-30 uppercase tracking-tighter mb-4">{placeholderText}</span>

                    {/* Image Prompt Display */}
                    <div className="relative">
                        <div className="px-3 py-1.5 bg-white rounded-full shadow-sm border border-slate-200 flex items-center gap-2 cursor-help group/hint">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                            <span className="text-[9px] font-black text-slate-600 tracking-tight">AI PROMPT GENERATED</span>

                            {/* Hover Tooltip for Prompt */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl opacity-0 group-hover/hint:opacity-100 pointer-events-none z-[150]">
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">Copy this for Midjourney</div>
                                <p className="text-[11px] font-medium leading-relaxed italic text-white/90">
                                    "{imagePrompt || section.image_prompt || 'Photorealistic premium studio lighting, 8k resolution, minimalist setup.'}"
                                </p>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default function SectionBlock({ section, onUpdate, images, colorPalette, selectedElement, onElementSelect }) {
    // Sortable Logic (Also acts as Droppable for Freeform Images)
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
    } = useSortable({ id: section.id, data: { type: 'section' } });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: section.id,
        data: { type: 'freeform-container' }
    });

    const setNodeRef = (node) => {
        setSortableRef(node);
        setDroppableRef(node);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Style Editor State
    const [showStylePanel, setShowStylePanel] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState('rectangle');
    const [guides, setGuides] = useState({ showCenterV: false, hLines: [] }); // hLines: array of { y } for dynamic horizontal guides



    // Helper: Style Panel UI
    const StylePanel = () => {
        let colors = [
            { name: 'Pure White', hex: '#ffffff' },
            { name: 'Soft Cream', hex: '#FAFAF7' },
            { name: 'Sage Pale', hex: '#F5F9F6' },
            { name: 'Slate Light', hex: '#f8fafc' },
            { name: 'Premium Green', hex: '#1a2e22' },
            { name: 'Deep Bark', hex: '#2E3830' },
            { name: 'Soft Gray', hex: '#f1f5f9' },
        ];

        if (colorPalette && colorPalette.palette && colorPalette.palette.length > 0) {
            const aiColors = [
                { name: 'Pure White', hex: '#ffffff' },
                { name: 'AI Dominant', hex: colorPalette.dominant || colorPalette.palette[0] }
            ];
            colorPalette.palette.slice(0, 5).forEach((hex, i) => {
                aiColors.push({ name: `AI Color ${i + 1}`, hex });
            });
            // remove duplicates by hex
            colors = aiColors.filter((v, i, a) => a.findIndex(t => (t.hex === v.hex)) === i);
        }

        // Helper: lighten/darken hex color
        const adjustColor = (hex, amount) => {
            hex = hex.replace('#', '');
            const num = parseInt(hex, 16);
            let r = Math.min(255, Math.max(0, (num >> 16) + amount));
            let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
            let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        };
        const mixColors = (hex1, hex2, ratio = 0.5) => {
            const h1 = hex1.replace('#', ''), h2 = hex2.replace('#', '');
            const r = Math.round(parseInt(h1.substring(0, 2), 16) * (1 - ratio) + parseInt(h2.substring(0, 2), 16) * ratio);
            const g = Math.round(parseInt(h1.substring(2, 4), 16) * (1 - ratio) + parseInt(h2.substring(2, 4), 16) * ratio);
            const b = Math.round(parseInt(h1.substring(4, 6), 16) * (1 - ratio) + parseInt(h2.substring(4, 6), 16) * ratio);
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        };

        // Generate gradients dynamically based on selected color
        const baseColor = section.backgroundColor || (colorPalette?.palette?.[0]) || '#f5f5f5';
        const darker = adjustColor(baseColor, -40);
        const veryLight = adjustColor(baseColor, 80);
        const paletteColor2 = colorPalette?.palette?.[1] || adjustColor(baseColor, -60);
        const warmMix = mixColors(baseColor, '#fff5ee', 0.3);

        const gradients = [
            { name: 'None', value: 'none' },
            { name: '밝게', value: `linear-gradient(135deg, ${veryLight} 0%, ${baseColor} 100%)` },
            { name: '어둡게', value: `linear-gradient(135deg, ${baseColor} 0%, ${darker} 100%)` },
            { name: '컬러믹스', value: `linear-gradient(135deg, ${baseColor} 0%, ${paletteColor2} 100%)` },
            { name: '따뜻하게', value: `linear-gradient(135deg, ${warmMix} 0%, ${baseColor} 100%)` },
        ];

        return (
            <div data-html2canvas-ignore className="absolute right-12 top-2 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-2xl p-4 z-[100] w-72">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section Advanced Style</span>
                    <button onClick={() => setShowStylePanel(false)} className="text-slate-400">
                        <Settings size={14} className="rotate-90" />
                    </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Background Color */}
                    <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-2 block">Background Color</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map(c => (
                                <button
                                    key={c.hex}
                                    onClick={() => {
                                        onUpdate(section.id, { backgroundColor: c.hex, backgroundGradient: 'none' });
                                    }}
                                    className={cn(
                                        "w-6 h-6 rounded-full border border-slate-200 shadow-sm",
                                        section.backgroundColor === c.hex && section.backgroundGradient === 'none' && "ring-2 ring-blue-500 ring-offset-2"
                                    )}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            ))}
                            <input
                                type="color"
                                value={section.backgroundColor || "#ffffff"}
                                onChange={(e) => {
                                    onUpdate(section.id, { backgroundColor: e.target.value, backgroundGradient: 'none' });
                                }}
                                className="w-6 h-6 rounded-full overflow-hidden border-none p-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Gradients */}
                    <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-2 block">Background Gradient</label>
                        <div className="grid grid-cols-2 gap-2">
                            {gradients.map(g => (
                                <button
                                    key={g.name}
                                    onClick={() => onUpdate(section.id, 'backgroundGradient', g.value)}
                                    className={cn(
                                        "h-8 rounded-lg border border-slate-200 text-[8px] font-bold overflow-hidden",
                                        section.backgroundGradient === g.value && "ring-2 ring-blue-500 ring-offset-1"
                                    )}
                                    style={{ background: g.value === 'none' ? '#fff' : g.value }}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Contrast Settings */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-2 block">Text Theme</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onUpdate(section.id, 'textColor', '#1a2e22')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[11px] font-bold border",
                                    (section.textColor === '#1a2e22' || !section.textColor) ? "bg-bark text-white border-bark" : "bg-white text-slate-400 border-slate-100"
                                )}
                            >
                                DARK
                            </button>
                            <button
                                onClick={() => onUpdate(section.id, 'textColor', '#ffffff')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[11px] font-bold border",
                                    section.textColor === '#ffffff' ? "bg-slate-200 text-slate-700 border-slate-200" : "bg-white text-slate-400 border-slate-100"
                                )}
                            >
                                LIGHT
                            </button>
                        </div>
                    </div>

                    {/* Manual Elements */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-2 block">Add Element</label>
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => {
                                    const newId = `custom-text-${Math.random().toString(36).substr(2, 9)}`;
                                    onUpdate(section.id, 'customElements', [...(section.customElements || []), { id: newId, type: 'text', content: '새 텍스트' }]);
                                }}
                                className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-black border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                                + TEXT
                            </button>
                            <button
                                onClick={() => setShowImagePicker(!showImagePicker)}
                                className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-black border border-emerald-100 hover:bg-emerald-100 transition-colors"
                            >
                                + IMAGE
                            </button>
                        </div>

                        {/* Mini Image Picker & Frame Selector */}
                        {showImagePicker && (
                            <div className="mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex gap-2 mb-2 pb-2 border-b border-slate-200">
                                    <button onClick={() => setSelectedFrame('rectangle')} className={cn("flex-1 py-1 text-[10px] font-bold rounded", selectedFrame === 'rectangle' ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500 shadow-sm")}>RECTANGLE</button>
                                    <button onClick={() => setSelectedFrame('rounded')} className={cn("flex-1 py-1 text-[10px] font-bold rounded", selectedFrame === 'rounded' ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500 shadow-sm")}>ROUNDED</button>
                                    <button onClick={() => setSelectedFrame('circle')} className={cn("flex-1 py-1 text-[10px] font-bold rounded", selectedFrame === 'circle' ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500 shadow-sm")}>CIRCLE</button>
                                </div>
                                <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                                    {images && images.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="aspect-square rounded-md overflow-hidden cursor-pointer hover:ring-2 ring-emerald-500 bg-white shadow-sm"
                                            onClick={() => {
                                                const newId = `custom-image-${Math.random().toString(36).substr(2, 9)}`;
                                                onUpdate(section.id, 'customElements', [...(section.customElements || []), {
                                                    id: newId,
                                                    type: 'image',
                                                    src: img.src,
                                                    width: 200,
                                                    height: 200,
                                                    frameType: selectedFrame
                                                }]);
                                                setShowImagePicker(false);
                                            }}
                                        >
                                            <img src={img.src} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section Actions */}

                        {/* Dynamic Count Selector (for sections that support it) */}
                        {['ingredients', 'point', 'review'].includes(section.type) && (
                            <div className="mb-4">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-2 block">Item Count</label>
                                <div className="flex gap-2">
                                    {[2, 3, 4].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => onUpdate(section.id, 'itemCount', num)}
                                            className={cn(
                                                "flex-1 py-1.5 rounded-lg text-[11px] font-bold border",
                                                (section.itemCount || 4) === num ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-400 border-slate-100 opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            {num}개
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                                onClick={() => {
                                    if (confirm('이 섹션을 삭제하시겠습니까?')) {
                                        onUpdate(section.id, '_DELETE_SECTION', true);
                                    }
                                }}
                                className="flex-1 py-2 rounded-lg text-[10px] font-black bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                DELETE SECTION
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    // Helper: Render Custom Elements (With Images)
    const renderCustomElements = () => {
        return (section.customElements || []).map(el => {
            if (el.type === 'image') return (
                <ResizableImage key={el.id} onUpdate={onUpdate} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                    section={section}
                    field={el.id}
                    elOpts={el}
                />
            );
            if (el.type === 'shape') return (
                <ResizableImage key={el.id} onUpdate={onUpdate} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                    section={section}
                    field={el.id}
                    elOpts={{ ...el, src: null, isShape: true, frameType: el.shapeType === 'circle' ? 'circle' : 'rectangle' }}
                />
            );
            if (el.type === 'frame') return (
                <ResizableImage key={el.id} onUpdate={onUpdate} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                    section={section}
                    field={el.id}
                    elOpts={{ ...el, src: el.frameSrc || null, isShape: false, frameType: el.frameShape || 'rectangle' }}
                />
            );
            return (
                <EditableText key={el.id} onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                    section={section}
                    field={el.id}
                    placeholder={el.content}
                />
            );
        });
    };

    // --- STATIC LAYOUTS ---

    const HeroLayout = () => {
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#fdf2f0');
        const defaultTextColor = section.textColor || '#1a2e22';

        return (
            <div className="relative w-full min-h-[900px] flex flex-col items-center py-20" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}

                {/* Top Text Area */}
                <div className="relative z-10 w-full max-w-4xl flex flex-col items-center mx-auto mb-12">
                    {/* Backward Compatibility Check */}
                    {section.title ? (
                        <>
                            <div className="mb-4">
                                <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                    section={section} field="subtitle" align="center" className="text-[12px] font-bold tracking-widest px-4 py-1.5 rounded-full bg-slate-100/50 text-slate-500 mb-4" placeholder="브랜드명 · 카테고리" />
                            </div>
                            <div className="mb-6 w-full">
                                <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                    section={section} field="title" multiline={true} align="center" className="text-6xl md:text-7xl font-black tracking-normal" />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* 1. Eyebrow */}
                            <div className="mb-4">
                                <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                    section={section} field="eyebrow" multiline align="center" placeholder="하루의 시작, 깨끗한 자신감!" />
                            </div>

                            {/* 2. Main Brand Name */}
                            <div className="mb-2 w-full">
                                <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                    section={section} field="mainBrandName" multiline align="center" placeholder="ALADA" className="text-6xl md:text-7xl font-black tracking-normal" title="BRAND NAME" />
                            </div>

                            {/* 3. Sub Product Name */}
                            <div className="mb-4">
                                <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                    section={section} field="subProductName" multiline align="center" placeholder="WHITENING SOAP" />
                            </div>
                        </>
                    )}
                </div>

                {/* Hero Featured Image - Full width, original image fully visible */}
                <div className="relative w-full overflow-hidden mb-16 z-10">
                    <DroppableImageSlot
                        section={section}
                        onUpdate={onUpdate}
                        field="assignedImage"
                        className="w-full min-h-[400px]"
                        placeholderText="HERO PRODUCT SHOT"
                        objectFit="contain"
                    />
                    {section.assignedImage && (
                        <button
                            data-html2canvas-ignore
                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); onUpdate(section.id, 'assignedImageTransform', { x: 0, y: 0, scale: 1 }); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); onUpdate(section.id, 'assignedImageTransform', { x: 0, y: 0, scale: 1 }); }}
                            style={{ pointerEvents: 'auto' }}
                            className="absolute -top-1 -right-1 z-[99999] w-7 h-7 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                            title="이미지 삭제"
                        >✕</button>
                    )}
                </div>

                {/* Bottom Hook Text */}
                <div className="relative z-10 w-full max-w-2xl text-center">
                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                        section={section}
                        field="content"
                        multiline
                        align="center"
                        className="text-xl font-semibold leading-relaxed tracking-tight"
                    />
                </div>
            </div>
        );
    };

    const PointLayout = () => {
        const accentColor = section.theme?.accent || '#7A9E8A';
        const defaultTextColor = section.textColor || '#1a2e22'; // Point header is mostly on white background

        return (
            <div className="w-full py-16 px-0 relative" style={{ color: defaultTextColor }}>
                {renderCustomElements()}
                {/* Header */}
                <div className="text-center mb-16 mx-auto">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold tracking-widest mb-4">핵심 포인트</span>
                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                        section={section}
                        field="title"
                        className="text-4xl font-semibold tracking-tight"
                        multiline={true}
                        align="center"
                        placeholder="내용을 입력하세요"
                    />
                    <div className="w-12 h-1 mx-auto mt-8 rounded-full" style={{ backgroundColor: accentColor }}></div>
                </div>

                <div className="flex flex-col gap-0 w-full">
                    {(section.points || [
                        { title: "강력한 보습 효과", content: "깊은 수분 성분으로 오래 지속되는 보습력을 선사합니다." },
                        { title: "피부 장벽 강화", content: "세라마이드 성분이 건강한 피부 환경을 조성합니다." },
                        { title: "지속력이 다릅니다", content: "미세먼지 속 하루에도 탁월한 사용감으로 지켜주는 든든한 제품입니다." }
                    ]).map((point, idx) => (
                        <div key={idx} className="relative">
                            {/* Full-width Image */}
                            <div className="w-full h-[500px] overflow-hidden relative">
                                <DroppableImageSlot section={section} onUpdate={onUpdate} field={`point${idx + 1}Image`} className="w-full h-full" placeholderText={`POINT ${idx + 1} VISUAL`} objectFit="cover" imagePrompt={section[`point${idx + 1}Prompt`] || `High-end cosmetic photography, visualize the effect of: ${point.title || 'premium cosmetic'}, photorealistic, soft studio lighting, 8k resolution`} />
                                {/* Number Badge Overlay */}
                                <div className="absolute top-6 left-8 flex items-center gap-3 z-10">
                                    <span className="text-5xl font-bold italic text-white" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.5)' }}>0{idx + 1}</span>
                                </div>
                                {section[`point${idx + 1}Image`] && (
                                    <button
                                        data-html2canvas-ignore
                                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, `point${idx + 1}Image`, null); onUpdate(section.id, `point${idx + 1}ImageTransform`, { x: 0, y: 0, scale: 1 }); }}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, `point${idx + 1}Image`, null); onUpdate(section.id, `point${idx + 1}ImageTransform`, { x: 0, y: 0, scale: 1 }); }}
                                        style={{ pointerEvents: 'auto' }}
                                        className="absolute top-3 right-3 z-[99999] w-7 h-7 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                                        title="이미지 삭제"
                                    >✕</button>
                                )}
                            </div>

                            {/* Text Content Below Image */}
                            <div className="py-14 text-center" style={{ backgroundColor: (section.backgroundGradient && section.backgroundGradient !== 'none') ? 'transparent' : (section.backgroundColor || '#ffffff'), color: section.textColor || '#1a2e22' }}>
                                <div className="text-2xl font-medium tracking-tight leading-snug mb-5">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                        section={section}
                                        field={`point${idx + 1}Title`}
                                        placeholder={point.title}
                                        align="center"
                                    />
                                </div>
                                <div className="text-base leading-relaxed opacity-80 font-medium max-w-xl mx-auto">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                        section={section}
                                        field={`point${idx + 1}Content`}
                                        multiline
                                        placeholder={point.content}
                                        align="center"
                                    />
                                </div>
                                <div className="pt-6 flex items-center justify-center gap-2">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                                        section={section}
                                        field={`point${idx + 1}Badge`}
                                        placeholder=""
                                        align="center"
                                        className="text-[11px] font-medium text-blue-500 tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const IngredientsLayout = () => {
        const itemCount = section.itemCount || 4;
        const items = Array.from({ length: itemCount }, (_, i) => i + 1);
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#f9fafb');
        const defaultTextColor = section.textColor || '#1a2e22';

        // Determine grid layout based on count
        let gridClass = "grid-cols-2";
        let imageSize = "w-[220px] h-[220px]";

        if (itemCount === 3) {
            gridClass = "grid-cols-3"; // 3 items in one row
            imageSize = "w-[180px] h-[180px]"; // Slightly smaller images for 3 cols
        } else if (itemCount === 2) {
            gridClass = "grid-cols-2";
            imageSize = "w-[280px] h-[280px]"; // Larger images for 2 cols
        }

        return (
            <div className="w-full py-20 relative" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}
                <div className="w-full mx-auto">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[12px] font-bold tracking-widest mb-6">핵심 성분</span>
                    </div>
                    <div className="text-center mb-4">
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="title" className="text-3xl font-semibold tracking-tight" placeholder="자연에서 찾은 순수한" align="center" />
                    </div>
                    <div className="text-center mb-16 max-w-xl mx-auto">
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="content" multiline placeholder="핵심 성분이 피부에 전하는 특별한 이야기" align="center" className="text-lg text-slate-500" />
                    </div>

                    {/* Main Ingredients Image */}
                    <div className="w-full h-[400px] rounded-3xl overflow-hidden shadow-xl mb-16 relative">
                        <DroppableImageSlot section={section} onUpdate={onUpdate} field="assignedImage" className="w-full h-full" placeholderText="INGREDIENTS FOCUS" objectFit="cover" />
                        {section.assignedImage && (
                            <button
                                data-html2canvas-ignore
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); onUpdate(section.id, 'assignedImageTransform', { x: 0, y: 0, scale: 1 }); }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); onUpdate(section.id, 'assignedImageTransform', { x: 0, y: 0, scale: 1 }); }}
                                style={{ pointerEvents: 'auto' }}
                                className="absolute top-3 right-3 z-[99999] w-7 h-7 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                                title="이미지 삭제"
                            >✕</button>
                        )}
                    </div>

                    {/* Dynamic Ingredient Grid */}
                    <div className={cn("grid gap-8", gridClass)}>
                        {items.map(i => (
                            <div key={i} className="flex flex-col items-center text-center p-4">
                                {/* Circular ingredient image with external delete button */}
                                <div className="relative mb-6">
                                    <div className={cn("rounded-full overflow-hidden shadow-lg border-4 border-white transition-all mx-auto", imageSize)}>
                                        <DroppableImageSlot section={section} onUpdate={onUpdate} field={`ing${i}Image`} className="w-full h-full" placeholderText={`성분 ${i}`} objectFit="cover" imagePrompt={section[`ing${i}Prompt`] || `Macro photography of pure ${section[`ing${i}Title`] || `ingredient ${i}`}, natural lighting, white background, high detail, 8k resolution`} />
                                    </div>
                                    {section[`ing${i}Image`] && (
                                        <button
                                            data-html2canvas-ignore
                                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, `ing${i}Image`, null); }}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, `ing${i}Image`, null); }}
                                            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, `ing${i}Image`, null); }}
                                            style={{ pointerEvents: 'auto' }}
                                            className="absolute -top-1 -right-1 z-[99999] w-6 h-6 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                                            title="이미지 삭제"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {/* Wrap text in a fixed height container block to lock alignment */}
                                <div className="w-full h-[200px] flex flex-col justify-start relative mt-4">
                                    <div className={cn("font-medium absolute top-0 w-full flex items-start justify-center", itemCount === 3 ? "text-[18px]" : "text-xl", "h-[90px]")}>
                                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field={`ing${i}Title`} multiline placeholder="성분명" align="center" className="leading-tight" />
                                    </div>
                                    <div className="absolute top-[110px] w-full text-[14px] opacity-80 leading-relaxed flex items-start justify-center">
                                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field={`ing${i}Content`} multiline placeholder="효능을 상세하게 설명해주세요" align="center" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const ComparisonLayout = () => {
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#ffffff');
        const defaultTextColor = section.textColor || '#1a2e22';

        return (
            <div className="w-full py-20 text-center relative" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}
                <div className="mb-14 mx-auto">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100/50 text-current opacity-80 text-[12px] font-bold tracking-widest mb-4">실제 효과</span>
                    <div className="text-3xl font-medium tracking-tight">
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="title" multiline={true} placeholder="분사 한 번으로 느껴지는 차이" align="center" />
                    </div>
                </div>

                {/* Before / After Images */}
                <div className="w-full mx-auto grid grid-cols-2 gap-4">
                    {/* Before Image */}
                    <div>
                        <div className="relative overflow-hidden rounded-xl h-[530px]">
                            <DroppableImageSlot section={section} onUpdate={onUpdate} field="beforeImage" className="w-full h-full grayscale opacity-70" placeholderText="사용 전" objectFit="cover" imagePrompt={section.beforePrompt || "Macro studio photography of skin condition before treatment, showing dullness or problematic texture, highly detailed, realistic, 8k"} />
                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-4 py-1.5 text-[12px] font-bold tracking-widest rounded-full">사용 전</div>
                            {section.beforeImage && (
                                <button
                                    data-html2canvas-ignore
                                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'beforeImage', null); onUpdate(section.id, 'beforeImageTransform', { x: 0, y: 0, scale: 1 }); }}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'beforeImage', null); onUpdate(section.id, 'beforeImageTransform', { x: 0, y: 0, scale: 1 }); }}
                                    style={{ pointerEvents: 'auto' }}
                                    className="absolute top-3 right-3 z-[99999] w-7 h-7 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                                    title="이미지 삭제"
                                >✕</button>
                            )}
                        </div>
                        {/* Text below image */}
                        <div className="mt-4 text-left px-2">
                            <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="beforeContent" multiline placeholder="건조하고 칙칙한 피부 톤,&#10;모공이 눈에 띄고 피부결이 거칠어요" />
                        </div>
                    </div>

                    {/* After Image */}
                    <div>
                        <div className="relative overflow-hidden rounded-xl h-[530px]">
                            <DroppableImageSlot section={section} onUpdate={onUpdate} field="afterImage" className="w-full h-full" placeholderText="사용 후" objectFit="cover" imagePrompt={section.afterPrompt || "Macro studio photography of skin condition after cosmetic treatment, glowing, smooth texture, bright and healthy, highly detailed, realistic, 8k"} />
                            <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1.5 text-[12px] font-bold tracking-widest rounded-full shadow-lg">사용 후</div>
                            {section.afterImage && (
                                <button
                                    data-html2canvas-ignore
                                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'afterImage', null); onUpdate(section.id, 'afterImageTransform', { x: 0, y: 0, scale: 1 }); }}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'afterImage', null); onUpdate(section.id, 'afterImageTransform', { x: 0, y: 0, scale: 1 }); }}
                                    style={{ pointerEvents: 'auto' }}
                                    className="absolute top-3 right-3 z-[99999] w-7 h-7 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                                    title="이미지 삭제"
                                >✕</button>
                            )}
                            <div className="absolute top-4 right-4 flex flex-col items-end">
                                <div className="text-3xl font-semibold text-white italic leading-none" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.4)' }}>
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="afterPercentage" placeholder="221%" />
                                </div>
                                <span className="text-[10px] font-medium text-white/80 tracking-widest mt-1">개선율</span>
                            </div>
                        </div>
                        {/* Text below image */}
                        <div className="mt-4 text-left px-2">
                            <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="afterContent" multiline placeholder="촉촉하고 환한 피부 톤,&#10;피부결이 매끈하고 자연스러운 윤기" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ReviewLayout = () => {
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#ffffff');
        const defaultTextColor = section.textColor || '#1a2e22';

        return (
            <div className="w-full py-24 relative" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}
                <div className="w-full mx-auto p-4 md:p-8">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100/50 text-current opacity-80 text-[12px] font-bold tracking-widest mb-4">고객 후기</span>
                        <h2 className="text-3xl font-semibold tracking-tight mb-2">이런 분들께 추천합니다</h2>
                        <p className="text-sm opacity-60">실제 사용자들의 솔직한 후기</p>
                    </div>

                    {/* Review Cards */}
                    <div className="grid grid-cols-1 gap-8">
                        {[1, 2, 3].map((reviewer) => (
                            <div key={reviewer} className="bg-slate-500/10 rounded-2xl p-8 relative">
                                <div className="text-xl font-bold tracking-tight leading-snug mb-3">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field={`reviewer${reviewer}Title`} placeholder={`리뷰어 타이틀 ${reviewer}`} />
                                </div>
                                <div className="text-sm leading-relaxed opacity-80 mb-6">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field={`reviewer${reviewer}Content`} multiline placeholder="리뷰 상세 내용을 적어주세요. 제품 사용 경험을 솔직하게 남겨보세요." />
                                </div>
                                <div className="flex items-center gap-3 pt-4 border-t border-slate-200/50">
                                    <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center text-[11px] font-black opacity-60">
                                        {reviewer === 1 ? 'H' : reviewer === 2 ? 'K' : 'A'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold opacity-90 uppercase tracking-widest">Verified Buyer</span>
                                        <span className="text-[10px] text-slate-400">네이버페이 구매</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const TextureLayout = () => (
        <div className="w-full min-h-[700px] relative py-20 flex items-center justify-center">
            {renderCustomElements()}
            <div className="absolute inset-x-8 inset-y-8 rounded-[3rem] overflow-hidden">
                <DroppableImageSlot section={section} onUpdate={onUpdate} field="assignedImage" className="w-full h-full" placeholderText="TEXTURE ZOOM-IN" objectFit="cover" imagePrompt={section.image_prompt || "Macro photography of cosmetic texture, creamy, smooth, highly detailed, realistic lighting, 8k resolution"} />
                <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                {section.assignedImage && (
                    <button
                        data-html2canvas-ignore
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); onUpdate(section.id, 'assignedImageTransform', { x: 0, y: 0, scale: 1 }); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); onUpdate(section.id, 'assignedImageTransform', { x: 0, y: 0, scale: 1 }); }}
                        style={{ pointerEvents: 'auto' }}
                        className="absolute top-3 right-3 z-[99999] w-7 h-7 bg-white shadow-lg border border-red-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer text-xs font-bold"
                        title="이미지 삭제"
                    >✕</button>
                )}
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-3xl border border-white/20 p-10 md:p-16 text-center w-full max-w-[90%] md:max-w-xl mx-auto rounded-[2.5rem] shadow-2xl">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-[12px] font-bold tracking-widest mb-6">TEXTURE</span>
                <div className="text-3xl font-medium text-white mb-6 tracking-tight">
                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="title" placeholder="텍스처" align="center" />
                </div>
                <div className="w-12 h-1 bg-white/40 mx-auto mb-8 rounded-full"></div>
                <div className="text-lg text-white/90 leading-relaxed font-medium">
                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="content" multiline placeholder="끈적이지 않는 고급스러운 텍스처가 피부를 부드럽게 감싸줍니다." align="center" />
                </div>
            </div>
        </div>
    );

    const StandardLayout = () => {
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#f5f5f5');
        const defaultTextColor = section.textColor || (section.assignedImage ? '#ffffff' : getContrastYIQ(section.backgroundColor || '#f5f5f5'));

        return (
            <div className="w-full min-h-[600px] relative flex flex-col items-center justify-center text-center" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}
                {/* Full-bleed background image */}
                {/* Background image / droppable - always droppable so images can be replaced */}
                <div className="absolute inset-0 z-0">
                    <DroppableImageSlot section={section} onUpdate={onUpdate} field="assignedImage" className="w-full h-full" placeholderText="배경 이미지" objectFit="cover" />
                    {section.assignedImage && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
                            <button
                                data-html2canvas-ignore
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); }}
                                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); }}
                                style={{ pointerEvents: 'auto' }}
                                className="absolute bottom-6 right-6 z-[99999] bg-white/95 backdrop-blur shadow-lg border border-red-200 rounded-lg px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer flex items-center gap-1"
                            >✕ 배경 이미지 삭제</button>
                        </>
                    )}
                </div>

                {/* Text Content */}
                <div className="relative z-10 w-full pt-48 pb-16 flex flex-col items-center">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-[12px] font-bold tracking-widest mb-4">
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                            section={section} field="subtitle" placeholder="브랜드" align="center" />
                    </span>
                    <div className="text-3xl font-medium tracking-tight mb-6 text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                            section={section} field="title" multiline={true} placeholder="브랜드 이야기" align="center" />
                    </div>
                    <div className="text-sm leading-relaxed font-medium text-white/90" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                            section={section} field="content" multiline placeholder="브랜드의 이야기를 적어보세요" align="center" />
                    </div>
                </div>
            </div>
        );
    };

    const BrandLayout = () => {
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#FAFAFA');
        const defaultTextColor = section.textColor || '#2d3436';

        return (
            <div className="w-full py-24 relative flex flex-col items-center justify-center text-center" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}
                <div className="w-full max-w-4xl mx-auto px-6">
                    {/* Header */}
                    <span className="inline-block px-4 py-1.5 rounded-full bg-slate-200/50 text-current opacity-80 text-[12px] font-bold tracking-widest mb-6 uppercase">
                        Brand Story
                    </span>
                    <div className="text-3xl font-medium tracking-tight mb-8">
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="title" placeholder="브랜드 철학" align="center" />
                    </div>
                    {/* Content */}
                    <div className="text-lg opacity-80 leading-loose break-keep max-w-2xl mx-auto mb-16">
                        <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="content" multiline placeholder="브랜드만의 특별한 가치와 철학을 이야기해주세요" align="center" />
                    </div>
                    {/* Brand Image */}
                    <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-lg relative">
                        <DroppableImageSlot section={section} onUpdate={onUpdate} field="assignedImage" className="w-full h-full" placeholderText="브랜드 무드 이미지" objectFit="cover" imagePrompt={section.image_prompt || "brand mood photography"} />
                        {section.assignedImage && (
                            <button
                                data-html2canvas-ignore
                                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(section.id, 'assignedImage', null); }}
                                style={{ pointerEvents: 'auto' }}
                                className="absolute top-4 right-4 z-[99999] bg-white shadow-lg border border-red-200 rounded-full px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                            >✕ 이미지 삭제</button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const FooterLayout = () => {
        const isGradient = section.backgroundGradient && section.backgroundGradient !== 'none';
        const bgColor = isGradient ? 'transparent' : (section.backgroundColor || '#F9FAFB');
        const defaultTextColor = section.textColor || '#475569';

        return (
            <div className="w-full py-24 relative px-4 md:px-8" style={{ backgroundColor: bgColor, color: defaultTextColor }}>
                {renderCustomElements()}
                <div className="w-full max-w-[1140px] mx-auto flex flex-col gap-16">
                    {/* Top Info Table */}
                    <div>
                        <div className="text-center mb-10 text-xl font-bold tracking-widest opacity-80">
                            제품정보
                        </div>
                        <div className="border-t-2 border-current opacity-20 mb-6"></div>

                        {/* Flex Table Rows */}
                        <div className="flex flex-col gap-5 text-sm">
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">브랜드</div>
                                <div className="flex-1 font-medium opacity-90 break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="brandName" placeholder="브랜드명을 입력하세요" />
                                </div>
                            </div>
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">제품명</div>
                                <div className="flex-1 font-medium opacity-90 break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="productName" placeholder="제품명을 입력하세요" />
                                </div>
                            </div>
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">용량</div>
                                <div className="flex-1 font-medium opacity-90 break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="volume" placeholder="용량을 입력하세요 (예: 50ml)" />
                                </div>
                            </div>
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">제조국</div>
                                <div className="flex-1 font-medium opacity-90 break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="manufacturer" placeholder="제조국/제조업자를 입력하세요" />
                                </div>
                            </div>
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">모델명/<br />사용기간</div>
                                <div className="flex-1 font-medium opacity-90 break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="modelAndExpiration" placeholder="모델명 / 사용기한을 입력하세요" />
                                </div>
                            </div>
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">전성분</div>
                                <div className="flex-1 opacity-70 leading-relaxed break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="fullIngredients" multiline placeholder="전성분을 입력하세요" />
                                </div>
                            </div>
                            <div className="flex border-b border-current/10 pb-5">
                                <div className="w-32 font-bold shrink-0 opacity-70">주의사항</div>
                                <div className="flex-1 opacity-70 leading-relaxed break-keep text-[14px]">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="cautions" multiline placeholder="주의사항" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notice Section */}
                    <div className="mt-8">
                        <div className="text-center mb-6 flex flex-col items-center justify-center">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold tracking-widest mb-4">NOTICE</span>
                        </div>

                        <div className="flex flex-col gap-12 text-center">
                            <div>
                                <div className="font-bold text-base opacity-80 mb-4 flex items-center justify-center">
                                    배송안내
                                </div>
                                <div className="text-[14px] opacity-70 leading-loose break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="shippingNotice" multiline align="center" />
                                </div>
                            </div>

                            <div>
                                <div className="font-bold text-base opacity-80 mb-4 flex items-center justify-center">
                                    교환 및 반품 안내
                                </div>
                                <div className="text-[14px] opacity-70 leading-loose break-keep">
                                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement} section={section} field="exchangeNotice" multiline align="center" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    const mainStyle = {
        ...style,
        backgroundColor: section.backgroundColor || '#ffffff',
        backgroundImage: section.backgroundGradient && section.backgroundGradient !== 'none'
            ? section.backgroundGradient
            : (section.backgroundImage ? `url(${section.backgroundImage})` : 'none'),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };

    // Section Deletion Logic (Point 15)
    if (section._DELETE_SECTION) return null;

    return (
        <div
            ref={setNodeRef}
            id={`section-${section.id}`}
            style={mainStyle}
            data-section-type={section.type}
            className="w-full relative group"
        >
            {/* Minimalist Edit Controls - Overlay only, doesn't affect layout flow */}
            <div data-html2canvas-ignore className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-[90] flex gap-2">
                <div {...attributes} {...listeners} className="bg-white/90 backdrop-blur-md text-slate-400 p-3 cursor-move hover:text-blue-500 shadow-xl border border-slate-100 rounded-xl">
                    <GripVertical size={16} />
                </div>
                <div
                    onClick={() => setShowStylePanel(!showStylePanel)}
                    className={cn(
                        "bg-white/90 backdrop-blur-md p-3 hover:text-blue-500 shadow-xl border border-slate-100 rounded-xl cursor-pointer transition-all",
                        showStylePanel ? "text-blue-500 border-blue-200 ring-2 ring-blue-50/50" : "text-slate-400"
                    )}
                >
                    <Settings size={16} />
                </div>
            </div>

            {/* Style Panel (Step 1 & 2) */}
            {showStylePanel && StylePanel()}

            {/* Alignment Guides */}
            {guides.showCenterV && (
                <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] z-[9999] pointer-events-none" style={{ background: 'repeating-linear-gradient(to bottom, #06b6d4 0, #06b6d4 4px, transparent 4px, transparent 8px)' }} />
            )}
            {guides.hLines && guides.hLines.map((line, i) => (
                <div key={i} className="absolute left-0 right-0 h-[2px] z-[9999] pointer-events-none" style={{ top: `${line.y}px`, background: 'repeating-linear-gradient(to right, #f43f5e 0, #f43f5e 4px, transparent 4px, transparent 8px)' }} />
            ))}

            {section.type === 'hero' && HeroLayout()}
            {section.type === 'point' && PointLayout()}
            {section.type === 'ingredients' && IngredientsLayout()}
            {section.type === 'comparison' && ComparisonLayout()}
            {section.type === 'review' && ReviewLayout()}
            {section.type === 'texture' && TextureLayout()}
            {section.type === 'description' && StandardLayout()}
            {section.type === 'brand' && BrandLayout()}
            {section.type === 'product_info' && FooterLayout()}

            {!['hero', 'point', 'ingredients', 'comparison', 'review', 'texture', 'description', 'brand', 'product_info'].includes(section.type) && StandardLayout()}

            {section.type === 'custom' && (
                <div className="w-full p-16 relative min-h-[300px]">
                    {renderCustomElements()}
                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                        section={section} field="title" placeholder="섹션 제목을 입력하세요" multiline align="center" className="text-4xl font-bold mb-8" />
                    <EditableText onUpdate={onUpdate} colorPalette={colorPalette} setGuides={setGuides} onElementSelect={onElementSelect} selectedElement={selectedElement}
                        section={section} field="content" placeholder="내용을 입력하세요" multiline className="text-lg" />
                </div>
            )}

            {/* Global Custom Elements Layer (Always fixed on top of layout but relative to section) */}
            {/* REMOVED DUPLICATE RENDER: renderCustomElements() was already called inside specific layouts */}
        </div>
    );
}
