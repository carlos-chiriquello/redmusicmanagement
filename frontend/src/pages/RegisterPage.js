import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_12820478-844c-49f1-b6bd-7ca7ece32718/artifacts/wn18b1ap_Logomarca-Babecue.png';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Voluntário');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(email, password, name, role);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex" data-testid="register-page">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src={LOGO_URL} alt="Red Music" className="h-20 w-auto mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Criar conta</h1>
            <p className="mt-2 text-base text-[#6b7280]">Cadastre-se para começar</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" data-testid="register-form">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-start gap-3" data-testid="register-error">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-[#111111] mb-2">
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="register-name-input"
                  className="w-full"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-[#111111] mb-2">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="register-email-input"
                  className="w-full"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-[#111111] mb-2">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="register-password-input"
                  className="w-full"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <Label htmlFor="role" className="block text-sm font-medium text-[#111111] mb-2">
                  Função
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger data-testid="register-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador" data-testid="role-option-admin">Administrador</SelectItem>
                    <SelectItem value="Líder" data-testid="role-option-leader">Líder</SelectItem>
                    <SelectItem value="Voluntário" data-testid="role-option-volunteer">Voluntário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-submit-button"
              className="w-full bg-[#c72137] hover:bg-[#cf3f57] text-white font-medium py-3 rounded-md"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>

            <p className="text-center text-sm text-[#6b7280]">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-[#c72137] hover:text-[#cf3f57] font-medium" data-testid="login-link">
                Faça login
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/12044265/pexels-photo-12044265.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
    </div>
  );
};
