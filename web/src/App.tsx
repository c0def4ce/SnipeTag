import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { DealFeed } from "@/components/deal-feed";
import { SnipeList } from "@/components/snipe-list";
import { RetailerDirectory } from "@/components/retailer-directory";
import { BillingPanel } from "@/components/billing-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { LoginForm } from "@/components/login-form";
import { ShareTargetHandler } from "@/components/share-target-handler";
import { AuthCallback } from "@/components/auth-callback";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { PwaRegister } from "@/lib/pwa-register";

const basename = import.meta.env.BASE_URL === "./" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");

function ShellRoute() {
  return <AppShell><Outlet /></AppShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={basename}>
          <PwaRegister />
          <Routes>
            <Route element={<ShellRoute />}>
              <Route path="/" element={<DealFeed />} />
              <Route path="/snipes" element={<SnipeList />} />
              <Route path="/alerts" element={<SnipeList onlyTriggered />} />
              <Route path="/retailers" element={<RetailerDirectory />} />
              <Route path="/billing" element={<BillingPanel />} />
              <Route path="/settings" element={<SettingsPanel />} />
              <Route path="/snipe" element={<ShareTargetHandler />} />
            </Route>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
