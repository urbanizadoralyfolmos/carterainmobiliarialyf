"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Caja de búsqueda reutilizable. Actualiza el parámetro `q` en la URL
 * (con un pequeño debounce) preservando el resto de los filtros ya
 * presentes (estado, proyecto, etc.), para que la página del servidor
 * vuelva a consultar con el nuevo término.
 */
export function SearchInput({
  placeholder = "Buscar...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(searchParams.get(paramName) ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValor(searchParams.get(paramName) ?? "");
    // Solo sincronizar cuando cambia la navegación (no en cada tecleo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get(paramName)]);

  function actualizarUrl(nuevoValor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nuevoValor.trim()) {
      params.set(paramName, nuevoValor);
    } else {
      params.delete(paramName);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevoValor = e.target.value;
    setValor(nuevoValor);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => actualizarUrl(nuevoValor), 300);
  }

  return (
    <div className="relative w-64 max-w-full">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
      </svg>
      <input
        type="search"
        value={valor}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400"
      />
    </div>
  );
}
