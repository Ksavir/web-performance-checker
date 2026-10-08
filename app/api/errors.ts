import { NextResponse } from 'next/server';

/** Respuesta 400 con el mensaje del error lanzado por la validación. */
export function badRequest(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
}

/** Argumento de las rutas con segmento dinámico [id]. */
export type IdContext = { params: Promise<{ id: string }> };
