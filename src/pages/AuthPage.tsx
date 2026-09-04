import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { signIn, signUp, confirmSignUp } from '../services/auth';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { refreshSession } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In Cognito, the login identifier can be username or email
      await signIn(email || username, password);
      await refreshSession();
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(username, password, email);
      setNeedsConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp(username, code);
      await signIn(username, password);
      await refreshSession();
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Invalid confirmation code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-gutter font-body-md selection:bg-primary-container selection:text-on-primary-container">
      <div className="w-full max-w-[480px]">
        {/* Brand Header */}
        <div className="text-center mb-xl">
          <h1 className="font-display text-display text-primary tracking-tight">Deony</h1>
          <p className="font-body-md text-secondary mt-sm">Introspection through permanence.</p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container-lowest border border-tertiary p-xl">
          {!needsConfirmation ? (
            /* Tabs */
            <div className="flex mb-lg border-b border-surface-variant">
              <button
                type="button"
                id="tab-login"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className={`flex-1 pb-md font-label-md text-label-md text-center ${
                  isLogin ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-secondary'
                } hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset`}
              >
                Log In
              </button>
              <button
                type="button"
                id="tab-signup"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className={`flex-1 pb-md font-label-md text-label-md text-center ${
                  !isLogin ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-secondary'
                } hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset`}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="mb-lg text-center">
              <h2 className="font-headline-md text-headline-md text-primary tracking-tight">Verify Account</h2>
              <p className="font-caption text-caption text-secondary mt-xs">
                Enter the confirmation code sent to your email.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-lg p-sm bg-error-container text-on-error-container font-caption text-caption rounded-DEFAULT">
              {error}
            </div>
          )}

          {needsConfirmation ? (
            /* Confirmation Form */
            <form onSubmit={handleConfirmSubmit} className="space-y-lg animate-[fadeIn_0.3s_ease-out]" id="form-confirm">
              <div>
                <label className="sr-only" htmlFor="confirm-code">Confirmation Code</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-sm font-body-md text-on-surface placeholder:text-secondary transition-colors"
                  id="confirm-code"
                  placeholder="Confirmation code"
                  required
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <button
                className="w-full bg-primary text-on-primary py-md px-lg rounded-DEFAULT font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm and Enter'}
              </button>
              <div className="text-center pt-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNeedsConfirmation(false);
                    setError('');
                  }}
                  className="font-caption text-caption text-secondary hover:text-primary underline transition-colors"
                >
                  Back to Log In
                </button>
              </div>
            </form>
          ) : isLogin ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-lg animate-[fadeIn_0.3s_ease-out]" id="form-login">
              <div>
                <label className="sr-only" htmlFor="login-email">Email address</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-sm font-body-md text-on-surface placeholder:text-secondary transition-colors"
                  id="login-email"
                  placeholder="Email address"
                  required
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="login-password">Password</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-sm font-body-md text-on-surface placeholder:text-secondary transition-colors"
                  id="login-password"
                  placeholder="Password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center pt-sm">
                <div className="flex items-center">
                  <input
                    className="border-outline-variant text-primary focus:ring-primary rounded-sm h-4 w-4 bg-transparent cursor-pointer"
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="ml-sm font-caption text-caption text-secondary cursor-pointer" htmlFor="remember">
                    Remember me
                  </label>
                </div>
                <a className="font-caption text-caption text-secondary hover:text-primary transition-colors" href="#">
                  Forgot password?
                </a>
              </div>
              <button
                className="w-full bg-primary text-on-primary py-md px-lg rounded-DEFAULT font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Entering...' : 'Enter Archive'}
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUpSubmit} className="space-y-lg animate-[fadeIn_0.3s_ease-out]" id="form-signup">
              <div>
                <label className="sr-only" htmlFor="signup-username">Username</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-sm font-body-md text-on-surface placeholder:text-secondary transition-colors"
                  id="signup-username"
                  placeholder="Choose a username"
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="signup-email">Email address</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-sm font-body-md text-on-surface placeholder:text-secondary transition-colors"
                  id="signup-email"
                  placeholder="Email address"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="signup-password">Password</label>
                <input
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-0 py-sm font-body-md text-on-surface placeholder:text-secondary transition-colors"
                  id="signup-password"
                  placeholder="Create a password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                className="w-full bg-primary text-on-primary py-md px-lg rounded-DEFAULT font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mt-md"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Begin Journey'}
              </button>
              <p className="font-caption text-caption text-secondary text-center mt-sm">
                By signing up, you agree to our <a className="underline hover:text-primary" href="#">Terms</a> and <a className="underline hover:text-primary" href="#">Privacy Policy</a>.
              </p>
            </form>
          )}

          {/* Social Login */}
          <div className="mt-xl pt-lg border-t border-surface-variant text-center">
            <p className="font-caption text-caption text-secondary mb-md">Or continue with</p>
            <div className="flex justify-center gap-md">
              <button
                type="button"
                aria-label="Sign in with Google"
                className="w-12 h-12 rounded-full border border-tertiary flex items-center justify-center hover:bg-surface-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-symbols-outlined text-on-surface" data-icon="account_circle">
                  account_circle
                </span>
              </button>
              <button
                type="button"
                aria-label="Sign in with Apple"
                className="w-12 h-12 rounded-full border border-tertiary flex items-center justify-center hover:bg-surface-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-symbols-outlined text-on-surface" data-icon="lock">
                  lock
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

