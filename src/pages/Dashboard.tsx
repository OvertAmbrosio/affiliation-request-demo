import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDbContext } from '../context/DbContext';
import { getAllAffiliations } from '../services/affiliation';
import { getAffiliationRequests } from '../services/affiliation-request';
import { SimulationLog, type LogEntry } from '../components/SimulationLog';
import type { AffiliationListView, AffiliationRequestListView } from '../interfaces/views';
import { getStatusVariant, getStatusIcon } from '../utils/statusUtils';
import type { AllStatuses } from '../interfaces/enums.type';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';

import { runStandardSimulations } from '../services/simulation/run-observed-simulation';
import { toast } from 'sonner';

export default function Dashboard() {
  const { db, isLoading: isDbLoading, error: dbError } = useDbContext();
  const [affiliations, setAffiliations] = useState<AffiliationListView[]>([]);
  const [requests, setRequests] = useState<AffiliationRequestListView[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchData = () => {
    if (!db) return;
    setAffiliations(getAllAffiliations(db));
    setRequests(getAffiliationRequests(db));
  };

  useEffect(() => {
    fetchData();
  }, [db]);

    const handleRunSimulation = async () => {
    if (!db) {
      toast.error('La base de datos no está lista.');
      return;
    }

    setLogs([]);
    setIsSimulating(true);
        toast.info('Iniciando simulación estándar...');

    try {
            await runStandardSimulations(db, (level: LogEntry['level'], message: string) => {
        setLogs((prevLogs) => [...prevLogs, { level, message, timestamp: new Date().toISOString() }]);
      });
            setLogs((prevLogs) => [...prevLogs, { level: 'success', message: 'Simulación completada. Se generaron los casos de prueba estándar.', timestamp: new Date().toISOString() }]);
      fetchData(); // Refresh data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      setLogs((prevLogs) => [...prevLogs, { level: 'error', message: `Error en la simulación: ${errorMessage}`, timestamp: new Date().toISOString() }]);
      toast.error(`Error en la simulación: ${errorMessage}`);
      console.error('Simulation Error:', error);
    } finally {
      setIsSimulating(false);
    }
  };



  const handleDownloadDb = () => {
    if (!db) return;
    const data = db.export();
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'culqi-demo.db';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isDbLoading) return <div>Cargando base de datos...</div>;
  if (dbError) return <div>Error al cargar la base de datos: {dbError.message}</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-4 mb-4">

                <Button onClick={handleRunSimulation} disabled={isSimulating} variant="secondary">
                    {isSimulating ? 'Simulando...' : 'Generar Casos de Prueba'}
        </Button>
        <Button onClick={handleDownloadDb} variant="secondary">Descargar BBDD</Button>
      </div>

      {(isSimulating || logs.length > 0) && <SimulationLog logs={logs} />}

      <Card>
        <CardHeader>
          <CardTitle>Afiliaciones</CardTitle>
          <CardDescription>Lista de todas las afiliaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Afiliación</TableHead>
                <TableHead>Comercio</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Paso Actual</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliations.map((aff) => (
                <TableRow key={aff.id}>
                  <TableCell className="font-medium">{aff.id}</TableCell>
                  <TableCell>{aff.business_name}</TableCell>
                  <TableCell>{aff.product_name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(aff.status as AllStatuses)} className="capitalize">
                      {React.createElement(getStatusIcon(aff.status as AllStatuses), { size: 16, className: 'mr-1' })}
                      {aff.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{aff.current_step}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/affiliation/${aff.id}`}>Ver Detalle</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Afiliación</CardTitle>
          <CardDescription>Solicitudes que requieren revisión y aprobación manual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Solicitud</TableHead>
                <TableHead>ID Afiliación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Revisado Por</TableHead>
                <TableHead>Fecha Revisión</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.id}</TableCell>
                  <TableCell>{req.affiliation_id}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                  </TableCell>
                  <TableCell>{req.reviewed_by ?? 'N/A'}</TableCell>
                  <TableCell>{req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/request/${req.id}`}>
                      <Button variant="outline" size="sm">Ver Detalle</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
