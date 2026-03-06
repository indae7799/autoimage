import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, closestCorners, rectIntersection, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Sidebar from './Sidebar';
import SectionBlock from './SectionBlock';
import GlobalToolbar from './GlobalToolbar';
import { createPortal } from 'react-dom';
import { Download, Loader2, Crop as CropIcon, X, Check, ArrowLeft } from 'lucide-react';
import { toBlob } from 'html-to-image';
import JSZip from 'jszip';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Lucide icon SVG path data for inline SVG generation
const ICON_SVG_PATHS = {
    Truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    ShieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    Leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 .5 20 .5s-1 5.5-3 11.2A7 7 0 0 1 11 20z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    Droplets: '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
    Sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    Sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
    Heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    CheckCircle2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    Award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    Flower2: '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>',
    Gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
    FlaskConical: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/>',
    BadgeCheck: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    Zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
};

function getIconSvgContent(name) {
    return ICON_SVG_PATHS[name] || '<circle cx="12" cy="12" r="10"/>';
}

// ---- Undo/Redo History ----
function useHistory(initialState) {
    const [history, setHistory] = useState([initialState]);
    const [pointer, setPointer] = useState(0);

    const state = history[pointer];

    const setState = useCallback((newStateOrFn) => {
        setHistory(prev => {
            const current = prev[pointer] ?? prev[prev.length - 1];
            const newState = typeof newStateOrFn === 'function' ? newStateOrFn(current) : newStateOrFn;
            const truncated = prev.slice(0, pointer + 1);
            // Limit history to 50 entries
            const updated = [...truncated, newState].slice(-50);
            setPointer(updated.length - 1);
            return updated;
        });
    }, [pointer]);

    const undo = useCallback(() => {
        setPointer(p => Math.max(0, p - 1));
    }, []);

    const redo = useCallback(() => {
        setPointer(p => Math.min(history.length - 1, p + 1));
    }, [history.length]);

    return { state, setState, undo, redo, canUndo: pointer > 0, canRedo: pointer < history.length - 1 };
}

