# SIGMA — Sistema de auditoría de planillas médicas

Sistema que detecta y corrige automáticamente valores facturados incorrectamente en planillas médicas
usando Machine Learning (RandomForest + SHAP), con trazabilidad completa para el auditor humano.

Este proyecto tiene 3 partes independientes que se ejecutan por separado:

```
SIGMA/
├── sql/        6 scripts numerados: esquema de PostgreSQL + datos de ejemplo
├── ml/         Microservicio Python (FastAPI) que predice el riesgo de cada fila
├── backend/    API NestJS (TypeScript) que orquesta todo y guarda en PostgreSQL
└── frontend/   Interfaz web (React) — lo que usa el auditor en el navegador
```

Todo corre **nativo en Windows, sin Docker** — igual que en tu entorno de desarrollo original.

Para que funcione necesitas **3 terminales abiertas al mismo tiempo, sin cerrarlas**: una con el
microservicio ML (puerto 8000), una con el backend (puerto 3000) y una con el frontend (puerto 5173). Si
cierras cualquiera de las tres (o le das Ctrl+C), esa parte se apaga y lo que dependía de ella deja de
responder.

---

## 0. Requisitos previos (instalar una sola vez)

1. **PostgreSQL 16 o 17** — https://www.postgresql.org/download/windows/ (durante la instalación,
   anota la contraseña que le pongas al usuario `postgres`; en los pasos de abajo se usa `postgres`
   como ejemplo, cámbiala si pusiste otra).
2. **Node.js 20 LTS o superior** — https://nodejs.org (incluye `npm`).
3. **Python 3.11 o superior** — https://www.python.org/downloads/windows/ (marca "Add python.exe to PATH"
   durante la instalación).
4. Un editor o simplemente la terminal (PowerShell o CMD) para correr los comandos de abajo.

Verifica que todo esté instalado abriendo PowerShell y corriendo:

```powershell
node --version
python --version
psql --version
```

---

## 1. Base de datos

Abre PowerShell en la carpeta `SIGMA\sql` y crea la base de datos (te pedirá la contraseña de `postgres`
que pusiste al instalar):

```powershell
psql -U postgres -c "CREATE DATABASE sigma;"
```

Luego ejecuta los 8 scripts **en orden** (crean las tablas y cargan los datos de ejemplo):

```powershell
psql -U postgres -d sigma -f 01-extensions.sql
psql -U postgres -d sigma -f 02-schema-usuarios-proveedores-catalogo.sql
psql -U postgres -d sigma -f 03-schema-planillas-detalles-correcciones.sql
psql -U postgres -d sigma -f 04-seed-usuarios.sql
psql -U postgres -d sigma -f 05-seed-proveedores-catalogo.sql
psql -U postgres -d sigma -f 06-seed-planilla-ejemplo.sql
psql -U postgres -d sigma -f 07-alter-catalogo-tarifas.sql
psql -U postgres -d sigma -f 08-alter-detalles-precision.sql
```

Esto deja creada una planilla de ejemplo (`PLA-2026-0842`, Hospital General Ambato) con 7 filas de
detalle, incluyendo el caso clásico: el código TPSNS `99201` con un beneficiario que solicitó $45.00
cuando el valor oficial de catálogo es $8.71 — el caso que el modelo debe detectar como CRÍTICO y
corregir automáticamente al revisar el riesgo.

> ⚠️ **Si ya tenías SIGMA instalado antes** (corriste solo los scripts `01`-`06` en una sesión previa):
> no hace falta recrear la base de datos, solo corre el nuevo `07-alter-catalogo-tarifas.sql` una vez
> sobre tu base `sigma` existente — agrega la sección de Catálogo sin borrar tus datos.
>
> ⚠️ **Si ya corriste hasta `07`** (instalaste la sección de Catálogo pero aún no el script `08`): corre
> también `08-alter-detalles-precision.sql` una vez sobre tu base `sigma` existente — permite cantidades
> con decimales (dosis parciales de medicamentos, ej. 1.43 unidades) y valores unitarios de hasta 4
> decimales en las planillas cargadas, sin borrar tus datos.

