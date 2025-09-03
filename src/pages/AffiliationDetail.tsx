import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ValidationHistoryDialog } from '../components/ValidationHistoryDialog';
import { ValidationsTable } from '../components/ValidationsTable';
import { useDbContext } from '../context/DbContext';
import type { AffiliationDetail as AffiliationDetailType } from '../interfaces/models';
import { getAffiliationDetailById } from '../services/affiliation/get-affiliation-detail';
import { getStatusVariant, getStatusIcon } from '../utils/statusUtils';
import type { AllStatuses } from '../interfaces/enums.type';
import { Button } from '../components/ui/button';
import { HistoryIcon } from 'lucide-react';

const AffiliationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { db } = useDbContext();
  const [affiliation, setAffiliation] = useState<AffiliationDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedValidationResultId, __setSelectedValidationResultId] = useState<number | null>(null);

  useEffect(() => {
    if (db && id) {
      try {
        setLoading(true);
        const data = getAffiliationDetailById(db, id);
        setAffiliation(data);
      } catch (error) {
        console.error('Failed to fetch affiliation details:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [db, id]);

  if (loading) {
    return <p>Cargando detalles de la afiliación...</p>;
  }

  if (!affiliation) {
    return <p>No se encontró la afiliación con ID {id}.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalle de la Afiliación #{affiliation.id}</CardTitle>
          <CardDescription>
            RUC: {affiliation.ruc} | {affiliation.business_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Producto</p>
              <p>{affiliation.product_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Canal</p>
              <p>{affiliation.channel_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <Badge variant={getStatusVariant(affiliation.status as AllStatuses)} className="capitalize">
                {React.createElement(getStatusIcon(affiliation.status as AllStatuses), { size: 16, className: 'mr-1' })}
                {affiliation.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Paso Actual</p>
              <p>{affiliation.current_step}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ValidationsTable validations={affiliation.validations} />

      {selectedValidationResultId !== null && (
        <ValidationHistoryDialog
          validationResultId={selectedValidationResultId}
          trigger={
            <Button variant="ghost" size="icon">
              <HistoryIcon className="h-4 w-4" />
            </Button>
          }
        />
      )}
    </div>
  );
};

export default AffiliationDetail;

