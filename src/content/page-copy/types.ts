export type PageCopyAction = {
  label: string;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
};

export type PageCopyEntry = {
  route: string;
  title: string;
  description: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  primaryAction: PageCopyAction;
  secondaryAction?: PageCopyAction;
};
