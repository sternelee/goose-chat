import { useCallback, useRef, useState } from 'react';
import { useConfig } from '../components/ConfigContext';
import { ChatType } from '../types/chat';
import { initializeSystem } from '../utils/providerUtils';
import { initializeCostDatabase } from '../utils/costDatabase';
import {
  backupConfig,
  initConfig,
  Message as ApiMessage,
  readAllConfig,
  Recipe,
  recoverConfig,
  resumeAgent,
  startAgent,
  validateConfig,
} from '../api';
import { COST_TRACKING_ENABLED } from '../updates';
import { convertApiMessageToFrontendMessage } from '../components/context_management';

export enum AgentState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  NO_PROVIDER = 'no_provider',
  INITIALIZED = 'initialized',
  ERROR = 'error',
}

export interface InitializationContext {
  recipe?: Recipe;
  resumeSessionId?: string;
  setAgentWaitingMessage: (msg: string | null) => void;
  setIsExtensionsLoading?: (isLoading: boolean) => void;
}

interface UseAgentReturn {
  agentState: AgentState;
  resetChat: () => void;
  loadCurrentChat: (context: InitializationContext) => Promise<ChatType>;
}

export class NoProviderOrModelError extends Error {
  constructor() {
    super('No provider or model configured');
    this.name = this.constructor.name;
  }
}

