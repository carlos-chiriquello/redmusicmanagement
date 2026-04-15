import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Music, TrendingUp, Cake, AlertTriangle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [burnout, setBurnout] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [metricsRes, topSongsRes, burnoutRes] = await Promise.all([
        axios.get(`${API}/dashboard/metrics`, { withCredentials: true }),
        axios.get(`${API}/dashboard/top-songs`, { withCredentials: true }),
        axios.get(`${API}/dashboard/burnout-alert`, { withCredentials: true })
      ]);
      setMetrics(metricsRes.data);
      setTopSongs(topSongsRes.data);
      setBurnout(burnoutRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="w-12 h-12 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#111111] tracking-tight mb-2">Dashboard</h1>
        <p className="text-base text-[#6b7280]">Visão geral do ministério</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-[#e28b95]/20" data-testid="metric-schedules-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Programações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#111111]">{metrics?.total_schedules || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#e28b95]/20" data-testid="metric-volunteers-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Voluntários Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#111111]">{metrics?.active_volunteers || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#e28b95]/20" data-testid="metric-songs-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
              <Music className="w-4 h-4" />
              Músicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#111111]">{metrics?.total_songs || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#e28b95]/20" data-testid="metric-birthdays-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
              <Cake className="w-4 h-4" />
              Aniversários este mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#111111]">{metrics?.birthdays_this_month?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-[#e28b95]/20" data-testid="top-songs-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#c72137]" />
              Top 10 Músicas Mais Tocadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSongs.length === 0 ? (
              <p className="text-sm text-[#6b7280]">Nenhuma música tocada ainda</p>
            ) : (
              <div className="space-y-3">
                {topSongs.map((song, index) => (
                  <div key={song.id} className="flex items-center justify-between p-3 bg-[#fcf7f6] rounded-md" data-testid={`top-song-${index}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#c72137] text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-[#111111]">{song.name}</p>
                        <p className="text-xs text-[#6b7280]">{song.original_key} - {song.bpm} BPM</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[#c72137]">{song.play_count}x</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {burnout.length > 0 && (
            <Card className="bg-[#fff5f5] border border-red-200" data-testid="burnout-alert-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alerta de Burnout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700 mb-3">Voluntários com muitas escalas consecutivas:</p>
                <div className="space-y-2">
                  {burnout.map((vol) => (
                    <div key={vol.volunteer_id} className="p-3 bg-white rounded-md border border-red-200" data-testid={`burnout-volunteer-${vol.volunteer_id}`}>
                      <p className="font-medium text-red-900">{vol.name}</p>
                      <p className="text-xs text-red-700">{vol.consecutive_schedules} escalas consecutivas</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {metrics?.birthdays_this_month && metrics.birthdays_this_month.length > 0 && (
            <Card className="bg-white border border-[#e28b95]/20" data-testid="birthdays-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                  <Cake className="w-5 h-5 text-[#c72137]" />
                  Aniversários deste mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.birthdays_this_month.map((birthday, index) => (
                    <div key={index} className="p-3 bg-[#fcf7f6] rounded-md" data-testid={`birthday-${index}`}>
                      <p className="font-medium text-[#111111]">{birthday.name}</p>
                      <p className="text-xs text-[#6b7280]">Dia {birthday.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
