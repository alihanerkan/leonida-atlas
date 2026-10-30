import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useTranslation();
    const { post, processing } = useForm({});
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };
    return (
        <AuthLayout title={t('auth.verify_title')} description={t('auth.verify_body')}>
            <Head title={t('auth.verify_title')} />
            {status === 'verification-link-sent' && <div className="text-mint mb-4 text-center text-sm font-medium">✓</div>}
            <form onSubmit={submit} className="space-y-6 text-center">
                <Button disabled={processing} variant="secondary" className="min-h-11">
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('auth.resend')}
                </Button>
                <TextLink href={route('logout')} method="post" className="mx-auto block text-sm">
                    {t('nav.logout')}
                </TextLink>
            </form>
        </AuthLayout>
    );
}
