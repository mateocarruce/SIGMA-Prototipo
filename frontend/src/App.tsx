import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { PlanillasPage } from './pages/PlanillasPage';
import { NuevaPlanillaPage } from './pages/NuevaPlanillaPage';
import { RevisarRiesgoPage } from './pages/RevisarRiesgoPage';
import { DetalleIndividualPage } from './pages/DetalleIndividualPage';
import { ConsolidadoPage } from './pages/ConsolidadoPage';
import { CorreccionesPage } from './pages/CorreccionesPage';
import { CatalogoPage } from './pages/CatalogoPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/planillas" element={<PlanillasPage />} />
            <Route path="/planillas/nueva" element={<NuevaPlanillaPage />} />
            <Route path="/planillas/:id/revisar-riesgo" element={<RevisarRiesgoPage />} />
            <Route path="/planillas/:id/consolidado" element={<ConsolidadoPage />} />
            <Route path="/detalles/:id/individual" element={<DetalleIndividualPage />} />
            <Route path="/correcciones" element={<CorreccionesPage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/planillas" replace />} />
          <Route path="*" element={<Navigate to="/planillas" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
