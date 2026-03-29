import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2분 타임아웃 (AI 처리 시간 고려)
});

// 백엔드 헬스체크 (Cold Start 방지)
export const ping = async () => {
  const response = await api.get('/api/ping');
  return response.data;
};

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

// 이미지 리사이즈 유틸 (업로드 전 프론트엔드에서 압축)
const resizeImageFile = (file, maxSize = 2048, quality = 0.85) => {
  return new Promise((resolve) => {
    // 이미 작은 파일은 그대로 전송 (500KB 이하)
    if (file.size < 500 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // maxSize 내라면 리사이즈 불필요
        if (img.width <= maxSize && img.height <= maxSize) {
          resolve(file);
          return;
        }

        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`[이미지 압축] ${(file.size / 1024).toFixed(0)}KB → ${(resizedFile.size / 1024).toFixed(0)}KB`);
            resolve(resizedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file); // 실패 시 원본
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

// 이미지 업로드 및 처리
export const processImages = async (files, templateId, productName = null, brandName = null) => {
  const formData = new FormData();

  // 업로드 전 이미지 압축 (병렬 처리)
  const resizedFiles = await Promise.all(
    files.map((file) => resizeImageFile(file))
  );

  resizedFiles.forEach((file) => {
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
    timeout: 180000, // 3분 (이미지 처리는 더 오래 걸릴 수 있음)
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
    timeout: 60000, // 1분
  });

  return URL.createObjectURL(response.data);
};

// AI 프롬프트 생성 (4종류 스타일 반환)
export const generatePromptFromImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await api.post('/api/generate-prompt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000, // 30초
  });

  return response.data.result.prompts;
};

export default api;
