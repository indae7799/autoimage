import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 템플릿 목록 조회
export const getTemplates = async () => {
  const response = await api.get('/api/templates');
  return response.data.templates;
};

// 템플릿 상세 조회
export const getTemplate = async (templateId) => {
  const response = await api.get(`/api/templates/${templateId}`);
  return response.data;
};

// 이미지 업로드 및 처리
export const processImages = async (files, templateId, productName = null, brandName = null) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const params = new URLSearchParams();
  params.append('template_id', templateId);
  if (productName) params.append('product_name', productName);
  if (brandName) params.append('brand_name', brandName);

  const response = await api.post(`/api/process?${params.toString()}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// 배경 제거 (누끼따기)
export const removeBackground = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await api.post('/api/remove-bg', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });

  return URL.createObjectURL(response.data);
};

// AI 프롬프트 생성
export const generatePromptFromImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await api.post('/api/generate-prompt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.prompt;
};

export default api;