---

## 2. Microservicio de Machine Learning

Abre una terminal en `SIGMA\ml`:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
```

> ⚠️ Usa siempre exactamente `.venv` (con el punto) como nombre, y créalo **una sola vez**. Si por
> accidente creas un segundo entorno con otro nombre (por ejemplo `venv`, sin punto) y lo activas, te va
> a faltar todo lo instalado y verás algo como `ModuleNotFoundError: No module named 'joblib'`. Si eso te
> pasa: `deactivate`, activa el bueno con `.venv\Scripts\activate`, y borra el que sobra con
> `Remove-Item -Recurse -Force venv`.

`train_model.py` genera un dataset sintético y entrena el modelo (crea `model.pkl`, tarda unos
segundos). **Solo hace falta correrlo una vez** — si vuelves a levantar el servicio otro día, sáltate
este paso, `model.pkl` ya queda guardado.

Deja esta terminal abierta (con `.venv` activado) y levanta el servicio:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

Verifica que responde abriendo en el navegador `http://localhost:8000/health` (debe mostrar
`{"status":"ok"}`), o mira `ml/README.md` para ejemplos con `curl`/`Invoke-RestMethod`.

**Deja esta terminal corriendo** — el backend le habla a este servicio por HTTP.

---

## 3. Backend (API)

Abre **otra** terminal en `SIGMA\backend`:

```powershell
npm install
copy .env.example .env
```

Revisa el archivo `.env` recién creado: si tu usuario/contraseña de PostgreSQL no son `postgres`/`postgres`,
edítalo con los tuyos (`POSTGRES_USER`, `POSTGRES_PASSWORD`).

```powershell
npm run start:dev
```

> ⚠️ El script se llama `start:dev`, no `dev` — este proyecto (a diferencia del frontend) no tiene un
> script `npm run dev`. Si corres `npm run dev` aquí por error verás `npm error Missing script: "dev"`.

El backend queda escuchando en `http://localhost:3000` (rutas bajo `/api`). Déjalo corriendo.

> ℹ️ Si abres `http://localhost:3000/api` directo en el navegador vas a ver
> `{"message":"Cannot GET /api","statusCode":404}` — es **normal**, no es un error. El backend es solo una
> API (JSON), no una página; no hay nada que "ver" ahí. Donde sí navegas es en el frontend (paso 4).

---

## 4. Frontend (la interfaz que usa el auditor)

Abre una **tercera** terminal en `SIGMA\frontend`:

```powershell
npm install
npm run dev
```

Te va a mostrar una URL, normalmente `http://localhost:5173` — ábrela en el navegador. Esa es la
aplicación real, funcionando contra tu base de datos y tu modelo de ML.

---

## Usuarios de prueba

Las 3 cuentas ya están cargadas por el script `04-seed-usuarios.sql`, todas con la misma contraseña:

| Rol       | Correo                      | Contraseña   |
|-----------|------------------------------|--------------|
| ADMIN     | admin@hospital.gob.ec        | `Sigma2026!` |
| AUDITOR   | auditor@hospital.gob.ec      | `Sigma2026!` |
| DIGITADOR | digitador@hospital.gob.ec    | `Sigma2026!` |

## Flujo recomendado para probarlo

1. Entra con `auditor@hospital.gob.ec`.
2. En "Planillas" verás `PLA-2026-0842` ya cargada. Entra a "Revisar riesgo" y ejecuta la revisión con IA
   — verás cómo la fila del código 99201 sale CRÍTICO y se corrige automáticamente de $45.00 a $8.71.
3. Revisa la "Planilla individual" de ese beneficiario (muestra el valor original) y luego la "Planilla
   consolidada" (ya con el valor corregido) — ambas se pueden imprimir/guardar como PDF con el botón
   correspondiente.
