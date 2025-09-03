import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from "./components/Navbar";
import { DbProvider } from './context/DbContext';
import Dashboard from "./pages/Dashboard";
import ObservationTypes from "./pages/ObservationTypes";
import { AffiliationRequestDetail } from './pages/AffiliationRequestDetail';
import RequestConfigPage from './pages/RequestConfigPage';
import AffiliationDetail from './pages/AffiliationDetail';
import { Toaster } from 'sonner';

function App() {
  return (
    <DbProvider>
      <BrowserRouter>
        <Navbar />
        <main className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/observation-types" element={<ObservationTypes />} />
            <Route path="/request/:id" element={<AffiliationRequestDetail />} />
            <Route path="/affiliation/:id" element={<AffiliationDetail />} />
            <Route path="/config" element={<RequestConfigPage />} />
          </Routes>
        </main>
        <Toaster richColors />
      </BrowserRouter>
    </DbProvider>
  );
}

export default App;
