import { Navigate } from 'react-router-dom';
import { useHasAuthority } from '../../hooks/useHasAuthority';
import { CircularLoader } from '@dhis2/ui';

interface RequireAuthorityProps {
    authority: string;
    children: React.ReactNode;
    redirectTo?: string;
}

export const RequireAuthority = ({
    authority,
    children,
    redirectTo = '/chat/data-capture',
}: RequireAuthorityProps) => {
    const { hasAuthority, isLoading } = useHasAuthority(authority);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <CircularLoader />
            </div>
        );
    }

    if (!hasAuthority) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};
