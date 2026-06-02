"use client";

import * as React from "react";
import {
  BellRing,
  BookOpen,
  Clock3,
  ExternalLink,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageSquare,
  PhoneCall,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AppPageIntro } from "@/components/composite/app-page-intro";
import { MobileProfileLogoutSection } from "@/components/composite/mobile-profile-logout-section";
import { AppAccordion } from "@/components/ui/app-accordion";
import { AppButton } from "@/components/ui/app-button";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/ui/app-card";
import { AppCheckbox } from "@/components/ui/app-checkbox";
import { AppDialog } from "@/components/ui/app-dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { AppInput } from "@/components/ui/app-input";
import { AppNotice } from "@/components/ui/app-notice";
import { AppTextarea } from "@/components/ui/app-textarea";
import { AppTurnstile } from "@/components/ui/app-turnstile";
import { getPageCopyByRoute } from "@/content/page-copy";
import {
  userFeaturePageMeta,
  userHelpFaqItems,
  userHelpQuickTopics,
  userGuideFaqs,
  userGuideSteps,
} from "@/content/user-content";
import { useMockUserProfile } from "@/hooks/use-mock-user-profile";
import { UserProfileEditor } from "@/features/user/components/user-profile-editor";
import { UserAppointmentsPage } from "@/features/user/components/user-appointments-page";
import { getPublicBackendConfig } from "@/lib/api/backend-config";
import { getPublicHelpFaqs } from "@/lib/api/help-faq";
import type { MockUserProfile } from "@/lib/mock-user-profile";
import { useLocalStorage } from "@/hooks/use-local-storage";

type UserFeaturePageKey = "jadwal-saya" | "panduan" | "bantuan" | "profil" | "pengaturan";

export function UserFeaturePage({ page }: { page: UserFeaturePageKey }) {
  const meta = userFeaturePageMeta[page];
  const copy = getPageCopyByRoute(meta.currentPath);
  const { profile, updateProfile, completionStatus } = useMockUserProfile(true);
  const eyebrow = copy?.heroEyebrow ?? meta.eyebrow;
  const heroTitle = copy?.heroTitle ?? meta.heroTitle;
  const heroDescription = copy?.heroDescription ?? meta.heroDescription;

  return (
    <DashboardShell
      role="user"
      currentPath={meta.currentPath}
      title={copy?.title ?? meta.title}
      subtitle={copy?.description ?? meta.subtitle}
    >
      <div className="space-y-8">
        <AppPageIntro
          eyebrow={eyebrow}
          title={heroTitle}
          description={heroDescription}
        />

        {page === "jadwal-saya" ? <UserAppointmentsPage /> : null}
        {page === "panduan" ? <UserGuidePage /> : null}
        {page === "bantuan" ? <UserHelpPage profile={profile} /> : null}
        {page === "profil" ? (
          <>
            <UserProfileEditor
              profile={profile}
              completionStatus={completionStatus}
              onSave={updateProfile}
            />
            <MobileProfileLogoutSection description="Keluar dari akun pengguna pada perangkat ini tanpa menambah tombol baru di navigasi bawah." />
          </>
        ) : null}
        {page === "pengaturan" ? <UserSettingsPage /> : null}
      </div>
    </DashboardShell>
  );
}

export function UserGuidePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {userGuideSteps.map((step, index) => (
          <AppCard key={step.title} padding="lg" className="space-y-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-role-accent-soft font-heading text-lg font-bold text-role-accent">
              {index + 1}
            </div>
            <div className="space-y-3">
              <AppCardTitle>{step.title}</AppCardTitle>
              <AppCardDescription>{step.description}</AppCardDescription>
            </div>
          </AppCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <AppCard padding="lg" className="space-y-5">
          <AppCardTitle>Tips kunjungan yang membantu</AppCardTitle>
          <div className="space-y-3">
            {[
              "Pastikan unit tujuan sudah sesuai dengan kebutuhan layanan Anda.",
              "Gunakan jadwal yang realistis agar tidak bentrok dengan agenda lain.",
              "Buka halaman bantuan jika butuh eskalasi atau perubahan jadwal.",
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-3 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-3">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-role-accent" />
                <p className="text-sm leading-6 text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard padding="lg" className="space-y-5">
          <AppCardTitle>Pertanyaan paling sering</AppCardTitle>
          <AppAccordion
            defaultValue={userGuideFaqs[0]?.question}
            items={userGuideFaqs.map((faq) => ({
              value: faq.question,
              title: faq.question,
              content: faq.answer,
            }))}
          />
        </AppCard>
      </div>
    </div>
  );
}

type HelpRequestDraft = {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
};

const HELP_REQUEST_TOPICS = [
  "Kendala akun pengguna",
  "Kendala antrian dan jadwal",
  "Perubahan data profil",
  "Koreksi layanan atau unit",
  "Keluhan layanan publik",
] as const;

const DEFAULT_SP4N_URL = "https://www.lapor.go.id/";

type HelpFaqEntry = {
  question: string;
  answer: string;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function mapPublicHelpFaqItems(rows: unknown[]) {
  return rows
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row, index) => ({
      question: String(row.question || row.title || "").trim(),
      answer: String(row.answer || row.note || row.description || "").trim(),
      sortOrder:
        typeof row.sortOrder === "number"
          ? row.sortOrder
          : typeof row.order === "number"
            ? row.order
            : index,
    }))
    .filter((row) => row.question && row.answer)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ question, answer }) => ({ question, answer }));
}

