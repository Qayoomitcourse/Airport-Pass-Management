import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Suspense fallback={<div className="text-gray-700 text-center">Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
