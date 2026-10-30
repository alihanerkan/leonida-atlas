import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import type { AtlasShared } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, FileJson, Globe, Image, Inbox, Languages, LayoutGrid, Map, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLogo from './app-logo';

type Item = NavItem & { permission: string };

export function AppSidebar() {
    const { t } = useTranslation('admin');
    const { auth, locale } = usePage<AtlasShared>().props;
    const perms = new Set(auth.user?.permissions ?? []);
    const allow = (items: Item[]) => items.filter((i) => perms.has(i.permission));

    const content = allow([
        { title: t('nav.dashboard'), url: '/admin', icon: LayoutGrid, permission: 'admin.access' },
        { title: t('nav.entries'), url: '/admin/entries', icon: BookOpen, permission: 'content.view' },
        { title: t('nav.translations'), url: '/admin/translations', icon: Languages, permission: 'translations.edit' },
        { title: t('nav.media'), url: '/admin/media', icon: Image, permission: 'media.upload' },
        { title: t('nav.map'), url: '/admin/map', icon: Map, permission: 'map.edit' },
        { title: t('nav.submissions'), url: '/admin/submissions', icon: Inbox, permission: 'submissions.review' },
        { title: t('nav.import'), url: '/admin/import', icon: FileJson, permission: 'content.create' },
    ]);
    const system = allow([
        { title: t('nav.users'), url: '/admin/users', icon: Users, permission: 'users.manage' },
        { title: t('nav.settings'), url: '/admin/settings', icon: Settings, permission: 'settings.manage' },
        { title: t('nav.audit'), url: '/admin/audit', icon: ClipboardList, permission: 'audit.view' },
    ]);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={perms.has('admin.access') ? '/admin' : `/${locale}`} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {content.length > 0 && <NavMain items={content} label={t('nav.group_content')} />}
                {system.length > 0 && <NavMain items={system} label={t('nav.group_system')} />}
            </SidebarContent>
            <SidebarFooter>
                <NavFooter items={[{ title: t('nav.view_site'), url: `/${locale}`, icon: Globe }]} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
