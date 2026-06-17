import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Mail } from "lucide-react";

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Categories from "@/pages/categories";
import CategoryEmails from "@/pages/category-emails";
import Emails from "@/pages/emails";
import Rules from "@/pages/rules";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(250, 60%, 35%)",
    colorForeground: "hsl(250, 40%, 10%)",
    colorMutedForeground: "hsl(250, 15%, 45%)",
    colorDanger: "hsl(0, 84.2%, 60.2%)",
    colorBackground: "hsl(250, 20%, 98%)",
    colorInput: "hsl(250, 20%, 88%)",
    colorInputForeground: "hsl(250, 40%, 10%)",
    colorNeutral: "hsl(250, 20%, 90%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[hsl(250,20%,90%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(250,40%,10%)] font-bold",
    headerSubtitle: "text-[hsl(250,15%,45%)]",
    socialButtonsBlockButtonText: "text-[hsl(250,40%,10%)] font-medium",
    formFieldLabel: "text-[hsl(250,40%,10%)] font-medium text-sm",
    footerActionLink: "text-[hsl(250,60%,35%)] font-semibold",
    footerActionText: "text-[hsl(250,15%,45%)]",
    dividerText: "text-[hsl(250,15%,45%)] text-sm",
    identityPreviewEditButton: "text-[hsl(250,60%,35%)]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-[hsl(250,40%,10%)]",
    logoBox: "flex justify-center py-1",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton:
      "border border-[hsl(250,20%,88%)] bg-white hover:bg-[hsl(250,20%,97%)] transition-colors",
    formButtonPrimary:
      "bg-[hsl(250,60%,35%)] hover:opacity-90 text-white font-semibold transition-opacity",
    formFieldInput:
      "border-[hsl(250,20%,85%)] bg-white text-[hsl(250,40%,10%)]",
    footerAction: "bg-[hsl(250,20%,97%)] border-t border-[hsl(250,20%,90%)]",
    dividerLine: "bg-[hsl(250,20%,90%)]",
    alert: "border border-red-200 bg-red-50",
    otpCodeFieldInput: "border-[hsl(250,20%,85%)]",
    formFieldRow: "",
    main: "",
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[hsl(250,35%,95%)] to-[hsl(250,20%,98%)] px-4 py-8">
      {children}
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageShell>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthPageShell>
  );
}

function SignUpPage() {
  return (
    <AuthPageShell>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </AuthPageShell>
  );
}

function LandingPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-[hsl(250,35%,95%)] to-[hsl(250,20%,98%)] px-4">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[hsl(250,60%,35%)] shadow-lg">
          <Mail className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[hsl(250,40%,10%)] tracking-tight">
            Sortify
          </h1>
          <p className="text-base text-[hsl(250,15%,45%)] font-medium">
            AI-powered email organizer
          </p>
          <p className="text-sm text-[hsl(250,15%,55%)] leading-relaxed pt-1">
            Connect your inbox and let AI automatically sort emails into custom
            categories.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={() => setLocation("/sign-in")}
            className="w-full py-3 px-4 rounded-xl bg-[hsl(250,60%,35%)] text-white font-semibold hover:opacity-90 transition-opacity shadow-sm text-sm"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setLocation("/sign-up")}
            className="w-full py-3 px-4 rounded-xl border border-[hsl(250,20%,85%)] bg-white text-[hsl(250,40%,10%)] font-semibold hover:bg-[hsl(250,20%,97%)] transition-colors shadow-sm text-sm"
          >
            Create account
          </button>
        </div>
        <p className="text-xs text-[hsl(250,15%,60%)]">
          Continue with Google, Apple, Microsoft, or email
        </p>
      </div>
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Dashboard />
        </Layout>
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>{children}</Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your Sortify account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Start organising your inbox with AI",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/categories/:id">
              {() => (
                <Protected>
                  <CategoryEmails />
                </Protected>
              )}
            </Route>
            <Route path="/categories">
              {() => (
                <Protected>
                  <Categories />
                </Protected>
              )}
            </Route>
            <Route path="/emails">
              {() => (
                <Protected>
                  <Emails />
                </Protected>
              )}
            </Route>
            <Route path="/rules">
              {() => (
                <Protected>
                  <Rules />
                </Protected>
              )}
            </Route>
            <Route path="/settings">
              {() => (
                <Protected>
                  <Settings />
                </Protected>
              )}
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
