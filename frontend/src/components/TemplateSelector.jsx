import React, { useState, useEffect } from 'react';
import { getTemplates } from '../services/api';
import { Loader2 } from 'lucide-react';

export default function TemplateSelector({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
        onSelectTemplate(data[0].id);
      }
    } catch (error) {
      console.error('템플릿 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (templateId) => {
    setSelectedId(templateId);
    onSelectTemplate(templateId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">템플릿 선택</h3>
      <div className="grid grid-cols-2 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedId === template.id
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
