import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { toBlob } from 'html-to-image';
import JSZip from 'jszip';
import { Download, Image as ImageIcon, X } from 'lucide-react';

// 드래그 가능한 이미지 컴포넌트
function DraggableImage({ image, index }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `image-${index}`,
    data: { type: 'image', src: image.url || URL.createObjectURL(image), index },
  });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-colors">
        <img
          src={image.url || URL.createObjectURL(image)}
          alt={`Image ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

// 드롭 가능한 이미지 슬롯
function ImageSlot({ id, image, onRemove, children, frame = 'rectangle' }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'image-slot' },
  });

  const frameClass = {
    rectangle: 'rounded-lg',
    rounded: 'rounded-2xl',
    circle: 'rounded-full',
  }[frame] || 'rounded-lg';

  return (
    <div
      ref={setNodeRef}
      className={`relative w-full h-full border-2 border-dashed overflow-hidden ${isOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
        } ${frameClass}`}
    >
      {image ? (
        <>
          <img src={image} alt="Section" className="w-full h-full object-cover" />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <ImageIcon className="w-12 h-12 mb-2" />
          <span className="text-sm">이미지를 드롭하세요</span>
        </div>
      )}
      {children}
    </div>
  );
}

// 편집 가능한 텍스트 필드
function EditableText({ value, onChange, style, multiline = false, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  const handleBlur = () => {
    onChange(localValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
  };

  if (isEditing) {
    const Component = multiline ? 'textarea' : 'input';
    return (
      <Component
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full border-2 border-blue-400 rounded px-2 py-1 focus:outline-none"
        style={style}
        placeholder={placeholder}
        rows={multiline ? 3 : 1}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-text hover:bg-blue-50 rounded px-2 py-1 transition-colors"
      style={style}
    >
      {value || <span className="text-slate-400">{placeholder}</span>}
    </div>
  );
}

// 섹션 컴포넌트
function Section({ section, content, onUpdate, onImageRemove }) {
  const sectionContent = content[section.type] || {};
  const sectionImages = section.images || {};

  // 필드 값 가져오기
  const getFieldValue = (field) => {
    if (field.type === 'text') {
      // 콘텐츠에서 값 찾기
      if (section.type === 'hero') {
        if (field.id === 'mainTitle') return sectionContent.header?.mainTitle || field.defaultValue || '';
        if (field.id === 'subTitle') return sectionContent.header?.subTitle || field.defaultValue || '';
        if (field.id === 'hookText') return sectionContent.header?.hookText || field.defaultValue || '';
      } else if (section.type === 'ingredients') {
        if (field.id === 'sectionTitle') return sectionContent.ingredients?.title || field.defaultValue || '';
        if (field.id.startsWith('ingredient')) {
          const num = field.id.replace('ingredient', '').replace('Desc', '').replace('Name', '');
          const index = parseInt(num) - 1;
          if (field.id.includes('Desc')) {
            return sectionContent.ingredients?.items?.[index]?.description || field.defaultValue || '';
          } else {
            return sectionContent.ingredients?.items?.[index]?.name || field.defaultValue || '';
          }
        }
      } else if (section.type === 'description') {
        if (field.id === 'sectionTitle') return sectionContent.description?.title || field.defaultValue || '';
        if (field.id === 'descriptionText') return sectionContent.description?.content || field.defaultValue || '';
      } else if (section.type === 'usage') {
        if (field.id === 'sectionTitle') return sectionContent.usage?.title || field.defaultValue || '';
        if (field.id.startsWith('step')) {
          const num = parseInt(field.id.replace('step', ''));
          return sectionContent.usage?.steps?.[num - 1] || field.defaultValue || '';
        }
      }
      return field.defaultValue || '';
    }
    return '';
  };

  const renderField = (field) => {
    if (field.type === 'text') {
      const fieldValue = getFieldValue(field);
      return (
        <div
          key={field.id}
          style={{
            position: 'absolute',
            left: `${field.position.x}px`,
            top: `${field.position.y}px`,
            width: field.size?.width ? `${field.size.width}px` : 'auto',
          }}
        >
          <EditableText
            value={fieldValue}
            onChange={(value) => onUpdate(section.id, field.id, value)}
            style={field.style}
            multiline={field.multiline}
            placeholder={field.placeholder}
          />
        </div>
      );
    } else if (field.type === 'image') {
      const imageKey = `${section.id}-${field.id}`;
      return (
        <div
          key={field.id}
          style={{
            position: 'absolute',
            left: `${field.position.x}px`,
            top: `${field.position.y}px`,
            width: `${field.size.width}px`,
            height: `${field.size.height}px`,
          }}
        >
          <ImageSlot
            id={imageKey}
            image={sectionImages[field.id]}
            onRemove={() => onImageRemove(section.id, field.id)}
            frame={field.frame || 'rectangle'}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="mb-8 bg-white rounded-lg shadow-sm relative"
      style={{
        backgroundColor: section.backgroundColor,
        width: `${section.width || 860}px`,
        height: `${section.height}px`,
        margin: '0 auto',
      }}
      data-section-id={section.id}
    >
      {section.fields.map((field) => renderField(field))}
    </div>
  );
}

export default function Editor({ template, content, images }) {
  const [sections, setSections] = useState(template.sections || []);
  const [sectionImages, setSectionImages] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 콘텐츠를 섹션에 적용 (초기 로드 시)
  React.useEffect(() => {
    if (content && sections.length > 0) {
      // 콘텐츠는 Section 컴포넌트에서 직접 읽어서 표시
      // 여기서는 섹션 구조만 유지
    }
  }, [content, sections]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.data.current?.type === 'image' && over.data.current?.type === 'image-slot') {
      const imageSrc = active.data.current.src;
      const slotId = over.id;
      const [sectionId, fieldId] = slotId.split('-').slice(0, 2);

      setSectionImages((prev) => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [fieldId]: imageSrc,
        },
      }));
    }
  };

  const handleUpdate = (sectionId, fieldId, value) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId) {
          const updatedFields = section.fields.map((field) => {
            if (field.id === fieldId) {
              return { ...field, defaultValue: value };
            }
            return field;
          });
          return { ...section, fields: updatedFields };
        }
        return section;
      })
    );
  };

  const handleImageRemove = (sectionId, fieldId) => {
    setSectionImages((prev) => {
      const newImages = { ...prev };
      if (newImages[sectionId]) {
        delete newImages[sectionId][fieldId];
      }
      return newImages;
    });
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('상세페이지');

      const sectionElements = document.querySelectorAll('[data-section-id]');

      for (let i = 0; i < sectionElements.length; i++) {
        const element = sectionElements[i];
        // Ensure pixel-perfect dimension calculation based on SectionBlock width of 860
        const targetWidth = 860;
        // Height can vary by section content, so we let the DOM dictate or scale appropriately if we had to zoom, but Sections are primarily 860 wide.
        const scale = targetWidth / element.offsetWidth;

        const blob = await toBlob(element, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
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

        folder.file(`${i + 1}.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = '상세페이지.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('다운로드 중 오류가 발생했습니다');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6">
        {/* 왼쪽: 편집 영역 */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">상세페이지 편집</h2>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? '다운로드 중...' : '다운로드'}
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <Section
                key={section.id}
                section={{
                  ...section,
                  images: sectionImages[section.id] || {},
                }}
                content={content}
                images={images}
                onUpdate={handleUpdate}
                onImageDrop={handleImageRemove}
                onImageRemove={handleImageRemove}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽: 이미지 패널 */}
        <div className="w-64 bg-white rounded-lg shadow-sm p-4 h-fit sticky top-4">
          <h3 className="font-semibold text-slate-800 mb-4">업로드된 이미지</h3>
          <div className="space-y-2">
            {images.map((image, index) => (
              <DraggableImage key={index} image={image} index={index} />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-blue-500 bg-white shadow-xl">
            <img
              src={images.find((_, i) => `image-${i}` === activeId)?.url || ''}
              alt="Dragging"
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
