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

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function Register() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    const field = (key: keyof RegisterForm, label: string, type: string, autoComplete: string) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>{label}</Label>
            <Input
                id={key}
                type={type}
                required
                autoComplete={autoComplete}
                value={data[key]}
                onChange={(e) => setData(key, e.target.value)}
                disabled={processing}
                className="min-h-11"
            />
            <InputError message={errors[key]} />
        </div>
    );

    return (
        <AuthLayout title={t('auth.register_title')} description={t('auth.register_subtitle')}>
            <Head title={t('auth.submit_register')} />
            <form className="flex flex-col gap-6" onSubmit={submit}>
                {field('name', t('auth.name'), 'text', 'name')}
                {field('email', t('auth.email'), 'email', 'email')}
                {field('password', t('auth.password'), 'password', 'new-password')}
                {field('password_confirmation', t('auth.password_confirm'), 'password', 'new-password')}
                <Button type="submit" className="min-h-11 w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('auth.submit_register')}
                </Button>
                <p className="text-muted-foreground text-center text-sm">
                    {t('auth.have_account')} <TextLink href={route('login')}>{t('auth.submit_login')}</TextLink>
                </p>
            </form>
        </AuthLayout>
    );
}
