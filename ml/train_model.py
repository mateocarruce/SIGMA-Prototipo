"""
SIGMA - Entrenamiento del modelo de deteccion de riesgo en reclamos medicos.

Genera un dataset sintetico de 4000 filas (3000 normales + 1000 anomalas,
repartidas en 4 tipos de regla de negocio: valor alterado, cantidad alterada,
beneficiario repetido, y combinaciones de las anteriores), entrena un
RandomForestClassifier sobre 3 features y guarda el modelo con joblib.

Features:
  - ratio_valor: valor_unitario_solicitado / valor_unitario_oficial
  - cantidad: cantidad de items solicitados
  - veces_repetido_beneficiario: veces que el mismo beneficiario+codigo
    aparece en la misma planilla

Uso:
    python train_model.py
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

RANDOM_STATE = 42
N_NORMAL = 3000
N_ANOMALOUS = 1000
N_ANOMALY_TYPES = 4  # valor alterado, cantidad alterada, beneficiario repetido, combinacion
MODEL_PATH = "model.pkl"

FEATURES = ["ratio_valor", "cantidad", "veces_repetido_beneficiario"]


def generar_dataset(rng: np.random.Generator) -> pd.DataFrame:
    filas = []

    # --- Filas normales -----------------------------------------------
    # ratio_valor cerca de 1.0 (pequeno ruido de redondeo), cantidad baja
    # (1-3, tipico de servicios medicos), beneficiario casi nunca repetido.
    ratio_normal = rng.normal(loc=1.0, scale=0.03, size=N_NORMAL)
    ratio_normal = np.clip(ratio_normal, 0.85, 1.15)
    cantidad_normal = rng.choice([1, 1, 1, 2, 2, 3], size=N_NORMAL)
    repetido_normal = rng.choice([1, 1, 1, 1, 2], size=N_NORMAL, p=[0.75, 0.1, 0.08, 0.05, 0.02])

    for r, c, v in zip(ratio_normal, cantidad_normal, repetido_normal):
        filas.append({"ratio_valor": r, "cantidad": c, "veces_repetido_beneficiario": v, "label": 0})

    # --- Filas anomalas --------------------------------------------------
    n_por_tipo = N_ANOMALOUS // N_ANOMALY_TYPES  # 250 cada una

    # Tipo 1: valor alterado (sobrefacturacion) — ratio_valor muy por encima de 1
    ratio_1 = rng.uniform(1.5, 6.0, size=n_por_tipo)
    cantidad_1 = rng.choice([1, 1, 2, 3], size=n_por_tipo)
    repetido_1 = rng.choice([1, 1, 2], size=n_por_tipo, p=[0.85, 0.1, 0.05])
    for r, c, v in zip(ratio_1, cantidad_1, repetido_1):
        filas.append({"ratio_valor": r, "cantidad": c, "veces_repetido_beneficiario": v, "label": 1})

    # Tipo 2: cantidad alterada — cantidad anormalmente alta, valor normal
    ratio_2 = rng.normal(loc=1.0, scale=0.04, size=n_por_tipo)
    ratio_2 = np.clip(ratio_2, 0.85, 1.2)
    cantidad_2 = rng.integers(8, 25, size=n_por_tipo)
    repetido_2 = rng.choice([1, 1, 2], size=n_por_tipo, p=[0.85, 0.1, 0.05])
    for r, c, v in zip(ratio_2, cantidad_2, repetido_2):
        filas.append({"ratio_valor": r, "cantidad": c, "veces_repetido_beneficiario": v, "label": 1})

    # Tipo 3: beneficiario repetido — mismo beneficiario+codigo muchas veces
    ratio_3 = rng.normal(loc=1.0, scale=0.05, size=n_por_tipo)
    ratio_3 = np.clip(ratio_3, 0.85, 1.2)
    cantidad_3 = rng.choice([1, 1, 2], size=n_por_tipo)
    repetido_3 = rng.integers(4, 12, size=n_por_tipo)
    for r, c, v in zip(ratio_3, cantidad_3, repetido_3):
        filas.append({"ratio_valor": r, "cantidad": c, "veces_repetido_beneficiario": v, "label": 1})

    # Tipo 4: combinaciones — dos o tres senales anomalas a la vez
    ratio_4 = rng.uniform(1.4, 5.0, size=n_por_tipo)
    cantidad_4 = rng.integers(5, 20, size=n_por_tipo)
    repetido_4 = rng.integers(3, 10, size=n_por_tipo)
    for r, c, v in zip(ratio_4, cantidad_4, repetido_4):
        filas.append({"ratio_valor": r, "cantidad": c, "veces_repetido_beneficiario": v, "label": 1})

    df = pd.DataFrame(filas)
    return df.sample(frac=1.0, random_state=RANDOM_STATE).reset_index(drop=True)


def main():
    rng = np.random.default_rng(RANDOM_STATE)
    df = generar_dataset(rng)

    print(f"Dataset generado: {len(df)} filas "
          f"({(df['label'] == 0).sum()} normales, {(df['label'] == 1).sum()} anomalas)")

    X = df[FEATURES]
    y = df["label"]

    modelo = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    modelo.fit(X, y)

    train_acc = modelo.score(X, y)
    print(f"Accuracy sobre datos de entrenamiento: {train_acc:.4f}")

    joblib.dump({"model": modelo, "features": FEATURES}, MODEL_PATH)
    print(f"Modelo guardado en {MODEL_PATH}")


if __name__ == "__main__":
    main()
