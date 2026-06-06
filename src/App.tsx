import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { RequireAuth, RequireRole } from "@/components/app/Guards";
import ScrollToTop from "@/components/ScrollToTop";

// --- Marketing site ---
import Index from "./pages/Index";
import Quests from "./pages/Quests";
import CommunityNotes from "./pages/CommunityNotes";
import Verticals from "./pages/Verticals";
import VerticalDetail from "./pages/VerticalDetail";
import Partnerships from "./pages/Partnerships";
import Hosts from "./pages/Hosts";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

// --- Public app ---
import Auth from "./pages/Auth";
import ScanResolve from "./pages/ScanResolve";
import QrLanding from "./pages/QrLanding";
import QuestDetail from "./pages/QuestDetail";

// --- In-app: Explore / Map / Favorites (outlet-based shell with BottomNav) ---
import AppLayoutShell from "./pages/app/AppLayout";
import Explore from "./pages/app/Explore";
import MapView from "./pages/app/MapView";
import Favorites from "./pages/app/Favorites";

// --- In-app: full Claude MVP pages (use AppLayout component wrapper internally) ---
import AppHome from "./pages/app/AppHome";
import QuestBrowser from "./pages/app/QuestBrowser";
import Profile from "./pages/app/Profile";
import Wallet from "./pages/app/Wallet";
import Rewards from "./pages/app/Rewards";
import Leaderboard from "./pages/app/Leaderboard";
import History from "./pages/app/History";
import CheckIn from "./pages/app/CheckIn";
import AppCommunityNotes from "./pages/app/AppCommunityNotes";

// --- Partner portal ---
import PartnerHome from "./pages/partner/PartnerHome";
import PartnerQuests from "./pages/partner/PartnerQuests";
import PartnerAnalytics from "./pages/partner/PartnerAnalytics";
import PartnerRewards from "./pages/partner/PartnerRewards";
import PartnerQrCodes from "./pages/partner/PartnerQrCodes";

// --- Admin ---
import AdminHome from "./pages/admin/AdminHome";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminQuests from "./pages/admin/AdminQuests";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminCommunityNotes from "./pages/admin/AdminCommunityNotes";
import AdminRewards from "./pages/admin/AdminRewards";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <FavoritesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* ── Marketing site ─────────────────────────────────────── */}
                <Route path="/" element={<Index />} />
                <Route path="/quests" element={<Quests />} />
                <Route path="/community-notes" element={<CommunityNotes />} />
                <Route path="/breadcrumbs" element={<Navigate to="/community-notes" replace />} />
                <Route path="/verticals" element={<Verticals />} />
                <Route path="/verticals/:slug" element={<VerticalDetail />} />
                <Route path="/partnerships" element={<Partnerships />} />
                <Route path="/hosts" element={<Hosts />} />
                <Route path="/privacy" element={<Placeholder title="Privacy Policy" description="Our full privacy policy is on the way." />} />
                <Route path="/terms" element={<Placeholder title="Terms of Service" description="Our full terms of service are on the way." />} />

                {/* ── Public app: auth + scan + quest detail ─────────────── */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/scan/:code" element={<ScanResolve />} />
                <Route path="/q/:questId" element={<QrLanding />} />
                <Route path="/quests/:questId" element={<QuestDetail />} />

                {/* ── Explore / Map / Favorites (outlet shell + BottomNav) ── */}
                <Route element={<AppLayoutShell />}>
                  <Route path="/app/explore" element={<Explore />} />
                  <Route path="/app/map" element={<MapView />} />
                  <Route path="/app/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
                </Route>

                {/* ── User app (each page wraps its own AppLayout + BottomNav) */}
                <Route path="/app" element={<RequireAuth><AppHome /></RequireAuth>} />
                <Route path="/app/quests" element={<RequireAuth><QuestBrowser /></RequireAuth>} />
                <Route path="/app/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/app/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
                <Route path="/app/rewards" element={<RequireAuth><Rewards /></RequireAuth>} />
                <Route path="/app/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
                <Route path="/app/history" element={<RequireAuth><History /></RequireAuth>} />
                <Route path="/app/checkin" element={<RequireAuth><CheckIn /></RequireAuth>} />
                <Route path="/app/community-notes" element={<RequireAuth><AppCommunityNotes /></RequireAuth>} />

                {/* ── Partner portal ─────────────────────────────────────── */}
                <Route path="/partner" element={<RequireRole roles={["partner", "admin"]}><PartnerHome /></RequireRole>} />
                <Route path="/partner/quests" element={<RequireRole roles={["partner", "admin"]}><PartnerQuests /></RequireRole>} />
                <Route path="/partner/analytics" element={<RequireRole roles={["partner", "admin"]}><PartnerAnalytics /></RequireRole>} />
                <Route path="/partner/rewards" element={<RequireRole roles={["partner", "admin"]}><PartnerRewards /></RequireRole>} />
                <Route path="/partner/qr-codes" element={<RequireRole roles={["partner", "admin"]}><PartnerQrCodes /></RequireRole>} />

                {/* ── Admin ──────────────────────────────────────────────── */}
                <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminHome /></RequireRole>} />
                <Route path="/admin/users" element={<RequireRole roles={["admin"]}><AdminUsers /></RequireRole>} />
                <Route path="/admin/quests" element={<RequireRole roles={["admin"]}><AdminQuests /></RequireRole>} />
                <Route path="/admin/partners" element={<RequireRole roles={["admin"]}><AdminPartners /></RequireRole>} />
                <Route path="/admin/community-notes" element={<RequireRole roles={["admin"]}><AdminCommunityNotes /></RequireRole>} />
                <Route path="/admin/rewards" element={<RequireRole roles={["admin"]}><AdminRewards /></RequireRole>} />
                <Route path="/admin/analytics" element={<RequireRole roles={["admin"]}><AdminAnalytics /></RequireRole>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </FavoritesProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
