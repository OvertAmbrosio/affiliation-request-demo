import { useState } from 'react';
import { toast } from 'sonner';
import { useDbContext } from '../context/DbContext';
import { addObservationTypeWithCauses } from '../services/affiliation-observation';
import ObservationTypeList from '../components/ObservationTypeList';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PlusCircle, X } from 'lucide-react';
import { Header } from '../components/Header';

export default function ObservationTypes() {
  const { db, isLoading, error } = useDbContext();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'manual' | 'system'>('manual');
  const [causes, setCauses] = useState<{ label: string }[]>([{ label: '' }]);
  const [refreshKey, setRefreshKey] = useState(0); // Key to trigger list refresh

  const handleAddCause = () => {
    setCauses([...causes, { label: '' }]);
  };

  const handleCauseChange = (index: number, value: string) => {
    const newCauses = [...causes];
    newCauses[index].label = value;
    setCauses(newCauses);
  };

  const handleRemoveCause = (index: number) => {
    setCauses(causes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !code.trim() || !label.trim() || !description.trim()) {
      toast.error('Por favor, complete todos los campos principales.');
      return;
    }

    try {
      await addObservationTypeWithCauses(db, {
        code,
        label,
        description,
        type,
        causes: causes.filter(c => c.label.trim() !== ''),
      });

      toast.success('Tipo de observación agregado con éxito.');
      // Reset form
      setCode('');
      setLabel('');
      setDescription('');
      setType('manual');
      setCauses([{ label: '' }]);
      setRefreshKey(prev => prev + 1); // Trigger list refresh
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      toast.error(`Error al agregar: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Gestión de Tipos de Observación" />
      <main className="p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Agregar Nuevo Tipo de Observación</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input id="code" value={code} onChange={e => setCode(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="label">Label (Etiqueta)</Label>
                  <Input id="label" value={label} onChange={e => setLabel(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={3} />
              </div>
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={type} onValueChange={(value: 'manual' | 'system') => setType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Causas Asociadas</Label>
                <div className="space-y-2 mt-2">
                  {causes.map((cause, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder={`Causa ${index + 1}`}
                        value={cause.label}
                        onChange={e => handleCauseChange(index, e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCause(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleAddCause}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Causa
                </Button>
              </div>

              <div className="flex justify-end">
                <Button type="submit">Guardar Tipo de Observación</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ObservationTypeList key={refreshKey} />
      </main>
    </div>
  );
}
