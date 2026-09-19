"""
SIGMA - Microservicio ML (FastAPI)

Expone:
  GET  /health            -> {"status": "ok"}
  POST /predecir-riesgo   -> score de riesgo (0-1), nivel de riesgo, y
                              contribuciones SHAP normalizadas por feature.

Ver CONTRACT.md seccion 2 para el contrato exacto. Ejecutar con:
  uvicorn main:app --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = "model.pkl"

# Umbrales de clasificacion (contrato): BAJO<0.25, MEDIO<0.50, ALTO<0.75, CRITICO>=0.75
UMBRAL_MEDIO = 0.25
UMBRAL_ALTO = 0.50
UMBRAL_CRITICO = 0.75

ml_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        data = joblib.load(MODEL_PATH)
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"No se encontro '{MODEL_PATH}'. Corre 'python train_model.py' primero."
        ) from exc

    ml_state["model"] = data["model"]
    ml_state["features"] = data["features"]
    ml_state["explainer"] = shap.TreeExplainer(ml_state["model"])
    yield
    ml_state.clear()


app = FastAPI(title="SIGMA - Microservicio ML", lifespan=lifespan)

# CORS abierto: servicio interno para demo local, sin autenticacion.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PrediccionRequest(BaseModel):
    # float (no int): datos reales incluyen cantidades fraccionarias, por
    # ejemplo dosis parciales de medicamentos líquidos (1.43, 0.715 unidades).
    cantidad: float = Field(..., gt=0)
    valor_unitario_solicitado: float = Field(..., ge=0)
    # ge=0 (no gt=0): un código sin tarifa oficial en catálogo puede caer en
    # el valor solicitado como referencia, y ese valor solicitado puede ser
    # 0 (insumos entregados sin costo). predecir_riesgo() cubre la división
    # por cero que esto implicaría.
    valor_unitario_oficial: float = Field(..., ge=0)
    veces_repetido_beneficiario: int = Field(..., ge=0)


class PrediccionResponse(BaseModel):
    score: float
    label: str
    shap_values: dict[str, float]


def calcular_label(score: float) -> str:
    if score < UMBRAL_MEDIO:
        return "BAJO"
    if score < UMBRAL_ALTO:
        return "MEDIO"
    if score < UMBRAL_CRITICO:
        return "ALTO"
    return "CRITICO"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predecir-riesgo", response_model=PrediccionResponse)
def predecir_riesgo(body: PrediccionRequest):
    model = ml_state["model"]
    features = ml_state["features"]
    explainer = ml_state["explainer"]

    # Sin tarifa de referencia (valor_unitario_oficial == 0) no hay ratio que
    # calcular: usamos 1.0 (neutro) en vez de dividir por cero.
    if body.valor_unitario_oficial > 0:
        ratio_valor = body.valor_unitario_solicitado / body.valor_unitario_oficial
    else:
        ratio_valor = 1.0

    fila = {
        "ratio_valor": ratio_valor,
        "cantidad": body.cantidad,
        "veces_repetido_beneficiario": body.veces_repetido_beneficiario,
    }
    X = pd.DataFrame([fila])[features]

    proba = model.predict_proba(X)[0]
    clase_positiva_idx = list(model.classes_).index(1)
    score = float(proba[clase_positiva_idx])
    label = calcular_label(score)

    # SHAP TreeExplainer: contribucion de cada feature a la prediccion de
    # ESTA instancia puntual, para la clase positiva (1 = anomalia).
    raw_shap = explainer.shap_values(X)
    raw_shap = np.asarray(raw_shap)
    if raw_shap.ndim == 3:
        # shape (n_samples, n_features, n_classes)
        contribuciones = raw_shap[0, :, clase_positiva_idx]
    else:
        # shape (n_samples, n_features) — modelos binarios en versiones
        # de shap donde shap_values ya devuelve solo la clase positiva.
        contribuciones = raw_shap[0]

    # Normalizamos las contribuciones absolutas para que sumen ~1: cada
    # valor representa el peso relativo de esa feature en ESTA prediccion.
    abs_contribuciones = np.abs(contribuciones)
    total = abs_contribuciones.sum()
    if total > 0:
        pesos = abs_contribuciones / total
    else:
        pesos = np.full_like(abs_contribuciones, 1.0 / len(abs_contribuciones))

    shap_values = {feat: round(float(peso), 4) for feat, peso in zip(features, pesos)}

    return PrediccionResponse(score=round(score, 4), label=label, shap_values=shap_values)


@app.exception_handler(KeyError)
def handle_missing_model(_request, _exc):
    raise HTTPException(status_code=500, detail="Modelo no cargado. Corre 'python train_model.py'.")
