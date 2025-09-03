import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { FileText, History as HistoryIcon } from 'lucide-react';
import { getStatusIcon, getStatusVariant } from '../utils/statusUtils';
import { ValidationHistoryDialog } from './ValidationHistoryDialog';
import type { AffiliationValidationResultDetail } from '../interfaces/models';

interface ValidationsTableProps {
  validations: AffiliationValidationResultDetail[];
  title?: string;
}

export const ValidationsTable: React.FC<ValidationsTableProps> = ({ validations, title = 'Resultados de Validación del Flujo' }) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Tipo de Validación</TableHead>
              <TableHead>Comentario</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validations && validations.length > 0 ? (
              validations.map(validation => (
                <TableRow key={validation.id}>
                  <TableCell>
                    {validation.status && (
                      <Badge variant={getStatusVariant(validation.status)} className="capitalize">
                        {React.createElement(getStatusIcon(validation.status), { size: 16, className: 'mr-1' })}
                        {validation.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{validation.observation_type_label}</TableCell>
                  <TableCell className="font-mono text-xs">{validation.comment}</TableCell>
                  <TableCell>{validation.created_at ? new Date(validation.created_at).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>
                    <ValidationHistoryDialog
                      validationResultId={validation.id}
                      trigger={
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ValidationHistoryDialog
                                validationResultId={validation.id}
                                trigger={
                                  <Button variant="ghost" size="icon">
                                    <HistoryIcon className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver Historial de Validación</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No se encontraron resultados de validación.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
