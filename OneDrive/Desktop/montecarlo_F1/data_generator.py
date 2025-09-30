import pandas as pd
import os

def gerar_arquivos_csv_finais():
    """
    Gera a versão final e corrigida de todos os arquivos CSV necessários
    para a simulação 'main_v3.py'.
    - Inclui 2 pilotos para todas as equipes principais, corrigindo a Red Bull.
    - Contém dados calibrados para uma simulação competitiva.
    - Adiciona colunas para simulação de chuva e erros de piloto.
    """
    print("Iniciando a geração dos arquivos CSV finais...")

    # --- DADOS DOS PILOTOS ---
    driver_data = [
        # Piloto, Equipe, Habilidade, Taxa de Erro, Bônus na Chuva
        {'name': 'Max Verstappen', 'team_name': 'Red Bull', 'skill': 99, 'error_rate': 0.015, 'wet_skill_bonus': 5},
        {'name': 'Lando Norris', 'team_name': 'McLaren', 'skill': 98, 'error_rate': 0.018, 'wet_skill_bonus': 4},
        {'name': 'Charles Leclerc', 'team_name': 'Ferrari', 'skill': 97, 'error_rate': 0.022, 'wet_skill_bonus': 3},
        {'name': 'Oscar Piastri', 'team_name': 'McLaren', 'skill': 97, 'error_rate': 0.020, 'wet_skill_bonus': 3},
        {'name': 'Lewis Hamilton', 'team_name': 'Ferrari', 'skill': 96, 'error_rate': 0.016, 'wet_skill_bonus': 5},
        {'name': 'George Russell', 'team_name': 'Mercedes', 'skill': 94, 'error_rate': 0.025, 'wet_skill_bonus': 3},
        {'name': 'Fernando Alonso', 'team_name': 'Aston Martin', 'skill': 93, 'error_rate': 0.012, 'wet_skill_bonus': 5},
        {'name': 'Carlos Sainz', 'team_name': 'Williams', 'skill': 92, 'error_rate': 0.019, 'wet_skill_bonus': 4},
        {'name': 'Alexander Albon', 'team_name': 'Williams', 'skill': 90, 'error_rate': 0.024, 'wet_skill_bonus': 2},
        {'name': 'Kimi Antonelli', 'team_name': 'Mercedes', 'skill': 89, 'error_rate': 0.030, 'wet_skill_bonus': 3},
        {'name': 'Sergio Pérez', 'team_name': 'Red Bull', 'skill': 88, 'error_rate': 0.028, 'wet_skill_bonus': 4},
        {'name': 'Pierre Gasly', 'team_name': 'Alpine', 'skill': 87, 'error_rate': 0.028, 'wet_skill_bonus': 2},
        {'name': 'Yuki Tsunoda', 'team_name': 'Racing Bulls', 'skill': 86, 'error_rate': 0.035, 'wet_skill_bonus': 1},
        {'name': 'Nico Hülkenberg', 'team_name': 'Kick Sauber', 'skill': 85, 'error_rate': 0.021, 'wet_skill_bonus': 2},
        {'name': 'Esteban Ocon', 'team_name': 'Haas', 'skill': 84, 'error_rate': 0.033, 'wet_skill_bonus': 3},
        {'name': 'Daniel Ricciardo', 'team_name': 'Racing Bulls', 'skill': 82, 'error_rate': 0.031, 'wet_skill_bonus': 4},
        {'name': 'Valtteri Bottas', 'team_name': 'Kick Sauber', 'skill': 81, 'error_rate': 0.026, 'wet_skill_bonus': 3},
        {'name': 'Lance Stroll', 'team_name': 'Aston Martin', 'skill': 80, 'error_rate': 0.038, 'wet_skill_bonus': 2},
        {'name': 'Guanyu Zhou', 'team_name': 'Alpine', 'skill': 78, 'error_rate': 0.032, 'wet_skill_bonus': 2},
        {'name': 'Kevin Magnussen', 'team_name': 'Haas', 'skill': 79, 'error_rate': 0.036, 'wet_skill_bonus': 2},
    ]
    df_drivers = pd.DataFrame(driver_data)

    # --- DADOS DAS EQUIPES ---
    team_data = [
        {'name': 'McLaren', 'car_performance': 98, 'reliability': 0.97},
        {'name': 'Ferrari', 'car_performance': 98, 'reliability': 0.95},
        {'name': 'Red Bull', 'car_performance': 97, 'reliability': 0.98},
        {'name': 'Mercedes', 'car_performance': 93, 'reliability': 0.96},
        {'name': 'Aston Martin', 'car_performance': 89, 'reliability': 0.93},
        {'name': 'Williams', 'car_performance': 86, 'reliability': 0.90},
        {'name': 'Racing Bulls', 'car_performance': 84, 'reliability': 0.91},
        {'name': 'Alpine', 'car_performance': 81, 'reliability': 0.86},
        {'name': 'Kick Sauber', 'car_performance': 79, 'reliability': 0.88},
        {'name': 'Haas', 'car_performance': 77, 'reliability': 0.87},
    ]
    df_teams = pd.DataFrame(team_data)

    # --- DADOS DAS PISTAS ---
    track_data = [
        # GP, Dif. Ultrap., Prob. SC, Fator Pace, Prob. Chuva
        {'gp_name': 'Bahrain', 'overtake_difficulty': 0.5, 'safety_car_prob': 0.60, 'pace_factor': 1.0, 'wet_race_prob': 0.01},
        {'gp_name': 'Monaco', 'overtake_difficulty': 0.98, 'safety_car_prob': 0.95, 'pace_factor': 0.98, 'wet_race_prob': 0.20},
        {'gp_name': 'Silverstone', 'overtake_difficulty': 0.3, 'safety_car_prob': 0.45, 'pace_factor': 1.02, 'wet_race_prob': 0.35},
        {'gp_name': 'Spa-Francorchamps', 'overtake_difficulty': 0.25, 'safety_car_prob': 0.70, 'pace_factor': 1.03, 'wet_race_prob': 0.45},
        {'gp_name': 'Monza', 'overtake_difficulty': 0.2, 'safety_car_prob': 0.50, 'pace_factor': 1.04, 'wet_race_prob': 0.15},
        {'gp_name': 'MarinaBay', 'overtake_difficulty': 0.90, 'safety_car_prob': 1.00, 'pace_factor': 0.98, 'wet_race_prob': 0.25},
        {'gp_name': 'Interlagos', 'overtake_difficulty': 0.4, 'safety_car_prob': 0.75, 'pace_factor': 1.0, 'wet_race_prob': 0.40},
        {'gp_name': 'Suzuka', 'overtake_difficulty': 0.4, 'safety_car_prob': 0.50, 'pace_factor': 1.01, 'wet_race_prob': 0.30},
        {'gp_name': 'Jeddah', 'overtake_difficulty': 0.4, 'safety_car_prob': 0.90, 'pace_factor': 1.02, 'wet_race_prob': 0.02},
    ]
    df_tracks = pd.DataFrame(track_data)
    
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