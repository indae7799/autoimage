import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 싱글톤 이벤트 에미터
class ToastEmitter {
    constructor() {
        this.listeners = [];
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    emit(type, message, duration) {
        this.listeners.forEach(listener => listener({ type, message, duration, id: Date.now() }));
    }
}

export const toastEmitter = new ToastEmitter();

// 빠른 사용을 위한 헬퍼 함수
export const toast = {
    success: (msg, duration = 3000) => toastEmitter.emit('success', msg, duration),
    error: (msg, duration = 4000) => toastEmitter.emit('error', msg, duration),
    info: (msg, duration = 3000) => toastEmitter.emit('info', msg, duration)
};

export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const unsubscribe = toastEmitter.subscribe((newToast) => {
            setToasts(prev => [...prev, newToast]);
            
            if (newToast.duration > 0) {
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== newToast.id));
                }, newToast.duration);
            }
        });
        return unsubscribe;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    if (toasts.length === 0) return null;

    return createPortal(
        <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div 
                    key={t.id} 
                    className={cn(
                        "pointer-events-auto flex items-center gap-3 p-4 pr-5 min-w-[300px] max-w-sm bg-white rounded-xl shadow-xl border animate-in slide-in-from-bottom-5 fade-in duration-300",
                        t.type === 'success' ? 'border-emerald-100' :
                        t.type === 'error' ? 'border-red-100' : 'border-blue-100'
                    )}
                >
                    <div className={cn(
                        "flex items-center justify-center p-2 rounded-lg",
                        t.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                        t.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                    )}>
                        {t.type === 'success' && <CheckCircle2 size={18} />}
                        {t.type === 'error' && <AlertCircle size={18} />}
                        {t.type === 'info' && <Info size={18} />}
                    </div>
                    <div className="flex-1 text-sm font-semibold text-slate-700">
                        {t.message}
                    </div>
                    <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>,
        document.body
    );
}
