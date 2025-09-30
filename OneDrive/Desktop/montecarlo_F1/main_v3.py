#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations
import argparse
from dataclasses import dataclass
import numpy as np
from typing import Dict

# Importa a engine existente do projeto principal
from main import F1MonteCarlo  # reaproveita a classe já validada


# No início do arquivo main_v3.py, substitua o dataclass SimParams por este:
@dataclass
class SimParams:
    n_sim: int = 50000
    seed: int = 42
    pace_driver_weight: float = 0.4
    grid_noise: float = 0.20 # Ruído na qualificação
    race_noise: float = 0.30 # Ruído na corrida
    sc_bunching_effect: float = 0.60
    dnf_base: float = 0.06
    wet_race_noise_increase: float = 0.15
    wet_sc_prob_increase: float = 0.25


def main():
    p = argparse.ArgumentParser(
        description="F1 Monte Carlo Simulation (v3.1 - Calibrated)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    p.add_argument("--gp", type=str, required=True, help="Nome do GP a ser simulado (ex: MarinaBay)")
    p.add_argument("--n-sim", type=int, default=50000, help="Número de simulações")
    p.add_argument("--seed", type=int, default=None, help="Seed para reprodutibilidade")

    # Novos argumentos para controle de ruído
    p.add_argument("--grid-noise", type=float, default=0.20, help="Controla a aleatoriedade da qualificação")
    p.add_argument("--race-noise", type=float, default=0.30, help="Controla a aleatoriedade da corrida")

    # Arquivos de dados
    p.add_argument("--drivers-csv", type=str, default="drivers_calibrados.csv")
    p.add_argument("--teams-csv", type=str, default="teams_calibrados.csv")
    p.add_argument("--tracks-csv", type=str, default="tracks.csv")

    # Salvar resultados
    p.add_argument("--save", type=str, default=None, help="Pasta para salvar CSVs")
    args = p.parse_args()

    params = SimParams(
        n_sim=args.n_sim,
        seed=args.seed if args.seed is not None else np.random.randint(0, 1_000_000),
        grid_noise=args.grid_noise,
        race_noise=args.race_noise,
    )

    file_paths: Dict[str, str] = {
        'drivers': args.drivers_csv,
        'teams': args.teams_csv,
        'tracks': args.tracks_csv,
    }

    sim = F1MonteCarlo(gp_name=args.gp, file_paths=file_paths, params=params)  # type: ignore[arg-type]
    sim.run()
    sim.display_results()

    if args.save:
        sim.save_results(args.save)


if __name__ == "__main__":
    main() 