import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuildProvider } from "@/lib/guild-context";
import { AppLayout } from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Welcome from "@/pages/welcome";
import Tickets from "@/pages/tickets";
import Shop from "@/pages/shop";
import Instagram from "@/pages/instagram";
import Tellonym from "@/pages/tellonym";
import Partnership from "@/pages/partnership";
import BotIdentity from "@/pages/bot-identity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/welcome" component={Welcome} />
        <Route path="/tickets" component={Tickets} />
        <Route path="/shop" component={Shop} />
        <Route path="/instagram" component={Instagram} />
        <Route path="/tellonym" component={Tellonym} />
        <Route path="/partnership" component={Partnership} />
        <Route path="/bot-identity" component={BotIdentity} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GuildProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </GuildProvider>
        <Toaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
