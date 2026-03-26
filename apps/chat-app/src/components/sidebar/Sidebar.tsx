import i18n from '@dhis2/d2-i18n';
import { IconChevronLeft24 } from '@dhis2/ui';
import cx from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import {
    Sidenav,
    SidenavItems,
    SidenavLink,
    SidenavParent,
} from './sidenav';
import { useHasAuthority } from '../../hooks/useHasAuthority';

interface SidebarNavLinkProps {
    label: string;
    to: string;
    disabled?: boolean;
    end?: boolean;
}

const SidebarNavLink = ({ to, label, disabled, end }: SidebarNavLinkProps) => {
    return (
        <SidenavLink
            to={to}
            disabled={disabled}
            LinkComponent={NavLink}
            label={label}
            end={end}
        />
    );
};

export const Sidebar = ({
                            className,
                            hideSidebar,
                        }: {
    className?: string;
    hideSidebar?: boolean;
}) => {
    const collapsedExternally = useRef<boolean>(false);
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { hasAuthority: canAccessSettings } = useHasAuthority('F_CHAT_ADD_SETTINGS');
    const isGuideRoute = location.pathname.startsWith('/chat/guides');
    const [guidesOpen, setGuidesOpen] = useState(isGuideRoute);

    useEffect(() => {
        // only react if explicitly defined
        // however, do react if it has been changed externally
        // eg. so that it reopen when navigating away from a collapsed route
        if (hideSidebar !== undefined || collapsedExternally.current) {
            setCollapsed(!!hideSidebar);
            collapsedExternally.current = !!hideSidebar;
        }
    }, [hideSidebar]);

    useEffect(() => {
        if (isGuideRoute) {
            setGuidesOpen(true);
        }
    }, [isGuideRoute]);

    return (
        <aside
            className={cx(styles.asideWrapper, className, {
                [styles.collapsed]: collapsed,
            })}
        >
            <Sidenav>
                <SidenavItems>
                    <SidebarNavLink
                        label={i18n.t('Data Capture')}
                        to="/chat/data-capture"
                    />
                    <SidenavParent
                        label={i18n.t('Guides')}
                        open={guidesOpen}
                        onClick={() => setGuidesOpen(current => !current)}
                    >
                        <SidebarNavLink
                            label={i18n.t('Data capture guide')}
                            to="/chat/guides/data-capture"
                        />
                        {canAccessSettings && (
                            <SidebarNavLink
                                label={i18n.t('Assessment setup guide')}
                                to="/chat/guides/assessment-setup"
                            />
                        )}
                    </SidenavParent>
                    {canAccessSettings && (
                        <SidebarNavLink
                            label={i18n.t('Settings')}
                            to="/chat/settings"
                        />
                    )}
                </SidenavItems>
            </Sidenav>
            <button
                className={styles.collapseButton}
                type="button"
                onClick={() => setCollapsed(!collapsed)}
            >
                <div
                    className={cx(styles.iconWrapper, {
                        [styles.collapsed]: collapsed,
                    })}
                >
                    <IconChevronLeft24 />
                </div>
            </button>
        </aside>
    );
};

export default Sidebar;
