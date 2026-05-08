import { ExternalLink, KeyRound, ShieldAlert } from "lucide-react";

type AccessFixLinksProps = {
  activationUrl?: string;
  projectId?: string;
};

function projectLinks(projectId: string, activationUrl?: string) {
  return [
    {
      href:
        activationUrl ||
        `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projectId}`,
      label: "Enable Firestore API",
    },
    {
      href: `https://console.cloud.google.com/iam-admin/iam?project=${projectId}`,
      label: "Open IAM access",
    },
    {
      href: `https://console.firebase.google.com/project/${projectId}/firestore`,
      label: "Open Firebase Firestore",
    },
    {
      href: `https://console.cloud.google.com/apis/library?project=${projectId}`,
      label: "API library",
    },
  ];
}

export function AccessFixLinks({ activationUrl, projectId }: AccessFixLinksProps) {
  if (!projectId && !activationUrl) {
    return null;
  }

  const links = projectId
    ? projectLinks(projectId, activationUrl)
    : [{ href: activationUrl as string, label: "Enable required API" }];

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
      <div className="mb-3 flex items-center gap-2 font-semibold text-black">
        <ShieldAlert className="size-4" />
        Fix access
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <a
            className="inline-flex h-10 items-center justify-between gap-2 rounded-full border border-amber-200 bg-white px-4 font-medium text-black transition hover:border-black"
            href={link.href}
            key={link.label}
            rel="noreferrer"
            target="_blank"
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound className="size-3.5" />
              {link.label}
            </span>
            <ExternalLink className="size-3.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
