# Casino Performance Check

Herramienta web independiente (Next.js + Lighthouse) para medir el rendimiento de páginas de casino.

## Requisitos
- Node.js 20 o superior
- Google Chrome o Chromium instalado (Lighthouse lo necesita). Si no se detecta solo:
  `CHROME_PATH="/ruta/al/chrome" npm run dev`

## Uso
```bash
npm install
npm run dev        # http://localhost:3000
```
Para ver la interfaz con datos de ejemplo sin ejecutar Lighthouse: `npm run seed` (antes de `npm run dev`).

Producción: `npm run build && npm start`

## Qué hace
- Recibe una URL y un tipo de página (Homepage, Lobby, Promotions, Login). Cada tipo recuerda su última URL.
- Ejecuta Lighthouse en móvil y/o escritorio (1 corrida, o 3 con mediana).
- Muestra: Performance score, LCP, FCP, TBT, CLS, peso de página y número de peticiones.
- Lista las 5 peticiones API más lentas, imágenes > 200 KB y JavaScript > 150 KB.
- Guarda cada prueba en SQLite (`data/lighthouse.db`) y compara con la anterior de la misma URL + tipo + dispositivo.
- Exporta el informe en PDF (móvil y escritorio, con comparación).

## Estructura
```
lib/lighthouse.js   ejecuta Lighthouse (Chrome headless)
lib/analyze.js      convierte el informe en métricas y hallazgos (función pura)
lib/queue.js        cola en memoria: una prueba a la vez
lib/db.js           SQLite (better-sqlite3)
lib/compare.js      reglas de mejora/empeora
lib/pdf.js          informe PDF (pdfkit)
lib/config.js       umbrales y tipos de página  <-- ajustar aquí "sobredimensionado"
app/api/*           endpoints
app/page.jsx        interfaz
```

## Limitaciones conocidas del prototipo
- La cola es en memoria: si el servidor se reinicia durante una prueba, esa prueba se pierde (los resultados ya guardados no).
- Login se mide como página pública, sin autenticar.
- Sitios con anti-bot, verificación de edad o geobloqueo pueden dar resultados distintos; la app avisa si detecta HTTP 4xx o una redirección.
- No hay autenticación de usuarios: usar en local o red interna. La app acepta cualquier URL http(s), incluidas las internas.
- Las "peticiones API" se detectan por tipo XHR/Fetch, respuesta JSON o rutas `/api`, `/graphql`.
