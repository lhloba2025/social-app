import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Route pages are code-split (lazy) so the initial bundle stays small —
// e.g. sales reps opening /SalesPortal no longer download the whole app.
const DesignStudio = lazy(() => import('./pages/DesignStudio'));
const DesignLibraryPage = lazy(() => import('./pages/DesignLibraryPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const GreetingCardsPage = lazy(() => import('./pages/GreetingCardsPage'));
const PostComposer = lazy(() => import('./pages/PostComposer'));
const PostsManager = lazy(() => import('./pages/PostsManager'));
const ContentCalendar = lazy(() => import('./pages/ContentCalendar'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const ImageGenPage = lazy(() => import('./pages/ImageGenPage'));
const TeamLinks = lazy(() => import('./pages/TeamLinks'));
const WhatsappOutreach = lazy(() => import('./pages/WhatsappOutreach'));
const Marketing = lazy(() => import('./pages/Marketing'));
const EngagementPage = lazy(() => import('./pages/EngagementPage'));
const AccountingPage = lazy(() => import('./pages/AccountingPage'));
const SalesPortal = lazy(() => import('./pages/SalesPortal'));
const SalesPortalAdmin = lazy(() => import('./pages/SalesPortalAdmin'));

const { Pages, Layout } = pagesConfig;

const PageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
    <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
  </div>
);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName="Marketing">
          <Marketing />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      <Route path="/DesignStudio" element={<LayoutWrapper currentPageName="DesignStudio"><DesignStudio /></LayoutWrapper>} />
      <Route path="/ImageGen" element={<LayoutWrapper currentPageName="ImageGen"><ImageGenPage language={localStorage.getItem('appLanguage') || 'ar'} /></LayoutWrapper>} />
      <Route path="/Engagement" element={<LayoutWrapper currentPageName="Engagement"><EngagementPage language={localStorage.getItem('appLanguage') || 'ar'} /></LayoutWrapper>} />
      <Route path="/DesignLibraryPage" element={<LayoutWrapper currentPageName="DesignLibraryPage"><DesignLibraryPage /></LayoutWrapper>} />
      <Route path="/AccountsPage" element={<LayoutWrapper currentPageName="AccountsPage"><AccountsPage /></LayoutWrapper>} />
      <Route path="/TeamLinks" element={<LayoutWrapper currentPageName="TeamLinks"><TeamLinks /></LayoutWrapper>} />
      <Route path="/WhatsappOutreach" element={<LayoutWrapper currentPageName="WhatsappOutreach"><WhatsappOutreach /></LayoutWrapper>} />
      <Route path="/GreetingCards" element={<LayoutWrapper currentPageName="GreetingCards"><GreetingCardsPage /></LayoutWrapper>} />
      <Route path="/PostComposer" element={<LayoutWrapper currentPageName="PostComposer"><PostComposer /></LayoutWrapper>} />
      <Route path="/PostsManager" element={<LayoutWrapper currentPageName="PostsManager"><PostsManager /></LayoutWrapper>} />
      <Route path="/ContentCalendar" element={<LayoutWrapper currentPageName="ContentCalendar"><ContentCalendar /></LayoutWrapper>} />
      <Route path="/Accounting" element={<LayoutWrapper currentPageName="Accounting"><AccountingPage /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public pages — no login (TikTok/Meta reviewers open these directly) */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Sales Team Portal — standalone app with its own login; must NOT be
                wrapped in the main Layout/sidebar nor the main app tree. */}
            <Route path="/SalesPortal" element={<SalesPortal language={localStorage.getItem('appLanguage') || 'ar'} />} />
            <Route path="/SalesPortalAdmin" element={<SalesPortalAdmin language={localStorage.getItem('appLanguage') || 'ar'} />} />

            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App