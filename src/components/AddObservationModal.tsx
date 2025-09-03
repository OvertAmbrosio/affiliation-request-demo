import { useState, useEffect } from 'react';
import { useDbContext } from '../context/DbContext';
import { getManualObservationTypesForProduct } from '../services';
import type { AffiliationObservationCause } from '../interfaces/models';
import type { ManualObservationSelectionView } from '../interfaces/views';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (observationTypeId: number, selectedCauseIds: number[], comment: string) => Promise<boolean>;
  productId: number;
}

export const AddObservationModal = ({ isOpen, onClose, onSubmit, productId }: Props) => {
  const { db } = useDbContext();
  const [observationTypes, setObservationTypes] = useState<ManualObservationSelectionView[]>([]);
  const [selectedObservationTypeId, setSelectedObservationTypeId] = useState<number | null>(null);
  const [selectedCauses, setSelectedCauses] = useState<AffiliationObservationCause[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (db && productId) {
      setObservationTypes(getManualObservationTypesForProduct(db, productId));
    }
  }, [db, productId]);

  const selectedObservation = observationTypes.find(
    (ot) => ot.id === selectedObservationTypeId
  );

  useEffect(() => {
    if (selectedObservation && selectedCauses.length > 0) {
      const causeLabels = selectedCauses.map((cause) => cause.label).join(', ');
      setComment(`${selectedObservation.label}: ${causeLabels}.`);
    } else if (selectedObservation) {
      setComment(`${selectedObservation.label}: `);
    } else {
      setComment('');
    }
  }, [selectedCauses, selectedObservation]);

  const handleCauseToggle = (causeId: number) => {
    const cause = observationTypes
      .flatMap((ot) => ot.causes)
      .find((c) => c.id === causeId);
    if (!cause) return;

    setSelectedCauses((prev) => {
      const isSelected = prev.some((c) => c.id === causeId);
      if (isSelected) {
        return prev.filter((c) => c.id !== causeId);
      } else {
        return [...prev, cause];
      }
    });
  };

  const resetForm = () => {
    setSelectedObservationTypeId(null);
    setSelectedCauses([]);
    setComment('');
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObservationTypeId || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onSubmit(
      selectedObservationTypeId,
      selectedCauses.map((c) => c.id),
      comment
    );
    setIsSubmitting(false);

    if (success) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Observación Manual</DialogTitle>
          <DialogDescription>
            Seleccione el tipo de observación, las causas aplicables y añada un comentario.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="observationType">Tipo de Observación</Label>
            <Select
              onValueChange={(value) => {
                setSelectedObservationTypeId(Number(value));
                setSelectedCauses([]); // Reset causes on type change
              }}
              value={selectedObservationTypeId ? String(selectedObservationTypeId) : ''}
              required
            >
              <SelectTrigger id="observationType">
                <SelectValue placeholder="Seleccione un tipo de observación..." />
              </SelectTrigger>
              <SelectContent>
                {observationTypes.map((observation) => (
                  <SelectItem key={observation.id} value={String(observation.id)}>
                    {observation.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedObservation && selectedObservation.causes && selectedObservation.causes.length > 0 && (
            <div className="space-y-2">
              <Label>Causas Específicas</Label>
              <div className="grid grid-cols-2 gap-2 p-4 border rounded-md">
                {selectedObservation.causes.map((cause: AffiliationObservationCause) => (
                  <div key={cause.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cause-${cause.id}`}
                      checked={selectedCauses.some((c) => c.id === cause.id)}
                      onCheckedChange={() => handleCauseToggle(cause.id)}
                    />
                    <Label htmlFor={`cause-${cause.id}`} className="font-normal text-sm">{cause.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Comentario</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Añada un comentario detallado sobre la observación..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedObservationTypeId || isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Observación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
