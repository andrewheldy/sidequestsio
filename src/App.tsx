import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { SignInPromptProvider } from "@/contexts/SignInPromptContext";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import AppLayout from "./pages/app/AppLayout";
import Explore from "./pages/app/Explore";
import MapView from "./pages/app/MapView";
import Favorites from "./pages/app/Favorites";
import Profile from "./pages/app/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <FavoritesProvider>
              <SignInPromptProvider>
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
                  <Route
                    path="/privacy"
                    element={<Placeholder title="Privacy Policy" description="Our full privacy policy is on the way." />}
                  />
                  <Route
                    path="/terms"
                    element={<Placeholder title="Terms of Service" description="Our full terms of service are on the way." />}
                  />

                  {/* Auth + onboarding */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />

                  {/* Public profile (read-only, privacy-safe) */}
                  <Route path="/u/:username" element={<PublicProfile />} />

                  {/* In-app experience */}
                  <Route path="/app" element={<AppLayout />}>
                    <Route index element={<Navigate to="/app/explore" replace />} />
                    <Route path="explore" element={<Explore />} />
                    <Route path="map" element={<MapView />} />
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
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SignInPromptProvider>
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
