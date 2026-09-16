import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/auth/rol";
import { formatDate } from "@/lib/utils/format";
import { actualizarRolUsuario, crearUsuario } from "./actions";

// Esta pantalla cambia apenas se crea o cambia de rol a alguien, así que
// nunca debe quedar cacheada entre visitas.
export const dynamic = "force-dynamic";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "gestor", label: "Gestor (carga datos y pagos, sin editar/eliminar)" },
  { value: "lectura", label: "Solo lectura" },
];

type Usuario = {
  id: string;
  email: string | null;
  nombre_completo: string | null;
  rol: string;
  created_at: string;
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardado?: string; creado?: string }>;
}) {
  const { error, guardado, creado } = await searchParams;

  // Esta pantalla es solo para administradores: cualquier otro usuario que
  // llegue a la URL directamente es redirigido al dashboard. La función
  // listar_usuarios() de la base de datos también exige ser admin, así que
  // aunque alguien se salte este chequeo no vería ningún dato.
  const admin = await esAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error: errorConsulta } = await supabase.rpc("listar_usuarios");
  const usuarios = (data ?? []) as Usuario[];

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Usuarios</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Administra qué puede hacer cada usuario. <strong>Gestor</strong> puede cargar
        información (clientes, propiedades, contratos, cuotas) y registrar pagos, pero no
        puede editar ni eliminar nada ya creado. <strong>Solo lectura</strong> únicamente
        puede ver información y generar reportes. <strong>Administrador</strong> puede hacer
        todo, incluyendo editar y eliminar.
      </p>

      {(error || errorConsulta) && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? errorConsulta?.message}
        </p>
      )}
      {guardado && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Rol actualizado correctamente.
        </p>
      )}
      {creado && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Usuario {creado} creado. Comparte con esa persona su email y la contraseña temporal
          que definiste (no queda guardada en ningún lado, así que anótala ahora si no lo
          hiciste).
        </p>
      )}

      <div className="mt-6 max-w-xl rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">+ Nuevo usuario</h2>
        <p className="mt-1 text-xs text-slate-500">
          Crea una cuenta nueva con una contraseña temporal. Compártesela a esa persona para
          que inicie sesión (por ahora no hay una pantalla para que la cambie ella misma).
        </p>
        <form action={crearUsuario} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Nombre completo</label>
            <input
              name="nombre_completo"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Contraseña temporal
            </label>
            <input
              type="text"
              name="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Rol</label>
            <select
              name="rol"
              defaultValue="gestor"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Desde</th>
              <th className="px-4 py-2 text-right">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {u.nombre_completo ?? "-"}
                  {u.id === user?.id && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(tú)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{u.email ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {formatDate(u.created_at ? u.created_at.slice(0, 10) : null)}
                </td>
                <td className="px-4 py-2 text-right">
                  {u.id === user?.id ? (
                    <span className="text-xs text-slate-400">
                      {ROLES.find((r) => r.value === u.rol)?.label ?? u.rol}
                    </span>
                  ) : (
                    <form
                      action={actualizarRolUsuario}
                      className="inline-flex items-center gap-2"
                    >
                      <input type="hidden" name="usuario_id" value={u.id} />
                      <select
                        name="rol"
                        defaultValue={u.rol}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
                      >
                        Guardar
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
