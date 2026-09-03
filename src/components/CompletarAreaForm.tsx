"use client";

import { useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils/format";

type LoteBase = {
  id: string;
  direccion: string;
  manzana: string | null;
  numero_lote: string | null;
  superficie_m2: number | null;
  valor_referencia: number | null;
};

export function CompletarAreaForm({
  lotes,
  valorM2,
  action,
  error,
}: {
  lotes: LoteBase[];
  valorM2: number | null;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [areas, setAreas] = useState<Record<string, string>>(() =>
    Object.fromEntries(lotes.map((l) => [l.id, l.superficie_m2 != null ? String(l.superficie_m2) : ""]))
  );
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const totalCompletados = useMemo(
    () => Object.values(areas).filter((v) => v.trim() !== "" && Number(v) > 0).length,
    [areas]
  );

  function valorCalculado(id: string) {
    const area = parseFloat(areas[id] ?? "");
    if (!area || area <= 0) return null;
    if (valorM2) return Math.round(area * valorM2 * 100) / 100;
    return lotes.find((l) => l.id === id)?.valor_referencia ?? null;
  }

  function enfocarSiguiente(index: number) {
    const siguiente = lotes[index + 1];
    if (siguiente) inputsRef.current[siguiente.id]?.focus();
  }

  return (
    <form action={action}>
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {totalCompletados} de {lotes.length} lotes con área cargada
        </span>
        {valorM2 ? (
          <span>Valor por m² del proyecto: {formatMoney(valorM2)}</span>
        ) : (
          <span className="text-amber-600">
            Este proyecto no tiene valor por m² configurado; el valor se puede escribir manualmente por lote.
          </span>
        )}
      </div>

      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Lote</th>
              <th className="px-4 py-2">Manzana</th>
              <th className="px-4 py-2">Área (m²)</th>
              {!valorM2 && <th className="px-4 py-2">Valor (manual)</th>}
              <th className="px-4 py-2">Valor calculado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lotes.map((l, index) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{l.direccion}</td>
                <td className="px-4 py-2 text-slate-600">{l.manzana ?? "-"}</td>
                <td className="px-4 py-2">
                  <input
                    ref={(el) => {
                      inputsRef.current[l.id] = el;
                    }}
                    type="number"
                    step="0.01"
                    min="0"
                    name={`sup_${l.id}`}
                    value={areas[l.id] ?? ""}
                    onChange={(e) =>
                      setAreas((prev) => ({ ...prev, [l.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        enfocarSiguiente(index);
                      }
                    }}
                    placeholder="0.00"
                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                {!valorM2 && (
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name={`val_${l.id}`}
                      defaultValue={l.valor_referencia ?? ""}
                      placeholder="Opcional"
                      className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                )}
                <td className="px-4 py-2 text-slate-600">
                  {valorM2 ? (
                    valorCalculado(l.id) != null ? (
                      formatMoney(valorCalculado(l.id))
                    ) : (
                      <span className="text-slate-300">-</span>
                    )
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Guardar áreas
        </button>
        <p className="text-xs text-slate-400">
          Los lotes que dejes en blanco quedan sin área y se pueden completar después
          editando la propiedad.
        </p>
      </div>
    </form>
  );
}
