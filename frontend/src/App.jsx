import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TypeB_Blank from './pages/TypeB_Blank';
import TypeA_Passage from './pages/TypeA_Passage';
import CumulativeTest from './pages/CumulativeTest';
import ReadingOX from './pages/ReadingOX';
import PassageVariation from './pages/PassageVariation';
import { SettingsProvider } from './store/SettingsContext';
import { AppProvider } from './store/AppContext';
import { HistoryProvider } from './store/HistoryContext';

export default function App() {
  return (
    <SettingsProvider>
      <AppProvider>
        <HistoryProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<TypeB_Blank />} />
              <Route path="/passage" element={<TypeA_Passage />} />
              <Route path="/reading-ox" element={<ReadingOX />} />
              <Route path="/cumulative" element={<CumulativeTest />} />
              <Route path="/variation" element={<PassageVariation />} />
            </Routes>
          </Layout>
        </HistoryProvider>
      </AppProvider>
    </SettingsProvider>
  );
}
