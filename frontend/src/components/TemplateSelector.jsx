import React, { useState, useEffect } from 'react';
import { getTemplates } from '../services/api';
import { Loader2 } from 'lucide-react';

export default function TemplateSelector({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([
    { id: 'template_kbeauty_basic', name: 'K-Beauty 기본', description: '깔끔하고 세련된 K-뷰티 스타일 템플릿' }
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('template_kbeauty_basic');

  useEffect(() => {
    // 초기 선택 설정
    onSelectTemplate('template_kbeauty_basic');
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // 백엔드에서 최신 템플릿 목록 가져오기 시도 (배경에서 실행)
      const data = await getTemplates();
      const safeData = Array.isArray(data) ? data : [];

      // 'default_template'은 사용자 요청에 따라 제외하고 kbeauty 위주로 필터링
      const filtered = safeData.filter(t => t.id !== 'default_template');

      if (filtered.length > 0) {
        setTemplates(filtered);
      }
    } catch (error) {
      console.log('템플릿 동기화 대기 중 (백엔드 예열 필요)');
    }
  };

  const handleSelect = (templateId) => {
    setSelectedId(templateId);
    onSelectTemplate(templateId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">템플릿 선택</h3>
      <div className="grid grid-cols-2 gap-4">
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
