# Estándares de código: cómo aplicar el SOP en este repositorio

Este documento traduce el **Standard Operating Procedure (SOP) de URDT** —buenas prácticas generales, Next.js, React y estilos— a instrucciones concretas para **Web Performance Check** (`casino-perf-check`).

Cada sección tiene el mismo formato:

- **Regla**: lo que pide el SOP.
- **En este repo**: qué cumple ya el código y qué no, con referencias `archivo:línea`.
- **Cómo aplicarlo**: los pasos concretos y un ejemplo antes/después con código del proyecto.

> **Cómo usarlo.** No es un plan de reescritura completa. Se aplica con la *regla del Boy Scout* del propio SOP: cada PR deja mejor los archivos que toca. La [sección 11](#11-plan-de-adopción-por-fases) propone un orden para quien quiera abordarlo de forma sistemática, y la [sección 12](#12-checklist-para-cada-pr) es la lista de comprobación para revisar cada PR.

---

## 0. Punto de partida

| Área del SOP | Estado actual | Prioridad |
|---|---|---|
| Colocación de código | Componentes planos en `app/components/`; `Results.jsx` agrupa 9 componentes en 426 líneas; helpers duplicados en 4 archivos | Alta |
| Comentarios | La mayoría explican el *por qué* (bien); hay código comentado y un comentario confuso | Baja (rápido) |
| Diseño de funciones | Las funciones de `lib/` son puras (bien); `summarize()` mide unas 200 líneas; hay argumentos *flag* y funciones con 4 parámetros posicionales | Media |
| Datos y nombres | Se usa encadenamiento opcional (bien); `any` abundante en `analyze.ts`; verbos y abreviaturas poco consistentes | Media |
| Calidad (KISS, números mágicos) | Varios números mágicos y líneas JSX muy largas | Media |
| Tests (AAA) | **No hay tests ni script `test`** | Alta |
| Next.js: caché y renderizado | Toda la página es `'use client'`; la caché de la API es correcta | Media |
| React: hooks y arquitectura | Solo componentes de función (bien); la lógica con estado vive dentro de los componentes; hay 3 implementaciones distintas de pestañas | Media |
| Estilos (Tailwind) | El proyecto **no usa Tailwind**: usa `globals.css` con tokens en `:root` | Se adapta (ver §6) |
| Secciones vacías del SOP (entorno, Docker, storage, estado…) | Sin contenido en el SOP | Propuestas provisionales en §10 |

---

## 1. Colocación del código (Code Colocation)

### Regla
Componentes, estilos, hooks y tests van en el mismo directorio. Solo se extrae a una carpeta compartida lo que usan **varios** módulos. No hay que optimizar para la reutilización antes de tiempo.

### En este repo
- `app/components/Results.jsx` contiene `Delta`, `CopyButton`, `CopyUrl`, `ImageThumb`, `LcpBreakdown`, `Opportunities`, `Diagnosis`, `Findings` y `DeviceResult`, es decir, 9 componentes en un mismo archivo.
- Helpers duplicados con implementaciones **distintas**:
  - `shortUrl`: `app/components/History.jsx:5`, `app/components/Results.jsx:9`, `lib/pdf.ts:9`, `lib/summarize.ts:24`.
  - `fmtDate`: `app/components/Results.jsx:8` y `app/components/Summary.jsx:9`.
  - `ms` / `kb`: `app/components/Summary.jsx:10-11` reimplementan `formatValue('ms')` y `formatBytes` de `lib/config.ts`.
- `DEVICES` existe en `lib/config.ts:11` y otra vez en `app/components/TestForm.jsx:8`. Además, `['mobile', 'desktop']` está escrito a mano en `History.jsx:55` y `lib/validate.ts:20`.
- Las claves de `localStorage` están repartidas: `'casino-perf:urls'` en `TestForm.jsx:13` y `'casino-perf:tests'` en `lib/storage.ts:5`.

### Cómo aplicarlo
1. **Crear `lib/format.ts`** con los formateadores compartidos (`shortUrl`, `formatDate`, `formatMs`, `formatBytes`, `formatValue`) y borrar las copias locales. Cuando haga falta una variante, se resuelve con un parámetro de objeto, no con otra función parecida:
   ```ts
   // lib/format.ts
   interface ShortUrlOptions { maxLength?: number; includeSearch?: boolean; hideRootPath?: boolean }

   export const shortUrl = (url: string, { maxLength, includeSearch = true, hideRootPath = false }: ShortUrlOptions = {}) => { /* … */ };
   ```
2. **Una sola fuente para los dispositivos**: `TestForm` importa `DEVICES` de `lib/config.ts` y le añade localmente solo el icono y la nota, que son detalles de presentación de ese componente.
3. **Reorganizar `app/components/` por componente**, con sus hooks y tests al lado:
   ```
   app/components/
   ├── ui/                         # primitivos y compuestos usados por varios componentes
   │   ├── CopyButton.jsx
   │   ├── Icon.jsx
   │   ├── Tabs.jsx
   │   └── Accordion.jsx
   ├── Workspace/                  # orquesta formulario, progreso, resultados e historial
   │   ├── Workspace.jsx
   │   ├── useTestJob.js
   │   └── useHistory.js
   ├── TestForm/
   │   ├── TestForm.jsx
   │   └── useRememberedUrls.js
   ├── Results/
   │   ├── Results.jsx
   │   ├── DeviceResult.jsx
   │   ├── Diagnosis.jsx
   │   ├── LcpBreakdown.jsx
   │   ├── FindingsTable.jsx
   │   ├── useSortedRows.js
   │   └── ImageThumb.jsx
   ├── Summary/
   │   ├── Summary.jsx
   │   └── Fix.jsx
   ├── History/
   │   └── History.jsx
   └── ScoreChip.jsx
   lib/
   ├── format.ts        + format.test.ts
   ├── compare.ts       + compare.test.ts
   ├── summarize.ts     + summarize.test.ts
   ├── analyze.ts       + analyze.test.ts
   └── …
   ```
   El `index.ts` por carpeta del ejemplo del SOP es opcional: aquí no hay librería que publicar y los imports directos son más fáciles de seguir.
4. **Criterio para pasar algo a `ui/` o a `lib/`**: hacerlo cuando lo use un segundo componente, no antes.

---

## 2. Comentarios

### Regla
El código debe explicarse solo. Los comentarios explican el **por qué** (lógica de negocio, rarezas de una API, decisiones de rendimiento), nunca el *qué*. **No se deja código comentado.**

### En este repo
- Buenos ejemplos que conviene imitar:
  - `app/page.jsx:20`: *"evita que un sondeo en curso reviva una prueba cancelada"*.
  - `app/page.jsx:79`: explica el caso del 409.
  - `lib/lighthouse.ts:40`: por qué se mata Chrome al cancelar.
  - `lib/analyze.ts:98`: por qué se muestran insights sin ahorro estimado.
- **Código comentado** en `app/components/TestForm.jsx:83-85` (el aviso "Select at least one device"). Hay que borrarlo, o restaurarlo si la funcionalidad hace falta. Git conserva el historial.
- **Comentario confuso** en `lib/queue.ts:6-7`: mezcla dos ideas con paréntesis encadenados. Propuesta:
  ```ts
  // Estado en memoria guardado en globalThis para sobrevivir al hot-reload de Next.
  // Las pruebas se ejecutan de una en una para que no compitan por CPU y se distorsionen.
  ```

### Cómo aplicarlo
- Antes de escribir un comentario, intentar sustituirlo por un nombre mejor o una constante con nombre (ver §5).
- Mantener un solo idioma en los comentarios. Hoy están en español y la interfaz en inglés; se recomienda mantener esa convención.
- Documentar con un comentario las rarezas de Lighthouse, por ejemplo: *"Lighthouse 13 unificó tamaño y formato de imágenes en un solo insight"* (`lib/analyze.ts:175`). Es el tipo de comentario que pide el SOP.

---

## 3. Diseño de funciones

### 3.1 Funciones pequeñas y con una sola responsabilidad

**En este repo**
- `lib/summarize.ts` → `summarize()` mide unas 200 líneas: calcula vitals, acciones por métrica, imágenes, scripts, oportunidades, APIs, peso de página, veredicto, "qué funciona" y cambios.
- `lib/analyze.ts` → `extract()` normaliza peticiones, calcula hallazgos, ahorros y avisos en una sola función.
- `app/page.jsx` → `Home` gestiona el sondeo, la cancelación, el historial y el render.

**Cómo aplicarlo**: dividir en funciones puras con nombre y dejar la función principal como orquestador legible:
```ts
// lib/summarize.ts
export function summarize(test: SummaryInput): Summary {
  const actions = [
    ...buildVitalActions(test),
    ...buildImageActions(test),
    ...buildScriptActions(test),
    ...buildOpportunityActions(test),
    ...buildApiActions(test),
    ...buildPageWeightActions(test),
  ].sort(byPriority);

  return {
    ...buildVerdict(test),
    vitals: buildVitals(test),
    caveats: test.warnings,
    changes: buildChanges(test),
    working: buildWorkingList(test),
    actions: actions.map(({ lead, ...action }) => action),
  };
}
```
Lo mismo con `extract()`: `normalizeRequests(lhr)`, `findSlowApis(requests)`, `findBigImages(requests, audits)`, `findBigScripts(requests, audits)`, `collectWarnings(lhr, requestedUrl)`.

> ⚠️ Antes de partir `summarize()` o `extract()` hay que escribir sus tests (§7), para que el refactor tenga red de seguridad.

### 3.2 Objetos como parámetro cuando hay más de 3 argumentos

**En este repo**: `saveBatch(batchId, url, pageType, results)` en `lib/storage.ts:23`, llamada en `app/page.jsx:51`.

```ts
// ❌ Antes
saveBatch(jobId, data.url, data.pageType, data.results);

// ✅ Después
interface SaveBatchParams { batchId: string; url: string; pageType: PageType; results: BatchDeviceResult[] }
export function saveBatch({ batchId, url, pageType, results }: SaveBatchParams): boolean { /* … */ }

saveBatch({ batchId: jobId, url: data.url, pageType: data.pageType, results: data.results });
```
Hay que revisar igual `table(doc, headers, rows, widths)` en `lib/pdf.ts:17`.

### 3.3 Evitar argumentos *flag*

**En este repo**
- `CopyUrl({ url, hint, link = false })` en `app/components/Results.jsx:40`: el booleano cambia lo que se renderiza.
- `Delta({ d, fmt, isScore })` en `app/components/Results.jsx:11`: el booleano cambia cómo se formatea.

**Cómo aplicarlo**
```jsx
// ❌ Antes
<Delta d={cmp.deltas.score} isScore />

// ✅ Después: se pasa el formateador en vez de un booleano
<Delta delta={cmp.deltas.score} format={formatScore} />
<Delta delta={d} format={(v) => formatValue(m.fmt, v)} />
```
```jsx
// ❌ Antes
<CopyUrl url={r.url} hint={r.hint} link />

// ✅ Después: dos componentes explícitos que comparten CopyButton
<CopyableLink url={r.url} hint={r.hint} />
<CopyableText url={r.url} />
```

### 3.4 Funciones puras

**En este repo**: `extract`, `diagnose`, `summarize`, `compare`, `rate`, `formatValue` y `pickMedian` ya son puras, y el README lo destaca. **Hay que mantenerlo así.**
- `lib/queue.ts` muta estado global (`jobs`, `aborts`, `runMs`). Es inevitable, pero conviene que esa mutación quede **solo** en `queue.ts` y que los cálculos (`queueInfo`, la media de duración) se extraigan como funciones puras que reciben los datos por parámetro, para poder probarlas.
- Las funciones nuevas de `lib/` no deben leer `localStorage`, `Date.now()` ni `process.env` directamente. Esos valores se reciben por parámetro.

---

## 4. Manejo de objetos y datos

### 4.1 Encadenamiento opcional y `??`
Ya se usa de forma consistente (`a['lcp-breakdown-insight']?.details?.items ?? []`). Hay que seguir así y **evitar los `!`** (non-null assertion), como `t.lcp!` en `lib/summarize.ts:74` o `fromRating(lcpRating)!`. Es mejor estrechar el tipo con una guarda:
```ts
// ❌
if (fromRating(lcpRating)) { … priority: fromRating(lcpRating)! … ms(t.lcp!) }

// ✅
const lcpPriority = fromRating(lcpRating);
if (lcpPriority && test.lcp != null) { … priority: lcpPriority … formatMs(test.lcp) }
```

### 4.2 Tipado (los ejemplos del SOP son TypeScript estricto)
- `lib/analyze.ts` usa `any` en `diagnose(a: Record<string, any>)`, `itemDetail(id, i: any)`, `subItems(i: any)`, etc., y `lib/types.ts:13` declara `audits?: Record<string, any>`.
- Hay que definir tipos mínimos para las auditorías que se leen (`LhrAuditItem`, `LhrTableDetails`…) o usar `unknown` y estrechar. No hace falta tipar todo el LHR.
- Opcional y progresivo: migrar `app/**/*.jsx` a `.tsx`. `tsconfig.json` ya tiene `strict: true` y `allowJs`.

### 4.3 Nombres consistentes

| Hoy | Propuesta | Motivo |
|---|---|---|
| `fmtDate`, `fmtEta`, `ms`, `kb` | `formatDate`, `formatEta`, `formatMs`, `formatBytes` | Mismo verbo que `formatValue` / `formatBytes` |
| `read`, `write` (`lib/storage.ts`) | `readTests`, `writeTests` | Decir *qué* se lee |
| `clearAll` | `clearBatches` | Coherente con `getBatch`, `listBatches`, `deleteBatch` |
| `queueInfo` | `getQueueInfo` | Coherente con `getJob` |
| `t`, `d`, `a`, `f`, `sv`, `cmp`, `lt`, `rb` | `test`, `diagnosis`, `audits`, `findings`, `savings`, `comparison`, `longTasks`, `renderBlocking` | Legibilidad (regla del Boy Scout) |

**Convención de verbos**: `get` para un elemento, `list` para una colección, `save`, `delete`, `clear`, `build` para construir estructuras derivadas y `format` para texto.

---

## 5. Principios de calidad

### 5.1 KISS y legibilidad antes que concisión
Algunas líneas concentran demasiada lógica. Ejemplos:
- `app/components/Results.jsx:140`: un ternario con JSX anidado en una celda.
- `app/components/Results.jsx:308` y `:339`: definiciones de columnas con lógica de render en línea.
- `lib/summarize.ts:203-208`: un sort con cuatro criterios encadenados en una sola expresión.

Hay que extraer variables con nombre (`meetsXRequirement` en el ejemplo del SOP) o funciones pequeñas:
```ts
// lib/summarize.ts
const byPriority = (a: Action, b: Action) =>
  RANK[a.priority] - RANK[b.priority]
  || Number(!!b.lead) - Number(!!a.lead)
  || (b.savingsMs ?? 0) - (a.savingsMs ?? 0)
  || (b.savingsBytes ?? 0) - (a.savingsBytes ?? 0);
```

### 5.2 Números mágicos → constantes con nombre

| Ubicación | Valor | Constante propuesta |
|---|---|---|
| `app/page.jsx:61` | `2000` | `POLL_INTERVAL_MS` |
| `app/components/Results.jsx:27` | `1500` | `COPIED_FEEDBACK_MS` |
| `app/components/Results.jsx:316`, `:333` | texto `"200 KB"` / `"150 KB"` | Usar `formatBytes(THRESHOLDS.imageBytes)` / `formatBytes(THRESHOLDS.scriptBytes)`: si se cambia el umbral en `config.ts`, hoy el texto queda desfasado |
| `lib/summarize.ts:39-41` | `300`, `500 * 1024`, `100`, `100 * 1024` | `PRIORITY_THRESHOLDS` en `lib/config.ts` |
| `lib/summarize.ts:190` | `3000` | `THRESHOLDS.verySlowApiMs` |
| `lib/queue.ts:53-55` | `50` | `MAX_STORED_JOBS` |
| `lib/queue.ts:98` | `10` | `RUN_DURATION_SAMPLES` |
| `lib/analyze.ts:62`, `:66`, `:90`, `:158`, `:167` | `10`, `5`, `15` | `MAX_RENDER_BLOCKING`, `MAX_MAIN_THREAD`, `MAX_ITEMS_PER_OPPORTUNITY`, `MAX_BIG_RESOURCES` |
| `lib/analyze.ts:54`, `:161` | `120`, `200`, `300`, `260` | `MAX_LABEL_CHARS`, etc. |
| `lib/lighthouse.ts:33` | `45000` | `MAX_WAIT_FOR_LOAD_MS`, junto a `RUN_TIMEOUT_MS` |

Los umbrales que el equipo podría querer ajustar van en `lib/config.ts`. Los que son detalle interno de un módulo, como constantes al inicio de ese módulo.

### 5.3 Regla del Boy Scout: mejoras pequeñas ya detectadas
- [ ] `app/components/Results.jsx:360`: `[...batch.results].sort((a) => (a.device === 'mobile' ? -1 : 1))` usa un comparador que ignora el segundo argumento, así que no es un orden válido. `lib/storage.ts:37` ya ordena el lote, de modo que basta con quitarlo o usar `(a, b) => Number(b.device === 'mobile') - Number(a.device === 'mobile')`.
- [ ] `app/components/Results.jsx:24-28`: `CopyButton` no limpia su `setTimeout` al desmontarse.
- [ ] Sustituir los `style={{ … }}` en línea de `Results.jsx:287`, `Results.jsx:411` y `TestForm.jsx:52,71` por clases de `globals.css` (ver §6).
- [ ] Borrar el código comentado de `TestForm.jsx:83-85`.

---

## 6. Estilos (adaptación de "Tailwind Standards")

El proyecto **no usa Tailwind**: usa `app/globals.css` con tokens CSS en `:root` (`--ink`, `--good`, `--radius`…). El SOP persigue dos objetivos que se pueden aplicar igual sin Tailwind.

### 6.1 Una sola fuente de tokens de diseño (equivale a `tailwind.config.js`)
- Los tokens de la interfaz están en `:root` de `globals.css`. Bien.
- **Problema**: `lib/pdf.ts:5` define su propia paleta `COLORS` con valores **distintos** (`good: '#1E8E5A'` frente a `--good: #3f7f6a`). El PDF y la web no coinciden.
- **Cómo aplicarlo**: crear `lib/tokens.ts` con la paleta y que lo consuman tanto `pdf.ts` como, por documentación o generación, las variables de `globals.css`. Ningún color ni radio en hexadecimal fuera de esos dos sitios.
- Nada de estilos en línea para espaciado o márgenes: se usan clases con tokens. El único `style` aceptable es un valor realmente dinámico, como el ancho de la barra de progreso en `page.jsx:116` o el de la mini barra en `Results.jsx:308`.

### 6.2 Utilidad `cn()` para clases condicionales
Hoy se usan template literals que dejan espacios sobrantes o clases vacías, por ejemplo en `Results.jsx:238`: `` `${c.num ? 'num' : ''} ${c.url ? 'url-cell' : ''}` ``.

```ts
// lib/cn.ts
export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');
```
```jsx
// ❌ Antes
<td className={`${c.num ? 'num' : ''} ${c.url ? 'url-cell' : ''}`}>

// ✅ Después
<td className={cn(c.num && 'num', c.url && 'url-cell')}>
```
Las clases con un solo valor interpolado (`` `tile r-${r}` ``, `` `chip r-${r}` ``) son legibles y pueden quedarse como están. `cn()` se usa cuando hay condiciones.

> Si en el futuro se adopta Tailwind, `cn()` se implementa con `clsx` + `tailwind-merge`, y los tokens de `:root` se mueven a `theme.extend` tal como muestra el SOP.

---

## 7. Tests (patrón Arrange, Act, Assert)

### Estado
No hay tests ni script `test` en `package.json`. Sin embargo, el núcleo de la app son **funciones puras** (`extract`, `diagnose`, `summarize`, `compare`, `rate`, `formatValue`, `normalizeUrl`, `validateRequest` y `pickMedian`), que se pueden probar sin Chrome.

### Cómo aplicarlo
1. Instalar Vitest: `npm i -D vitest`. Funciona con los imports `.ts` que ya usa `lib/`.
2. Añadir a `package.json`: `"test": "vitest run"` y `"test:watch": "vitest"`.
3. Colocar cada test **junto a su módulo** (`lib/compare.test.ts`) y los fixtures de Lighthouse en `lib/__fixtures__/` (LHR mínimos recortados de informes reales).
4. Orden de prioridad:
   1. `compare.ts` y `config.ts` (`rate`, `formatValue`, `formatBytes`): rápidos y sin dependencias.
   2. `validate.ts`: URLs válidas e inválidas, dispositivos y número de ejecuciones.
   3. `summarize.ts`: prioridades, fusión imágenes/JS, pruebas antiguas sin `diagnosis` y veredicto.
   4. `analyze.ts`: `extract()` con fixtures, incluidos errores (`runtimeError`, score `null`, HTTP 4xx o redirección).
5. Cada test sigue **AAA**, con un comportamiento por `it` y la descripción en forma de frase:
   ```ts
   // lib/compare.test.ts
   import { describe, it, expect } from 'vitest';
   import { compare } from './compare.ts';

   describe('compare', () => {
     it('marca el LCP como "worse" cuando sube más de un 5 %', () => {
       // Arrange
       const previous = { id: 1, createdAt: '2026-01-01T00:00:00.000Z', lcp: 2000 };
       const current = { lcp: 2200 };

       // Act
       const result = compare(current, previous);

       // Assert
       expect(result?.deltas.lcp).toMatchObject({ status: 'worse', diff: 200 });
     });

     it('devuelve null si no hay prueba anterior', () => {
       // Arrange
       const current = { lcp: 2200 };

       // Act
       const result = compare(current, null);

       // Assert
       expect(result).toBeNull();
     });
   });
   ```
6. **Regla de equipo**: un PR que cambie la lógica de `lib/` incluye o actualiza su test.

---

## 8. Next.js

> **Nota de versión.** El SOP describe los valores por defecto de Next.js 13/14 (`fetch` con `force-cache` por defecto). Este proyecto usa **Next 16** (`package.json`), donde desde la versión 15 **`fetch` y los `GET` de Route Handlers ya no se cachean por defecto**, y Next 16 añade *Cache Components* (`'use cache'`, `cacheLife`, `cacheTag`). Los conceptos del SOP (memoización, Data Cache, revalidación por tiempo o por etiqueta, Full Route Cache) siguen siendo válidos, pero antes de copiar sus ejemplos hay que comprobar la API en la documentación de la versión instalada. Por ejemplo, la firma de `revalidateTag` cambió en Next 16.

### 8.1 Caché: qué se cachea y qué no

| Recurso | Decisión | Estado |
|---|---|---|
| `GET /api/test/[id]` (estado del trabajo) | **Nunca** se cachea: cambia cada segundo | ✅ `dynamic = 'force-dynamic'` (`app/api/test/[id]/route.js:5`) |
| Sondeo desde el cliente | `cache: 'no-store'` | ✅ `app/page.jsx:44` |
| `POST /api/test` y `POST /api/report` | No se cachean (son mutaciones) | ✅ |
| Layout y cabecera | Renderizado estático | ⚠️ La cabecera se renderiza dentro de un componente cliente (ver 8.2) |
| Historial | Vive en `localStorage`: no aplica la caché de Next | n/a |

**Regla**: todo lo que dependa de un trabajo en curso o del navegador del usuario es dinámico. Si se añade un dato del servidor que cambia poco (por ejemplo, una lista de páginas a probar desde una base de datos), se cachea con revalidación por etiqueta y se invalida desde la mutación que lo modifica, tal como muestra el ejemplo `revalidateTag('user')` del SOP.

### 8.2 Renderizado: componentes cliente solo para lo interactivo

**Regla del SOP**: los Server Components son el valor por defecto, y `'use client'` se reserva para elementos interactivos.

**En este repo**: `app/page.jsx:1` declara `'use client'` en la página entera, de modo que la cabecera estática (logo, título, descripción) se envía como JavaScript e hidrata sin necesidad.

**Cómo aplicarlo**
```jsx
// app/page.jsx  (Server Component: sin 'use client')
import Workspace from './components/Workspace/Workspace';

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <img className="brand-logo" src="/logo.svg" alt="" width="38" height="38" />
        <div>
          <h1>Web Performance Check</h1>
          <p>Test a URL page, compare it with your last test and export a PDF.</p>
        </div>
      </header>
      <Workspace />
    </div>
  );
}
```
```jsx
// app/components/Workspace/Workspace.jsx
'use client';
// formulario, progreso, resultados e historial: todo lo que tiene estado
```
- `ScoreChip.jsx` no tiene `'use client'` y no lo necesita, porque no tiene estado. Así deben quedar los primitivos sin interacción.
- `'use client'` solo se pone en el **punto de entrada** de un árbol interactivo, no en cada archivo hijo.

### 8.3 Streaming y `<Suspense>`
- Hoy los datos no se obtienen en el servidor durante el render: llegan por sondeo y desde `localStorage`. Por eso **`loading.js` y `<Suspense>` para datos no aportan nada todavía**. No hay que añadirlos por cumplir.
- **Cuándo aplicarlos**: si el historial pasa al servidor (por ejemplo, a una base de datos; `.gitignore` ya contempla `data/*.db`), el bloque de historial y los resultados se envuelven en `<Suspense fallback={<HistorySkeleton />}>` para que la cabecera y el formulario se envíen y sean interactivos sin esperar a la consulta.

### 8.4 Hidratación selectiva y code splitting (`next/dynamic`)
- `Results.jsx` (426 líneas) junto con `Summary.jsx` y `lib/summarize.ts` solo se muestran **después** de una prueba. Son candidatos claros para separarlos del bundle inicial:
  ```jsx
  // app/components/Workspace/Workspace.jsx
  import dynamic from 'next/dynamic';

  const Results = dynamic(() => import('../Results/Results'), {
    loading: () => <ResultsSkeleton />,
  });
  ```
- Dentro de `Results`, la pestaña *Summarize* puede cargarse también con `dynamic` la primera vez que se abre.

### 8.5 Rendimiento propio: predicar con el ejemplo
Esta herramienta recomienda eliminar las peticiones que bloquean el render y usar `font-display`. Debe cumplirlo ella misma:
- `app/layout.js:13-15` carga Instrument Sans con un `<link>` a Google Fonts, que es una petición bloqueante a un tercero. Hay que sustituirlo por `next/font/google`, que autoaloja la fuente y aplica `display: 'swap'`:
  ```js
  // app/layout.js
  import { Instrument_Sans } from 'next/font/google';
  const instrumentSans = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
  // <html lang="en" className={instrumentSans.className}>
  ```
- Hay que pasar la propia app por Web Performance Check (`npm run build && npm start`) antes de cada versión y registrar el resultado en el PR.

---

## 9. React

### 9.1 No pasar props con spread en JSX
**Estado**: ✅ hoy no hay ningún `<Comp {...props} />`, así que hay que mantenerlo. Las props se pasan explícitamente: `<Results key={batch.batchId} batch={batch} />`.
Al configurar ESLint (§10) se activa `react/jsx-props-no-spreading`.

### 9.2 Hooks personalizados en lugar de HOCs
**Estado**: no hay HOCs (bien), pero la lógica con estado está incrustada en los componentes y se puede extraer a hooks colocados junto a su componente:

| Hook propuesto | Origen actual | Responsabilidad |
|---|---|---|
| `useTestJob()` | `app/page.jsx:14-92` | Iniciar la prueba, sondear, cancelar, refs `timer` / `activeJob`, progreso y ETA |
| `useHistory()` | `app/page.jsx:22-40` | `listBatches`, `openBatch`, `removeBatch`, `clearHistory` |
| `useRememberedUrls()` | `app/components/TestForm.jsx:21-29` | Leer y guardar en `localStorage` la URL por tipo de página |
| `useCopyToClipboard()` | `app/components/Results.jsx:24-28` | Copiar, estado "copiado" y limpiar el timeout al desmontar |
| `useSortedRows(rows, columns)` | `app/components/Results.jsx:196-206` | Estado de orden y filas ordenadas |
| `useArrowKeyTabs()` | `app/components/Results.jsx:369-375` | Navegación con flechas entre pestañas |

Resultado esperado: `Workspace.jsx` queda en unas pocas líneas de composición.
```jsx
export default function Workspace() {
  const history = useHistory();
  const job = useTestJob({ onDone: history.openBatch });
  // …solo JSX
}
```

### 9.3 Componentes de función
**Estado**: ✅ todos los componentes son de función. Es obligatorio en código nuevo.

### 9.4 Arquitectura de componentes por capas
El SOP define cuatro capas. Así encajan los componentes de este repo:

| Capa | Qué es | Componentes (actuales → propuestos) |
|---|---|---|
| **Primitivos** | Piezas mínimas sin lógica de negocio | `CopyButton`, `Icon` (unificar los SVG en línea de `TestForm.jsx:5`, `History.jsx:69`, `Results.jsx:32-34,395,399`), `Badge`, `Delta` |
| **Compuestos** | Patrón *compound* flexible | **`Tabs`** (hoy hay 3 implementaciones: `Results.jsx:393`, `Results.jsx:413`, `History.jsx:36`), **`Accordion`** (`<details className="acc">` en `Findings`, `Opportunities`), `DataTable` |
| **Complejos** | Autocontenidos y sin personalización entre páginas | `ScoreChip`, `ImageThumb`, `CopyUrl` |
| **Aplicados** | Específicos de una vista, colocados con ella | `DeviceResult`, `Diagnosis`, `LcpBreakdown`, `Fix`, `History`, `TestForm` |

Ejemplo del compuesto `Tabs`, que sustituye a las tres implementaciones y centraliza `role`, `aria-selected` y la navegación por teclado:
```jsx
<Tabs value={view} onChange={setView} label="Result view">
  <Tabs.List>
    <Tabs.Tab value="result" icon={<Icon name="chart" />}>Test result</Tabs.Tab>
    <Tabs.Tab value="summary" icon={<Icon name="list" />} count={summary.actions.length}>Summarize</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="result"><DeviceResult test={current} /></Tabs.Panel>
  <Tabs.Panel value="summary"><Summary summary={summary} /></Tabs.Panel>
</Tabs>
```
`Findings` (`Results.jsx:196`) recibe hoy 6 props de configuración (`title`, `note`, `rows`, `columns`, `empty`, `badge`). Es el "componente demasiado configurable" que el SOP desaconseja. Con `Accordion` + `DataTable` cada vista compone lo que necesita:
```jsx
<Accordion>
  <Accordion.Summary title="Oversized images" badge={imagesBadge} />
  <Accordion.Body note={`Images above ${formatBytes(THRESHOLDS.imageBytes)} transferred.`}>
    <DataTable rows={findings.bigImages} columns={IMAGE_COLUMNS} empty="No images above the threshold." />
  </Accordion.Body>
</Accordion>
```

### 9.5 Empaquetar como módulo NPM
No aplica: es una aplicación, no una librería de componentes. Solo se reconsideraría si `ui/` se compartiera con otros proyectos.

---

## 10. Secciones que el SOP deja vacías: propuestas provisionales

El SOP incluye títulos sin contenido: *Project Configuration (Environment files, Docker files)*, *Event Listening*, *Cookie and Local Storage*, *Performance*, *Component Pattern* y *Client Side State*. Hasta que el equipo las complete, este repo sigue estas reglas, derivadas del código actual:

### Archivos de entorno
- Crear `.env.example` con las variables que se leen (hoy solo `CHROME_PATH`, usada en `lib/lighthouse.ts:18`) y una línea de descripción por variable.
- Los secretos reales van en `.env.local`, que ya está ignorado en `.gitignore`.
- `process.env` se lee solo en código de servidor (`lib/lighthouse.ts`, rutas de `app/api`), nunca en `lib/config.ts`, que se comparte con el cliente.

### Docker
- Si se añade un `Dockerfile`, debe incluir Chromium y Node ≥ 22.19 (requisitos del README), fijar `CHROME_PATH` y ejecutar `npm run build` en una etapa separada (multi-stage).

### Eventos, listeners y temporizadores
- Cada `addEventListener`, `setTimeout` o `setInterval` tiene su limpieza. El patrón de referencia es `lib/lighthouse.ts:41-51` (`{ once: true }` + `removeEventListener` en `finally`).
- En React la limpieza va en el `return` del `useEffect`. Pendiente: el `setTimeout` de `CopyButton` (§5.3).

### Cookies y `localStorage`
- **Todas las claves con el prefijo `casino-perf:`** y declaradas en un único módulo (`lib/storage.ts`). Hoy `TestForm.jsx:13` declara la suya por separado.
- Cada lectura y escritura va en `try/catch` y la app funciona sin almacenamiento. `lib/storage.ts` ya lo hace bien.
- Si cambia la forma de los datos guardados, hay que mantener la compatibilidad con pruebas antiguas, como ya se hace con las pruebas sin `diagnosis`. Una alternativa es añadir un campo `schemaVersion`.
- No se usan cookies: no hay sesión ni datos del lado del servidor.

### Estado en el cliente
- Estado local por defecto y elevarlo solo cuando dos componentes lo comparten. No hace falta una librería de estado global.
- El estado derivado se calcula y no se guarda (por ejemplo, `summary` con `useMemo` en `Results.jsx:367`, que está bien).
- La lógica con estado reutilizable va en hooks personalizados (§9.2).

### Lint y formato
Hoy no hay ESLint ni Prettier. Se propone:
- ESLint con `eslint-config-next`, ejecutado con `eslint .` mediante un script `"lint"`.
- Reglas que automatizan este SOP: `react/jsx-props-no-spreading`, `max-params: ["error", 3]`, `no-unused-vars`, `@typescript-eslint/no-explicit-any` (como `warn` al principio) y `@typescript-eslint/no-non-null-assertion` (`warn`).
- Prettier con la configuración actual implícita: comillas simples, punto y coma y unos 140 caracteres de ancho.

---

## 11. Plan de adopción por fases

Cada fase se entrega en uno o varios PR pequeños y no mezcla refactor con cambios funcionales.

| Fase | Contenido | Riesgo |
|---|---|---|
| **0. Limpieza rápida** | Borrar el código comentado, reescribir el comentario de `queue.ts`, corregir el comparador de `Results.jsx:360`, limpiar el timeout de `CopyButton` y convertir los textos "200 KB"/"150 KB" a `THRESHOLDS` | Muy bajo |
| **1. Red de seguridad** | Vitest + tests AAA de `compare`, `config`, `validate`, `summarize` y `analyze` con fixtures; ESLint | Bajo |
| **2. Utilidades compartidas** | `lib/format.ts`, `lib/cn.ts` y `lib/tokens.ts`; constantes para los números mágicos; un único `DEVICES`; claves de storage centralizadas | Bajo |
| **3. Funciones** | `saveBatch` con objeto; quitar los *flags* de `Delta` y `CopyUrl`; dividir `summarize()` y `extract()`; renombrados de §4.3; reducir `any` | Medio (cubierto por la fase 1) |
| **4. React** | Extraer hooks (§9.2), reorganizar carpetas (§1) y dividir `Results.jsx` | Medio |
| **5. Next.js** | `page.jsx` como Server Component + `Workspace` cliente, `next/dynamic` para `Results`, `next/font` | Medio |
| **6. Componentes compuestos** | `Tabs`, `Accordion`, `DataTable` e `Icon`; migración opcional a `.tsx` | Medio |

---

## 12. Checklist para cada PR

**Del SOP**
- [ ] Las funciones hacen una sola cosa y tienen nombres claros.
- [ ] Las funciones tienen 3 parámetros o menos; si hay más, se usa un objeto.
- [ ] No hay argumentos *flag*: se usan funciones separadas o se pasa un formateador o componente.
- [ ] Las funciones son puras cuando es posible, sobre todo en `lib/`.
- [ ] Los nombres siguen la convención (`get`/`list`/`save`/`delete`/`build`/`format`).
- [ ] Se usa encadenamiento opcional y `??` en accesos anidados, sin `!` ni `any` nuevos.
- [ ] No queda código comentado.
- [ ] Los comentarios explican el *por qué*, no el *qué*.
- [ ] El código relacionado está colocado junto: componente, hook y test en la misma carpeta.
- [ ] Los números mágicos son constantes con nombre (umbrales ajustables en `lib/config.ts`).
- [ ] El código prioriza la legibilidad sobre la concisión.
- [ ] Los tests siguen AAA y los cambios en `lib/` traen su test.

**Específico de este repo**
- [ ] `'use client'` solo en la entrada de un árbol interactivo.
- [ ] Nada que dependa de un trabajo en curso o de `localStorage` se cachea.
- [ ] No hay props con spread en JSX.
- [ ] La lógica con estado reutilizable está en un hook personalizado.
- [ ] Las clases condicionales usan `cn()`, sin estilos en línea salvo valores dinámicos.
- [ ] Los colores salen de los tokens (`globals.css` / `lib/tokens.ts`).
- [ ] Las claves de `localStorage` llevan el prefijo `casino-perf:` y se declaran en `lib/storage.ts`.
- [ ] Cada listener o temporizador tiene su limpieza.
- [ ] `npm run build`, `npm test` y `npm run lint` pasan.
- [ ] Se ha dejado el código que se ha tocado un poco mejor de lo que estaba (regla del Boy Scout).

---

*Fuente: "Standard Operating Procedure" (URDT), secciones General Best Practices, Next.js Standards, React.js Standards y Tailwind Standards. Las propuestas marcadas como provisionales (§10) no están en el SOP y deben validarse con el equipo.*
