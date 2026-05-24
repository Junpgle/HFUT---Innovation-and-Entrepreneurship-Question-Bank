import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

const STORAGE_KEY = 'app_ai_api_settings';

export const loadApiSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
};

export default function ApiSettingsModal({ show, onClose }) {
    const [apiBaseUrl, setApiBaseUrl] = useState('https://api.openai.com/v1');
    const [apiKey, setApiKey] = useState('');
    const [apiModel, setApiModel] = useState('gpt-4o-mini');
    const [apiTemperature, setApiTemperature] = useState('0.7');
    const [apiMaxTokens, setApiMaxTokens] = useState('4096');

    useEffect(() => {
        if (!show) return;
        const saved = loadApiSettings();
        if (saved) {
            setApiBaseUrl(saved.apiBaseUrl || 'https://api.openai.com/v1');
            setApiKey(saved.apiKey || '');
            setApiModel(saved.apiModel || 'gpt-4o-mini');
            setApiTemperature(String(saved.apiTemperature ?? '0.7'));
            setApiMaxTokens(String(saved.apiMaxTokens ?? '4096'));
        }
    }, [show]);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            apiBaseUrl: apiBaseUrl.trim(),
            apiKey: apiKey.trim(),
            apiModel: apiModel.trim(),
            apiTemperature: Number(apiTemperature) || 0.7,
            apiMaxTokens: Number(apiMaxTokens) || 4096
        }));
        alert('API 设置已保存');
        onClose();
    };

    if (!show) return null;

    return (
        <div style={{ viewTransitionName: 'modal-backdrop' }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60" onClick={onClose}>
            <div style={{ viewTransitionName: 'modal' }} className="bg-white dark:bg-slate-900 w-full h-[100dvh] sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6 flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">API 设置</h2>
                        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">您的 API 将在本地妥善管理，不会经过我们的后端</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
                </div>
                <div className="p-5 sm:p-6 space-y-3">
                    <input value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} placeholder="API Base URL" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" type="password" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    <input value={apiModel} onChange={e => setApiModel(e.target.value)} placeholder="模型名" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                        <input value={apiTemperature} onChange={e => setApiTemperature(e.target.value)} placeholder="temperature" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                        <input value={apiMaxTokens} onChange={e => setApiMaxTokens(e.target.value)} placeholder="max_tokens" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    </div>
                    <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2">
                        <Save size={16} /> 保存 API 设置
                    </button>
                </div>
            </div>
        </div>
    );
}