export function useAgent(): UseAgentReturn {
  const [agentState, setAgentState] = useState<AgentState>(AgentState.UNINITIALIZED);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const initPromiseRef = useRef<Promise<ChatType> | null>(null);
  const [recipeFromAppConfig, setRecipeFromAppConfig] = useState<Recipe | null>(
    (window.appConfig.get('recipe') as Recipe) || null
  );
  const { getExtensions, addExtension, read } = useConfig();

  const resetChat = useCallback(() => {
    setSessionId(null);
    setAgentState(AgentState.UNINITIALIZED);
    setRecipeFromAppConfig(null);
  }, []);

  const agentIsInitialized = agentState === AgentState.INITIALIZED;
  const currentChat = useCallback(
    async (initContext: InitializationContext): Promise<ChatType> => {
      if (agentIsInitialized && sessionId) {
        const agentResponse = await resumeAgent({
          body: {
            session_id: sessionId,
          },
          throwOnError: true,
        });

        const agentSession = agentResponse.data;
        const messages = agentSession.conversation || [];
        return {
          sessionId: agentSession.id,
          title: agentSession.recipe?.title || agentSession.description,
          messageHistoryIndex: 0,
          messages: messages?.map((message: ApiMessage) =>
            convertApiMessageToFrontendMessage(message)
          ),
          recipe: agentSession.recipe,
          recipeParameters: agentSession.user_recipe_values || null,
        };
      }

      if (initPromiseRef.current) {
        return initPromiseRef.current;
      }

      const initPromise = (async () => {
        setAgentState(AgentState.INITIALIZING);
        const agentWaitingMessage = initContext.setAgentWaitingMessage;
        agentWaitingMessage('Agent is initializing');

        try {
          // Get config from either Tauri or fallback to appConfig
          let config: any;
          try {
            console.log('Trying to get config...');
            // Try Tauri API first (when running in Tauri)
            if (window.__TAURI__) {
              console.log('Tauri API detected, invoking get_config...');
              const { invoke } = await import('@tauri-apps/api/core');
              config = await invoke('get_config');
              console.log('Got config from Tauri:', config);
            } else {
              console.log('Tauri API not available, using fallback');
              throw new Error('Tauri API not available');
            }
          } catch (configError) {
            console.warn('Failed to get config from Tauri, using fallback:', configError);
            // Fallback to appConfig mock (for development/web)
            config = window.appConfig
              ? window.appConfig.getAll()
              : {
                  GOOSE_DEFAULT_PROVIDER: 'openai',
                  GOOSE_DEFAULT_MODEL: 'gpt-3.5-turbo',
                };
            console.log('Using fallback config:', config);
          }

          const provider = (await read('GOOSE_PROVIDER', false)) ?? config.GOOSE_DEFAULT_PROVIDER;
          const model = (await read('GOOSE_MODEL', false)) ?? config.GOOSE_DEFAULT_MODEL;

          console.log('Final provider:', provider, 'Final model:', model);

          if (!provider || !model) {
            setAgentState(AgentState.NO_PROVIDER);
            throw new NoProviderOrModelError();
          }

          let agentResponse;
          try {
            console.log('About to call startAgent or resumeAgent...');
            console.log('resumeSessionId:', initContext.resumeSessionId);
            console.log(
              'working_dir:',
              config.GOOSE_WORKING_DIR ||
                (window.appConfig?.get('GOOSE_WORKING_DIR') as string) ||
                '.'
            );
            console.log('recipe:', recipeFromAppConfig ?? initContext.recipeConfig);

            agentResponse = initContext.resumeSessionId
              ? await resumeAgent({
                  body: {
                    session_id: initContext.resumeSessionId,
                  },
                  throwOnError: true,
                })
              : await startAgent({
                  body: {
                    working_dir:
                      config.GOOSE_WORKING_DIR ||
                      (window.appConfig?.get('GOOSE_WORKING_DIR') as string) ||
                      '.',
                    recipe: recipeFromAppConfig ?? initContext.recipeConfig,
                  },
                  throwOnError: true,
                });

            console.log('Agent response received:', agentResponse);
          } catch (apiError) {
            console.error('API call to startAgent/resumeAgent failed:', apiError);
            console.error('API Error type:', typeof apiError);
            console.error('API Error constructor:', apiError?.constructor?.name);
            console.error('API Error message:', apiError?.message);
            console.error('API Error data:', apiError?.data);
            console.error('API Error status:', apiError?.status);
            throw apiError;
          }

          const agentSession = agentResponse.data;
          console.log('Agent session data:', agentSession);
          if (!agentSession) {
            throw Error('Failed to get session info');
          }
          setSessionId(agentSession.id);

          agentWaitingMessage('Agent is loading config');

          await initConfig();

          try {
            await readAllConfig({ throwOnError: true });
          } catch (error) {
            console.warn('Initial config read failed, attempting recovery:', error);
            await handleConfigRecovery();
          }

          agentWaitingMessage('Extensions are loading');

          const recipeForInit = initContext.recipe || agentSession.recipe || undefined;
          await initializeSystem(agentSession.id, provider as string, model as string, {
            getExtensions,
            addExtension,
            setIsExtensionsLoading: initContext.setIsExtensionsLoading,
            recipeParameters: agentSession.user_recipe_values,
            recipe: recipeForInit,
          });

          if (COST_TRACKING_ENABLED) {
            try {
              await initializeCostDatabase();
            } catch (error) {
              console.error('Failed to initialize cost database:', error);
            }
          }

          const recipe = initContext.recipe || agentSession.recipe;
          const conversation = agentSession.conversation || [];
          // If we're loading a recipe from initContext (new recipe load), start with empty messages
          // Otherwise, use the messages from the session
          const messages =
            initContext.recipe && !initContext.resumeSessionId
              ? []
              : conversation.map((message: ApiMessage) =>
                  convertApiMessageToFrontendMessage(message)
                );

          let initChat: ChatType = {
            sessionId: agentSession.id,
            title: agentSession.recipe?.title || agentSession.description,
            messageHistoryIndex: 0,
            messages: messages,
            recipe: recipe,
            recipeParameters: agentSession.user_recipe_values || null,
          };

          setAgentState(AgentState.INITIALIZED);

          return initChat;
        } catch (error) {
          console.error('Agent initialization failed with detailed error:', error);
          console.error('Error type:', typeof error);
          console.error('Error constructor:', error?.constructor?.name);
          console.error('Error message:', error?.message);
          console.error('Error stack:', error?.stack);

          if ((error + '').includes('Failed to create provider')) {
            setAgentState(AgentState.NO_PROVIDER);
          } else {
            setAgentState(AgentState.ERROR);
          }
          throw error;
        } finally {
          agentWaitingMessage(null);
          initPromiseRef.current = null;
        }
      })();

      initPromiseRef.current = initPromise;
      return initPromise;
    },
    [agentIsInitialized, sessionId, read, recipeFromAppConfig, getExtensions, addExtension]
  );

  return {
    agentState,
    resetChat,
    loadCurrentChat: currentChat,
  };
}

const handleConfigRecovery = async () => {
  const configVersion = localStorage.getItem('configVersion');
  const shouldMigrateExtensions = !configVersion || parseInt(configVersion, 10) < 3;

  if (shouldMigrateExtensions) {
    try {
      await backupConfig({ throwOnError: true });
      await initConfig();
    } catch (migrationError) {
      console.error('Migration failed:', migrationError);
    }
  }

  try {
    await validateConfig({ throwOnError: true });
    await readAllConfig({ throwOnError: true });
  } catch {
    try {
      await recoverConfig({ throwOnError: true });
      await readAllConfig({ throwOnError: true });
    } catch {
      console.warn('Config recovery failed, reinitializing...');
      await initConfig();
    }
  }
};
