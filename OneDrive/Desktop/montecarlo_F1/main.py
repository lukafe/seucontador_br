#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
F1 Monte Carlo (v3) - Advanced Simulation
- Object-oriented simulation for better organization.
- Introduces WEATHER (rain) factor, affecting pace and Safety Car probability.
- Improved DNF model separating mechanical failure and driver error.
- Professional terminal output using the 'rich' library.

Author: Gemini & You ;)
"""
from __future__ import annotations
import argparse
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from collections import defaultdict
import os
import sys
from tqdm import tqdm
from rich.console import Console
from rich.table import Table
import fnmatch
import json
from datetime import datetime, timezone
import io
import base64

# --- Global Settings ---
POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
FASTEST_LAP_POINT = 1

# --- Data Classes ---
@dataclass
class Driver:
    name: str
    team_name: str
    skill: float
    error_rate: float      # Probability of making an error that causes DNF (e.g., 0.01 = 1%)
    wet_skill_bonus: float # Rain pace bonus

@dataclass
class Team:
    name: str
    car_performance: float
    reliability: float

@dataclass
class Track:
    gp_name: str
    overtake_difficulty: float
    safety_car_prob: float
    pace_factor: float
    wet_race_prob: float   # Probability that the race is wet (e.g., 0.2 = 20%)

@dataclass
class SimParams:
    n_sim: int = 1_000_000
    seed: int = 42
    pace_driver_weight: float = 0.45
    grid_noise: float = 0.10
    race_noise: float = 0.22
    sc_bunching_effect: float = 0.35
    dnf_base: float = 0.06 # kept for compatibility (not used directly)
    wet_race_noise_increase: float = 0.12 # Rain increases unpredictability
    wet_sc_prob_increase: float = 0.25    # Rain increases SC chance
    # New parameters for realism
    dnf_mech_base: float = 0.015          # Average mechanical base ~1.5%
    driver_error_wet_multiplier: float = 1.6
    fastest_lap_temp: float = 0.35        # Softmax temperature (higher = more random)
    fastest_lap_top10_bias: float = 1.35  # Bias toward top-10 for FL
    # Separate parameters for qualifying
    quali_driver_weight: float = 0.60
    quali_noise: float = 0.06
    # Terminal/UX
    show_progress: bool = True
    use_color: bool = True

# --- Main Simulation Class ---
class F1MonteCarlo:
    def __init__(self, gp_name: str, file_paths: Dict[str, str], params: SimParams):
        self.params = params
        self.rng = np.random.default_rng(self.params.seed)
        self.console = Console(no_color=not self.params.use_color, force_terminal=sys.stdout.isatty())
        self._load_data(gp_name, file_paths)
        self.results_df = None
        self.team_results_df = None
        # Aggregated diagnostics
        self.sc_events_count = 0
        self.total_dnfs = 0
        self.total_starts = 0
        self.wet_races_count = 0

    def _rename_first_match(self, df: pd.DataFrame, target: str, candidates: List[str]):
        for c in candidates:
            if c in df.columns:
                df.rename(columns={c: target}, inplace=True)
                return

    def _normalize_driver_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        # Map alternative column names
        self._rename_first_match(df, 'name', ['name', 'driver', 'Driver'])
        self._rename_first_match(df, 'team_name', ['team_name', 'team', 'Team'])
        self._rename_first_match(df, 'skill', ['skill', 'pace', 'rating'])
        self._rename_first_match(df, 'error_rate', ['error_rate', 'driver_error', 'mistake_rate', 'error', 'err_rate'])
        self._rename_first_match(df, 'wet_skill_bonus', ['wet_skill_bonus', 'wet_bonus', 'wet', 'wet_pace_bonus'])
        # Defaults
        if 'error_rate' not in df.columns:
            df['error_rate'] = 0.01
        if 'wet_skill_bonus' not in df.columns:
            df['wet_skill_bonus'] = 0.0
        # Types
        for col in ['skill', 'error_rate', 'wet_skill_bonus']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        # Remove invalid rows
        required = ['name', 'team_name', 'skill']
        before = len(df)
        df = df.dropna(subset=[c for c in required if c in df.columns])
        if len(df) < before:
            self.console.print(f"[yellow]Aviso: {before - len(df)} pilotos removidos por dados ausentes.[/yellow]")
        return df

    def _normalize_team_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        self._rename_first_match(df, 'name', ['name', 'team', 'Team'])
        self._rename_first_match(df, 'car_performance', ['car_performance', 'performance', 'car', 'pace'])
        self._rename_first_match(df, 'reliability', ['reliability', 'reliab', 'reliability_score'])
        for col in ['car_performance', 'reliability']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        # Remove invalid rows
        required = ['name', 'car_performance', 'reliability']
        before = len(df)
        df = df.dropna(subset=[c for c in required if c in df.columns])
        if len(df) < before:
            self.console.print(f"[yellow]Aviso: {before - len(df)} equipes removidas por dados ausentes.[/yellow]")
        return df

    def _normalize_track_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        self._rename_first_match(df, 'gp_name', ['gp_name', 'gp', 'Grand_Prix', 'track', 'circuit'])
        self._rename_first_match(df, 'overtake_difficulty', ['overtake_difficulty', 'overtake', 'overtaking', 'overtake_index'])
        self._rename_first_match(df, 'safety_car_prob', ['safety_car_prob', 'sc_prob', 'safetycar_prob'])
        self._rename_first_match(df, 'pace_factor', ['pace_factor', 'pace', 'speed_factor'])
        self._rename_first_match(df, 'wet_race_prob', ['wet_race_prob', 'wet_prob', 'rain_prob'])
        for col in ['overtake_difficulty', 'safety_car_prob', 'pace_factor', 'wet_race_prob']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        # Remove invalid rows
        required = ['gp_name', 'overtake_difficulty', 'safety_car_prob', 'pace_factor']
        before = len(df)
        df = df.dropna(subset=[c for c in required if c in df.columns])
        if len(df) < before:
            self.console.print(f"[yellow]Aviso: {before - len(df)} pistas removidas por dados ausentes.[/yellow]")
        return df

    def _load_data(self, gp_name: str, files: Dict[str, str]):
        try:
            drivers_df = pd.read_csv(files['drivers'])
            teams_df = pd.read_csv(files['teams'])
            tracks_df = pd.read_csv(files['tracks'])
        except FileNotFoundError as e:
            self.console.print(f"[bold red]Erro: Arquivo não encontrado - {e.filename}.[/bold red]")
            sys.exit(1)

        # Normalize schemas
        drivers_df = self._normalize_driver_schema(drivers_df)
        teams_df = self._normalize_team_schema(teams_df)
        tracks_df = self._normalize_track_schema(tracks_df)

        # Ensure required columns with defaults
        if 'error_rate' not in drivers_df.columns:
            drivers_df['error_rate'] = 0.01
        if 'wet_skill_bonus' not in drivers_df.columns:
            drivers_df['wet_skill_bonus'] = 0.0

        # Clamp to realistic ranges
        if 'skill' in drivers_df.columns:
            drivers_df['skill'] = drivers_df['skill'].clip(0.70, 1.05)
        drivers_df['error_rate'] = drivers_df['error_rate'].clip(0.002, 0.030)
        drivers_df['wet_skill_bonus'] = drivers_df['wet_skill_bonus'].clip(-0.05, 0.05)

        if 'car_performance' in teams_df.columns:
            teams_df['car_performance'] = teams_df['car_performance'].clip(0.70, 1.10)
        if 'reliability' in teams_df.columns:
            teams_df['reliability'] = teams_df['reliability'].clip(0.90, 0.995)

        if 'overtake_difficulty' in tracks_df.columns:
            tracks_df['overtake_difficulty'] = tracks_df['overtake_difficulty'].clip(0.0, 1.0)
        if 'safety_car_prob' in tracks_df.columns:
            tracks_df['safety_car_prob'] = tracks_df['safety_car_prob'].clip(0.05, 0.70)
        if 'pace_factor' in tracks_df.columns:
            tracks_df['pace_factor'] = tracks_df['pace_factor'].clip(0.90, 1.10)
        if 'wet_race_prob' not in tracks_df.columns:
            tracks_df['wet_race_prob'] = 0.20
        else:
            tracks_df['wet_race_prob'] = tracks_df['wet_race_prob'].clip(0.0, 0.90)

        # Validate team references in drivers
        if 'team_name' in drivers_df.columns and 'name' in teams_df.columns:
            known_teams = set(teams_df['name'].astype(str))
            before = len(drivers_df)
            drivers_df = drivers_df[drivers_df['team_name'].astype(str).isin(known_teams)].copy()
            removed = before - len(drivers_df)
            if removed > 0:
                self.console.print(f"[yellow]Aviso: {removed} pilotos removidos por equipes desconhecidas.[/yellow]")

        self.drivers = [Driver(**row) for _, row in drivers_df.iterrows()]
        self.teams = {row['name']: Team(**row) for _, row in teams_df.iterrows()}
        
        track_data = tracks_df[tracks_df['gp_name'].str.lower() == gp_name.lower()]
        if track_data.empty:
            self.console.print(f"[bold red]Erro: GP '{gp_name}' não encontrado.[/bold red]")
            sys.exit(1)
        self.track = Track(**track_data.iloc[0].to_dict())

    def _calculate_pace(self, driver: Driver, is_wet: bool) -> float:
        team = self.teams[driver.team_name]
        car_weight = 1.0 - self.params.pace_driver_weight
        # Multiplicative blend (close to geometric mean) to reduce extremes
        base_pace = (driver.skill ** self.params.pace_driver_weight) * (team.car_performance ** car_weight)
        if is_wet:
            base_pace *= (1.0 + driver.wet_skill_bonus)
        return base_pace * self.track.pace_factor

    def _calculate_quali_pace(self, driver: Driver, is_wet: bool) -> float:
        team = self.teams[driver.team_name]
        car_weight = 1.0 - self.params.quali_driver_weight
        base_pace = (driver.skill ** self.params.quali_driver_weight) * (team.car_performance ** car_weight)
        if is_wet:
            base_pace *= (1.0 + driver.wet_skill_bonus)
        return base_pace * self.track.pace_factor

    def _simulate_race(self, quali_order: List[Driver], is_wet: bool) -> Tuple[List[Driver], List[Driver], Driver | None]:
        order = list(quali_order)
        race_noise = self.params.race_noise + (self.params.wet_race_noise_increase if is_wet else 0)
        sc_prob = min(1.0, self.track.safety_car_prob + (self.params.wet_sc_prob_increase if is_wet else 0))

        # Safety Car: bunching effect with local swaps in the midfield
        if self.rng.random() < sc_prob:
            self.sc_events_count += 1
            swaps = max(1, int(self.params.sc_bunching_effect * np.sqrt(len(order))))
            for _ in range(swaps):
                # avoid shuffling the top 3 too much
                i = int(self.rng.integers(low=3, high=len(order)))
                if i < len(order):
                    order[i-1], order[i] = order[i], order[i-1]

        race_scores = {}
        n = len(order)
        for rank, driver in enumerate(order):
            traffic_penalty = self.track.overtake_difficulty * (rank / max(1, n - 1))
            pace = self._calculate_pace(driver, is_wet)
            race_scores[driver.name] = pace - traffic_penalty + self.rng.normal(0, race_noise)
        
        finishing_order = sorted(order, key=lambda d: race_scores[d.name], reverse=True)
        
        # Realistic DNF: combine mechanical and driver error without summing directly
        survivors, dnfs = [], []
        for d in finishing_order:
            team = self.teams[d.team_name]
            # Mechanical base adjusted by reliability (more reliable -> lower prob)
            mech_multiplier = 1.0 + (0.98 - team.reliability) * 50.0  # ~0.98 as reference
            mechanical_dnf_prob = np.clip(self.params.dnf_mech_base * mech_multiplier, 0.003, 0.060)
            driver_error_prob = np.clip(
                d.error_rate * (self.params.driver_error_wet_multiplier if is_wet else 1.0),
                0.001, 0.050
            )
            # Independent combination: 1 - (1 - a)(1 - b)
            combined_prob = 1.0 - (1.0 - mechanical_dnf_prob) * (1.0 - driver_error_prob)
            if self.rng.random() < combined_prob:
                dnfs.append(d)
            else:
                survivors.append(d)

        # Fastest lap: weighted sampling (top-10 with slight bias)
        fl_candidate = None
        if survivors:
            # position after removing DNFs
            pos_map = {d.name: idx + 1 for idx, d in enumerate(survivors)}
            tau = self.params.fastest_lap_temp
            bias = self.params.fastest_lap_top10_bias
            weights = []
            for d in survivors:
                score = race_scores[d.name]
                w = np.exp(score / max(1e-6, tau))
                if pos_map[d.name] <= 10:
                    w *= bias
                weights.append(w)
            weights = np.array(weights, dtype=float)
            weights /= weights.sum()
            idx = int(self.rng.choice(len(survivors), p=weights))
            fl_candidate = survivors[idx]

        return survivors, dnfs, fl_candidate

    def run(self):
        stats = defaultdict(lambda: defaultdict(int))
        wet_races_count = 0

        self.console.print(f"\n[bold cyan]Simulando o GP de {self.track.gp_name}...[/bold cyan]")
        self.console.print(f"Parâmetros: {self.params.n_sim:,} iterações, Pista molhada: {self.track.wet_race_prob:.0%}, Seed: {self.params.seed}")
        
        is_tty = sys.stdout.isatty()
        progress_iter = tqdm(
            range(self.params.n_sim),
            desc=f"Simulating {self.track.gp_name} GP",
            disable=(not is_tty) or (not self.params.show_progress),
            dynamic_ncols=True,
            ascii=True,
            leave=False,
        )
        for _ in progress_iter:
            is_wet = self.rng.random() < self.track.wet_race_prob
            if is_wet:
                wet_races_count += 1

            # total starts (for DNF metrics)
            self.total_starts += len(self.drivers)

            # Pace by race condition; normalize to mean ~1 per race
            race_pace_map = {d.name: self._calculate_pace(d, is_wet) for d in self.drivers}
            mean_race_pace = float(np.mean(list(race_pace_map.values())))
            if mean_race_pace > 0:
                for k in race_pace_map:
                    race_pace_map[k] /= mean_race_pace
            
            # Separate quali pace; normalize too
            quali_pace_map = {d.name: self._calculate_quali_pace(d, is_wet) for d in self.drivers}
            mean_quali_pace = float(np.mean(list(quali_pace_map.values())))
            if mean_quali_pace > 0:
                for k in quali_pace_map:
                    quali_pace_map[k] /= mean_quali_pace
            
            # Qualifying
            quali_scores = np.array([quali_pace_map[d.name] for d in self.drivers]) + self.rng.normal(0, self.params.quali_noise, len(self.drivers))
            order_idx = np.argsort(-quali_scores)
            quali_order = [self.drivers[i] for i in order_idx]
            
            # Race
            survivors, dnfs, fl_candidate = self._simulate_race(quali_order, is_wet)
            
            # Stats
            if survivors:
                stats[survivors[0].name]["win"] += 1
                for d in survivors[:3]: stats[d.name]["podium"] += 1
                for d in survivors[:6]: stats[d.name]["top6"] += 1
            
            for d in dnfs: stats[d.name]["dnf"] += 1
            self.total_dnfs += len(dnfs)
            
            pts = defaultdict(int)
            top_10 = survivors[:len(POINTS)]
            for i, d in enumerate(top_10): pts[d.name] += POINTS[i]
            # FL points only if in the top-10
            if fl_candidate and fl_candidate in top_10:
                pts[fl_candidate.name] += FASTEST_LAP_POINT
            
            # Accumulate points and variance (sum of squares)
            for d in self.drivers:
                p = pts.get(d.name, 0)
                stats[d.name]["total_points"] += p
                stats[d.name]["points_sumsq"] += p * p

        # Process results into DataFrames
        driver_data = []
        for d in self.drivers:
            s = stats[d.name]
            n = max(1, self.params.n_sim)
            # Rates and 95% CI (normal approx.)
            def rate_and_ci(count: int) -> Tuple[float, float]:
                p = count / n
                margin = 1.96 * np.sqrt(max(p * (1 - p) / n, 0.0))
                return p * 100.0, margin * 100.0

            win_pct, win_ci = rate_and_ci(s["win"])
            pod_pct, pod_ci = rate_and_ci(s["podium"])
            top6_pct, top6_ci = rate_and_ci(s["top6"])
            dnf_pct, dnf_ci = rate_and_ci(s["dnf"])

            # Points: mean, std, and 95% CI of the mean
            mean_pts = s["total_points"] / n
            ex2 = s["points_sumsq"] / n
            var = max(ex2 - mean_pts * mean_pts, 0.0)
            std = np.sqrt(var)
            se = std / np.sqrt(n)
            pts_ci = 1.96 * se

            driver_data.append({
                "Driver": d.name, "Team": d.team_name,
                "Win%": win_pct,
                "WinCI": win_ci,
                "Podium%": pod_pct,
                "PodiumCI": pod_ci,
                "Top6%": top6_pct,
                "Top6CI": top6_ci,
                "DNF%": dnf_pct,
                "DNFCI": dnf_ci,
                "ExpectedPoints": mean_pts,
                "PointsStd": std,
                "PointsCI": pts_ci,
            })
            
        self.results_df = pd.DataFrame(driver_data).sort_values("ExpectedPoints", ascending=False).reset_index(drop=True)
        self.team_results_df = self.results_df.groupby("Team")["ExpectedPoints"].sum().reset_index().sort_values("ExpectedPoints", ascending=False)
        self.wet_races_count = wet_races_count
        self.console.print(f"[green]Simulação concluída! ({wet_races_count / self.params.n_sim:.1%} de corridas com chuva)[/green]")
        
        # Sanity diagnostics
        if self.total_starts > 0:
            avg_dnf_rate = self.total_dnfs / self.total_starts
        else:
            avg_dnf_rate = 0.0
        avg_sc_rate = self.sc_events_count / max(1, self.params.n_sim)
        self.avg_dnf_rate = avg_dnf_rate
        self.avg_sc_rate = avg_sc_rate
        self.console.print(f"DNF médio no grid: {avg_dnf_rate:.1%} | Safety Car em corridas: {avg_sc_rate:.1%}")

    def display_results(self):
        if self.results_df is None:
            self.console.print("[bold red]Nenhum resultado para exibir. Rode a simulação primeiro.[/bold red]")
            return
        
        self.console.print(f"\n[bold magenta]=== Resumo dos Pilotos - GP de {self.track.gp_name} ===[/bold magenta]")
        driver_table = Table(show_header=True, header_style="bold blue")
        for col in self.results_df.columns:
            style = "cyan" if col in ["Driver", "Team"] else "white"
            driver_table.add_column(col, style=style, justify="right" if col != "Driver" and col != "Team" else "left")
        
        for _, row in self.results_df.iterrows():
            driver_table.add_row(*[f"{val:.2f}" if isinstance(val, float) else str(val) for val in row])
        self.console.print(driver_table)

        self.console.print(f"\n[bold magenta]=== Pontos Esperados por Equipe ===[/bold magenta]")
        team_table = Table(show_header=True, header_style="bold blue")
        team_table.add_column("Team", style="cyan", justify="left")
        team_table.add_column("ExpectedPoints", style="white", justify="right")

        for _, row in self.team_results_df.iterrows():
            team_table.add_row(row["Team"], f"{row['ExpectedPoints']:.2f}")
        self.console.print(team_table)

    def display_gui(self):
        if self.results_df is None:
            self.console.print("[bold red]Nenhum resultado para exibir. Rode a simulação primeiro.[/bold red]")
            return
        import tkinter as tk
        from tkinter import ttk
        from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
        import matplotlib.pyplot as plt

        root = tk.Tk()
        root.title(f"F1 Monte Carlo - {self.track.gp_name}")
        root.geometry("1100x700")

        notebook = ttk.Notebook(root)
        notebook.pack(fill=tk.BOTH, expand=True)

        # Drivers tab
        frame_drivers = ttk.Frame(notebook)
        notebook.add(frame_drivers, text="Pilotos")
        self._render_df_table(frame_drivers, self.results_df)

        # Teams tab
        frame_teams = ttk.Frame(notebook)
        notebook.add(frame_teams, text="Equipes")
        self._render_df_table(frame_teams, self.team_results_df)

        # Charts tab
        frame_charts = ttk.Frame(notebook)
        notebook.add(frame_charts, text="Gráficos")
        fig = plt.Figure(figsize=(10, 6), dpi=100)
        ax1 = fig.add_subplot(211)
        ax2 = fig.add_subplot(212)

        # Top drivers by ExpectedPoints
        top_n = min(10, len(self.results_df))
        top_drivers = self.results_df.nlargest(top_n, "ExpectedPoints")
        ax1.bar(top_drivers["Driver"], top_drivers["ExpectedPoints"], color="#2E86C1")
        ax1.set_title("Top Pilotos por Pontos Esperados")
        ax1.set_ylabel("Pontos")
        ax1.tick_params(axis='x', rotation=30)
        ax1.grid(True, axis='y', linestyle='--', alpha=0.3)

        # Team points
        ax2.bar(self.team_results_df["Team"], self.team_results_df["ExpectedPoints"], color="#28B463")
        ax2.set_title("Pontos Esperados por Equipe")
        ax2.set_ylabel("Pontos")
        ax2.tick_params(axis='x', rotation=30)
        ax2.grid(True, axis='y', linestyle='--', alpha=0.3)
        fig.tight_layout()

        canvas = FigureCanvasTkAgg(fig, master=frame_charts)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

        # Diagnostics tab
        frame_diag = ttk.Frame(notebook)
        notebook.add(frame_diag, text="Diagnósticos")
        diag_text = (
            f"GP: {self.track.gp_name}\n"
            f"Simulações: {self.params.n_sim:,}\n"
            f"Seed: {self.params.seed}\n"
            f"Corridas com chuva: {self.wet_races_count / max(1, self.params.n_sim):.1%}\n"
            f"DNF médio no grid: {getattr(self, 'avg_dnf_rate', 0.0):.1%}\n"
            f"Safety Car por corrida: {getattr(self, 'avg_sc_rate', 0.0):.1%}\n"
        )
        lbl = ttk.Label(frame_diag, text=diag_text, justify=tk.LEFT, anchor=tk.NW)
        lbl.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        root.mainloop()

    def _render_df_table(self, parent, df: pd.DataFrame):
        import tkinter as tk
        from tkinter import ttk
        frame = ttk.Frame(parent)
        frame.pack(fill=tk.BOTH, expand=True)

        cols = list(df.columns)
        tree = ttk.Treeview(frame, columns=cols, show='headings')
        vsb = ttk.Scrollbar(frame, orient='vertical', command=tree.yview)
        hsb = ttk.Scrollbar(frame, orient='horizontal', command=tree.xview)
        tree.configure(yscroll=vsb.set, xscroll=hsb.set)

        tree.grid(row=0, column=0, sticky='nsew')
        vsb.grid(row=0, column=1, sticky='ns')
        hsb.grid(row=1, column=0, sticky='ew')

        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)

        for c in cols:
            tree.heading(c, text=str(c))
            tree.column(c, width=max(80, int(900 / max(1, len(cols)))) , anchor='e' if c not in ("Driver", "Team", "Team") else 'w')

        for _, row in df.iterrows():
            values = [f"{v:.2f}" if isinstance(v, float) else str(v) for v in row]
            tree.insert('', 'end', values=values)

    def save_results(self, save_dir: str):
        if self.results_df is None:
            self.console.print("[bold red]Nenhum resultado para salvar.[/bold red]")
            return

        path = os.path.join(save_dir, self.track.gp_name)
        os.makedirs(path, exist_ok=True)
        self.results_df.to_csv(os.path.join(path, "driver_summary.csv"), index=False)
        self.team_results_df.to_csv(os.path.join(path, "team_summary.csv"), index=False)
        # Meta JSON with parameters and diagnostics
        meta = {
            "gp_name": self.track.gp_name,
            "params": asdict(self.params),
            "track": asdict(self.track),
            "diagnostics": {
                "wet_races_fraction": self.wet_races_count / max(1, self.params.n_sim),
                "avg_dnf_rate": getattr(self, 'avg_dnf_rate', None),
                "avg_sc_rate": getattr(self, 'avg_sc_rate', None),
                "total_sc_events": self.sc_events_count,
                "total_dnfs": self.total_dnfs,
                "total_starts": self.total_starts,
            },
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        with open(os.path.join(path, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        self.console.print(f"\n[green]Arquivos CSV salvos em: {os.path.abspath(path)}[/green]")

    def save_html_report(self, save_dir: str, filename: str | None = None):
        if self.results_df is None:
            self.console.print("[bold red]Nenhum resultado para salvar.[/bold red]")
            return
        import matplotlib.pyplot as plt
        path = os.path.join(save_dir, self.track.gp_name)
        os.makedirs(path, exist_ok=True)
        report_name = filename if filename else "report.html"
        out_path = os.path.join(path, report_name)

        # Create charts and encode as base64
        fig = plt.Figure(figsize=(12, 7), dpi=120)
        ax1 = fig.add_subplot(121)
        ax2 = fig.add_subplot(122)

        # Improve chart aesthetics
        fig.patch.set_facecolor('#0f1220')
        for ax in (ax1, ax2):
            ax.set_facecolor('#0f1220')
            ax.grid(True, axis='x', linestyle='--', alpha=0.25, color='#a9b4d0')
            for spine in ax.spines.values():
                spine.set_visible(False)

        # Drivers: Expected Points (Top-N) as horizontal bar with labels
        top_n = min(12, len(self.results_df))
        top_drivers = self.results_df.nlargest(top_n, "ExpectedPoints").copy()
        top_drivers = top_drivers.iloc[::-1]  # reverse so the highest is on top in barh
        ax1.barh(top_drivers["Driver"], top_drivers["ExpectedPoints"], color="#4C84FF")
        for i, v in enumerate(top_drivers["ExpectedPoints"].values):
            ax1.text(v + max(0.01, 0.02 * float(top_drivers["ExpectedPoints"].max())), i, f"{v:.2f}", va='center', ha='left', color='#eaeefb', fontsize=9)
        ax1.set_title("Expected Points (Drivers)", color="#ffffff")
        ax1.tick_params(colors="#eaeefb")
        ax1.set_xlabel("Points", color="#a9b4d0")

        # Teams: Expected Points as horizontal bar with labels
        teams_df = self.team_results_df.copy()
        teams_df = teams_df.sort_values("ExpectedPoints", ascending=True)
        ax2.barh(teams_df["Team"], teams_df["ExpectedPoints"], color="#28B463")
        for i, v in enumerate(teams_df["ExpectedPoints"].values):
            ax2.text(v + max(0.01, 0.02 * float(teams_df["ExpectedPoints"].max())), i, f"{v:.2f}", va='center', ha='left', color='#eaeefb', fontsize=9)
        ax2.set_title("Expected Points (Teams)", color="#ffffff")
        ax2.tick_params(colors="#eaeefb")
        ax2.set_xlabel("Points", color="#a9b4d0")

        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
        buf.seek(0)
        charts_b64 = base64.b64encode(buf.read()).decode('ascii')

        # Additional chart: Win% and Podium% per driver (Top-N)
        fig2 = plt.Figure(figsize=(12, 7), dpi=120)
        ax3 = fig2.add_subplot(111)
        fig2.patch.set_facecolor('#0f1220')
        ax3.set_facecolor('#0f1220')
        ax3.grid(True, axis='x', linestyle='--', alpha=0.25, color='#a9b4d0')
        for spine in ax3.spines.values():
            spine.set_visible(False)

        top_n_prob = min(12, len(self.results_df))
        prob_df = self.results_df.nlargest(top_n_prob, "Win%").copy()
        # reverse for barh top at top
        prob_df = prob_df.iloc[::-1]
        drivers_list = prob_df["Driver"].tolist()
        win_vals = prob_df["Win%"].values
        pod_vals = prob_df["Podium%"].values
        y = np.arange(len(drivers_list))
        h = 0.38
        ax3.barh(y - h/2, win_vals, height=h, color="#FF7F50", label="Win (%)")
        ax3.barh(y + h/2, pod_vals, height=h, color="#9B59B6", label="Podium (%)")
        for i, (w, p) in enumerate(zip(win_vals, pod_vals)):
            ax3.text(w + 0.5, y[i] - h/2, f"{w:.1f}%", va='center', ha='left', color='#eaeefb', fontsize=9)
            ax3.text(p + 0.5, y[i] + h/2, f"{p:.1f}%", va='center', ha='left', color='#eaeefb', fontsize=9)
        ax3.set_yticks(y)
        ax3.set_yticklabels(drivers_list, color="#eaeefb")
        ax3.set_xlabel("Probability (%)", color="#a9b4d0")
        ax3.set_title("Driver Probabilities (Win and Podium)", color="#ffffff")
        leg = ax3.legend(facecolor="#151939", edgecolor="#243061")
        for text in leg.get_texts():
            text.set_color('#eaeefb')

        fig2.tight_layout()
        buf2 = io.BytesIO()
        fig2.savefig(buf2, format='png', bbox_inches='tight', facecolor=fig2.get_facecolor())
        buf2.seek(0)
        charts2_b64 = base64.b64encode(buf2.read()).decode('ascii')

        # Build HTML
        style = """
        <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 24px; background: #0f1220; color: #eaeefb; }
        h1, h2, h3 { color: #ffffff; }
        .card { background: #151939; border: 1px solid #243061; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
        .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .muted { color: #a9b4d0; }
        .small { font-size: 12px; }
        img { max-width: 100%; height: auto; border-radius: 10px; border: 1px solid #243061; }
        .kpi { display: inline-block; margin-right: 18px; }
        .kpi .label { color: #a9b4d0; }
        .kpi .value { font-size: 20px; font-weight: 700; }
        </style>
        """

        diag_html = f"""
        <div class='grid'>
          <div class='card'>
            <div class='kpi'><div class='label'>GP</div><div class='value'>{self.track.gp_name}</div></div>
            <div class='kpi'><div class='label'>Simulations</div><div class='value'>{self.params.n_sim:,}</div></div>
            <div class='kpi'><div class='label'>Seed</div><div class='value'>{self.params.seed}</div></div>
            <div class='kpi'><div class='label'>Wet Races</div><div class='value'>{self.wet_races_count / max(1, self.params.n_sim):.1%}</div></div>
            <div class='kpi'><div class='label'>Average DNF Rate</div><div class='value'>{getattr(self, 'avg_dnf_rate', 0.0):.1%}</div></div>
            <div class='kpi'><div class='label'>SC per Race</div><div class='value'>{getattr(self, 'avg_sc_rate', 0.0):.1%}</div></div>
          </div>
        </div>
        """

        html = f"""
        <!DOCTYPE html>
        <html lang='en'>
        <head>
          <meta charset='utf-8'/>
          <meta name='viewport' content='width=device-width, initial-scale=1'/>
          <title>F1 Monte Carlo - {self.track.gp_name}</title>
          {style}
        </head>
        <body>
          <h1>F1 Monte Carlo - {self.track.gp_name}</h1>
          {diag_html}

          <div class='card'>
            <h2>Points Charts</h2>
            <img src='data:image/png;base64,{charts_b64}' alt='Charts'/>
            <div class='small muted'>Generated at {datetime.now(timezone.utc).isoformat()}</div>
          </div>

          <div class='card'>
            <h2>Probabilities (Win and Podium)</h2>
            <img src='data:image/png;base64,{charts2_b64}' alt='Win & Podium Probabilities'/>
          </div>
        </body>
        </html>
        """

        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)
        self.console.print(f"[green]Relatório HTML salvo em: {os.path.abspath(out_path)}[/green]")

def _discover_file(base_dir: str, patterns: List[str]) -> str | None:
    try:
        entries = os.listdir(base_dir)
    except Exception:
        return None
    candidates: List[str] = []
    for pat in patterns:
        for name in entries:
            if fnmatch.fnmatch(name.lower(), pat.lower()):
                candidates.append(os.path.join(base_dir, name))
    if not candidates:
        return None
    # Pick most recent by mtime
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def main():
    p = argparse.ArgumentParser(description="F1 Monte Carlo Simulation (v3)")
    p.add_argument("--gp", type=str, default="MarinaBay", help="Nome do GP a ser simulado (ex: MarinaBay)")
    p.add_argument("--n-sim", type=int, default=1_000_000, help="Número de simulações")
    p.add_argument("--seed", type=int, default=None, help="Seed para reprodutibilidade")
    p.add_argument("--data-dir", type=str, default=".", help="Pasta base onde estão os CSVs")
    p.add_argument("--drivers-csv", type=str, default=None)
    p.add_argument("--teams-csv", type=str, default=None)
    p.add_argument("--tracks-csv", type=str, default=None)
    p.add_argument("--no-progress", action="store_true", help="Desativa barra de progresso")
    p.add_argument("--no-color", action="store_true", help="Desativa cores no terminal")
    p.add_argument("--save", type=str, default=None, help="Pasta para salvar CSVs")
    # Parameter overrides
    p.add_argument("--pace-driver-weight", type=float, default=None, help="Peso do piloto no pace da corrida (0-1)")
    p.add_argument("--grid-noise", type=float, default=None, help="Ruído da classificação padrão")
    p.add_argument("--race-noise", type=float, default=None, help="Ruído da corrida")
    p.add_argument("--sc-bunching", type=float, default=None, help="Intensidade de embaralhamento do SC")
    p.add_argument("--wet-race-noise-increase", type=float, default=None, help="Aumento de ruído na chuva")
    p.add_argument("--wet-sc-prob-increase", type=float, default=None, help="Aumento de probabilidade de SC na chuva")
    p.add_argument("--dnf-mech-base", type=float, default=None, help="Base de DNF mecânico")
    p.add_argument("--driver-error-wet-mult", type=float, default=None, help="Multiplicador de erro do piloto na chuva")
    p.add_argument("--fl-temp", type=float, default=None, help="Temperatura do softmax para volta mais rápida")
    p.add_argument("--fl-top10-bias", type=float, default=None, help="Viés para top-10 na volta mais rápida")
    p.add_argument("--quali-driver-weight", type=float, default=None, help="Peso do piloto no pace da classificação (0-1)")
    p.add_argument("--quali-noise", type=float, default=None, help="Ruído da classificação")
    p.add_argument("--gui", action="store_true", help="Abre interface gráfica (Tkinter)")
    p.add_argument("--html-report", type=str, default=None, help="Gera relatório HTML (opcional: nome do arquivo, ex: report.html)")
    args = p.parse_args()

    # Automatic file discovery if not provided
    data_dir = args.data_dir if args.data_dir else "."

    def resolve_path(arg_path: str | None, patterns: List[str]) -> str:
        if arg_path and os.path.isfile(arg_path):
            return arg_path
        candidate = _discover_file(data_dir, patterns)
        if candidate and os.path.isfile(candidate):
            return candidate
        # fallback: search in cwd
        candidate = _discover_file(".", patterns)
        if candidate and os.path.isfile(candidate):
            return candidate
        # last resort: return the first pattern name (may fail later with friendly message)
        return patterns[0]

    drivers_path = resolve_path(args.drivers_csv, ["drivers_*.csv", "drivers.csv"]) 
    teams_path = resolve_path(args.teams_csv, ["teams_*.csv", "teams.csv"]) 
    tracks_path = resolve_path(args.tracks_csv, ["tracks_*.csv", "tracks.csv"])

    params = SimParams(
        n_sim=args.n_sim, 
        seed=args.seed if args.seed is not None else np.random.randint(0, 1_000_000),
        show_progress=not args.no_progress,
        use_color=not args.no_color,
    )
    # Apply overrides if provided
    if args.pace_driver_weight is not None:
        params.pace_driver_weight = float(np.clip(args.pace_driver_weight, 0.0, 1.0))
    if args.grid_noise is not None:
        params.grid_noise = max(0.0, float(args.grid_noise))
    if args.race_noise is not None:
        params.race_noise = max(0.0, float(args.race_noise))
    if args.sc_bunching is not None:
        params.sc_bunching_effect = max(0.0, float(args.sc_bunching))
    if args.wet_race_noise_increase is not None:
        params.wet_race_noise_increase = max(0.0, float(args.wet_race_noise_increase))
    if args.wet_sc_prob_increase is not None:
        params.wet_sc_prob_increase = max(0.0, float(args.wet_sc_prob_increase))
    if args.dnf_mech_base is not None:
        params.dnf_mech_base = max(0.0, float(args.dnf_mech_base))
    if args.driver_error_wet_mult is not None:
        params.driver_error_wet_multiplier = max(0.0, float(args.driver_error_wet_mult))
    if args.fl_temp is not None:
        params.fastest_lap_temp = max(1e-6, float(args.fl_temp))
    if args.fl_top10_bias is not None:
        params.fastest_lap_top10_bias = max(0.0, float(args.fl_top10_bias))
    if args.quali_driver_weight is not None:
        params.quali_driver_weight = float(np.clip(args.quali_driver_weight, 0.0, 1.0))
    if args.quali_noise is not None:
        params.quali_noise = max(0.0, float(args.quali_noise))
    
    file_paths = {
        'drivers': drivers_path,
        'teams': teams_path,
        'tracks': tracks_path
    }

    sim = F1MonteCarlo(gp_name=args.gp, file_paths=file_paths, params=params)
    sim.run()
    if args.save:
        sim.save_results(args.save)
    if args.html_report is not None:
        base_dir = args.save if args.save else "results"
        sim.save_html_report(base_dir, args.html_report if isinstance(args.html_report, str) and len(args.html_report) > 0 else None)
    if args.gui:
        sim.display_gui()
    else:
        sim.display_results()

if __name__ == "__main__":
    main()