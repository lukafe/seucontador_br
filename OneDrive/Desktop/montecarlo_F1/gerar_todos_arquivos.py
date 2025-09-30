import pandas as pd
import os


def gerar_arquivos_csv_finais():
    """
    Gera a versão final e RECALIBRADA de todos os arquivos CSV para a simulação.
    - Ratings ajustados para criar "tiers" de performance e resultados mais realistas.
    - Converte escalas para compatibilidade com o simulador (0.70-1.10 etc.).
    """
    print("Iniciando a geração dos arquivos CSV FINAIS e RECALIBRADOS...")

    # --- DADOS DOS PILOTOS (com Tiers de Performance) ---
    driver_data = [
        # Tier 1: Favoritos claros
        {"name": "Max Verstappen", "team_name": "Red Bull", "skill": 99, "error_rate": 0.015, "wet_skill_bonus": 5},
        {"name": "Lando Norris", "team_name": "McLaren", "skill": 98, "error_rate": 0.018, "wet_skill_bonus": 4},

        # Tier 2: Desafiantes diretos à vitória
        {"name": "Charles Leclerc", "team_name": "Ferrari", "skill": 97, "error_rate": 0.022, "wet_skill_bonus": 3},
        {"name": "Oscar Piastri", "team_name": "McLaren", "skill": 96, "error_rate": 0.020, "wet_skill_bonus": 3},
        {"name": "Lewis Hamilton", "team_name": "Ferrari", "skill": 95, "error_rate": 0.016, "wet_skill_bonus": 5},

        # Tier 3: Potencial de pódio consistente
        {"name": "George Russell", "team_name": "Mercedes", "skill": 93, "error_rate": 0.025, "wet_skill_bonus": 3},
        {"name": "Fernando Alonso", "team_name": "Aston Martin", "skill": 92, "error_rate": 0.012, "wet_skill_bonus": 5},
        {"name": "Carlos Sainz", "team_name": "Williams", "skill": 92, "error_rate": 0.019, "wet_skill_bonus": 4},

        # Tier 4: Líderes do meio do grid
        {"name": "Sergio Pérez", "team_name": "Red Bull", "skill": 89, "error_rate": 0.028, "wet_skill_bonus": 4},
        {"name": "Alexander Albon", "team_name": "Williams", "skill": 89, "error_rate": 0.024, "wet_skill_bonus": 2},
        {"name": "Kimi Antonelli", "team_name": "Mercedes", "skill": 88, "error_rate": 0.030, "wet_skill_bonus": 3},

        # Resto do Grid
        {"name": "Pierre Gasly", "team_name": "Alpine", "skill": 87, "error_rate": 0.028, "wet_skill_bonus": 2},
        {"name": "Yuki Tsunoda", "team_name": "Racing Bulls", "skill": 86, "error_rate": 0.035, "wet_skill_bonus": 1},
        {"name": "Nico Hülkenberg", "team_name": "Kick Sauber", "skill": 85, "error_rate": 0.021, "wet_skill_bonus": 2},
        {"name": "Esteban Ocon", "team_name": "Haas", "skill": 84, "error_rate": 0.033, "wet_skill_bonus": 3},
        {"name": "Daniel Ricciardo", "team_name": "Racing Bulls", "skill": 82, "error_rate": 0.031, "wet_skill_bonus": 4},
        {"name": "Valtteri Bottas", "team_name": "Kick Sauber", "skill": 81, "error_rate": 0.026, "wet_skill_bonus": 3},
        {"name": "Lance Stroll", "team_name": "Aston Martin", "skill": 80, "error_rate": 0.038, "wet_skill_bonus": 2},
        {"name": "Guanyu Zhou", "team_name": "Alpine", "skill": 78, "error_rate": 0.032, "wet_skill_bonus": 2},
        {"name": "Kevin Magnussen", "team_name": "Haas", "skill": 79, "error_rate": 0.036, "wet_skill_bonus": 2},
    ]
    df_drivers = pd.DataFrame(driver_data)

    # Converter escalas para o simulador
    # skill: percentuais -> 0.xx (mantém hierarquia, sem saturar o clamp do simulador)
    if "skill" in df_drivers.columns:
        df_drivers["skill"] = (df_drivers["skill"].astype(float) / 100.0).clip(0.70, 1.05)
    # wet_skill_bonus: pontos percentuais -> fração
    if "wet_skill_bonus" in df_drivers.columns:
        df_drivers["wet_skill_bonus"] = (df_drivers["wet_skill_bonus"].astype(float) / 100.0).clip(-0.05, 0.05)

    # --- DADOS DAS EQUIPES (com Tiers de Performance) ---
    team_data = [
        # Tier 1: Equipes de ponta
        {"name": "McLaren", "car_performance": 98, "reliability": 0.97},
        {"name": "Ferrari", "car_performance": 97, "reliability": 0.95},
        {"name": "Red Bull", "car_performance": 96, "reliability": 0.98},

        # Tier 2: Melhor do resto
        {"name": "Mercedes", "car_performance": 92, "reliability": 0.96},

        # Tier 3: Meio do grid forte
        {"name": "Aston Martin", "car_performance": 88, "reliability": 0.93},
        {"name": "Williams", "car_performance": 87, "reliability": 0.90},

        # Final do grid
        {"name": "Racing Bulls", "car_performance": 84, "reliability": 0.91},
        {"name": "Alpine", "car_performance": 82, "reliability": 0.86},
        {"name": "Kick Sauber", "car_performance": 80, "reliability": 0.88},
        {"name": "Haas", "car_performance": 78, "reliability": 0.87},
    ]
    df_teams = pd.DataFrame(team_data)

    # Escalas: car_performance em 0.xx, reliability já está em fração
    if "car_performance" in df_teams.columns:
        df_teams["car_performance"] = (df_teams["car_performance"].astype(float) / 100.0).clip(0.70, 1.10)

    # --- DADOS DAS PISTAS ---
    track_data = [
        {"gp_name": "Bahrain", "overtake_difficulty": 0.5, "safety_car_prob": 0.60, "pace_factor": 1.0, "wet_race_prob": 0.01},
        {"gp_name": "Monaco", "overtake_difficulty": 0.98, "safety_car_prob": 0.95, "pace_factor": 0.98, "wet_race_prob": 0.20},
        {"gp_name": "Silverstone", "overtake_difficulty": 0.3, "safety_car_prob": 0.45, "pace_factor": 1.02, "wet_race_prob": 0.35},
        {"gp_name": "Spa-Francorchamps", "overtake_difficulty": 0.25, "safety_car_prob": 0.70, "pace_factor": 1.03, "wet_race_prob": 0.45},
        {"gp_name": "Monza", "overtake_difficulty": 0.2, "safety_car_prob": 0.50, "pace_factor": 1.04, "wet_race_prob": 0.15},
        {"gp_name": "MarinaBay", "overtake_difficulty": 0.90, "safety_car_prob": 1.00, "pace_factor": 0.98, "wet_race_prob": 0.25},
        {"gp_name": "Interlagos", "overtake_difficulty": 0.4, "safety_car_prob": 0.75, "pace_factor": 1.0, "wet_race_prob": 0.40},
        {"gp_name": "Suzuka", "overtake_difficulty": 0.4, "safety_car_prob": 0.50, "pace_factor": 1.01, "wet_race_prob": 0.30},
        {"gp_name": "Jeddah", "overtake_difficulty": 0.4, "safety_car_prob": 0.90, "pace_factor": 1.02, "wet_race_prob": 0.02},
    ]
    df_tracks = pd.DataFrame(track_data)

    # Clipes de segurança iguais ao simulador
    if "overtake_difficulty" in df_tracks.columns:
        df_tracks["overtake_difficulty"] = df_tracks["overtake_difficulty"].clip(0.0, 1.0)
    if "safety_car_prob" in df_tracks.columns:
        df_tracks["safety_car_prob"] = df_tracks["safety_car_prob"].clip(0.05, 1.0)
    if "pace_factor" in df_tracks.columns:
        df_tracks["pace_factor"] = df_tracks["pace_factor"].clip(0.90, 1.10)
    if "wet_race_prob" in df_tracks.columns:
        df_tracks["wet_race_prob"] = df_tracks["wet_race_prob"].clip(0.0, 0.90)

    # --- SALVAR ARQUIVOS ---
    try:
        df_drivers.to_csv("drivers_calibrados.csv", index=False)
        print("✅ Arquivo 'drivers_calibrados.csv' gerado com sucesso!")

        df_teams.to_csv("teams_calibrados.csv", index=False)
        print("✅ Arquivo 'teams_calibrados.csv' gerado com sucesso!")

        df_tracks.to_csv("tracks.csv", index=False)
        print("✅ Arquivo 'tracks.csv' gerado com sucesso!")

    except Exception as e:
        print(f"❌ Ocorreu um erro ao salvar os arquivos: {e}")


if __name__ == "__main__":
    gerar_arquivos_csv_finais()
    print("\nTodos os arquivos foram gerados. Você está pronto para a simulação!") 