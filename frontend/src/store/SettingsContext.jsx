import { createContext, useContext, useEffect, useState } from 'react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [model, setModel] = useState(() => localStorage.getItem('llm_model') || 'gpt-5-mini');

  useEffect(() => {
    localStorage.setItem('openai_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('llm_model', model);
  }, [model]);

  return (
    <SettingsContext.Provider value={{ apiKey, setApiKey, model, setModel }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