export default function DragDropEditor({ sections: initialSections, setSections: setParentSections, images: initialImages, summary, colorPalette, onGoBack }) {
    // Undo/Redo aware state
    const { state: sections, setState: setSections, undo, redo, canUndo, canRedo } = useHistory(initialSections);

    // Sync with parent
    useEffect(() => {
        setParentSections(sections);
    }, [sections]);

    // Editable image list (can grow with additional uploads)
    const [images, setImages] = useState(initialImages || []);

    const [activeId, setActiveId] = useState(null);
    const [activeImageId, setActiveImageId] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [zoom, setZoom] = useState(100);

    // Selection state: { sectionId, elementId, type: 'text'|'image', style }
    const [selectedElement, setSelectedElement] = useState(null);

    // Paint / Eyedropper state
    const [paintMode, setPaintMode] = useState(null); // null | 'pick'
    const [pickedColor, setPickedColor] = useState(null);
    const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
    const [magnifierColor, setMagnifierColor] = useState('#000000');

    // ---- Selection Management ----
    const handleElementSelect = useCallback((sectionId, elementId, type, style) => {
        setSelectedElement({ sectionId, elementId, type, style });
    }, []);

    const handleClearSelection = useCallback(() => {
        setSelectedElement(null);
    }, []);

    // ---- Style Update from Toolbar ----
    const handleToolbarStyleUpdate = useCallback((styleKey, value, skipReactUpdate = false) => {
        if (!selectedElement) return;
        const { sectionId, elementId } = selectedElement;
        const styleFieldName = `${elementId}Style`;

        if (!skipReactUpdate) {
            setSections(prev => prev.map(s => {
                if (s.id === sectionId) {
                    const currentStyle = s[styleFieldName] || {};
                    return { ...s, [styleFieldName]: { ...currentStyle, [styleKey]: value } };
                }
                return s;
            }));
        }

        // Update local selection state too
        setSelectedElement(prev => prev ? {
            ...prev,
            style: { ...prev.style, [styleKey]: value }
        } : null);
    }, [selectedElement, setSections]);

    // ---- Duplicate Element ----
    const handleDuplicate = useCallback(() => {
        if (!selectedElement) return;
        const { sectionId, elementId } = selectedElement;

        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                const newId = `custom-${selectedElement.type}-${Math.random().toString(36).substr(2, 9)}`;
                const existingPos = s[`${elementId}Pos`] || { x: 0, y: 0 };
                const existingStyle = s[`${elementId}Style`] || {};
                const existingSize = s[`${elementId}Size`] || {};

                if (selectedElement.type === 'text') {
                    const newElements = [...(s.customElements || []), {
                        id: newId,
                        type: 'text',
                        content: s[elementId] || '복제된 텍스트'
                    }];
                    return {
                        ...s,
                        customElements: newElements,
                        [newId]: s[elementId] || '복제된 텍스트',
                        [`${newId}Pos`]: { x: existingPos.x + 20, y: existingPos.y + 20 },
                        [`${newId}Style`]: { ...existingStyle },
                    };
                } else if (selectedElement.type === 'image') {
                    const origEl = (s.customElements || []).find(e => e.id === elementId);
                    if (origEl) {
                        const newElements = [...(s.customElements || []), {
                            ...origEl,
                            id: newId,
                        }];
                        return {
                            ...s,
                            customElements: newElements,
                            [`${newId}Pos`]: { x: existingPos.x + 20, y: existingPos.y + 20 },
                            [`${newId}Style`]: { ...existingStyle },
                            [`${newId}Size`]: { ...existingSize },
                        };
                    }
                }
            }
            return s;
        }));
    }, [selectedElement, setSections]);

    // ---- Delete Element ----
    const handleDelete = useCallback(() => {
        if (!selectedElement) return;
        const { sectionId, elementId } = selectedElement;

        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                return { ...s, [`_DELETE_ELEMENT_${elementId}`]: true };
            }
            return s;
        }));
        setSelectedElement(null);
    }, [selectedElement, setSections]);

    // ---- Add Text ----
    const handleAddText = useCallback(() => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];
        const newId = `custom-text-${Math.random().toString(36).substr(2, 9)}`;
        setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'text', style: { zIndex: 40 } });

        setSections(prev => prev.map((s) => {
            if (s.id === targetSection.id) {
                return {
                    ...s,
                    customElements: [...(s.customElements || []), { id: newId, type: 'text', content: '새 텍스트' }],
                    [newId]: '새 텍스트',
                    [`${newId}Style`]: { fontSize: 24, fontWeight: 400, fontFamily: 'Pretendard', color: '#000000' },
                    [`${newId}Pos`]: { x: 50, y: 50 },
                };
            }
            return s;
        }));
    }, [sections, setSections]);

    // ---- Add Heading (large title text) ----
    const handleAddHeading = useCallback(() => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];
        const newId = `custom-text-${Math.random().toString(36).substr(2, 9)}`;
        setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'text', style: { zIndex: 40 } });

        setSections(prev => prev.map((s) => {
            if (s.id === targetSection.id) {
                return {
                    ...s,
                    customElements: [...(s.customElements || []), { id: newId, type: 'text', content: '제목' }],
                    [newId]: '제목',
                    [`${newId}Style`]: { fontSize: 48, fontWeight: 800, fontFamily: 'Pretendard', color: '#000000' },
                    [`${newId}Pos`]: { x: 50, y: 50 },
                };
            }
            return s;
        }));
    }, [sections, setSections]);

    // ---- Add Shape ----
    const handleAddShape = useCallback((shapeType) => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];
        const newId = `custom-shape-${Math.random().toString(36).substr(2, 9)}`;

        const isLine = shapeType.startsWith('line');
        const isTriangle = shapeType === 'triangle';

        // Shape dimensions
        const width = isLine ? 300 : 150;
        const height = isLine ? 4 : 150;

        // Shape styles based on type
        let shapeStyle = {
            backgroundColor: isLine ? '#cbd5e1' : '#e2e8f0',
            borderRadius: shapeType === 'circle' ? '50%' : '0',
            opacity: 1,
        };

        if (shapeType === 'line-dashed') {
            shapeStyle = { backgroundColor: 'transparent', borderBottom: '2px dashed #cbd5e1', opacity: 1 };
        } else if (shapeType === 'line-dotted') {
            shapeStyle = { backgroundColor: 'transparent', borderBottom: '3px dotted #cbd5e1', opacity: 1 };
        } else if (shapeType === 'line-double') {
            shapeStyle = { backgroundColor: 'transparent', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', opacity: 1 };
        } else if (shapeType === 'line-gradient') {
            shapeStyle = { background: 'linear-gradient(to right, transparent, #cbd5e1, transparent)', opacity: 1 };
        } else if (isTriangle) {
            shapeStyle = {
                backgroundColor: 'transparent',
                width: 0, height: 0,
                borderLeft: '75px solid transparent',
                borderRight: '75px solid transparent',
                borderBottom: '130px solid #e2e8f0',
                opacity: 1,
            };
        }

        setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'shape', style: { zIndex: 20, ...shapeStyle } });

        setSections(prev => prev.map((s) => {
            if (s.id === targetSection.id) {
                return {
                    ...s,
                    customElements: [...(s.customElements || []), {
                        id: newId,
                        type: 'shape',
                        shapeType: shapeType,
                        width: width,
                        height: isTriangle ? 130 : (shapeType === 'line-double' ? 8 : height),
                    }],
                    [`${newId}Pos`]: { x: 100, y: 100 },
                    [`${newId}Style`]: shapeStyle,
                    [`${newId}Size`]: {
                        w: width,
                        h: isTriangle ? 130 : (shapeType === 'line-double' ? 8 : height),
                    },
                };
            }
            return s;
        }));
    }, [sections, setSections, selectedElement]);

    // ---- Add Frame (Droppable Image Container) ----
    const handleAddFrame = useCallback((frameShape) => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];
        const newId = `custom-frame-${Math.random().toString(36).substr(2, 9)}`;
        const borderRadius = frameShape === 'circle' ? '50%' : frameShape === 'rounded' ? '24px' : frameShape === 'hexagon' ? '16px' : frameShape === 'arch' ? '50% 50% 0 0' : '0';
        setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'frame', style: { zIndex: 25 } });

        setSections(prev => prev.map((s) => {
            if (s.id === targetSection.id) {
                return {
                    ...s,
                    customElements: [...(s.customElements || []), {
                        id: newId,
                        type: 'frame',
                        frameShape: frameShape,
                        width: 250,
                        height: 250,
                        src: null, // Will be filled by image drop
                    }],
                    [`${newId}Pos`]: { x: 100, y: 100 },
                    [`${newId}Style`]: {
                        borderRadius: borderRadius,
                        opacity: 1,
                        border: '2px dashed #94a3b8',
                        backgroundColor: '#f1f5f9',
                    },
                    [`${newId}Size`]: { w: 250, h: 250 },
                };
            }
            return s;
        }));
    }, [sections, setSections]);

    // ---- Add Badge/Sticker (Premium) ----
    const handleAddBadge = useCallback((badge) => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];

        const processBadge = (iconSrc) => {
            const newId = `custom-text-${Math.random().toString(36).substr(2, 9)}`;
            setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'text', style: { zIndex: 40 } });

            setSections(prev => prev.map((s) => {
                if (s.id === targetSection.id) {
                    const elementsToAdd = [];
                    // Add text
                    elementsToAdd.push({ id: newId, type: 'text', content: badge.text });

                    const updates = {
                        ...s,
                        [newId]: badge.text,
                        [`${newId}Style`]: {
                            fontSize: badge.fontSize || 14,
                            fontWeight: badge.fontWeight || 800,
                            fontFamily: badge.fontFamily || 'Pretendard',
                            color: badge.color || '#ffffff',
                            background: badge.gradient || badge.bg || '#ef4444',
                            letterSpacing: badge.letterSpacing || 2,
                            borderRadius: badge.borderRadius || '8px',
                            padding: badge.padding || '6px 16px',
                            boxShadow: badge.shadow || 'none',
                            border: badge.border || 'none',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: 'center'
                        },
                        [`${newId}Pos`]: { x: 50, y: 50 },
                    };

                    // Add icon as adjacent element if exists, or handled via HTML hack if necessary.
                    // Actually, a better approach for badges is to add SVG directly into the text content or a dedicated icon element next to it.
                    // We'll create an adjacent image element for the icon if iconSrc exists.
                    if (iconSrc) {
                        const iconId = `custom-image-${Math.random().toString(36).substr(2, 9)}`;
                        elementsToAdd.push({
                            id: iconId,
                            type: 'image',
                            src: iconSrc,
                            width: (badge.fontSize || 14) + 4,
                            height: (badge.fontSize || 14) + 4,
                        });
                        updates[`${iconId}Pos`] = { x: 50, y: 30 }; // Place slightly above or group them manually
                        updates[`${iconId}Style`] = { opacity: 1, zIndex: 40, pointerEvents: 'none' }; // Keep it unclickable or grouped
                        updates[`${iconId}Size`] = { w: (badge.fontSize || 14) + 4, h: (badge.fontSize || 14) + 4 };
                    }

                    updates.customElements = [...(s.customElements || []), ...elementsToAdd];
                    return updates;
                }
                return s;
            }));
        };

        if (badge.Icon) {
            import('lucide-react').then((mod) => {
                const iconName = badge.Icon.render ? badge.Icon.render.name : (badge.Icon.displayName || badge.Icon.name);
                const color = badge.color || '#ffffff';
                let svgString = `<circle cx="12" cy="12" r="10"/>`; // fallback
                if (iconName && getIconSvgContent(iconName)) {
                    svgString = getIconSvgContent(iconName);
                }
                const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgString}</svg>`;
                processBadge(`data:image/svg+xml,${encodeURIComponent(svgPayload)}`);
            });
        } else {
            processBadge(null);
        }
    }, [sections, setSections, selectedElement]);

    // ---- Add Preset Text (Premium) ----
    const handleAddPresetText = useCallback((preset) => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];

        const processPreset = (iconSrc) => {
            const newId = `custom-text-${Math.random().toString(36).substr(2, 9)}`;
            setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'text', style: { zIndex: 40 } });

            setSections(prev => prev.map((s) => {
                if (s.id === targetSection.id) {
                    const elementsToAdd = [];
                    elementsToAdd.push({ id: newId, type: 'text', content: preset.text });

                    const updates = {
                        ...s,
                        [newId]: preset.text,
                        [`${newId}Style`]: {
                            fontSize: preset.fontSize || 16,
                            fontWeight: preset.fontWeight || 600,
                            fontFamily: 'Pretendard',
                            color: preset.color || '#1a1a2e',
                            background: preset.style?.background || preset.style?.textBg || 'transparent',
                            padding: preset.style?.padding || '10px 20px',
                            borderRadius: preset.style?.borderRadius || '12px',
                            border: preset.style?.border || 'none',
                            boxShadow: preset.style?.boxShadow || 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: 'center'
                        },
                        [`${newId}Pos`]: { x: 50, y: 50 },
                    };

                    if (iconSrc) {
                        const iconId = `custom-image-${Math.random().toString(36).substr(2, 9)}`;
                        elementsToAdd.push({
                            id: iconId,
                            type: 'image',
                            src: iconSrc,
                            width: (preset.fontSize || 16) + 4,
                            height: (preset.fontSize || 16) + 4,
                        });
                        updates[`${iconId}Pos`] = { x: 50, y: 30 };
                        updates[`${iconId}Style`] = { opacity: 1, zIndex: 40, pointerEvents: 'none' };
                        updates[`${iconId}Size`] = { w: (preset.fontSize || 16) + 4, h: (preset.fontSize || 16) + 4 };
                    }

                    updates.customElements = [...(s.customElements || []), ...elementsToAdd];
                    return updates;
                }
                return s;
            }));
        };

        if (preset.Icon) {
            import('lucide-react').then((mod) => {
                const iconName = preset.Icon.render ? preset.Icon.render.name : (preset.Icon.displayName || preset.Icon.name);
                const color = preset.color || '#1a1a2e';
                let svgString = `<circle cx="12" cy="12" r="10"/>`;
                if (iconName && getIconSvgContent(iconName)) {
                    svgString = getIconSvgContent(iconName);
                }
                const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgString}</svg>`;
                processPreset(`data:image/svg+xml,${encodeURIComponent(svgPayload)}`);
            });
        } else {
            processPreset(null);
        }
    }, [sections, setSections, selectedElement]);

    // ---- Add Icon (SVG image element via Lucide) ----
    const handleAddIcon = useCallback((iconData) => {
        if (sections.length === 0) return;
        const targetSection = selectedElement && sections.find(s => s.id === selectedElement.sectionId) ? sections.find(s => s.id === selectedElement.sectionId) : sections[0];

        // Import the Lucide icon dynamically and render to SVG data URL
        import('lucide-react').then((mod) => {
            const IconComponent = mod[iconData.name];
            if (!IconComponent) return;

            // Build SVG string from Lucide icon data
            const iconColor = iconData.color || '#475569';
            const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${getIconSvgContent(iconData.name)}</svg>`;
            const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;

            const newId = `custom-image-${Math.random().toString(36).substr(2, 9)}`;
            setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'image', style: { zIndex: 30 } });

            setSections(prev => prev.map((s) => {
                if (s.id === targetSection.id) {
                    return {
                        ...s,
                        customElements: [...(s.customElements || []), {
                            id: newId,
                            type: 'image',
                            src: dataUrl,
                            width: 45,
                            height: 45,
                        }],
                        [`${newId}Pos`]: { x: 80, y: 80 },
                        [`${newId}Style`]: { opacity: 1, zIndex: 30 },
                        [`${newId}Size`]: { w: 45, h: 45 },
                    };
                }
                return s;
            }));
        });
    }, [sections, setSections, selectedElement]);

    // ---- Add Section ----
    const handleAddSection = useCallback(() => {
        const newSection = {
            id: `section-${Math.random().toString(36).substr(2, 9)}`,
            type: 'custom',
            title: '새 섹션',
            content: '여기에 내용을 입력하세요',
            backgroundColor: '#ffffff',
            textColor: '#1a2e22',
        };
        setSections(prev => [...prev, newSection]);
    }, [setSections]);

    // ---- Add Image (from sidebar upload) ----
    const handleAddImage = useCallback((imgObj) => {
        setImages(prev => [...prev, imgObj]);
    }, []);

    // ---- Flip ----
    const handleFlip = useCallback((axis) => {
        if (!selectedElement) return;
        const { sectionId, elementId } = selectedElement;
        const styleFieldName = `${elementId}Style`;

        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                const currentStyle = s[styleFieldName] || {};
                const key = axis === 'h' ? 'scaleX' : 'scaleY';
                return { ...s, [styleFieldName]: { ...currentStyle, [key]: (currentStyle[key] || 1) * -1 } };
            }
            return s;
        }));
    }, [selectedElement, setSections]);

    // ---- Layer ordering ----
    const handleLayerChange = useCallback((direction) => {
        if (!selectedElement) return;
        const { sectionId, elementId } = selectedElement;
        const styleFieldName = `${elementId}Style`;

        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                const currentStyle = s[styleFieldName] || {};
                const z = currentStyle.zIndex || 10;
                return { ...s, [styleFieldName]: { ...currentStyle, zIndex: direction === 'up' ? z + 1 : Math.max(10, z - 1) } };
            }
            return s;
        }));
    }, [selectedElement, setSections]);

    // ---- Lock toggle ----
    const handleLockToggle = useCallback(() => {
        if (!selectedElement) return;
        setSelectedElement(prev => prev ? { ...prev, locked: !prev.locked } : null);
    }, [selectedElement]);

    // ---- Remove Background ----
    const handleRemoveBg = useCallback(async () => {
        if (!selectedElement || selectedElement.type !== 'image') return;
        // Call backend API for bg removal
        alert('누끼따기 기능은 백엔드 설정 후 사용 가능합니다.');
    }, [selectedElement]);

    // ---- Crop Image ----
    const [cropModalData, setCropModalData] = useState(null); // { sectionId, elementId, imgSrc }
    const [cropState, setCropState] = useState({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
    const imgRef = useRef(null);

    const handleCrop = useCallback(() => {
        if (!selectedElement || selectedElement.type !== 'image') return;
        const { sectionId, elementId } = selectedElement;
        const section = sections.find(s => s.id === sectionId);
        if (!section) return;

        let imgSrc = null;
        if (elementId.startsWith('custom-')) {
            const el = (section.customElements || []).find(e => e.id === elementId);
            imgSrc = el?.originalSrc || el?.src;
        } else {
            imgSrc = section[`${elementId}Original`] || section[elementId];
        }

        if (!imgSrc) { alert('자를 이미지가 없습니다.'); return; }

        // Open modal
        setCropModalData({ sectionId, elementId, imgSrc });
        setCropState({ unit: '%', width: 100, height: 100, x: 0, y: 0 }); // Default full crop
    }, [selectedElement, sections]);

    const performCrop = async () => {
        if (!imgRef.current || !cropState.width || !cropState.height) {
            setCropModalData(null);
            return;
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');

        // cropState is in percentages because we initialized it with { unit: '%' }
        const cropX = (cropState.x * image.naturalWidth) / 100;
        const cropY = (cropState.y * image.naturalHeight) / 100;
        const cropW = (cropState.width * image.naturalWidth) / 100;
        const cropH = (cropState.height * image.naturalHeight) / 100;

        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');

        // Draw cropped area
        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropW,
            cropH,
            0,
            0,
            cropW,
            cropH
        );

        const croppedDataUrl = canvas.toDataURL('image/png');

        setSections(prev => prev.map(s => {
            if (s.id === cropModalData.sectionId) {
                if (cropModalData.elementId.startsWith('custom-')) {
                    const updatedCE = (s.customElements || []).map(e =>
                        e.id === cropModalData.elementId
                            ? { ...e, src: croppedDataUrl, originalSrc: e.originalSrc || cropModalData.imgSrc }
                            : e
                    );
                    return { ...s, customElements: updatedCE };
                } else {
                    return {
                        ...s,
                        [cropModalData.elementId]: croppedDataUrl,
                        [`${cropModalData.elementId}Original`]: s[`${cropModalData.elementId}Original`] || cropModalData.imgSrc
                    };
                }
            }
            return s;
        }));

        setCropModalData(null);
    };

    // ---- Paint / Eyedropper Mode ----
    const handlePaintModeToggle = useCallback(() => {
        if (paintMode === 'pick') {
            setPaintMode(null);
            setPickedColor(null);
        } else {
            // Try native EyeDropper API first
            if (window.EyeDropper) {
                const eyeDropper = new window.EyeDropper();
                eyeDropper.open().then((result) => {
                    const color = result.sRGBHex;
                    setPickedColor(color);
                    // Auto-apply to selected element if available
                    if (selectedElement) {
                        const target = selectedElement.type === 'text' ? 'color' : 'backgroundColor';
                        handleToolbarStyleUpdate(target, color);
                    }
                    setPaintMode(null);
                }).catch(() => {
                    setPaintMode(null);
                });
            } else {
                // Fallback: canvas-based color picking
                setPaintMode('pick');
            }
        }
    }, [paintMode, selectedElement, handleToolbarStyleUpdate]);

    // Canvas-based eyedropper: capture canvas on paint mode
    useEffect(() => {
        if (paintMode !== 'pick') return;

        const handleMouseMove = (e) => {
            setMagnifierPos({ x: e.clientX, y: e.clientY });

            // Get pixel color from elements under cursor
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el) {
                const computed = window.getComputedStyle(el);
                const bgColor = computed.backgroundColor;
                if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                    // Convert rgb to hex
                    const match = bgColor.match(/\d+/g);
                    if (match && match.length >= 3) {
                        const hex = '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
                        setMagnifierColor(hex);
                    }
                } else if (el.tagName === 'IMG') {
                    // For images, sample pixel from canvas
                    try {
                        const canvas = document.createElement('canvas');
                        const rect = el.getBoundingClientRect();
                        canvas.width = el.naturalWidth || rect.width;
                        canvas.height = el.naturalHeight || rect.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
                        const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
                        const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
                        const data = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
                        const hex = '#' + [data[0], data[1], data[2]].map(x => x.toString(16).padStart(2, '0')).join('');
                        setMagnifierColor(hex);
                    } catch (e) {
                        // CORS - can't read pixel
                    }
                }
            }
        };

        const handleClick = (e) => {
            // Prevent default to avoid selecting elements
            e.preventDefault();
            e.stopPropagation();
            setPickedColor(magnifierColor);

            // Auto-apply to selected element
            if (selectedElement) {
                const target = selectedElement.type === 'text' ? 'color' : 'backgroundColor';
                handleToolbarStyleUpdate(target, magnifierColor);
            }
            setPaintMode(null);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setPaintMode(null);
                setPickedColor(null);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.cursor = 'crosshair';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.cursor = '';
        };
    }, [paintMode, magnifierColor, selectedElement, handleToolbarStyleUpdate]);

    const [clipboard, setClipboard] = useState(null);

    // ---- Keyboard Shortcuts ----
    useEffect(() => {
        const handler = (e) => {
            // Ignore if typing in an input
            const isInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable;

            // Ctrl+Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isInput) {
                e.preventDefault();
                undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z: Redo
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) && !isInput) {
                e.preventDefault();
                redo();
            }
            // Ctrl+C: Copy
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isInput) {
                if (selectedElement) {
                    setClipboard(selectedElement);
                    console.log('Copied element to clipboard:', selectedElement);
                }
            }
            // Ctrl+V: Paste
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isInput) {
                if (clipboard) {
                    const { sectionId, elementId } = clipboard;
                    // Always paste into the current section of the clipboarded element for simplicity, but offset it
                    setSections(prev => prev.map(s => {
                        if (s.id === sectionId) {
                            const newId = `custom-${clipboard.type}-${Math.random().toString(36).substr(2, 9)}`;
                            const existingPos = s[`${elementId}Pos`] || { x: 0, y: 0 };
                            const existingStyle = s[`${elementId}Style`] || {};
                            const existingSize = s[`${elementId}Size`] || {};

                            if (clipboard.type === 'text') {
                                const newElements = [...(s.customElements || []), {
                                    id: newId,
                                    type: 'text',
                                    content: s[elementId] || '복제된 텍스트'
                                }];
                                return {
                                    ...s,
                                    customElements: newElements,
                                    [newId]: s[elementId] || '복제된 텍스트',
                                    [`${newId}Pos`]: { x: existingPos.x + 20, y: existingPos.y + 20 },
                                    [`${newId}Style`]: { ...existingStyle },
                                };
                            } else if (clipboard.type === 'image' || clipboard.type === 'shape' || clipboard.type === 'frame') {
                                const origEl = (s.customElements || []).find(e => e.id === elementId);
                                if (origEl) {
                                    const newElements = [...(s.customElements || []), {
                                        ...origEl,
                                        id: newId,
                                    }];
                                    return {
                                        ...s,
                                        customElements: newElements,
                                        [`${newId}Pos`]: { x: existingPos.x + 20, y: existingPos.y + 20 },
                                        [`${newId}Style`]: { ...existingStyle },
                                        [`${newId}Size`]: { ...existingSize },
                                    };
                                }
                            }
                        }
                        return s;
                    }));
                }
            }
            // Ctrl+D: Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !isInput) {
                e.preventDefault();
                handleDuplicate();
            }
            // Delete or Backspace: Delete (only if not editing text)
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement && !isInput) {
                e.preventDefault();
                handleDelete();
            }
            // Escape: Clear selection
            if (e.key === 'Escape') {
                setSelectedElement(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, handleDuplicate, handleDelete, selectedElement, clipboard]);

    // ---- Download ----
    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder('상세페이지_결과');
            const sectionElements = document.querySelectorAll('[data-section-type]');

            for (let i = 0; i < sectionElements.length; i++) {
                const element = sectionElements[i];

                // Ensure pixel-perfect dimension calculation based on standard desktop width 1140
                const targetWidth = 1140;
                // Height can vary by section content, so we let the DOM dictate or scale appropriately if we had to zoom, but Sections are now responsive.
                const scale = targetWidth / element.offsetWidth;

                const blob = await toBlob(element, {
                    pixelRatio: 2,
                    backgroundColor: 'transparent',
                    width: targetWidth,
                    height: element.offsetHeight * scale,
                    style: {
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        width: `${element.offsetWidth}px`,
                        height: `${element.offsetHeight}px`
                    },
                    fontEmbedCSS: '', // Skip embedding fonts to prevent CORS SecurityError
                    filter: (node) => {
                        // Exclude nodes with data-html2canvas-ignore
                        if (node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
                            return false;
                        }
                        return true;
                    }
                });
                folder.file(`section-${i + 1}.png`, blob);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = '상세페이지_이미지_패키지.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsDownloading(false);
        }
    };

    // ---- DnD ----
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Custom collision detection: prioritize image slots/frame drops when dragging images
    const customCollisionDetection = useCallback((args) => {
        // First check pointer-based collisions (more precise for nested droppables)
        const pointerCollisions = pointerWithin(args);

        // If we have pointer collisions, prioritize slot/frame targets over section targets
        if (pointerCollisions.length > 0) {
            const slotCollision = pointerCollisions.find(c =>
                String(c.id).endsWith('-slot') || String(c.id).endsWith('-frame-drop')
            );
            if (slotCollision) return [slotCollision];
        }

        // Fall back to rect intersection for broader matching  
        const rectCollisions = rectIntersection(args);
        if (rectCollisions.length > 0) {
            const slotCollision = rectCollisions.find(c =>
                String(c.id).endsWith('-slot') || String(c.id).endsWith('-frame-drop')
            );
            if (slotCollision) return [slotCollision];
        }

        // Final fallback: closestCorners for section reordering
        return closestCorners(args);
    }, []);

    const handleDragStart = (event) => {
        const { active } = event;
        if (active.data.current?.type === 'section') setActiveId(active.id);
        else if (active.data.current?.type === 'image') setActiveImageId(active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        console.log('[DragEnd] active:', active?.id, 'type:', active?.data?.current?.type, 'over:', over?.id);

        if (active.data.current?.type === 'section' && over && active.id !== over.id) {
            setSections((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }

        if (active.data.current?.type === 'image' && over) {
            const overId = String(over.id);
            const imageSrc = active.data.current.src;

            // Handle frame drop (custom frame element)
            if (overId.includes('__') && overId.endsWith('-frame-drop')) {
                const [sectionId, rest] = overId.split('__');
                const fieldName = rest.replace('-frame-drop', '');
                setSections(prev => prev.map(section =>
                    section.id === sectionId ? {
                        ...section,
                        [`${fieldName}FrameSrc`]: imageSrc,
                        [`${fieldName}ImgTransform`]: { x: 0, y: 0, scale: 1 },
                    } : section
                ));
            } else if (overId.includes('__') && overId.endsWith('-slot')) {
                const [sectionId, rest] = overId.split('__');
                const fieldName = rest.replace('-slot', '');
                setSections(prev => prev.map(section =>
                    section.id === sectionId ? { ...section, [fieldName]: imageSrc } : section
                ));
            } else {
                // If dropped anywhere else on a section (not a specific slot), add as a free floating custom image
                const targetSectionId = overId.split('__')[0].replace('-slot', '');
                const newId = `custom-image-${Math.random().toString(36).substr(2, 9)}`;
                setSections(prev => prev.map(section => {
                    if (section.id === targetSectionId) {
                        return {
                            ...section,
                            customElements: [...(section.customElements || []), {
                                id: newId,
                                type: 'image',
                                src: imageSrc,
                                width: 300,
                                height: 300,
                                frameType: 'rectangle'
                            }],
                            [`${newId}Pos`]: { x: 50, y: 50 },
                            [`${newId}Size`]: { w: 300, h: 300 },
                            [`${newId}Style`]: { zIndex: 50, opacity: 1 } // Super high z-index on drop so it's visible
                        };
                    }
                    return section;
                }));
                setSelectedElement({ sectionId: targetSectionId, elementId: newId, type: 'image', style: { zIndex: 50 } });
            }
        }

        setActiveId(null);
        setActiveImageId(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-screen bg-slate-100 overflow-hidden" onPointerDown={(e) => {
                // Clear selection when clicking on truly empty canvas area only
                const isOnElement = e.target.closest('[data-element-id]') || e.target.closest('[class*="group/resizable"]') || e.target.closest('[class*="group/text"]') || e.target.closest('.resize-handle-corner') || e.target.closest('.global-toolbar') || e.target.closest('.sidebar') || e.target.closest('[data-section-type]');
                if (!isOnElement) {
                    handleClearSelection();
                }
            }}>
                {/* Editor Header */}
                <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-[10000] shadow-sm">
                    <div className="flex items-center gap-3">
                        {onGoBack && (
                            <button
                                onClick={() => { if (confirm('편집 내용이 저장되지 않습니다. 처음 화면으로 돌아가시겠습니까?')) onGoBack(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-xs font-semibold"
                                title="처음으로 돌아가기"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">처음으로</span>
                            </button>
                        )}
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg">AI</div>
                        <div>
                            <h1 className="text-sm font-black text-slate-800 tracking-tight">AI Page Editor</h1>
                            <p className="text-[10px] font-medium text-slate-400">상세페이지 생성기 v2.0</p>
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> 처리중...</>
                        ) : (
                            <><Download className="w-4 h-4" /> 이미지 다운로드</>
                        )}
                    </button>
                </header>

                {/* Global Toolbar (always fixed below header) */}
                <GlobalToolbar
                    selectedElement={selectedElement}
                    onStyleUpdate={handleToolbarStyleUpdate}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onAddText={handleAddText}
                    onAddShape={handleAddShape}
                    onAddFrame={handleAddFrame}
                    onAddSection={handleAddSection}
                    onRemoveBg={handleRemoveBg}
                    onResetImagePos={() => {
                        if (!selectedElement) return;
                        const { sectionId, elementId } = selectedElement;
                        setSections(prev => prev.map(s =>
                            s.id === sectionId ? { ...s, [`${elementId}Transform`]: { x: 0, y: 0, scale: 1 } } : s
                        ));
                    }}
                    onLayerUp={() => handleLayerChange('up')}
                    onLayerDown={() => handleLayerChange('down')}
                    onFlipH={() => handleFlip('h')}
                    onFlipV={() => handleFlip('v')}
                    onLockToggle={handleLockToggle}
                    onCrop={handleCrop}
                    paintMode={paintMode}
                    onPaintModeToggle={handlePaintModeToggle}
                    pickedColor={pickedColor}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    colorPalette={colorPalette}
                    zoom={zoom}
                    onZoomChange={setZoom}
                />

                <div className="flex flex-1 overflow-hidden" style={{ marginTop: '44px' }}>
                    {/* Left: Canvas */}
                    <div className="flex-1 overflow-y-auto bg-slate-100/50 flex flex-col items-center py-8 custom-scrollbar">
                        <div
                            className="bg-white min-h-[1056px] relative shadow-[0_0_40px_rgba(0,0,0,0.05)]"
                            style={{
                                width: `${860 * zoom / 100}px`,
                                maxWidth: zoom > 100 ? 'none' : '860px',
                                transition: 'width 0.2s',
                            }}
                        >
                            {/* AI Summary */}
                            {summary && (
                                <div className="p-10 bg-slate-50/50 border-b border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[9px] font-black">AI</div>
                                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planning Summary</h2>
                                    </div>
                                    <div className="text-sm font-medium leading-relaxed text-slate-600 whitespace-pre-wrap italic">
                                        {summary}
                                    </div>
                                </div>
                            )}

                            <SortableContext items={sections} strategy={verticalListSortingStrategy}>
                                {sections.map((section) => (
                                    <SectionBlock
                                        key={section.id}
                                        section={section}
                                        images={images}
                                        colorPalette={colorPalette}
                                        selectedElement={selectedElement}
                                        onElementSelect={handleElementSelect}
                                        onUpdate={(id, fieldOrUpdates, value) => {
                                            // Handle section deletion — remove from array entirely
                                            if (fieldOrUpdates === '_DELETE_SECTION') {
                                                setSections(prev => prev.filter(s => s.id !== id));
                                                setSelectedElement(null);
                                                return;
                                            }
                                            if (typeof fieldOrUpdates === 'object') {
                                                setSections(prev => prev.map(s =>
                                                    s.id === id ? { ...s, ...fieldOrUpdates } : s
                                                ));
                                            } else {
                                                setSections(prev => prev.map(s =>
                                                    s.id === id ? { ...s, [fieldOrUpdates]: value } : s
                                                ));
                                            }
                                        }}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="w-72 bg-white border-l border-slate-200 shadow-xl z-10 overflow-hidden">
                        <Sidebar
                            images={images}
                            sections={sections}
                            colorPalette={colorPalette}
                            onAddText={handleAddText}
                            onAddHeading={handleAddHeading}
                            onAddShape={handleAddShape}
                            onAddFrame={handleAddFrame}
                            onAddBadge={handleAddBadge}
                            onAddPresetText={handleAddPresetText}
                            onAddIcon={handleAddIcon}
                            onAddImage={handleAddImage}
                            onImageClick={(image) => {
                                // Add image as free element
                                if (sections.length === 0) return;
                                const targetSection = selectedElement ? sections.find(s => s.id === selectedElement.sectionId) || sections[0] : sections[0];
                                const newId = `custom-image-${Math.random().toString(36).substr(2, 9)}`;

                                // Calculate scroll-aware position so image appears in the visible area
                                const canvasEl = document.querySelector('.flex-1.overflow-y-auto');
                                const sectionEl = document.querySelector(`[data-section-type]`);
                                let posY = 100;
                                if (canvasEl && sectionEl) {
                                    const scrollTop = canvasEl.scrollTop;
                                    const canvasRect = canvasEl.getBoundingClientRect();
                                    // Find the target section element
                                    const allSections = document.querySelectorAll('[data-section-type]');
                                    let targetEl = null;
                                    allSections.forEach(el => {
                                        // Match by checking if this section's data attribute relates to the target
                                        const rect = el.getBoundingClientRect();
                                        if (rect.top <= canvasRect.top + canvasRect.height / 2 && rect.bottom >= canvasRect.top + canvasRect.height / 2) {
                                            targetEl = el;
                                        }
                                    });
                                    if (targetEl) {
                                        const tRect = targetEl.getBoundingClientRect();
                                        posY = canvasRect.top + canvasRect.height / 2 - tRect.top - 150;
                                    } else {
                                        posY = scrollTop > 200 ? scrollTop - 100 : 100;
                                    }
                                }

                                setSections(prev => prev.map(s => {
                                    if (s.id === targetSection.id) {
                                        return {
                                            ...s,
                                            customElements: [...(s.customElements || []), {
                                                id: newId,
                                                type: 'image',
                                                src: image.src,
                                                width: 300,
                                                height: 300,
                                                frameType: 'rectangle'
                                            }],
                                            [`${newId}Pos`]: { x: 50, y: Math.max(50, posY) },
                                            [`${newId}Size`]: { w: 300, h: 300 },
                                            [`${newId}Style`]: { zIndex: 30, opacity: 1 }
                                        };
                                    }
                                    return s;
                                }));
                                setSelectedElement({ sectionId: targetSection.id, elementId: newId, type: 'image', style: { zIndex: 30 } });
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Paint Mode Magnifier Overlay */}
            {paintMode === 'pick' && (
                <div
                    className="fixed z-[99999] pointer-events-none"
                    style={{
                        left: magnifierPos.x + 20,
                        top: magnifierPos.y - 80,
                    }}
                >
                    <div className="flex flex-col items-center">
                        {/* Magnifier circle */}
                        <div className="w-16 h-16 rounded-full border-4 border-white shadow-2xl flex items-center justify-center relative overflow-hidden"
                            style={{ backgroundColor: magnifierColor }}
                        >
                            {/* Crosshair */}
                            <div className="absolute w-px h-full bg-white/50" />
                            <div className="absolute w-full h-px bg-white/50" />
                        </div>
                        {/* Color label */}
                        <div className="mt-1 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-lg">
                            {magnifierColor}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded mt-0.5 shadow">
                            클릭으로 색상 선택 · ESC 취소
                        </div>
                    </div>
                </div>
            )}

            {createPortal(
                <DragOverlay>
                    {activeId ? (
                        <div className="bg-white p-4 shadow-2xl rounded-lg border-2 border-blue-400 opacity-80 cursor-grabbing">
                            섹션 이동 중...
                        </div>
                    ) : null}
                    {activeImageId ? (
                        <div className="w-20 h-20 rounded-lg overflow-hidden shadow-xl border-2 border-blue-400 cursor-grabbing">
                            <img src={images.find(img => img.id === activeImageId)?.src} className="w-full h-full object-cover" />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}

            {/* Visual Crop Modal Overlay */}
            {cropModalData && (
                <div className="fixed inset-0 z-[100000] bg-black/80 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-700">
                        {/* Header */}
                        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <CropIcon size={16} className="text-blue-400" /> 이미지 자르기
                            </h3>
                            <button onClick={() => setCropModalData(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Crop Area */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center bg-black/50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMmQzNzQ4Ii8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzFhMjAyYyIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxYTIwMmMiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzJkMzc0OCIvPjwvc3ZnPg==')]">
                            <ReactCrop
                                crop={cropState}
                                onChange={(_, percentCrop) => setCropState(percentCrop)}
                            >
                                <img
                                    ref={imgRef}
                                    src={cropModalData.imgSrc}
                                    alt="Crop me"
                                    className="max-w-2xl w-full h-auto shadow-2xl"
                                    crossOrigin="anonymous"
                                />
                            </ReactCrop>
                        </div>

                        {/* Footer - Actions */}
                        <div className="h-16 px-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
                            <button
                                onClick={() => setCropModalData(null)}
                                className="px-5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors"
                            >취소</button>
                            <button
                                onClick={performCrop}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Check size={16} /> 자르기 적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DndContext>
    );
}