export function UserHelpPage({ profile }: { profile: MockUserProfile | null }) {
  const [faqItems, setFaqItems] = React.useState<HelpFaqEntry[]>(() =>
    userHelpFaqItems.map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
  );
  const [helpDialogOpen, setHelpDialogOpen] = React.useState(false);
  const [submittingHelpRequest, setSubmittingHelpRequest] = React.useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = React.useState(
    () => getPublicBackendConfig().turnstileSiteKey,
  );
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [turnstileResetKey, setTurnstileResetKey] = React.useState(0);
  const [helpDraft, setHelpDraft] = React.useState<HelpRequestDraft>({
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    topic: HELP_REQUEST_TOPICS[0],
    message: "",
  });

  React.useEffect(() => {
    setHelpDraft((current) => ({
      ...current,
      name: current.name || profile?.name || "",
      email: current.email || profile?.email || "",
      phone: current.phone || profile?.phone || "",
    }));
  }, [profile?.email, profile?.name, profile?.phone]);

  React.useEffect(() => {
    let cancelled = false;

    const loadFaqs = async () => {
      try {
        const response = await getPublicHelpFaqs();
        if (cancelled) {
          return;
        }

        const mappedItems = mapPublicHelpFaqItems(response.helpFaqs ?? []);
        if (mappedItems.length > 0) {
          setFaqItems(mappedItems);
        }
      } catch {
        if (!cancelled) {
          setFaqItems(
            userHelpFaqItems.map((item) => ({
              question: item.question,
              answer: item.answer,
            })),
          );
        }
      }
    };

    void loadFaqs();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (turnstileSiteKey) {
      return;
    }

    let cancelled = false;
    const loadRuntimeConfig = async () => {
      try {
        const response = await fetch("/api/runtime-config", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          turnstileSiteKey?: string;
        };

        if (!cancelled) {
          setTurnstileSiteKey(String(payload.turnstileSiteKey || "").trim());
        }
      } catch {
        if (!cancelled) {
          setTurnstileSiteKey("");
        }
      }
    };

    void loadRuntimeConfig();
    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  function resetHelpRequestState() {
    setTurnstileToken("");
    setTurnstileResetKey((current) => current + 1);
  }

  function handleOpenRating() {
    const target = process.env.NEXT_PUBLIC_STAFF_RATING_URL?.trim();
    if (!target) {
      toast.info("Tautan survei kepuasan akan disambungkan saat integrasi live aktif.");
      return;
    }

    const normalized = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  }

  async function handleSubmitHelpRequest() {
    if (!helpDraft.name.trim() || !helpDraft.email.trim() || !helpDraft.phone.trim()) {
      toast.error("Nama, email, dan WhatsApp wajib diisi.");
      return;
    }

    if (!helpDraft.message.trim() || helpDraft.message.trim().length < 20) {
      toast.error("Jelaskan kendala minimal 20 karakter.");
      return;
    }

    if (!turnstileToken.trim()) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setSubmittingHelpRequest(true);
    try {
      const response = await fetch("/api/public/help-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...helpDraft,
          turnstileToken,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mailtoUrl?: string;
        message?: string;
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Form bantuan belum dapat diproses.");
      }

      toast.success(payload.message || "Form bantuan siap dikirim.");
      setHelpDialogOpen(false);
      setHelpDraft((current) => ({
        ...current,
        message: "",
      }));
      resetHelpRequestState();

      if (payload.mailtoUrl) {
        window.location.href = payload.mailtoUrl;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Form bantuan belum dapat diproses.";
      toast.error(message);
      resetHelpRequestState();
    } finally {
      setSubmittingHelpRequest(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AppCard padding="lg" className="space-y-5">
            <AppCardTitle>Bantuan yang paling sering dibutuhkan</AppCardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              {userHelpQuickTopics.map((item) => (
                <HelpChannelCard
                  key={item.title}
                  icon={LifeBuoy}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </AppCard>

          <AppCard padding="lg" className="space-y-5">
            <div className="space-y-1">
              <AppCardTitle>FAQ layanan publik</AppCardTitle>
              <AppCardDescription>
                Pertanyaan berikut dibaca dari daftar bantuan publik dan dipakai sebagai acuan cepat sebelum Anda menghubungi petugas.
              </AppCardDescription>
            </div>
            <AppAccordion
              defaultValue={faqItems[0]?.question}
              items={faqItems.map((faq) => ({
                value: faq.question,
                title: faq.question,
                content: faq.answer,
              }))}
            />
          </AppCard>
        </div>

        <div className="space-y-6">
          <AppCard padding="lg" className="space-y-5">
            <AppCardTitle>Kanal bantuan dan pengaduan</AppCardTitle>
            <div className="grid gap-4">
              <HelpChannelCard
                icon={PhoneCall}
                title="Call center"
                description="Gunakan untuk antrian aktif, perubahan jadwal, atau arahan cepat sebelum datang."
                value="(021) 2993 5500"
              />
              <HelpChannelCard
                icon={Mail}
                title="Form bantuan"
                description="Pertanyaan tertulis diajukan melalui formulir dan verifikasi keamanan sebelum email dibuka."
                action={
                  <AppButton variant="outline" onClick={() => setHelpDialogOpen(true)}>
                    <MessageSquare className="size-4" />
                    Kirim pertanyaan
                  </AppButton>
                }
              />
              <HelpChannelCard
                icon={ShieldCheck}
                title="Survei kepuasan layanan"
                description="Isi survei setelah layanan selesai agar evaluasi pengalaman layanan tercatat dengan baik."
                action={
                  <AppButton variant="outline" onClick={handleOpenRating}>
                    <ExternalLink className="size-4" />
                    Buka survei
                  </AppButton>
                }
              />
              <HelpChannelCard
                icon={LifeBuoy}
                title="SP4N Lapor"
                description="Gunakan kanal pengaduan nasional bila Anda perlu menyampaikan pengaduan layanan publik."
                action={
                  <AppButton
                    variant="outline"
                    onClick={() =>
                      window.open(
                        process.env.NEXT_PUBLIC_SP4N_LAPOR_URL?.trim() || DEFAULT_SP4N_URL,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    Buka SP4N Lapor
                  </AppButton>
                }
              />
            </div>
          </AppCard>
          <AppNotice
            icon={LifeBuoy}
            title="Perlu bantuan segera?"
            description="Jika antrian aktif Anda sudah mendekati waktu layanan, utamakan call center atau resepsionis. Gunakan SP4N untuk pengaduan layanan publik dan survei kepuasan setelah layanan selesai."
          />
        </div>
      </div>

      <AppDialog
        open={helpDialogOpen}
        onOpenChange={(open) => {
          setHelpDialogOpen(open);
          if (!open) {
            resetHelpRequestState();
          }
        }}
        title="Kirim pertanyaan bantuan"
        description="Isi formulir singkat berikut. Setelah verifikasi keamanan, aplikasi akan menyiapkan email bantuan dengan format pesan yang sudah rapi."
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <AppFormField label="Nama lengkap">
              <AppInput
                value={helpDraft.name}
                onChange={(event) =>
                  setHelpDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nama lengkap"
              />
            </AppFormField>
            <AppFormField label="Email">
              <AppInput
                type="email"
                value={helpDraft.email}
                onChange={(event) =>
                  setHelpDraft((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="nama@email.com"
              />
            </AppFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AppFormField label="Nomor WhatsApp">
              <AppInput
                value={helpDraft.phone}
                onChange={(event) =>
                  setHelpDraft((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="08xxxxxxxxxx"
              />
            </AppFormField>
            <AppFormField label="Topik bantuan">
              <AppInput
                list="user-help-topics"
                value={helpDraft.topic}
                onChange={(event) =>
                  setHelpDraft((current) => ({ ...current, topic: event.target.value }))
                }
                placeholder="Pilih atau tulis topik bantuan"
              />
              <datalist id="user-help-topics">
                {HELP_REQUEST_TOPICS.map((topic) => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            </AppFormField>
          </div>

          <AppFormField label="Pesan">
            <AppTextarea
              value={helpDraft.message}
              onChange={(event) =>
                setHelpDraft((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="Jelaskan kendala atau kebutuhan Anda secara singkat dan jelas."
            />
          </AppFormField>

          {turnstileSiteKey ? (
            <AppTurnstile
              siteKey={turnstileSiteKey}
              action="help_request"
              resetKey={turnstileResetKey}
              onTokenChange={setTurnstileToken}
            />
          ) : (
            <AppNotice
              icon={ShieldCheck}
              tone="warning"
              title="Verifikasi keamanan belum tersedia"
              description="Konfigurasi captcha belum terbaca. Form bantuan belum bisa dikirim sampai verifikasi keamanan aktif."
            />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <AppButton variant="outline" onClick={() => setHelpDialogOpen(false)}>
              Tutup
            </AppButton>
            <AppButton
              loading={submittingHelpRequest}
              loadingLabel="Menyiapkan email..."
              disabled={!turnstileSiteKey}
              onClick={() => void handleSubmitHelpRequest()}
            >
              Kirim pertanyaan
            </AppButton>
          </div>
        </div>
      </AppDialog>
    </>
  );
}

function HelpChannelCard({
  icon: Icon,
  title,
  description,
  value,
  action,
}: {
  icon: typeof PhoneCall;
  title: string;
  description: string;
  value?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-2xl)] bg-surface-container-low p-5">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-surface-container-lowest text-role-accent">
        <Icon className="size-4" />
      </div>
      <div className="mt-4 space-y-2">
        <p className="font-semibold">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {value ? <p className="font-medium text-role-accent">{value}</p> : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

function UserSettingsPage() {
  const [preferences, setPreferences] = useLocalStorage("lkpp-user-preferences", {
    emailNotifications: true,
    whatsappReminders: true,
    dayBeforeReminder: false,
  });

  function updatePreference(key: keyof typeof preferences, checked: boolean) {
    setPreferences((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <AppCard padding="lg" className="space-y-6">
        <AppCardTitle>Preferensi notifikasi</AppCardTitle>
        <div className="space-y-4">
          <SettingToggleRow
            icon={BellRing}
            title="Notifikasi email"
            description="Jika aktif, pembaruan status antrian dan perubahan jadwal dikirim ke email."
            checked={preferences.emailNotifications}
            onCheckedChange={(checked) => updatePreference("emailNotifications", checked)}
          />
          <SettingToggleRow
            icon={PhoneCall}
            title="Pengingat WhatsApp"
            description="Jika aktif, pengingat jadwal dikirim sebelum layanan dimulai."
            checked={preferences.whatsappReminders}
            onCheckedChange={(checked) => updatePreference("whatsappReminders", checked)}
          />
          <SettingToggleRow
            icon={Clock3}
            title="Pengingat H-1"
            description="Jika aktif, ringkasan kunjungan dikirim satu hari sebelumnya."
            checked={preferences.dayBeforeReminder}
            onCheckedChange={(checked) => updatePreference("dayBeforeReminder", checked)}
          />
        </div>
      </AppCard>

      <div className="space-y-6">
        <AppNotice
          icon={Settings2}
          title="Pengaturan akun dan notifikasi"
          description="Pengaturan bahasa dan tampilan akun akan kami lengkapi bertahap."
        />
        <AppCard padding="lg" className="space-y-4">
          <AppCardTitle>Keamanan</AppCardTitle>
          <SettingActionRow
            icon={LockKeyhole}
            title="Ubah kata sandi"
            description="Gunakan opsi ini untuk mengganti kata sandi akun."
            actionLabel="Buka reset password"
            onAction={() => window.location.assign("/reset")}
          />
        </AppCard>
      </div>
    </div>
  );
}

function SettingToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof BellRing;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-surface-container-lowest text-role-accent">
          <Icon className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <AppCheckbox
        aria-label={title}
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
    </div>
  );
}

function SettingActionRow({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof BellRing;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-surface-container-lowest text-role-accent">
          <Icon className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <AppButton variant="outline" size="sm" onClick={onAction}>
        {actionLabel}
      </AppButton>
    </div>
  );
}
