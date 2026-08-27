import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_12820478-844c-49f1-b6bd-7ca7ece32718/artifacts/wn18b1ap_Logomarca-Babecue.png';
const INSTRUMENTS = ['Vocal', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Percussão'];

export const PublicRegisterPage = () => {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', birth_date: '', email: '', phone: '',
    photo_url: '', instruments: [], password: ''
  });

  const toggleInstrument = (inst) => {
    setForm(p => ({ ...p, instruments: p.instruments.includes(inst) ? p.instruments.filter(i => i !== inst) : [...p.instruments, inst] }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Foto muito grande (máx 3MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(p => ({ ...p, photo_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.instruments.length === 0) { setError('Selecione pelo menos um instrumento'); return; }
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/public/volunteers/register`, form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fcf7f6] flex items-center justify-center p-6" data-testid="register-success">
        <Card className="max-w-md w-full border-[#e28b95]/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#111111] mb-2">Cadastro Enviado!</h2>
            <p className="text-sm text-[#6b7280] mb-6">Aguarde aprovação da liderança. Você receberá acesso em breve.</p>
            <Button onClick={() => navigate('/login')} className="bg-[#c72137] hover:bg-[#cf3f57]" data-testid="go-to-login">Ir para o Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf7f6] py-8 px-4" data-testid="public-register-page">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <img src={LOGO_URL} alt="Red Music" className="h-16 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#111111]">Cadastro de Voluntário</h1>
          <p className="text-sm text-[#6b7280]">Preencha seus dados para se juntar ao ministério</p>
        </div>

        <Card className="border-[#e28b95]/20">
          <CardContent className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 flex items-start gap-2 mb-4">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="volunteer-register-form">
              <div className="flex flex-col items-center gap-3">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Perfil" className="w-24 h-24 rounded-full object-cover border-4 border-[#f7e1e1]" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#f7e1e1] flex items-center justify-center text-[#c72137] text-2xl font-bold">?</div>
                )}
                <label className="cursor-pointer text-sm text-[#c72137] hover:underline">
                  {form.photo_url ? 'Trocar foto' : 'Adicionar foto'}
                  <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" data-testid="photo-input" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo *</Label>
                  <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required data-testid="reg-name" />
                </div>
                <div>
                  <Label>Data de Nascimento *</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm({...form, birth_date: e.target.value})} required data-testid="reg-birthdate" />
                </div>
                <div>
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required data-testid="reg-email" />
                </div>
                <div>
                  <Label>Celular (WhatsApp) *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required placeholder="(00) 00000-0000" data-testid="reg-phone" />
                </div>
                <div className="col-span-2">
                  <Label>Senha (mín. 6 caracteres) *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={6} data-testid="reg-password" />
                </div>
              </div>
              <div className="pt-2 border-t border-[#e28b95]/20">
                <Label className="text-base font-semibold text-[#111111] mb-2 block">Instrumentos / Funções *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {INSTRUMENTS.map(inst => (
                    <label key={inst} className="flex items-center gap-2 p-2 border border-[#e28b95]/30 rounded-lg cursor-pointer hover:bg-[#fcf7f6]" data-testid={`inst-${inst}`}>
                      <Checkbox checked={form.instruments.includes(inst)} onCheckedChange={() => toggleInstrument(inst)} />
                      <span className="text-sm font-medium">{inst}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#c72137] hover:bg-[#cf3f57]" data-testid="submit-register">
                {loading ? 'Enviando...' : 'Enviar Cadastro'}
              </Button>
              <p className="text-center text-xs text-[#6b7280]">
                Já tem conta? <Link to="/login" className="text-[#c72137] hover:underline" data-testid="login-link">Faça login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
