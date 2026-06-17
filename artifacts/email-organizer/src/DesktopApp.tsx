import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Categories from "@/pages/categories";
import CategoryEmails from "@/pages/category-emails";
import Emails from "@/pages/emails";
import Rules from "@/pages/rules";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function DesktopApp() {
  return (
    <WouterRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/categories/:id">
                {() => <CategoryEmails />}
              </Route>
              <Route path="/categories" component={Categories} />
              <Route path="/emails" component={Emails} />
              <Route path="/rules" component={Rules} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}
