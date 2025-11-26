import i18n from "@dhis2/d2-i18n";
import { CssVariables, CssReset, Menu, MenuItem } from "@dhis2/ui";
import React, { useEffect, useState, useRef, Fragment } from "react";
import { Outlet, useResolvedPath, useNavigate } from "react-router-dom";
import useAppSettings from "../hooks/useAppSettings.js";
import OrgUnitTree from "./explore/OrgUnitTree.jsx";
import styles from "./styles/Root.module.css";

export const appPages = [
    { path: "/", name: i18n.t("Home") },
    { path: "/dashboards", name: i18n.t("Dashboards") },
];

export const assessmentsList = [
    {
        path: "/assessments/A294977888e",
        name: i18n.t("Flood Health Facility Assessment"),
    },
    {
        path: "/assessments/pFSueR4Uwyy",
        name: i18n.t("Heat Wave Facility Assessment"),
    },
    {
        path: "/assessments/VQye4gFGUpM",
        name: i18n.t("Drought Health Facility Assessment"),
    },
];

const Root = () => {
    const { settings } = useAppSettings();
    const { pathname } = useResolvedPath();
    const navigate = useNavigate();

    const [sidebarWidth, setSidebarWidth] = useState(380);
    const isResizing = useRef(false);

    useEffect(() => {
        if (pathname === "/" && settings?.startPage) {
            navigate(settings.startPage);
        }
    }, [settings, pathname, navigate]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing.current) return;
            setSidebarWidth(Math.min(600, Math.max(200, e.clientX)));
        };

        const handleMouseUp = () => {
            isResizing.current = false;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    return (
        <>

            <CssReset />
            <CssVariables spacers colors />

            <div                 className={styles.container}
                                 style={{ "--sidebar-width": `${sidebarWidth}px` }}>
                <div className={styles.sidebar}>
                    <Menu>
                        {appPages.map(({ path, name }) => (
                            <Fragment key={path}>
                                <MenuItem
                                    label={name}
                                    href={`#${path}`}
                                    active={
                                        pathname === path ||
                                        (path !== "/" && pathname.startsWith(path))
                                    }
                                />
                                {path === "/explore" && pathname.startsWith("/explore") && (
                                    <OrgUnitTree />
                                )}
                            </Fragment>
                        ))}

                        <Fragment key={"assessments-menu-items"}>
                            <MenuItem
                                label={i18n.t("Assessments")}
                                href={`#/assessments`}
                                active={
                                    pathname === "/assessments" ||
                                    pathname.startsWith("/assessments")
                                }
                            />
                            {pathname.startsWith("/assessments") && (
                                <>
                                    {assessmentsList.map(({ path, name }) => (
                                        <>
                                            <MenuItem
                                                key={path}
                                                label={name}
                                                href={`#${path}`}
                                                active={pathname === path}
                                                className={styles.customSubMenuItem}
                                            />
                                            {pathname.startsWith(path) && (
                                                <OrgUnitTree pathPrefix={path} />
                                            )}
                                        </>
                                    ))}
                                </>
                            )}
                        </Fragment>
                        <Fragment key={'settings-route'}>
                            <MenuItem
                                label={'Settings'}
                                href={`#/settings`}
                                active={
                                    pathname === '/settings' ||
                                    ('/settings' !== "/" && pathname.startsWith('/settings'))
                                }
                            />
                        </Fragment>

                    </Menu>
                </div>
                <div
                    className={styles.resizer}
                    onMouseDown={() => (isResizing.current = true)}
                />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </>
    );
};

export default Root;
