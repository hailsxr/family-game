import { API_URL } from '../config/api';
import type { GameSummary, GameDetail } from '../types/api';

class ApiService {
  async getGames(limit = 20): Promise<GameSummary[]> {
    const res = await fetch(`${API_URL}/games?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
    return res.json();
  }

  async getGameDetail(id: string): Promise<GameDetail> {
    const res = await fetch(`${API_URL}/games/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch game: ${res.status}`);
    return res.json();
  }
}

export const apiService = new ApiService();
