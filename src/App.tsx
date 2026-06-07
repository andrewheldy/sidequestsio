import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { SignInPromptProvider } from "@/contexts/SignInPromptContext";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DemoBanner } from "@/components/DemoBanner";
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import CommunityNotes from "./pages/CommunityNotes";
import Verticals from "./pages/Verticals";
import VerticalDetail from "./pages/VerticalDetail";
import Partnerships from "./pages/Partnerships";
import Hosts from "./pages/Hosts";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PublicProfile from "./pages/PublicProfile";
import Placeholder from "./pages/Placeholder";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import QuestDetail from "./pages/QuestDetail";
import QrLanding from "./pages/QrLanding";
import ScanResolve from "./pages/ScanResolve";
import AppLayout from "./pages/app/AppLayout";
import Explore from "./pages/app/Explore";
import MapView from "./pages/app/MapView";
import Favorites from "./pages/app/Favorites";
import Profile from "./pages/app/Profile";
import Settings from "./pages/app/Settings";
import QuestBrowser from "./pages/app/QuestBrowser";
import AppCommunityNotes from "./pages/app/AppCommunityNotes";
import CheckIn from "./pages/app/CheckIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* DemoSessionProvider must wrap AuthProvider so AuthContext can read the demo toggle */}
          <DemoSessionProvider>
            <AuthProvider>
              <FavoritesProvider>
                <SignInPromptProvider>
                  <DemoBanner />
                  <ScrollToTop />
                  <Routes>
                    {/* Marketing site */}
                    <Route path="/" element={<Index />} />
                    <Route path="/quests" element={<Quests />} />
                    <Route path="/community-notes" element={<CommunityNotes />} />
                    <Route path="/breadcrumbs" element={<Navigate to="/community-notes" replace />} />
                    <Route path="/verticals" element={<Verticals />} />
                    <Route path="/verticals/:slug" element={<VerticalDetail />} />
                    <Route path="/partnerships" element={<Partnerships />} />
                    <Route path="/hosts" element={<Hosts />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />

                    {/* Auth + onboarding */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/onboarding" element={<Onboarding />} />

                    {/* Public profile (read-only, privacy-safe) */}
                    <Route path="/u/:username" element={<PublicProfile />} />

                    {/* Quest detail & QR resolution */}
                    <Route path="/quests/:questId" element={<QuestDetail />} />
                    <Route path="/q/:questId" element={<QrLanding />} />
                    <Route path="/scan/:code" element={<ScanResolve />} />

                    {/* In-app experience */}
                    <Route path="/app" element={<AppLayout />}>
                      <Route index element={<Navigate to="/app/explore" replace />} />
                      <Route path="explore" element={<Explore />} />
                      <Route path="map" element={<MapView />} />
                      <Route path="quests" element={<QuestBrowser />} />
                      <Route path="community-notes" element={<AppCommunityNotes />} />
                      <Route
                        path="checkin"
                        element={
                          <ProtectedRoute>
                            <CheckIn />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="favorites"
                        element={
                          <ProtectedRoute>
                            <Favorites />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="profile"
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        }
                      />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SignInPromptProvider>
              </FavoritesProvider>
            </AuthProvider>
          </DemoSessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
