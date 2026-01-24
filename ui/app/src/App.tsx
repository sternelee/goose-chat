import { useEffect, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { ErrorUI } from './components/ErrorBoundary';
import { ExtensionInstallModal } from './components/ExtensionInstallModal';
import { ToastContainer } from 'react-toastify';
import AnnouncementModal from './components/AnnouncementModal';
import TelemetryOptOutModal from './components/TelemetryOptOutModal';
import ProviderGuard from './components/ProviderGuard';
import { createSession } from './sessions';

import { ChatType } from './types/chat';
import Hub from './components/Hub';
import { UserInput } from './types/message';

interface PairRouteState {
  resumeSessionId?: string;
  initialMessage?: UserInput;
}
import SettingsView, { SettingsViewOptions } from './components/settings/SettingsView';
import SessionsView from './components/sessions/SessionsView';
import SharedSessionView from './components/sessions/SharedSessionView';
import SchedulesView from './components/schedule/SchedulesView';
import ProviderSettings from './components/settings/providers/ProviderSettingsPage';
import { AppLayout } from './components/Layout/AppLayout';
import { ChatProvider, DEFAULT_CHAT_TITLE } from './contexts/ChatContext';
import LauncherView from './components/LauncherView';

import 'react-toastify/dist/ReactToastify.css';
import { useConfig } from './components/ConfigContext';
import { ModelAndProviderProvider } from './components/ModelAndProviderContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PermissionSettingsView from './components/settings/permission/PermissionSetting';

import ExtensionsView, { ExtensionsViewOptions } from './components/extensions/ExtensionsView';
import RecipesView from './components/recipes/RecipesView';
import AppsView from './components/apps/AppsView';
import StandaloneAppView from './components/apps/StandaloneAppView';
import { View, ViewOptions } from './utils/navigationUtils';

import { useNavigation } from './hooks/useNavigation';
import { errorMessage } from './utils/conversionUtils';
import { getInitialWorkingDir } from './utils/workingDir';
import { usePageViewTracking } from './hooks/useAnalytics';
import { trackOnboardingCompleted, trackErrorWithContext } from './utils/analytics';
import { AppEvents } from './constants/events';

function PageViewTracker() {
  usePageViewTracking();
  return null;
}

// Route Components
const HubRouteWrapper = () => {
  const setView = useNavigation();
  return <Hub setView={setView} />;
};

const PairRouteWrapper = ({
  activeSessions,
}: {
  activeSessions: Array<{
    sessionId: string;
    initialMessage?: UserInput;
  }>;
  setActiveSessions: (
    sessions: Array<{ sessionId: string; initialMessage?: UserInput }>
  ) => void;
}) => {
  const { extensionsList } = useConfig();
  const location = useLocation();
  const routeState =
    (location.state as PairRouteState) || (window.history.state as PairRouteState) || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const resumeSessionId = searchParams.get('resumeSessionId') ?? undefined;
  const recipeId = searchParams.get('recipeId') ?? undefined;
  const initialMessage = routeState.initialMessage;

  // Create session if we have an initialMessage, recipeId, but no sessionId
  useEffect(() => {
    if (
      (initialMessage || recipeId) &&
      !resumeSessionId &&
      !isCreatingSession
    ) {
      setIsCreatingSession(true);

      (async () => {
        try {
          const newSession = await createSession(getInitialWorkingDir(), {
            recipeId,
            allExtensions: extensionsList,
          });

          window.dispatchEvent(
            new CustomEvent(AppEvents.ADD_ACTIVE_SESSION, {
              detail: {
                sessionId: newSession.id,
                initialMessage,
              },
            })
          );

          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.set('resumeSessionId', newSession.id);
            newParams.delete('recipeId');
            return newParams;
          });
        } catch (error) {
          console.error('Failed to create session:', error);
          trackErrorWithContext(error, {
            component: 'PairRouteWrapper',
            action: 'create_session',
            recoverable: true,
          });
        } finally {
          setIsCreatingSession(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialMessage,
    recipeId,
    resumeSessionId,
    setSearchParams,
    extensionsList,
  ]);

  // Add resumed session to active sessions if not already there
  useEffect(() => {
    if (resumeSessionId && !activeSessions.some((s) => s.sessionId === resumeSessionId)) {
      window.dispatchEvent(
        new CustomEvent(AppEvents.ADD_ACTIVE_SESSION, {
          detail: {
            sessionId: resumeSessionId,
            initialMessage: initialMessage,
          },
        })
      );
    }
  }, [resumeSessionId, activeSessions, initialMessage]);

  return null;
};

const SettingsRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setView = useNavigation();

  const viewOptions =
    (location.state as SettingsViewOptions) || (window.history.state as SettingsViewOptions) || {};

  const sectionFromUrl = searchParams.get('section');
  if (sectionFromUrl) {
    viewOptions.section = sectionFromUrl;
  }

  return <SettingsView onClose={() => navigate('/')} setView={setView} viewOptions={viewOptions} />;
};

const SessionsRoute = () => {
  return <SessionsView />;
};

const SchedulesRoute = () => {
  const navigate = useNavigate();
  return <SchedulesView onClose={() => navigate('/')} />;
};

const RecipesRoute = () => {
  return <RecipesView />;
};

const PermissionRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const parentView = location.state?.parentView as View;
  const parentViewOptions = location.state?.parentViewOptions as ViewOptions;

  return (
    <PermissionSettingsView
      onClose={() => {
        switch (parentView) {
          case 'chat':
            navigate('/');
            break;
          case 'pair':
            navigate('/pair');
            break;
          case 'settings':
            navigate('/settings', { state: parentViewOptions });
            break;
          case 'sessions':
            navigate('/sessions');
            break;
          case 'schedules':
            navigate('/schedules');
            break;
          case 'recipes':
            navigate('/recipes');
            break;
          default:
            navigate('/');
        }
      }}
    />
  );
};

const ConfigureProvidersRoute = () => {
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen bg-background-default">
      <ProviderSettings
        onClose={() => navigate('/settings', { state: { section: 'models' } })}
        isOnboarding={false}
      />
    </div>
  );
};

interface WelcomeRouteProps {
  onSelectProvider: () => void;
}

const WelcomeRoute = ({ onSelectProvider }: WelcomeRouteProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen bg-background-default">
      <ProviderSettings
        onClose={() => {
          navigate('/', { replace: true });
        }}
        isOnboarding={true}
        onProviderLaunched={(model?: string) => {
          trackOnboardingCompleted('other', model);
          onSelectProvider();
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
};

const SharedSessionRouteWrapper = ({
  isLoadingSharedSession,
  setIsLoadingSharedSession,
  sharedSessionError,
}: {
  isLoadingSharedSession: boolean;
  setIsLoadingSharedSession: (loading: boolean) => void;
  sharedSessionError: string | null;
}) => {
  const location = useLocation();
  const setView = useNavigation();

  const historyState = window.history.state;
  const sessionDetails = (location.state?.sessionDetails ||
    historyState?.sessionDetails) as any | null;
  const error = location.state?.error || historyState?.error || sharedSessionError;

  return (
    <SharedSessionView
      session={sessionDetails}
      isLoading={isLoadingSharedSession}
      error={error}
      onRetry={async () => {
        // TODO: Implement retry logic for Tauri
        console.warn('Shared session retry not yet implemented for Tauri');
      }}
    />
  );
};

const ExtensionsRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const viewOptions =
    (location.state as ExtensionsViewOptions) ||
    (window.history.state as ExtensionsViewOptions) ||
    {};

  return (
    <ExtensionsView
      onClose={() => navigate(-1)}
      setView={(view, options) => {
        switch (view) {
          case 'chat':
            navigate('/');
            break;
          case 'pair':
            navigate('/pair', { state: options });
            break;
          case 'settings':
            navigate('/settings', { state: options });
            break;
          default:
            navigate('/');
        }
      }}
      viewOptions={viewOptions}
    />
  );
};

export function AppInner() {
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [isLoadingSharedSession, setIsLoadingSharedSession] = useState(false);
  const [sharedSessionError, setSharedSessionError] = useState<string | null>(null);
  const [didSelectProvider, setDidSelectProvider] = useState<boolean>(false);

  const navigate = useNavigate();
  const setView = useNavigation();

  const [chat, setChat] = useState<ChatType>({
    sessionId: '',
    name: DEFAULT_CHAT_TITLE,
    messages: [],
    recipe: null,
  });

  const MAX_ACTIVE_SESSIONS = 10;

  const [activeSessions, setActiveSessions] = useState<
    Array<{ sessionId: string; initialMessage?: UserInput }>
  >([]);

  useEffect(() => {
    const handleAddActiveSession = (event: Event) => {
      const { sessionId, initialMessage } = (
        event as CustomEvent<{
          sessionId: string;
          initialMessage?: UserInput;
        }>
      ).detail;

      setActiveSessions((prev) => {
        const existingIndex = prev.findIndex((s) => s.sessionId === sessionId);

        if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          return [...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1), existing];
        }

        const newSession = { sessionId, initialMessage };
        const updated = [...prev, newSession];
        if (updated.length > MAX_ACTIVE_SESSIONS) {
          return updated.slice(updated.length - MAX_ACTIVE_SESSIONS);
        }
        return updated;
      });
    };

    const handleClearInitialMessage = (event: Event) => {
      const { sessionId } = (event as CustomEvent<{ sessionId: string }>).detail;

      setActiveSessions((prev) => {
        return prev.map((session) => {
          if (session.sessionId === sessionId) {
            return { ...session, initialMessage: undefined };
          }
          return session;
        });
      });
    };

    window.addEventListener(AppEvents.ADD_ACTIVE_SESSION, handleAddActiveSession);
    window.addEventListener(AppEvents.CLEAR_INITIAL_MESSAGE, handleClearInitialMessage);
    return () => {
      window.removeEventListener(AppEvents.ADD_ACTIVE_SESSION, handleAddActiveSession);
      window.removeEventListener(AppEvents.CLEAR_INITIAL_MESSAGE, handleClearInitialMessage);
    };
  }, []);

  const { addExtension } = useConfig();

  // Tauri: Signal that React is ready
  useEffect(() => {
    console.log('Goose Tauri app is ready');
    // In Tauri, we don't need to signal readiness to the main process
    // The backend is already running in-process
  }, []);

  // Handle fatal errors from Tauri backend (if any)
  useEffect(() => {
    const handleFatalError = (error: string) => {
      console.error('Encountered a fatal error:', error);
      setFatalError(error);
    };

    // Listen for potential fatal errors
    // This would be set up via Tauri events if needed

    return () => {
      // Cleanup
    };
  }, []);

  // Prevent default drag and drop behavior globally
  useEffect(() => {
    const preventDefaults = (e: globalThis.DragEvent) => {
      const target = e.target as HTMLElement;
      const isOverDropZone = target.closest('[data-drop-zone="true"]') !== null;

      if (!isOverDropZone) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleDragOver = (e: globalThis.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: globalThis.DragEvent) => {
      const target = e.target as HTMLElement;
      const isOverDropZone = target.closest('[data-drop-zone="true"]') !== null;

      if (!isOverDropZone) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('dragenter', preventDefaults, false);
    document.addEventListener('dragleave', preventDefaults, false);
    document.addEventListener('dragover', handleDragOver, false);
    document.addEventListener('drop', handleDrop, false);

    return () => {
      document.removeEventListener('dragenter', preventDefaults, false);
      document.removeEventListener('dragleave', preventDefaults, false);
      document.removeEventListener('dragover', handleDragOver, false);
      document.removeEventListener('drop', handleDrop, false);
    };
  }, []);

  if (fatalError) {
    return <ErrorUI error={errorMessage(fatalError)} />;
  }

  return (
    <>
      <PageViewTracker />
      <ToastContainer
        aria-label="Toast notifications"
        toastClassName={() =>
          `relative min-h-16 mb-4 p-2 rounded-lg
               flex justify-between overflow-hidden cursor-pointer
               text-text-on-accent bg-background-inverse
              `
        }
        style={{ width: '450px' }}
        className="mt-6"
        position="top-right"
        autoClose={3000}
        closeOnClick
        pauseOnHover
      />
      <ExtensionInstallModal addExtension={addExtension} setView={setView} />
      <div className="relative w-screen h-screen overflow-hidden bg-background-muted flex flex-col">
        <div className="titlebar-drag-region" />
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Routes>
            <Route path="launcher" element={<LauncherView />} />
            <Route
              path="welcome"
              element={<WelcomeRoute onSelectProvider={() => setDidSelectProvider(true)} />}
            />
            <Route path="configure-providers" element={<ConfigureProvidersRoute />} />
            <Route path="standalone-app" element={<StandaloneAppView />} />
            <Route
              path="/"
              element={
                <ProviderGuard didSelectProvider={didSelectProvider}>
                  <ChatProvider chat={chat} setChat={setChat} contextKey="hub">
                    <AppLayout activeSessions={activeSessions} />
                  </ChatProvider>
                </ProviderGuard>
              }
            >
              <Route index element={<HubRouteWrapper />} />
              <Route
                path="pair"
                element={
                  <PairRouteWrapper
                    activeSessions={activeSessions}
                    setActiveSessions={setActiveSessions}
                  />
                }
              />
              <Route path="settings" element={<SettingsRoute />} />
              <Route
                path="extensions"
                element={
                  <ChatProvider chat={chat} setChat={setChat} contextKey="extensions">
                    <ExtensionsRoute />
                  </ChatProvider>
                }
              />
              <Route path="apps" element={<AppsView />} />
              <Route path="sessions" element={<SessionsRoute />} />
              <Route path="schedules" element={<SchedulesRoute />} />
              <Route path="recipes" element={<RecipesRoute />} />
              <Route
                path="shared-session"
                element={
                  <SharedSessionRouteWrapper
                    isLoadingSharedSession={isLoadingSharedSession}
                    setIsLoadingSharedSession={setIsLoadingSharedSession}
                    sharedSessionError={sharedSessionError}
                  />
                }
              />
              <Route path="permission" element={<PermissionRoute />} />
            </Route>
          </Routes>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ModelAndProviderProvider>
        <HashRouter>
          <AppInner />
        </HashRouter>
        <AnnouncementModal />
        <TelemetryOptOutModal controlled={false} />
      </ModelAndProviderProvider>
    </ThemeProvider>
  );
}
