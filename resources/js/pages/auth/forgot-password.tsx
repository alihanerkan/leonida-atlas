import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<{ email: string }>({ email: '' });
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };
    return (
        <AuthLayout title={t('auth.forgot_title')} description={t('auth.forgot_subtitle')}>
            <Head title={t('auth.forgot_title')} />
            {status && <div className="text-mint mb-4 text-center text-sm font-medium">{status}</div>}
            <form onSubmit={submit} className="space-y-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        className="min-h-11"
                    />
                    <InputError message={errors.email} />
                </div>
                <Button className="min-h-11 w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('auth.send_link')}
                </Button>
            </form>
            <p className="text-muted-foreground mt-6 text-center text-sm">
                <TextLink href={route('login')}>{t('auth.back_to_login')}</TextLink>
            </p>
        </AuthLayout>
    );
}
