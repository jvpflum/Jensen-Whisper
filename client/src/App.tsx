import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AnimatePresence } from "framer-motion";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import CognitiveEnhancer from "@/pages/CognitiveEnhancer";
import TriangleBackground from "@/components/TriangleBackground";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

function Router() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Switch location={location}>
        <Route path="/">
          <PageTransition>
            <Home />
          </PageTransition>
        </Route>
        <Route path="/chat">
          <PageTransition>
            <Chat />
          </PageTransition>
        </Route>
        <Route path="/cognitive">
          <PageTransition>
            <CognitiveEnhancer />
          </PageTransition>
        </Route>
        <Route>
          <PageTransition>
            <NotFound />
          </PageTransition>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-nvidia-darker text-nvidia-light">
        <TriangleBackground />
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center relative z-10 py-8">
          <Router />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
