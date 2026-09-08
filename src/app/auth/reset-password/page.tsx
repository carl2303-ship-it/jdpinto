import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Nova password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-brand-navy px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sky text-lg font-bold text-white">
            JD
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
