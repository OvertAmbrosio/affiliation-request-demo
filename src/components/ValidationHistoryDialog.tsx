import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { type ValidationHistoryView } from '../interfaces/views';
import { useDbContext } from '../context/DbContext';
import { Button } from './ui/button';
import { Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { getStatusVariant } from '../utils/statusUtils';

interface Props {
  validationResultId: number;
  trigger: React.ReactNode;
}

export const ValidationHistoryDialog: React.FC<Props> = ({ validationResultId, trigger }) => {
  const { db } = useDbContext();
  const [history, setHistory] = useState<ValidationHistoryView[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  const fetchHistory = () => {
    if (!db) return;
    try {
      const stmt = db.prepare(
        `
        SELECT
          h.id,
          h.attempt_number,
          h.status,
          h.comment,
          h.created_at,
          p.response_json
        FROM t_affiliation_validation_history h
        LEFT JOIN t_validation_provider_response p ON h.provider_response_id = p.id
        WHERE h.validation_result_id = :id
        ORDER BY h.created_at DESC
      `
      );
      stmt.bind({ ':id': validationResultId });
      const results: ValidationHistoryView[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as ValidationHistoryView);
      }
      setHistory(results);
      stmt.free();
    } catch (error) {
      console.error('Failed to fetch validation history:', error);
      setHistory([]);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchHistory();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="min-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de la Validación</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.attempt_number}</TableCell>
                    <TableCell>
                      {item.status && <Badge variant={getStatusVariant(item.status)}>{item.status.toUpperCase()}</Badge>}
                    </TableCell>
                    <TableCell>{item.comment}</TableCell>
                    <TableCell>{item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell>
                      {item.response_json && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedResponse(item.response_json || null)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Respuesta del Proveedor</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No hay historial de intentos para esta validación.</p>
          )}
        </div>
      </DialogContent>

      {/* Provider Response Viewer Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="min-w-2xl">
          <DialogHeader>
            <DialogTitle>Respuesta del Proveedor</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-md bg-gray-900 p-4">
            <pre className="text-sm text-white"><code>{selectedResponse ? JSON.stringify(JSON.parse(selectedResponse), null, 2) : ''}</code></pre>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
