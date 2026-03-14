import { X, Key } from 'lucide-react';
import { useSettings } from '../store/SettingsContext';
import { useState } from 'react';
import { cn } from '../lib/utils';

export default function ApiKeyModal({ isOpen, onClose }) {
  const { apiKey, setApiKey, model, setModel } = useSettings();
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState(model);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(tempKey);
    setModel(tempModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" /> API Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">OpenAI API Key</label>
            <input 
              type="password" 
              value={tempKey} 
              onChange={e => setTempKey(e.target.value)}
              className="w-full border outline-none focus:ring-2 focus:ring-blue-500/50 border-slate-200 rounded-xl px-4 py-3 text-sm transition-all"
              placeholder="sk-..."
            />
            <p className="text-xs text-slate-500 mt-2">이 키는 브라우저의 로컬 저장소에만 안전하게 보관됩니다.</p>
          </div>


        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            취소
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500/50 hover:-translate-y-0.5 transform">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
