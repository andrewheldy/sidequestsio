import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import CommunityNotes from "./pages/CommunityNotes";
import Verticals from "./pages/Verticals";
import VerticalDetail from "./pages/VerticalDetail";
import Partnerships from "./pages/Partnerships";
import Hosts from "./pages/Hosts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/community-notes" element={<CommunityNotes />} />
            <Route path="/breadcrumbs" element={<Navigate to="/community-notes" replace />} />
            <Route path="/verticals" element={<Verticals />} />
            <Route path="/verticals/:slug" element={<VerticalDetail />} />
            <Route path="/partnerships" element={<Partnerships />} />
            <Route path="/hosts" element={<Hosts />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;