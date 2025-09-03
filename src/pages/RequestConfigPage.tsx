import { useState, useEffect } from 'react';
import { useDbContext } from '../context/DbContext';
import { getAffiliationRequestConfigs, updateAffiliationRequestConfig } from '../services/request-config';
import type { AffiliationRequestConfigView } from '../interfaces/views';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

export default function RequestConfigPage() {
  const { db, isLoading: isDbLoading } = useDbContext();
  const [configs, setConfigs] = useState<AffiliationRequestConfigView[]>([]);

  const fetchConfigs = () => {
    if (db) {
      const data = getAffiliationRequestConfigs(db);
      setConfigs(data);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [db]);

  const handleToggle = async (configId: number, currentStatus: boolean) => {
    if (!db) return;

    try {
      await updateAffiliationRequestConfig(db, configId, !currentStatus);
      toast.success(`Configuración para el producto actualizada correctamente.`);
      fetchConfigs(); // Refresh the view
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      toast.error(`Error al actualizar la configuración: ${errorMessage}`);
    }
  };

  if (isDbLoading) {
    return <p>Cargando base de datos...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Negocio de Afiliación</CardTitle>
        <CardDescription>
          Aquí puedes configurar el comportamiento del sistema para las solicitudes de afiliación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className='text-center'>¿Auto-Aprobar si no hay Observaciones?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map(config => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.product_name}</TableCell>
                <TableCell className='text-center'>
                  <Switch
                    checked={config.auto_approve}
                    onCheckedChange={() => handleToggle(config.id, config.auto_approve)}
                    aria-readonly
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
