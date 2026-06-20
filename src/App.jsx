import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import DesignStudio from './pages/DesignStudio';
import DesignLibraryPage from './pages/DesignLibraryPage';
import AccountsPage from './pages/AccountsPage';
import Dashboard from './pages/Dashboard';
import GreetingCardsPage from './pages/GreetingCardsPage';
import PostComposer from './pages/PostComposer';
import PostsManager from './pages/PostsManager';
import ContentCalendar from './pages/ContentCalendar';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ImageGenPage from './pages/ImageGenPage';
import TeamLinks from './pages/TeamLinks';
import WhatsappOutreach from './pages/WhatsappOutreach';
import Marketing from './pages/Marketing';
import EngagementPage from './pages/EngagementPage';
import AccountingPage from './pages/AccountingPage';
import CRM from './pages/CRM';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

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
      <Route path="/CRM" element={<LayoutWrapper currentPageName="CRM"><CRM language={localStorage.getItem('appLanguage') || 'ar'} /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public pages — no login (TikTok/Meta reviewers open these directly) */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App