import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

export default function Login({
    status,
    canResetPassword,
    prefill,
}: {
    status?: string;
    canResetPassword: boolean;
    prefill?: { email: string; password: string } | null;
}) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: prefill?.email ?? '',
        password: prefill?.password ?? '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <AuthLayout title={t('auth.login_title')} description={t('auth.login_subtitle')}>
            <Head title={t('auth.submit_login')} />
            {status && <div className="text-mint mb-4 text-center text-sm font-medium">{status}</div>}
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        autoFocus
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="min-h-11"
                    />
                    <InputError message={errors.email} />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">{t('auth.password')}</Label>
                        {canResetPassword && (
                            <TextLink href={route('password.request')} className="ml-auto text-sm">
                                {t('auth.forgot')}
                            </TextLink>
                        )}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="min-h-11"
                    />
                    <InputError message={errors.password} />
                </div>
                <div className="flex items-center space-x-3">
                    <Checkbox id="remember" name="remember" checked={data.remember} onCheckedChange={(v) => setData('remember', v === true)} />
                    <Label htmlFor="remember">{t('auth.remember')}</Label>
                </div>
                <Button type="submit" className="min-h-11 w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('auth.submit_login')}
                </Button>
                <p className="text-muted-foreground text-center text-sm">
                    {t('auth.no_account')} <TextLink href={route('register')}>{t('auth.submit_register')}</TextLink>
                </p>
            </form>
        </AuthLayout>
    );
}
