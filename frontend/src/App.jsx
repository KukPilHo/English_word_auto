import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TypeB_Blank from './pages/TypeB_Blank';
import TypeA_Passage from './pages/TypeA_Passage';
import TestBank from './pages/TestBank';
import SummitBank from './pages/SummitBank';
import Ingest from './pages/Ingest';
import CumulativeTest from './pages/CumulativeTest';
import ReadingOX from './pages/ReadingOX';
import ReadingMatch from './pages/ReadingMatch';
import PassageVariation from './pages/PassageVariation';
import { SettingsProvider } from './store/SettingsContext';
import { AppProvider } from './store/AppContext';
import { HistoryProvider } from './store/HistoryContext';
import { AdminProvider } from './store/AdminContext';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <AdminProvider>
    <SettingsProvider>
      <AppProvider>
        <HistoryProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<TypeB_Blank />} />
              <Route path="/passage" element={<TypeA_Passage />} />
              <Route path="/reading-ox" element={<ReadingOX />} />
              <Route path="/reading-match" element={<ReadingMatch />} />
              <Route path="/cumulative" element={<CumulativeTest />} />
              <Route path="/variation" element={<PassageVariation />} />
              <Route path="/testbank" element={<TestBank />} />
              <Route path="/summit-bank" element={<SummitBank />} />
              <Route path="/ingest" element={<Ingest />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Layout>
        </HistoryProvider>
      </AppProvider>
    </SettingsProvider>
    </AdminProvider>
  );
}
