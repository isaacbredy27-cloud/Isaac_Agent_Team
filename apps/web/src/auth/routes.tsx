// Route table for mobile-pwa-expert to mount inside <AuthProvider> and the router.
// Screens load lazily so they stay out of the main bundle.
import { Suspense, lazy, type ReactElement, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { authCopy } from "./copy";
import { authPaths } from "./helpers";
import { RequireSession } from "./RequireSession";
import { Status } from "./screens/ui";
import { useAuth } from "./AuthProvider";

const SignIn = lazy(() => import("./screens/SignIn").then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => import("./screens/SignUp").then((m) => ({ default: m.SignUp })));
const ForgotPassword = lazy(() => import("./screens/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const UpdatePassword = lazy(() => import("./screens/UpdatePassword").then((m) => ({ default: m.UpdatePassword })));
const AuthCallback = lazy(() => import("./screens/AuthCallback").then((m) => ({ default: m.AuthCallback })));
const MfaEnroll = lazy(() => import("./screens/MfaEnroll").then((m) => ({ default: m.MfaEnroll })));
const MfaChallenge = lazy(() => import("./screens/MfaChallenge").then((m) => ({ default: m.MfaChallenge })));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <Status>{authCopy.loading}</Status>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

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
  { path: authPaths.signIn, element: <Lazy><SignIn /></Lazy> },
  { path: authPaths.signUp, element: <Lazy><SignUp /></Lazy> },
  { path: authPaths.forgotPassword, element: <Lazy><ForgotPassword /></Lazy> },
  { path: authPaths.updatePassword, element: <Lazy><UpdatePassword /></Lazy> },
  { path: authPaths.callback, element: <Lazy><AuthCallback /></Lazy> },
  { path: authPaths.mfaEnroll, element: <RequireSession><Lazy><MfaEnrollRoute /></Lazy></RequireSession> },
  { path: authPaths.mfaChallenge, element: <RequireSession><Lazy><MfaChallengeRoute /></Lazy></RequireSession> },
];
