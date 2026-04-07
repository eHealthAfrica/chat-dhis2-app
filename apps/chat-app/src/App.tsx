import {
    createHashRouter,
    RouterProvider,
    Navigate,
} from 'react-router-dom';
import ErrorPage from './components/ErrorPage';
import './locales';
import './App.module.css';
import { CssReset, CssVariables } from '@dhis2/ui';
import { Layout } from './components/layout/Layout';
import { SyncUrlWithGlobalShell } from './utils/syncUrlWithGlobalShell';
import { ChatLayout } from './features/chat/ChatLayout';
import { ChatSettingsPage } from './features/chat/pages/ChatSettingsPage';
import { NewAssessmentPage } from './features/chat/pages/NewAssessmentPage';
import { AddExistingAssessmentPage } from './features/chat/pages/AddExistingAssessmentPage';
import { DataCaptureGuidePage } from './features/chat/pages/DataCaptureGuidePage';
import { AssessmentSetupGuidePage } from './features/chat/pages/AssessmentSetupGuidePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { CaptureHome, CaptureList, CaptureForm } from './features/chat/ChatDataCapture';
import { RequireAuthority } from './components/RequireAuthority';

export type RouteHandle = {
    fullWidth?: boolean;
    /* whether to automatically collapse the sidebar when route is active */
    collapseSidebar?: boolean;
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

const router = createHashRouter([
    {
        element: (
            <>
                <SyncUrlWithGlobalShell />
                <Layout />
            </>
        ),
        errorElement: <ErrorPage />,
        children: [
            {
                path: '/',
                element: <Navigate to="/chat/data-capture" replace />,
            },
            {
                path: '/chat',
                handle: {
                    fullWidth: true,
                } satisfies RouteHandle,
                element: <ChatLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/chat/data-capture" replace />,
                    },
                    {
                        path: 'settings',
                        element: (
                            <RequireAuthority authority="F_CHAT_ADD_SETTINGS">
                                <ChatSettingsPage />
                            </RequireAuthority>
                        ),
                    },
                    {
                        path: 'settings/new',
                        element: (
                            <RequireAuthority authority="F_CHAT_ADD_SETTINGS">
                                <NewAssessmentPage />
                            </RequireAuthority>
                        ),
                    },
                    {
                        path: 'settings/existing',
                        element: (
                            <RequireAuthority authority="F_CHAT_ADD_SETTINGS">
                                <AddExistingAssessmentPage />
                            </RequireAuthority>
                        ),
                    },
                    {
                        path: 'guides',
                        children: [
                            {
                                path: 'data-capture',
                                element: <DataCaptureGuidePage />,
                            },
                            {
                                path: 'assessment-setup',
                                element: (
                                    <RequireAuthority authority="F_CHAT_ADD_SETTINGS">
                                        <AssessmentSetupGuidePage />
                                    </RequireAuthority>
                                ),
                            },
                        ],
                    },
                    {
                        path: 'data-capture',
                        children: [
                            {
                                index: true,
                                element: <CaptureHome />,
                            },
                            {
                                path: ':programId',
                                element: <CaptureList />,
                            },
                            {
                                path: ':programId/new',
                                element: <CaptureForm />,
                            },
                            {
                                path: ':programId/:eventId',
                                element: <CaptureForm />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
]);

const App = () => {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <CssReset />
                <CssVariables theme spacers colors elevations />
                <RouterProvider router={router} />
                <ReactQueryDevtools position="bottom-right" />
            </QueryClientProvider>
        </>
    );
};

export default App;
