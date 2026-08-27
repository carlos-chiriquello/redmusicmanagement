import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Music, Users, ExternalLink, ChevronDown } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_12820478-844c-49f1-b6bd-7ca7ece32718/artifacts/wn18b1ap_Logomarca-Babecue.png';

const CATEGORY_ORDER = ['Vocais', 'Violões', 'Guitarras', 'Teclados', 'Baixo', 'Percussão', 'Bateria'];
const FN_TO_CAT = { 'Vocal':'Vocais','Backing Vocal':'Vocais','Violão':'Violões','Guitarra':'Guitarras','Teclado':'Teclados','Baixo':'Baixo','Percussão':'Percussão','Bateria':'Bateria' };
const SLOT_LIMITS = { 'Vocais':6,'Violões':2,'Guitarras':2,'Teclados':2,'Baixo':1,'Percussão':1,'Bateria':1 };
const WEEKDAY_PT = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export const PublicMonthlyPage = () => {
  const { ministry, yearMonth } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/public/monthly/${encodeURIComponent(ministry)}/${yearMonth}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [ministry, yearMonth]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fcf7f6]"><div className="w-10 h-10 border-4 border-[#c72137] border-t-transparent rounded-full animate-spin"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-6 bg-[#fcf7f6]"><p className="text-[#c72137]">{error}</p></div>;

  const schedules = data?.schedules || [];
  const [y, m] = (yearMonth || '').split('-');
  const monthLabel = m ? `${monthNames[parseInt(m)-1]} ${y}` : yearMonth;

  const formatDate = (d) => {
    const dt = new Date(d + 'T00:00:00');
    return { short: `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`, weekday: WEEKDAY_PT[dt.getDay()] };
  };

  const getGrouped = (schedule) => {
    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    (schedule.members || []).forEach(m => {
      const cat = FN_TO_CAT[m.function];
      if (cat) grouped[cat].push(m);
    });
    return grouped;
  };

  return (
    <div className="min-h-screen bg-[#fcf7f6]" data-testid="public-monthly-page">
      <header className="bg-white border-b border-[#e28b95]/20 py-4 px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <img src={LOGO_URL} alt="Red Music" className="h-10" />
          <div className="flex items-center gap-2">
            <Badge className="bg-[#c72137] text-white hover:bg-[#c72137]" data-testid="ministry-badge">{ministry}</Badge>
            <Badge className="bg-[#f7e1e1] text-[#c72137] hover:bg-[#f7e1e1]" data-testid="month-badge">{monthLabel}</Badge>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Somente Leitura</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#111111]">Escala Mensal — {ministry}</h1>
          <p className="text-[#6b7280]">{monthLabel} — {schedules.length} programação{schedules.length !== 1 ? 'ões' : ''}</p>
        </div>

        {schedules.length === 0 ? (
          <Card className="border-[#e28b95]/20"><CardContent className="p-8 text-center text-[#6b7280]">Nenhuma escala neste mês</CardContent></Card>
        ) : (
          <>
            <Card className="border-[#e28b95]/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-[#c72137]" />Grade Mensal</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="inline-flex gap-3 min-w-full pb-2">
                    {schedules.map(s => {
                      const grouped = getGrouped(s);
                      const dh = formatDate(s.date);
                      return (
                        <div key={s.id} className="flex-shrink-0 w-56 border border-[#e28b95]/30 rounded-lg overflow-hidden bg-white" data-testid={`monthly-column-${s.id}`}>
                          <div className="bg-[#c72137] text-white p-3 text-center">
                            <p className="text-lg font-bold">{dh.short}</p>
                            <p className="text-xs opacity-90">{dh.weekday}</p>
                          </div>
                          <div className="divide-y divide-[#e28b95]/20">
                            {CATEGORY_ORDER.map(cat => {
                              const members = grouped[cat] || [];
                              const empty = Math.max(0, SLOT_LIMITS[cat] - members.length);
                              return (
                                <div key={cat} className="p-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#c72137] mb-1.5">{cat}</p>
                                  <div className="space-y-1">
                                    {members.map((m, i) => (
                                      <div key={i} className="px-2 py-1 bg-[#fcf7f6] rounded text-xs border border-[#e28b95]/20 truncate" title={m.volunteer_name}>
                                        {m.volunteer_name}
                                        {m.function === 'Backing Vocal' && <span className="text-[9px] text-[#6b7280] ml-1">(BV)</span>}
                                      </div>
                                    ))}
                                    {Array.from({length: empty}).map((_,i) => <div key={i} className="px-2 py-1 bg-gray-50 rounded text-xs text-gray-300 border border-dashed border-gray-200">—</div>)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#e28b95]/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Music className="w-5 h-5 text-[#c72137]" />Setlists do Mês</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedules.map(s => {
                    const dh = formatDate(s.date);
                    const vocals = (s.members || []).filter(m => m.function.toLowerCase().includes('vocal'));
                    return (
                      <Collapsible key={s.id} data-testid={`setlist-collapsible-${s.id}`}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 bg-white border border-[#e28b95]/20 rounded-lg hover:bg-[#fcf7f6] transition-colors">
                            <div className="flex items-center gap-3 text-left">
                              <div className="w-10 h-10 rounded bg-[#c72137] text-white flex items-center justify-center font-bold text-sm">
                                {dh.short}
                              </div>
                              <div>
                                <p className="font-semibold text-[#111111]">{s.name}</p>
                                <p className="text-xs text-[#6b7280]">{dh.weekday} • {(s.setlist||[]).length} música(s)</p>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-[#6b7280]" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {(s.setlist || []).length === 0 ? (
                            <p className="p-4 text-sm text-[#6b7280] italic">Setlist ainda não definido</p>
                          ) : (
                            (s.setlist || []).map((entry, idx) => {
                              const full = entry.song_full || {};
                              const vocalName = vocals.find(v => v.volunteer_id === entry.main_vocal_volunteer_id)?.volunteer_name || 'Não definido';
                              return (
                                <div key={idx} className="p-3 bg-[#fcf7f6] rounded-lg border border-[#e28b95]/20 ml-4" data-testid={`song-${s.id}-${idx}`}>
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-[#c72137] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{idx+1}</div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-[#111111]">{entry.song_name}</p>
                                        {full.artist && <span className="text-xs text-[#6b7280]">— {full.artist}</span>}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                                        <span className={`font-bold ${entry.key_for_this_event !== entry.original_key ? 'text-[#c72137]' : 'text-[#111111]'}`}>Tom: {entry.key_for_this_event}</span>
                                        {entry.key_for_this_event !== entry.original_key && <span className="text-xs text-[#6b7280]">(Original: {entry.original_key})</span>}
                                        {full.bpm && <><span className="text-[#6b7280]">•</span><span className="text-[#6b7280]">{full.bpm} BPM</span></>}
                                        {full.tempo && <><span className="text-[#6b7280]">•</span><span className="text-[#6b7280]">{full.tempo}</span></>}
                                      </div>
                                      <p className="text-sm text-[#6b7280] mt-1">Vocal: <span className="font-medium text-[#111111]">{vocalName}</span></p>
                                      <div className="flex gap-3 mt-2 flex-wrap">
                                        {full.link_original && <a href={full.link_original} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Original</a>}
                                        {full.link_pt_br && <a href={full.link_pt_br} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />PT-BR</a>}
                                        {full.link_intro_arrangement && <a href={full.link_intro_arrangement} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c72137] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Arranjo</a>}
                                      </div>
                                      {full.notes && <p className="text-xs text-[#6b7280] mt-2 italic border-l-2 border-[#e28b95]/40 pl-2">{full.notes}</p>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <footer className="text-center text-xs text-[#6b7280] py-4">Red Music — Sistema de Gestão de Ministério de Louvor</footer>
      </main>
    </div>
  );
};
