# SIGMA — Microservicio ML

Microservicio FastAPI que evalúa el riesgo de una fila de `detalles_servicios`
(posible sobrefacturación, cantidad alterada o beneficiario repetido) con un
`RandomForestClassifier` entrenado sobre datos sintéticos, explicado con SHAP.

Contrato completo en `../CONTRACT.md`, sección 2.

## Setup

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Entrenar el modelo

```bash
python train_model.py
```

Genera un dataset sintético (3000 filas normales + 1000 anómalas repartidas en
4 tipos de anomalía: valor alterado, cantidad alterada, beneficiario repetido
y combinaciones), entrena el `RandomForestClassifier`
(`n_estimators=200, max_depth=6, class_weight="balanced"`) sobre las features
`ratio_valor`, `cantidad`, `veces_repetido_beneficiario`, y guarda el modelo
en `model.pkl` (junto con la lista de features, vía `joblib`).

Este paso debe correrse una vez antes de levantar el servidor — `model.pkl`
no se versiona en git.

## Levantar el servidor

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Docs interactivas (Swagger) en `http://127.0.0.1:8000/docs`.

## Endpoints

### `GET /health`

```bash
curl http://127.0.0.1:8000/health
```

```json
{"status": "ok"}
```

### `POST /predecir-riesgo`

Body:

```json
{
  "cantidad": 1,
  "valor_unitario_solicitado": 45.0,
  "valor_unitario_oficial": 8.71,
  "veces_repetido_beneficiario": 1
}
```

`score` es la probabilidad (0-1) de que la fila sea anómala, según el
RandomForest. `label` se deriva de `score`: `BAJO` (<0.25), `MEDIO` (<0.50),
`ALTO` (<0.75), `CRITICO` (≥0.75). `shap_values` son las contribuciones de
cada feature al `score` de esa predicción puntual (SHAP TreeExplainer sobre
el RandomForest), normalizadas para sumar ~1.

#### Ejemplo 1 — valor muy por encima del catálogo (esperado: CRITICO)

```bash
curl -s -X POST http://127.0.0.1:8000/predecir-riesgo \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 1, "valor_unitario_solicitado": 45.0, "valor_unitario_oficial": 8.71, "veces_repetido_beneficiario": 1}'
```

```json
{"score":1.0,"label":"CRITICO","shap_values":{"ratio_valor":0.8292,"cantidad":0.0842,"veces_repetido_beneficiario":0.0866}}
```

#### Ejemplo 2 — valor coincide con catálogo (esperado: BAJO)

```bash
curl -s -X POST http://127.0.0.1:8000/predecir-riesgo \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 1, "valor_unitario_solicitado": 18.0, "valor_unitario_oficial": 18.0, "veces_repetido_beneficiario": 1}'
```

```json
{"score":0.0195,"label":"BAJO","shap_values":{"ratio_valor":0.3745,"cantidad":0.3128,"veces_repetido_beneficiario":0.3127}}
```

#### Ejemplo 3 — valor correcto pero beneficiario repetido 6 veces (esperado: ALTO/CRITICO)

```bash
curl -s -X POST http://127.0.0.1:8000/predecir-riesgo \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 3, "valor_unitario_solicitado": 12.5, "valor_unitario_oficial": 12.5, "veces_repetido_beneficiario": 6}'
```

```json
{"score":0.7914,"label":"CRITICO","shap_values":{"ratio_valor":0.1337,"cantidad":0.1833,"veces_repetido_beneficiario":0.683}}
```

## Notas

- Sin autenticación (uso interno, según contrato).
- CORS abierto a todos los orígenes (demo local).
- El backend (NestJS) debe llamar a `http://127.0.0.1:8000` (IP explícita, no
  `localhost`), tal como especifica el contrato.