4. Revisa "Correcciones" para ver el historial de auditoría.
5. Prueba "+ Nueva carga" para subir una planilla `.xlsx` nueva (hay archivos de prueba si ya los tenías
   de tu sesión anterior, o usa cualquier Excel con columnas: fecha, codigo_tpsns, descripcion,
   beneficiario_nombre, beneficiario_identificacion, cantidad, valor_unitario).
6. Entra a "Catálogo" (nuevo, ver sección siguiente) para revisar los códigos oficiales o cargar tu
   propio archivo de códigos.

## Catálogo de tarifas (nuevo)

Pestaña **Catálogo** en la barra superior. Es el listado de códigos TPSNS/insumos con su nombre y su
costo unitario oficial — la misma tabla que usa "Revisar riesgo" para saber cuál es el valor correcto
de cada código y decidir si hay que corregirlo. Cualquier usuario logueado (ADMIN, AUDITOR o
DIGITADOR) puede verla, cargar un archivo y editar códigos a mano.

**Cargar un archivo `.xlsx`** — botón "Cargar catálogo (.xlsx)". Acepta dos formatos de encabezado
(no distingue mayúsculas/minúsculas):

- El formato del catálogo real de insumos/medicamentos: `TIPO_PROCEDIMIENTO, NIVEL, CODIGO, NOMBRE, VALOR_II`
- El formato simple que ya usa el resto del sistema: `codigo_tpsns, descripcion, valor_oficial` (con
  `tipo_procedimiento`/`nivel` opcionales)

Al subirlo, SIGMA hace un **upsert**: si el código ya existe en el catálogo, actualiza su nombre y
costo con lo que viene en el archivo; si no existe, lo agrega. **Nunca borra** códigos que ya tenías y
no vinieron en el archivo — así puedes ir cargando catálogos de distintas fuentes (consultas,
insumos, medicamentos, etc.) sin perder lo que ya cargaste antes. Al terminar te muestra cuántas filas
eran nuevas, cuántas se actualizaron, y el detalle de cualquier fila con error (código o valor
faltante, fila duplicada dentro del mismo archivo).

**Agregar o editar a mano** — botón "+ Nuevo código" o "Editar" en cualquier fila: un formulario simple
con código, nombre, costo unitario (admite hasta 4 decimales, para insumos de muy bajo costo como
$0.0138) y tipo/nivel opcionales.

Esta sección por sí sola **no corrige códigos digitados incorrectamente todavía** — es la base de
datos que una futura función de auto-corrección necesitaría para comparar el código que alguien
escribió mal contra el catálogo real y sugerir el código correcto. Mientras más completo esté este
catálogo, mejor va a funcionar esa función cuando se construya.

## Notas importantes

- **No es una copia de tu proyecto original** — es una implementación nueva, autocontenida, que sigue
  la misma arquitectura y decisiones de diseño que describiste (NestJS + TypeORM + PostgreSQL nativo,
  FastAPI + RandomForest + SHAP, el modelo nunca inventa el valor corregido, la corrección nunca cambia
  `estado_fila`, etc.), pensada para que la puedas correr tal cual y seguir construyendo sobre ella.
- El dataset del modelo ML es sintético (mismo tema pendiente que ya tenías identificado: falta
  reentrenar con datos reales una vez existan auditorías etiquetadas).
- CORS está abierto (`origin: true`) para desarrollo local — restríngelo antes de cualquier uso real.
- Cada vez que reinicies tu computadora necesitas volver a levantar, en este orden: PostgreSQL (normalmente
  arranca solo como servicio de Windows), luego `ml` (uvicorn), luego `backend`, luego `frontend`.
- Si algo fallara al primer intento (versiones de Node/Python distintas, puerto ocupado, etc.), revisa el
  mensaje de error de la terminal correspondiente — casi siempre indica exactamente qué falta.

## Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| `ModuleNotFoundError: No module named 'joblib'` (u otro paquete) al correr `uvicorn` | Activaste un entorno virtual distinto al que tiene `pip install -r requirements.txt` corrido (por ejemplo creaste `venv` además de `.venv`) | `deactivate`, luego `.venv\Scripts\activate`, y confirma con `pip list` que aparecen `joblib`, `scikit-learn`, `shap`, `pandas`, `numpy` |
| `npm error Missing script: "dev"` en `backend` | Ese proyecto usa `start:dev`, no `dev` (solo el `frontend` usa `dev`) | `npm run start:dev` |
| `{"message":"Cannot GET /api",...}` al abrir `localhost:3000/api` en el navegador | Comportamiento normal — el backend es una API, no una página | Ignóralo; para "ver" algo abre `localhost:5173` (el frontend) |
| `ERR_CONNECTION_REFUSED` en `localhost:5173` (o en `:3000`/`:8000`) | La terminal de ese servicio no está corriendo — se cerró, le diste Ctrl+C, o nunca la abriste | Abre una terminal nueva en esa carpeta (`frontend`, `backend` o `ml`) y vuelve a correr su comando de arranque, **sin cerrar las otras dos** |
| El login funciona pero "Planillas" sale vacío o da error | El backend no puede conectarse a PostgreSQL, o los scripts `sql/01`-`07` no corrieron completos | Revisa que el servicio de PostgreSQL esté iniciado (`services.msc` → PostgreSQL) y vuelve a correr los 7 scripts SQL en orden |
| `column "valor_oficial" is of type numeric(10,2)...` o "Catálogo" sale vacío/da error 500 | No corriste `07-alter-catalogo-tarifas.sql` sobre una base `sigma` que ya tenías de antes | `psql -U postgres -d sigma -f 07-alter-catalogo-tarifas.sql` dentro de `SIGMA\sql`, luego reinicia el backend |
| `proveedor_id inválido` al confirmar "Nueva carga" (paso 2) | **Corregido.** Antes el frontend traía la lista de proveedores de un archivo con UUID fijos; si volvías a correr `05-seed-proveedores-catalogo.sql` (o recreabas la base), Postgres genera UUID nuevos y esa lista quedaba desactualizada. Ahora el desplegable se carga en vivo desde `GET /api/proveedores`, así que esto ya no debería volver a pasar | Si de todas formas lo ves, asegúrate de tener la versión más reciente del backend y el frontend (esta corrección) y reinicia ambos |
| `invalid input syntax for type integer: "1.43"` (Error 500) al subir una planilla con cantidades decimales (ej. dosis parciales de medicamentos líquidos) | **Corregido.** La columna `cantidad` de `detalles_servicios` era `INT` y no aceptaba decimales; datos reales de emergencia sí traen cantidades como 1.43 o 0.715 unidades | Corre `psql -U postgres -d sigma -f 08-alter-detalles-precision.sql` dentro de `SIGMA\sql`, luego reinicia el backend. También amplía `valor_unitario_solicitado`/`subtotal_solicitado` (y las columnas equivalentes de `correcciones_automaticas`) a 4 decimales, igual que ya se hizo con el Catálogo, para no perder precisión en insumos de bajo costo unitario |
| "No se pudo contactar el servicio ML... Request failed with status code 422" al presionar "Revisar riesgo" | **Corregido.** El microservicio ML todavía exigía `cantidad` como número entero (rechazaba las cantidades decimales que el fix anterior ya permite) y exigía que el valor oficial de catálogo fuera mayor a 0 (fallaba si el código no está en catálogo y el valor solicitado es $0.00) | Reemplaza `SIGMA/ml/main.py` por la versión corregida y reinicia esa terminal (`Ctrl+C`, `uvicorn main:app --host 0.0.0.0 --port 8000`). No hace falta reentrenar el modelo (`model.pkl` no cambia) |
