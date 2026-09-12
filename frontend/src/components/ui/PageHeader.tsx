import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Heading from "./Heading";
import Subheading from "./Subheading";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export default function PageHeader({ title, subtitle, backHref, backLabel = "Back", className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex w-max items-center gap-1.5 text-sm font-medium text-grey-700 transition-colors hover:text-neutral-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <Heading size="lg">{title}</Heading>
      {subtitle && <Subheading className="mt-1">{subtitle}</Subheading>}
    </div>
  );
}