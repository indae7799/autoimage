import React, { useState, useEffect } from 'react';

export default function TemplateSelector({ onSelectTemplate }) {
  const templates = [
    { id: 'template_kbeauty_basic', name: 'K-Beauty 기본', description: '깔끔하고 세련된 K-뷰티 스타일 템플릿' }
  ];
  const [selectedId] = useState('template_kbeauty_basic');

  useEffect(() => {
    // 초기 선택 설정 (K-Beauty 기본)
    onSelectTemplate('template_kbeauty_basic');
  }, []);

  const handleSelect = (templateId) => {
    // 현재는 템플릿이 하나뿐이므로 별도 선택 로직은 단순화
    onSelectTemplate(templateId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">템플릿 선택</h3>
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className={`p-4 rounded-lg border-2 transition-all ${selectedId === template.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
              }`}
          >
            <div className="font-semibold text-slate-800">{template.name}</div>
            {template.description && (
              <div className="text-sm text-slate-500 mt-1">{template.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
