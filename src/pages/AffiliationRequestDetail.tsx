import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle,
  History as HistoryIcon,
  ShieldAlert,
} from 'lucide-react';

import { useDbContext } from '../context/DbContext';

// Import modular services
import {
  addManualObservation,
  getAffiliationRequestDetail,
  getObservationsForRequest,
  getRequestHistory,
  resolveObservationService,
  retryObservationService,
  resolveRequestService,
} from '../services';

// Import correct interfaces
import type { AffiliationRequestHistory } from '../interfaces/models';
import type {
  AffiliationRequestDetailView,
  AffiliationObservationView,
} from '../interfaces/views';

import { AddObservationModal } from '../components/AddObservationModal';
import { Header } from '../components/Header';
import { ValidationsTable } from '../components/ValidationsTable';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { getStatusIcon, getStatusVariant } from '../utils/statusUtils';

import { USER_SUPERVISOR_UUID } from '../utils/constants';

export function AffiliationRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { db, isLoading: isDbLoading, error: dbError } = useDbContext();

  const [requestDetail, setRequestDetail] = useState<AffiliationRequestDetailView | null>(null);
  const [observations, setObservations] = useState<AffiliationObservationView[]>([]);
  const [history, setHistory] = useState<AffiliationRequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const requestId = Number(id);

  const fetchData = useCallback(() => {
    if (!db || !requestId) return;

    setLoading(true);
    try {
      const detail = getAffiliationRequestDetail(db, requestId);
      if (!detail) {
        setError('Solicitud de afiliación no encontrada.');
        toast.error('Solicitud de afiliación no encontrada.');
        return;
      }

      setRequestDetail(detail);
      const obs = getObservationsForRequest(db, requestId);
      setObservations(obs);
      setHistory(getRequestHistory(db, requestId));

      setError(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      setError(errorMessage);
      toast.error(`Error al cargar datos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [db, requestId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetryObservation = (observationId: number) => {
    if (!db) return;

    const confirmation = window.confirm('¿Está seguro de que desea reintentar esta validación?');
    if (!confirmation) return;

    try {
      const result = retryObservationService(db, observationId);
      if (result.success) {
        toast.success('La validación se ha reintentado con éxito y la observación ha sido aprobada.');
        fetchData(); // Refresh data
      } else {
        toast.error(`Error al reintentar la observación: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      toast.error(`Error al reintentar la observación: ${errorMessage}`);
      console.error(error);
    }
  };

  const handleResolveObservation = (observationId: number, resolution: 'approved' | 'rejected') => {
    if (!db) return;

    const action = resolution === 'approved' ? 'aprobar' : 'rechazar';
    const confirmation = window.confirm(`¿Está seguro de que desea ${action} esta observación?`);
    if (!confirmation) return;

    try {
      const result = resolveObservationService(db, { observationId, newStatus: resolution, resolvedBy: USER_SUPERVISOR_UUID });
      if (result.success) {
        toast.success(`Observación resuelta como '${resolution}' con éxito.`);
        fetchData(); // Refresh data
      } else {
        toast.error(`Error al resolver la observación: ${result.error}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      toast.error(`Error al resolver la observación: ${errorMessage}`);
    }
  };



  if (loading || isDbLoading) return <div className="p-4">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (dbError) return <div>Error al cargar la base de datos: {dbError.message}</div>;
  if (!requestDetail) return <div>Solicitud no encontrada.</div>;

  const pendingObservations = observations.filter(obs => obs.status === 'pending');
  const resolvedObservations = observations.filter(obs => obs.status !== 'pending');

  const canObserve = ['pending', 'observed'].includes(requestDetail.status);
  const canResolveRequest = requestDetail.status === 'pending' && pendingObservations.length === 0;

  const handleResolveRequest = (resolution: 'approved' | 'rejected') => {
    if (!db) return;

    const action = resolution === 'approved' ? 'aprobar' : 'rechazar';
    const confirmation = window.confirm(`¿Está seguro de que desea ${action} esta solicitud de afiliación?`);
    if (!confirmation) return;

    try {
      const result = resolveRequestService(db, { requestId, newStatus: resolution, resolvedBy: USER_SUPERVISOR_UUID });
      if (result.success) {
        toast.success(`Solicitud de afiliación marcada como '${resolution}'.`);
        fetchData(); // Refresh data
      } else {
        toast.error(`Error al resolver la solicitud: ${result.error}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      toast.error(`Error al resolver la solicitud: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={`Detalle de Solicitud: ${requestDetail.affiliation_id}`} />

      <AddObservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (observationTypeId: number, selectedCauseIds: number[], comment: string) => {
          if (!db || !requestDetail) return false;

          const result = addManualObservation(db, {
            requestId: requestDetail.id,
            observationTypeId,
            comment,
            causeIds: selectedCauseIds,
            createdBy: USER_SUPERVISOR_UUID,
          });

          if (result.success) {
            toast.success('Observación manual agregada con éxito.');
            fetchData();
            setIsModalOpen(false);
            return true;
          } else {
            toast.error(`Error al agregar la observación: ${result.error}`);
            return false;
          }
        }}
        productId={requestDetail.product_id}
      />



      <main className="p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Información de la Solicitud</CardTitle>
                <Badge variant={getStatusVariant(requestDetail.status)}>
                  {React.createElement(getStatusIcon(requestDetail.status), { size: 16, className: 'mr-1' })}
                  {requestDetail.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><strong>ID de Afiliación:</strong> {requestDetail.affiliation_id}</div>
                  <div><strong>Producto:</strong> {requestDetail.product_name}</div>
                  <div><strong>RUC:</strong> {requestDetail.ruc}</div>
                  <div><strong>Nombre Comercio:</strong> {requestDetail.business_name}</div>
                  <div>
                    <p className="text-sm text-muted-foreground">{requestDetail.created_at ? new Date(requestDetail.created_at).toLocaleString() : 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">Revisado el: {requestDetail.reviewed_at ? new Date(requestDetail.reviewed_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ValidationsTable validations={requestDetail.validations || []} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><HistoryIcon className="mr-2" /> Historial de la Solicitud</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado Anterior</TableHead>
                      <TableHead>Estado Nuevo</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead>Realizado por</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length > 0 ? history.map((h: AffiliationRequestHistory) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          {h.previous_status ? (
                            <Badge variant={getStatusVariant(h.previous_status)}>{h.previous_status}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {h.new_status ? (
                            <Badge variant={getStatusVariant(h.new_status)}>{h.new_status}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{h.details ?? '-'}</TableCell>
                        <TableCell>{h.changed_by}</TableCell>
                        <TableCell>{h.changed_at ? new Date(h.changed_at).toLocaleString() : 'N/A'}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={5} className="text-center">No hay historial de cambios.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            { // si es el estado de la solicitud es aprobada entonces no se muestra el card de acciones de revision
              requestDetail.status !== 'approved' && (
                <Card >
                  <CardHeader>
                    <CardTitle className="flex items-center">Acciones de Revisión</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleResolveRequest('approved')}
                      disabled={!canResolveRequest}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2" size={16} /> Aprobar
                    </Button>
                    <Button
                      onClick={() => handleResolveRequest('rejected')}
                      disabled={!canResolveRequest}
                      className="flex-1"
                      variant="destructive"
                    >
                      <ShieldAlert className="mr-2" size={16} /> Rechazar
                    </Button>
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      disabled={!canObserve}
                      className="flex-1"
                      variant="outline"
                    >
                      <ShieldAlert className="mr-2" size={16} /> Observar
                    </Button>
                  </CardContent>
                </Card>
              )}
            {pendingObservations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 text-yellow-500" /> Observaciones Pendientes ({pendingObservations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingObservations.map((obs: AffiliationObservationView) => (
                      <div key={obs.id} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{obs.observation_type_label}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{obs.comment}</p>
                            <Badge variant={obs.type === 'system' ? 'destructive' : 'secondary'} className="mt-1 capitalize">{obs.type}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <div className="ml-auto flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleResolveObservation(obs.id, 'approved')}>Aprobar</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleResolveObservation(obs.id, 'rejected')}>Rechazar</Button>
                                {obs.type === 'system' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="outline" onClick={() => handleRetryObservation(obs.id)}>Reintentar</Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reintentar la validación automática que generó esta observación.</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {resolvedObservations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="mr-2 text-green-500" /> Observaciones Resueltas ({resolvedObservations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resolvedObservations.map((obs: AffiliationObservationView) => (
                      <div key={obs.id} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{obs.observation_type_label}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Revisado por: {obs.reviewed_by}</p>
                            <p className="text-sm text-gray-500">Fecha: {obs.reviewed_at ? new Date(obs.reviewed_at).toLocaleString() : 'N/A'}</p>
                          </div>
                          <Badge variant={getStatusVariant(obs.status)}>{obs.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
