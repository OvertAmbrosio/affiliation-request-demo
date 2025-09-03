import { useEffect, useState } from "react";
import { useDbContext } from "../context/DbContext";
import { getAllObservationTypesWithCauses, type ManualObservationSelection } from "../services/affiliation-observation";

export default function ObservationTypeList() {
  const { db, isLoading, error } = useDbContext();
  const [types, setTypes] = useState<ManualObservationSelection[]>([]);

  useEffect(() => {
    if (db) {
      const allTypes = getAllObservationTypesWithCauses(db);
      setTypes(allTypes);
    }
  }, [db]);

  if (isLoading) {
    return <p>Cargando lista de tipos de observación...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error al cargar los datos: {error.message}</p>;
  }

  return (
    <div className="overflow-x-auto mt-8">
      <h2 className="text-xl font-semibold mb-4">Tipos de Observaciones Disponibles</h2>
      <table className="min-w-full bg-white border text-left">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Código</th>
            <th className="border px-2 py-1">Label</th>
            <th className="border px-2 py-1">Descripción</th>
            <th className="border px-2 py-1">Tipo</th>
            <th className="border px-2 py-1">Causas</th>
            <th className="border px-2 py-1">Activo</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id}>
              <td className="border px-2 py-1">{t.id}</td>
              <td className="border px-2 py-1">{t.code}</td>
              <td className="border px-2 py-1">{t.label}</td>
              <td className="border px-2 py-1">{t.title}</td>
              <td className="border px-2 py-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === 'manual' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {t.type}
                </span>
              </td>
              <td className="border px-2 py-1">
                {t.causes && t.causes.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {t.causes.map(cause => <li key={cause.id}>{cause.label}</li>)}
                  </ul>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="border px-2 py-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {t.is_active ? 'Sí' : 'No'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
