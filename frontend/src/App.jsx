import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import ImageUploader from './components/ImageUploader';
import { ping, processImages } from './services/api';
import { ToastContainer, toast } from './components/Toast';

const DragDropEditor = lazy(() => import('./components/DragDropEditor'));
import { Loader2, CheckCircle2 } from 'lucide-react';

function App() {
  const [step, setStep] = useState('upload'); // upload -> processing -> editor
  const [selectedTemplateId] = useState('template_kbeauty_basic'); // 템플릿 1개로 고정
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [sections, setSections] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);

  // Memoize image URLs to prevent memory leaks from repeated createObjectURL
  const imageUrls = useMemo(() => {
    return images.map((img, idx) => ({ id: `img-${idx}`, src: URL.createObjectURL(img) }));
  }, [images]);

  // Cleanup blob URLs when images change
  useEffect(() => {
    return () => {
      imageUrls.forEach(img => URL.revokeObjectURL(img.src));
    };
  }, [imageUrls]);

  // Go back to start
  const resetToStart = () => {
    setStep('upload');
    setResult(null);
    setSections([]);
    setImages([]); // 처음으로 갈 때 이미지들 모두 초기화
  };

  // 앱 로드시 백엔드 Warm-up (렌더 Cold Start 방지)
  useEffect(() => {
    console.log('Backend Warm-up Ping sent...');
    ping().catch(() => {
      // Ignore initial ping failure
    });
  }, []);

  const handleImagesSelected = (files) => {
    setImages(files);
    if (files.length > 0) {
      setStep('ready');
    }
  };

  const handleProcess = async () => {
    if (images.length === 0) {
      toast.error('최소 1장 이상의 이미지를 업로드해주세요.');
      return;
    }

    setProcessing(true);
    setStep('processing');
    setLoadingStep(0);

    // 진행 상태 업데이트 (가짜 로딩 스텝)
    const steps = 5;
    let currentStep = 0;
    const msgInterval = setInterval(() => {
      currentStep += 1;
      if (currentStep < steps) {
        setLoadingStep(currentStep);
      }
    }, 4500); // 4.5초마다 1칸씩 (최대 약 20초)

    try {
      const data = await processImages(images, selectedTemplateId);
      // 성공 시 즉시 100% 로딩 처리
      setLoadingStep(steps);
      clearInterval(msgInterval);
      
      setResult(data);
      // Initialize sections with AI-generated content and styles
      const content = data.content || {};
      const initialSections = data.template.sections.map(s => {
        const updatedSection = { ...s };

        // ---- Map AI content by section type ----
        if (s.type === 'hero') {
          const h = content.header || {};

          if (h.mainBrandName || h.eyebrow) {
            // New behavior: Use AI-generated names directly
            // mainBrandName = English product name (from AI)
            // subProductName = Korean translation (from AI)
            updatedSection.eyebrow = h.eyebrow || '';
            updatedSection.mainBrandName = h.mainBrandName || '';
            updatedSection.subProductName = h.subProductName || '';
            updatedSection.content = h.hookText || '';

            if (h.eyebrowStyle) updatedSection.eyebrowStyle = h.eyebrowStyle;
            if (h.mainBrandNameStyle) updatedSection.mainBrandNameStyle = h.mainBrandNameStyle;
            if (h.subProductNameStyle) updatedSection.subProductNameStyle = h.subProductNameStyle;

            delete updatedSection.title;
            delete updatedSection.subtitle;
          } else {
            // Old behavior fallback
            updatedSection.title = h.mainTitle || s.title;
            updatedSection.subtitle = h.subTitle || s.subtitle || '';
            updatedSection.content = h.hookText || '';
            if (h.mainTitleStyle) updatedSection.titleStyle = h.mainTitleStyle;
            if (h.subTitleStyle) updatedSection.subtitleStyle = h.subTitleStyle;
          }

          if (h.hookTextStyle) updatedSection.contentStyle = h.hookTextStyle;
          if (h.sectionBg) updatedSection.backgroundColor = h.sectionBg;
          if (h.mainTitleStyle?.color) updatedSection.textColor = h.mainTitleStyle.color;
          if (h.image_prompt) updatedSection.image_prompt = h.image_prompt;
        }

        else if (s.type === 'point') {
          const pts = content.points || content.header?.points || [];
          updatedSection.title = content.points_title || content.header?.mainTitle || s.title;
          if (pts.length > 0) {
            updatedSection.points = pts;
            pts.forEach((pt, i) => {
              updatedSection[`point${i + 1}Title`] = pt.title || pt.name || '';
              updatedSection[`point${i + 1}Content`] = pt.content || pt.description || '';
            });
          }
          if (content.points_style?.backgroundColor) updatedSection.backgroundColor = content.points_style.backgroundColor;
          if (content.points_style?.color) updatedSection.textColor = content.points_style.color;
          if (content.points_image_prompt) updatedSection.image_prompt = content.points_image_prompt;
        }

        else if (s.type === 'ingredients') {
          const ing = content.ingredients || {};
          updatedSection.title = ing.title || s.title;
          updatedSection.content = ing.description || '';
          if (ing.items && ing.items.length > 0) {
            // Count how many ingredients the AI returned and set it on the section
            updatedSection.itemCount = ing.items.length;
            ing.items.forEach((item, i) => {
              updatedSection[`ing${i + 1}Title`] = item.name || '';
              updatedSection[`ing${i + 1}Content`] = item.description || '';
            });
          }
          if (ing.style?.backgroundColor) updatedSection.backgroundColor = ing.style.backgroundColor;
          if (ing.style?.color) updatedSection.textColor = ing.style.color;
          if (ing.image_prompt) updatedSection.image_prompt = ing.image_prompt;
        }

        else if (s.type === 'comparison') {
          const comp = content.comparison || {};
          updatedSection.title = comp.title || s.title;
          updatedSection.beforeContent = comp.before || '';
          updatedSection.afterContent = comp.after || '';
          updatedSection.afterPercentage = comp.percentage || '221%';
          if (comp.style?.backgroundColor) updatedSection.backgroundColor = comp.style.backgroundColor;
          if (comp.style?.color) updatedSection.textColor = comp.style.color;
          if (comp.image_prompt) updatedSection.image_prompt = comp.image_prompt;
        }

        else if (s.type === 'review') {
          const rev = content.review || {};
          updatedSection.title = rev.title || s.title;
          if (rev.items) {
            rev.items.forEach((r, i) => {
              updatedSection[`reviewer${i + 1}Title`] = r.title || '';
              updatedSection[`reviewer${i + 1}Content`] = r.content || '';
            });
          }
          if (rev.style?.backgroundColor) updatedSection.backgroundColor = rev.style.backgroundColor;
          if (rev.image_prompt) updatedSection.image_prompt = rev.image_prompt;
        }

        else if (s.type === 'texture') {
          const tex = content.texture || {};
          updatedSection.title = tex.title || s.title;
          updatedSection.content = tex.content || '';
          if (tex.style?.backgroundColor) updatedSection.backgroundColor = tex.style.backgroundColor;
          if (tex.image_prompt) updatedSection.image_prompt = tex.image_prompt;
        }

        else if (s.type === 'description') {
          const desc = content.description || {};
          updatedSection.title = desc.title || s.title;
          updatedSection.content = desc.content || '';
          if (desc.style?.backgroundColor) updatedSection.backgroundColor = desc.style.backgroundColor;
          if (desc.image_prompt) updatedSection.image_prompt = desc.image_prompt;
        }

        else if (s.type === 'usage') {
          const usg = content.usage || {};
          updatedSection.title = usg.title || s.title;
          updatedSection.content = usg.content || (usg.steps ? usg.steps.join('\n') : '');
          if (usg.style?.backgroundColor) updatedSection.backgroundColor = usg.style.backgroundColor;
          if (usg.image_prompt) updatedSection.image_prompt = usg.image_prompt;
        }

        else if (s.type === 'brand') {
          const brandData = content.brand || {};
          updatedSection.title = brandData.title || s.title || '브랜드 스토리';
          updatedSection.content = brandData.content || '';
          if (brandData.style?.backgroundColor) updatedSection.backgroundColor = brandData.style.backgroundColor;
          if (brandData.image_prompt) updatedSection.image_prompt = brandData.image_prompt;
        }

        else {
          // fallback for any other custom types
          const fallback = content[s.type] || {};
          updatedSection.title = fallback.title || s.title;
          updatedSection.content = fallback.content || '';
          if (fallback.style?.backgroundColor) updatedSection.backgroundColor = fallback.style.backgroundColor;
          if (fallback.image_prompt) updatedSection.image_prompt = fallback.image_prompt;
        }

        return updatedSection;
      });

      // Inject the Footer layout section dynamically
      const prodInfo = content.product_info || {};
      const aiInfo = data.productInfo || {}; // AI 추출 원천 데이터

      initialSections.push({
        id: `section-footer-${Date.now()}`,
        type: 'product_info',
        itemCount: 1, // Doesn't matter
        backgroundColor: prodInfo.style?.backgroundColor || '#F9FAFB',
        textColor: prodInfo.style?.color || '#475569',
        fullIngredients: prodInfo.full_ingredients || 'Water, Glycerin, Niacinamide...',
        brandName: aiInfo.brandName && aiInfo.brandName !== 'Unknown' ? aiInfo.brandName : '브랜드명을 입력하세요',
        productName: aiInfo.productName && aiInfo.productName !== 'Product' ? aiInfo.productName : '제품명을 입력하세요',
        volume: aiInfo.volume && aiInfo.volume !== '' ? aiInfo.volume : '용량을 입력하세요 (예: 50ml)',
        manufacturer: aiInfo.manufacturer && aiInfo.manufacturer !== '' ? aiInfo.manufacturer : '제조국/제조업자를 입력하세요',
        modelAndExpiration: '모델명 / 사용기한을 입력하세요',
        cautions: '1) 화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이 나타난 경우 전문의 등과 상담할 것\n2) 상처가 있는 부위 등에는 사용을 자제할 것\n3) 보관 및 취급 시의 주의사항\n   가) 어린이의 손이 닿지 않는 곳에 보관할 것\n   나) 직사광선을 피해서 보관할 것',
        shippingNotice: '일반 상품은 결제 완료 후 영업일 기준 1~2일 내에 출고됩니다.\n예약 상품 및 일부 특수 상품의 경우 개별 배송 일정에 따라 추가 기간이 소요될 수 있습니다.\n제주도 및 일부 도서지역은 추가 배송비가 발생할 수 있습니다.',
        exchangeNotice: '상품 수령 후 7일 이내에 교환 및 반품 신청이 가능합니다.\n제품 불량 및 오배송의 경우 반품비는 무료이며, 단순 변심에 의한 왕복 배송비는 고객 부담입니다.\n또한 아래에 해당하는 경우 교환/반품이 제한될 수 있습니다.\n포장 훼손, 사용 흔적이 있는 경우, 구성품이 누락된 경우'
      });

      setSections(initialSections);
      setStep('editor');
    } catch (error) {
      console.error('처리 실패:', error);
      const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류';
      toast.error(`생성 오류: ${errorMessage}`);
      setStep('ready');
    } finally {
      clearInterval(msgInterval);
      setProcessing(false);
    }
  };

  if (step === 'editor' && result) {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-semibold">에디터 준비 중...</h2>
        </div>
      }>
        <DragDropEditor
          sections={sections}
          setSections={setSections}
          images={imageUrls}
          summary={result.productInfo?.summary}
          colorPalette={result.colorPalette}
          onGoBack={resetToStart}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI 상세페이지 생성기 v2.0</h1>
        <div className="flex gap-4">
          <span className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow shadow-blue-500/30 rounded-full text-xs font-bold tracking-wide">K-Beauty Mode</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {(step === 'upload' || step === 'ready') && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">제품 이미지 업로드</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">AI가 이미지를 꼼꼼히 분석하여 매력적인 상세페이지를 만듭니다.</p>
                </div>
              </div>
              <ImageUploader onImagesSelected={handleImagesSelected} images={images} />
              
              {images.length > 0 && (
                <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleProcess}
                      disabled={processing}
                      className="group flex flex-col items-center bg-gradient-to-br from-blue-600 to-purple-600 disabled:opacity-50 text-white py-4 px-12 rounded-xl font-bold tracking-wide hover:from-blue-700 hover:to-purple-700 hover:-translate-y-1 shadow-2xl hover:shadow-blue-500/50 transition-all active:translate-y-0"
                    >
                      <span className="text-lg">AI 상세페이지 생성하기</span>
                      <span className="text-[10px] text-blue-200 mt-1 uppercase tracking-widest font-semibold group-hover:text-white transition-colors">Generate with AI</span>
                    </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-8 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 relative z-10" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">AI가 상세페이지를 제작 중입니다</h2>
            <p className="text-sm font-medium text-slate-500 mb-12">사용하시는 이미지 개수와 크기에 따라 30초~2분 정도 소요될 수 있습니다.</p>
            
            <div className="w-full max-w-lg space-y-4">
               {[
                 { idx: 0, text: '이미지 최적화 및 메타데이터 분석' },
                 { idx: 1, text: '핵심 색상 팔레트 및 제품 특성 추출' },
                 { idx: 2, text: '웹 검색을 통한 제품 상세 정보 보강' },
                 { idx: 3, text: '전문적인 문안 및 헤드라인 생성' },
                 { idx: 4, text: '콘텐츠 매핑 및 최종 레이아웃 확정' }
               ].map((item) => (
                 <div key={item.idx} className="flex items-center gap-4 p-4 rounded-xl transition-all duration-500" style={{ 
                    backgroundColor: loadingStep > item.idx ? '#f0fdf4' : loadingStep === item.idx ? '#eff6ff' : '#f8fafc',
                    borderColor: loadingStep > item.idx ? '#bbf7d0' : loadingStep === item.idx ? '#bfdbfe' : '#f1f5f9',
                    borderWidth: 1
                  }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors duration-500 ${loadingStep > item.idx ? 'bg-green-500 text-white' : loadingStep === item.idx ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-200 text-slate-400'}`}>
                        {loadingStep > item.idx ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{item.idx + 1}</span>}
                    </div>
                    <span className={`text-sm font-bold transition-colors duration-500 ${loadingStep > item.idx ? 'text-green-700' : loadingStep === item.idx ? 'text-blue-700' : 'text-slate-400'}`}>
                        {item.text}
                    </span>
                    {loadingStep === item.idx && <Loader2 size={14} className="ml-auto animate-spin text-blue-400" />}
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
