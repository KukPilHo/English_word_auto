import { createContext, useContext, useEffect, useState } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [model, setModel] = useState('gpt-5.4-mini'); // 고정 모델

  useEffect(() => {
    localStorage.setItem('openai_api_key', apiKey);
  }, [apiKey]);

  // 모델은 로컬 스토리지 무시하고 항상 gpt-4o-mini를 쓰도록 함

  return (
    <SettingsContext.Provider value={{ apiKey, setApiKey, model, setModel }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
