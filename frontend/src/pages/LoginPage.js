import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_12820478-844c-49f1-b6bd-7ca7ece32718/artifacts/wn18b1ap_Logomarca-Babecue.png';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex" data-testid="login-page">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src={LOGO_URL} alt="Red Music" className="h-20 w-auto mx-auto mb-6" data-testid="login-logo" />
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Bem-vindo de volta</h1>
            <p className="mt-2 text-base text-[#6b7280]">Faça login para acessar o sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" data-testid="login-form">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-start gap-3" data-testid="login-error">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
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
                  data-testid="login-email-input"
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
                  data-testid="login-password-input"
                  className="w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#c72137] hover:bg-[#cf3f57] text-white font-medium py-3 rounded-md"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-center text-sm text-[#6b7280]">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-[#c72137] hover:text-[#cf3f57] font-medium" data-testid="register-link">
                Cadastre-se
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://scontent.frao7-1.fna.fbcdn.net/v/t39.30808-6/545794227_1218732790295220_1932545517385383888_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x1365&ctp=s2048x1365&_nc_cat=109&ccb=1-7&_nc_sid=f727a1&_nc_ohc=WDDp33irn3QQ7kNvwE5Ucc9&_nc_oc=AdpwotwBWNTwQvCr9AG9ybZwMDo0z74xEregJh0Z0SroxyVLUgoeQ8BpiIyS3XVe6WY&_nc_zt=23&_nc_ht=scontent.frao7-1.fna&_nc_gid=LosNi3QPJClNYo_FB7X9LA&_nc_ss=7b2a8&oh=00_AQHZOyxL4NI3n4ywyRSiKdLc0NpWkSz8oox3banyuGNFEA&oe=6A714BD2)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
    </div>
  );
};
