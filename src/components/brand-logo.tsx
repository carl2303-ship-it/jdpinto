import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Logo JDPINTO (o ficheiro enviado pelo utilizador). */
export function BrandLogo({ size = 48, className, priority }: Props) {
  return (
    <Image
      src="/icon-192.png"
      alt="JDPINTO"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-xl object-contain bg-white shadow-sm", className)}
    />
  );
}
