import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Nova password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-brand-navy px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <BrandLogo size={96} priority className="rounded-2xl" />
          </div>
          <CardTitle className="text-xl">Redefinir password</CardTitle>
          <CardDescription>
            Escolhe uma nova password para aceder à JDPINTO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
