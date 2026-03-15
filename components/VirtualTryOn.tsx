'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Shirt, User, ArrowRight, Loader2, Sparkles, RefreshCw, Download, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { getAI } from '@/lib/gemini';

type ClothingType = 'top' | 'bottom' | 'full';
type FullSetMode = 'single' | 'separate';

export default function VirtualTryOn() {
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [topImage, setTopImage] = useState<string | null>(null);
  const [bottomImage, setBottomImage] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  
  const [clothingType, setClothingType] = useState<ClothingType>('top');
  const [fullSetMode, setFullSetMode] = useState<FullSetMode>('single');
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    if (savedKey) setCustomApiKey(savedKey);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', customApiKey);
    localStorage.setItem('gemini_model', selectedModel);
    setShowSettings(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'model' | 'top' | 'bottom' | 'full') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'model') setModelImage(base64);
      else if (type === 'top') setTopImage(base64);
      else if (type === 'bottom') setBottomImage(base64);
      else if (type === 'full') setFullImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const generateTryOn = async () => {
    let imagesToProcess: { data: string, mimeType: string }[] = [];
    let prompt = "";

    if (!modelImage) {
      setError("Vui lòng tải lên ảnh người mẫu.");
      return;
    }

    const modelBase64 = modelImage.split(',')[1];
    imagesToProcess.push({ data: modelBase64, mimeType: "image/png" });

    if (clothingType === 'top') {
      if (!topImage) { setError("Vui lòng tải lên ảnh áo."); return; }
      imagesToProcess.push({ data: topImage.split(',')[1], mimeType: "image/png" });
      prompt = "Replace the top/shirt of the person in Image 1 with the clothing shown in Image 2. Keep face, pose, and background identical.";
    } else if (clothingType === 'bottom') {
      if (!bottomImage) { setError("Vui lòng tải lên ảnh quần."); return; }
      imagesToProcess.push({ data: bottomImage.split(',')[1], mimeType: "image/png" });
      prompt = "Replace the pants/bottom of the person in Image 1 with the clothing shown in Image 2. Keep face, pose, and background identical.";
    } else if (clothingType === 'full') {
      if (fullSetMode === 'single') {
        if (!fullImage) { setError("Vui lòng tải lên ảnh bộ trang phục."); return; }
        imagesToProcess.push({ data: fullImage.split(',')[1], mimeType: "image/png" });
        prompt = "Replace the entire outfit (both top and bottom) of the person in Image 1 with the full outfit shown in Image 2. Keep face, pose, and background identical.";
      } else {
        if (!topImage || !bottomImage) { setError("Vui lòng tải lên cả ảnh áo và ảnh quần."); return; }
        imagesToProcess.push({ data: topImage.split(',')[1], mimeType: "image/png" });
        imagesToProcess.push({ data: bottomImage.split(',')[1], mimeType: "image/png" });
        prompt = "Replace the top of the person in Image 1 with the clothing in Image 2, and replace the bottom of the person in Image 1 with the clothing in Image 3. Keep face, pose, and background identical.";
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const ai = getAI(customApiKey);
      const model = selectedModel;

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            ...imagesToProcess.map(img => ({ inlineData: img })),
            { text: `
              This is a virtual try-on task.
              ${prompt}
              
              CRITICAL CONSTRAINTS:
              1. Keep the person's face, hair, and skin tone EXACTLY the same.
              2. Keep the person's body shape, pose, and orientation EXACTLY the same.
              3. Keep the background and lighting EXACTLY the same.
              4. Ensure the new clothing fits naturally on the person's body following their pose.
            ` }
          ]
        }
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;

      if (!parts) {
        throw new Error("AI không trả về kết quả hợp lệ. Vui lòng thử lại.");
      }

      let foundImage = false;
      for (const part of parts) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("AI không trả về ảnh kết quả. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi trong quá trình xử lý.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setModelImage(null);
    setTopImage(null);
    setBottomImage(null);
    setFullImage(null);
    setResultImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">VIRTUAL TRY-ON AI</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium opacity-60">
              <a href="#" className="hover:opacity-100 transition-opacity">Bộ sưu tập</a>
              <a href="#" className="hover:opacity-100 transition-opacity">Công nghệ</a>
            </nav>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Cài đặt hệ thống</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Mô hình AI (Model)</label>
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-3 bg-black/5 border border-transparent focus:border-black/10 focus:bg-white rounded-xl outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Mặc định)</option>
                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image (Chất lượng cao)</option>
                    <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image (Mới nhất)</option>
                    <option value="imagen-4.0-generate-001">Imagen 4 Generate (Chuyên dụng)</option>
                  </select>
                  <p className="mt-2 text-[11px] text-black/40 leading-relaxed">
                    Chọn mô hình phù hợp với nhu cầu của bạn. Các mô hình Pro/3.1 có thể yêu cầu API Key trả phí.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Gemini API Key</label>
                  <input 
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="Nhập API Key của bạn..."
                    className="w-full px-4 py-3 bg-black/5 border border-transparent focus:border-black/10 focus:bg-white rounded-xl outline-none transition-all text-sm"
                  />
                  <p className="mt-2 text-[11px] text-black/40 leading-relaxed">
                    Khóa này sẽ được lưu cục bộ trên trình duyệt của bạn. Nếu để trống, hệ thống sẽ sử dụng khóa mặc định của máy chủ (nếu có).
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={saveSettings}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-8">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">01. Tải ảnh lên</h2>
              <div className="space-y-6">
                {/* Model Upload */}
                <div className="relative group">
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <User size={16} /> Ảnh người mẫu
                  </label>
                  <div className={`aspect-[3/4] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white ${modelImage ? 'border-black' : 'border-black/10 hover:border-black/30'}`}>
                    {modelImage ? (
                      <div className="relative w-full h-full">
                        <img src={modelImage} alt="Model" className="w-full h-full object-cover" />
                        <button onClick={() => setModelImage(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm transition-colors">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center w-full h-full justify-center">
                        <Upload className="text-black/20 group-hover:text-black transition-colors" size={32} />
                        <span className="text-sm font-medium text-black/40 group-hover:text-black transition-colors">Chọn ảnh người mẫu</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'model')} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Clothing Uploads based on type */}
                <div className="space-y-4">
                  {clothingType === 'top' && (
                    <div className="relative group">
                      <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                        <Shirt size={16} /> Ảnh áo tham chiếu
                      </label>
                      <div className={`aspect-[3/4] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white ${topImage ? 'border-black' : 'border-black/10 hover:border-black/30'}`}>
                        {topImage ? (
                          <div className="relative w-full h-full">
                            <img src={topImage} alt="Top" className="w-full h-full object-cover" />
                            <button onClick={() => setTopImage(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm transition-colors">
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center w-full h-full justify-center">
                            <Upload className="text-black/20 group-hover:text-black transition-colors" size={32} />
                            <span className="text-sm font-medium text-black/40 group-hover:text-black transition-colors">Chọn ảnh áo</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'top')} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {clothingType === 'bottom' && (
                    <div className="relative group">
                      <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                        <Shirt size={16} /> Ảnh quần tham chiếu
                      </label>
                      <div className={`aspect-[3/4] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white ${bottomImage ? 'border-black' : 'border-black/10 hover:border-black/30'}`}>
                        {bottomImage ? (
                          <div className="relative w-full h-full">
                            <img src={bottomImage} alt="Bottom" className="w-full h-full object-cover" />
                            <button onClick={() => setBottomImage(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm transition-colors">
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center w-full h-full justify-center">
                            <Upload className="text-black/20 group-hover:text-black transition-colors" size={32} />
                            <span className="text-sm font-medium text-black/40 group-hover:text-black transition-colors">Chọn ảnh quần</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'bottom')} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {clothingType === 'full' && (
                    <div className="space-y-4">
                      <div className="flex p-1 bg-black/5 rounded-xl text-[12px]">
                        <button 
                          onClick={() => setFullSetMode('single')}
                          className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${fullSetMode === 'single' ? 'bg-white shadow-sm text-black' : 'text-black/40'}`}
                        >
                          Một ảnh full bộ
                        </button>
                        <button 
                          onClick={() => setFullSetMode('separate')}
                          className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${fullSetMode === 'separate' ? 'bg-white shadow-sm text-black' : 'text-black/40'}`}
                        >
                          Ảnh áo & quần riêng
                        </button>
                      </div>

                      {fullSetMode === 'single' ? (
                        <div className="relative group">
                          <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                            <Shirt size={16} /> Ảnh bộ trang phục
                          </label>
                          <div className={`aspect-[3/4] rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white ${fullImage ? 'border-black' : 'border-black/10 hover:border-black/30'}`}>
                            {fullImage ? (
                              <div className="relative w-full h-full">
                                <img src={fullImage} alt="Full Set" className="w-full h-full object-cover" />
                                <button onClick={() => setFullImage(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-sm transition-colors">
                                  <RefreshCw size={14} />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center w-full h-full justify-center">
                                <Upload className="text-black/20 group-hover:text-black transition-colors" size={32} />
                                <span className="text-sm font-medium text-black/40 group-hover:text-black transition-colors">Chọn ảnh bộ đồ</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'full')} />
                              </label>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                            <label className="block text-[10px] font-bold uppercase mb-1">Ảnh áo</label>
                            <div className={`aspect-[3/4] rounded-xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white ${topImage ? 'border-black' : 'border-black/10'}`}>
                              {topImage ? (
                                <div className="relative w-full h-full">
                                  <img src={topImage} alt="Top" className="w-full h-full object-cover" />
                                  <button onClick={() => setTopImage(null)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"><RefreshCw size={10} /></button>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1 p-2 text-center w-full h-full justify-center">
                                  <Upload size={16} className="text-black/20" />
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'top')} />
                                </label>
                              )}
                            </div>
                          </div>
                          <div className="relative group">
                            <label className="block text-[10px] font-bold uppercase mb-1">Ảnh quần</label>
                            <div className={`aspect-[3/4] rounded-xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white ${bottomImage ? 'border-black' : 'border-black/10'}`}>
                              {bottomImage ? (
                                <div className="relative w-full h-full">
                                  <img src={bottomImage} alt="Bottom" className="w-full h-full object-cover" />
                                  <button onClick={() => setBottomImage(null)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"><RefreshCw size={10} /></button>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1 p-2 text-center w-full h-full justify-center">
                                  <Upload size={16} className="text-black/20" />
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'bottom')} />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">02. Loại trang phục</h2>
              <div className="flex p-1 bg-black/5 rounded-xl">
                <button 
                  onClick={() => setClothingType('top')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${clothingType === 'top' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black'}`}
                >
                  Áo
                </button>
                <button 
                  onClick={() => setClothingType('bottom')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${clothingType === 'bottom' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black'}`}
                >
                  Quần
                </button>
                <button 
                  onClick={() => setClothingType('full')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${clothingType === 'full' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black'}`}
                >
                  Full bộ
                </button>
              </div>
            </section>

            <button
              onClick={generateTryOn}
              disabled={isGenerating || !modelImage}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Thử đồ ngay
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {error && (
              <p className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
                {error}
              </p>
            )}
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[32px] p-8 min-h-[600px] flex flex-col shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Kết quả hiển thị</h2>
                {resultImage && (
                  <div className="flex gap-2">
                    <button onClick={reset} className="p-2 hover:bg-black/5 rounded-full transition-colors" title="Làm mới">
                      <RefreshCw size={20} />
                    </button>
                    <a href={resultImage} download="try-on-result.png" className="p-2 hover:bg-black/5 rounded-full transition-colors" title="Tải về">
                      <Download size={20} />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#F9F9F9] border border-black/5 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/20" size={24} />
                      </div>
                      <p className="text-sm font-medium text-black/40 animate-pulse">AI đang phân tích và ghép trang phục...</p>
                    </motion.div>
                  ) : resultImage ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full relative flex items-center justify-center"
                    >
                      <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain" />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center p-12"
                    >
                      <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shirt className="text-black/20" size={40} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Sẵn sàng để thử đồ</h3>
                      <p className="text-black/40 max-w-xs mx-auto">Tải ảnh lên và nhấn nút &quot;Thử đồ ngay&quot; để xem kết quả kỳ diệu từ AI.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="p-4 bg-black/5 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Công nghệ</p>
                  <p className="text-sm font-semibold">Gemini 2.5 Flash</p>
                </div>
                <div className="p-4 bg-black/5 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Độ phân giải</p>
                  <p className="text-sm font-semibold">HD Quality</p>
                </div>
                <div className="p-4 bg-black/5 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Xử lý</p>
                  <p className="text-sm font-semibold">Real-time AI</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-black/40">© 2026 AI Virtual Try-On. Powered by Google Gemini.</p>
          <div className="flex gap-8 text-sm font-medium text-black/60">
            <a href="#" className="hover:text-black transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-black transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-black transition-colors">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
