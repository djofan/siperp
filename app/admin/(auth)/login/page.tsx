import { Suspense } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoginForm } from "@/components/admin-shell/LoginForm";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Masuk ke Admin SIP</CardTitle>
        <CardDescription>
          Gunakan akun yang sudah didaftarkan oleh superadmin.
        </CardDescription>
      </CardHeader>
      <Suspense>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
