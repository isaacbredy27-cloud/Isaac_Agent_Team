// Route table for mobile-pwa-expert to mount inside <AuthProvider> and the router.
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { authPaths } from "./helpers";
import { RequireSession } from "./RequireSession";
import { AuthCallback } from "./screens/AuthCallback";
import { ForgotPassword } from "./screens/ForgotPassword";
import { MfaChallenge } from "./screens/MfaChallenge";
import { MfaEnroll } from "./screens/MfaEnroll";
import { SignIn } from "./screens/SignIn";
import { SignUp } from "./screens/SignUp";
import { UpdatePassword } from "./screens/UpdatePassword";
import { useAuth } from "./AuthProvider";

function MfaEnrollRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  return (
    <MfaEnroll
      onDone={() => {
        void auth.refresh();
        navigate(authPaths.home, { replace: true });
      }}
    />
  );
}

function MfaChallengeRoute() {
  const navigate = useNavigate();
  return <MfaChallenge onDone={() => navigate(authPaths.home, { replace: true })} />;
}

export interface AuthRoute {
  path: string;
  element: ReactElement;
}

export const authRoutes: AuthRoute[] = [
  { path: authPaths.signIn, element: <SignIn /> },
  { path: authPaths.signUp, element: <SignUp /> },
  { path: authPaths.forgotPassword, element: <ForgotPassword /> },
  { path: authPaths.updatePassword, element: <UpdatePassword /> },
  { path: authPaths.callback, element: <AuthCallback /> },
  { path: authPaths.mfaEnroll, element: <RequireSession><MfaEnrollRoute /></RequireSession> },
  { path: authPaths.mfaChallenge, element: <RequireSession><MfaChallengeRoute /></RequireSession> },
];
