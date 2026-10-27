"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { defineStepper } from "@stepperize/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { Notice } from "@/components/ui";
import { Steps } from "@/components/ui/stepper";
import { NETWORK_IDS, NETWORKS } from "@/lib/networks";
import { isAnyAddress, isHttpsUrl } from "@/lib/action";
import { submitReport, type ReportState } from "./actions";

const CATEGORIES = ["phishing", "scam", "exploit", "mixer", "sanctioned", "other", "false_positive"] as const;

type T = ReturnType<typeof useTranslations<"Report">>;

const buildSchema = (t: T) =>
  z.object({
    address: z.string().trim().min(1, t("vAddressRequired")).refine(isAnyAddress, t("vAddressBad")),
    network: z.string().min(1),
    category: z.enum(CATEGORIES, t("vCategory")),
    description: z.string().trim().min(10, t("vDescShort")).max(2000, t("vDescLong")),
    link: z.string().trim().refine((v) => v === "" || isHttpsUrl(v), t("vLink")),
    website: z.string().optional(),
  });

type ReportValues = z.infer<ReturnType<typeof buildSchema>>;

const OPTION_KEYS = {
  phishing: "optPhishing",
  scam: "optScam",
  exploit: "optExploit",
  mixer: "optMixer",
  sanctioned: "optSanctioned",
  other: "optOther",
  false_positive: "optFalsePositive",
} as const;

const reportStepper = defineStepper(
  [
    { id: "address", title: "address" },
    { id: "category", title: "category" },
    { id: "details", title: "details" },
  ] as const,
);

const STEP_FIELDS = {
  address: ["address", "network"],
  category: ["category"],
  details: ["description", "link"],
} as const;

const LABEL = "mb-2 block text-sm font-medium text-silver-2";
const INPUT = "input h-12 text-base";

export function ReportForm({ address, network, category }: { address: string; network: string; category: string }) {
  const t = useTranslations("Report");
  const tErr = useTranslations("Errors");
  const schema = useMemo(() => buildSchema(t), [t]);
  const [state, setState] = useState<ReportState | null>(null);
  const [pending, startTransition] = useTransition();
  const stepper = reportStepper.useStepper();
  const {
    register,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportValues>({
    resolver: standardSchemaResolver(schema),
    mode: "onTouched",
    defaultValues: {
      address,
      network: network || "ethereum",
      category: (CATEGORIES as readonly string[]).includes(category) ? (category as ReportValues["category"]) : "other",
      description: "",
      link: "",
      website: "",
    },
  });

  if (state?.ok && state.id) {
    const statusUrl = `/report/status?id=${state.id}&t=${state.token}`;
    return (
      <div className="flex flex-col items-start gap-5 py-4">
        <CheckCircle2 className="size-10 text-ok" />
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{t("accepted", { id: state.id })}</h2>
          <p className="text-base text-silver-2">{t("saveLink")}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <a href={statusUrl} className="btn-primary h-12 w-full text-base sm:w-auto">
            {t("openStatus")}
          </a>
          <Link href="/report" className="btn-ghost h-12 w-full text-base sm:w-auto">
            {t("another")}
          </Link>
        </div>
      </div>
    );
  }

  const order = reportStepper.steps.map((s) => s.id);
  const activeIndex = order.indexOf(stepper.current.id);
  const statusOf = (id: (typeof order)[number]) => {
    const i = order.indexOf(id);
    return i < activeIndex ? ("done" as const) : i === activeIndex ? ("active" as const) : ("todo" as const);
  };

  const goNext = async () => {
    const fields = STEP_FIELDS[stepper.current.id as keyof typeof STEP_FIELDS] ?? [];
    if (await trigger(fields)) void stepper.next();
  };

  const onSubmit = (values: ReportValues) => {
    const form = new FormData();
    form.set("address", values.address);
    form.set("network", values.network);
    form.set("category", values.category);
    form.set("description", values.description);
    form.set("link", values.link);
    if (values.website) form.set("website", values.website);
    startTransition(async () => setState(await submitReport(null, form)));
  };

  const fieldError = (name: keyof ReportValues) =>
    errors[name]?.message ? <p className="mt-2 text-sm text-warn">{errors[name]?.message}</p> : null;

  return (
    <div className="text-base">
      <Steps steps={reportStepper.steps.map((s) => ({ ...s, title: t(s.id === "address" ? "stepAddress" : s.id === "category" ? "stepCategory" : "stepDetails"), status: statusOf(s.id) }))} className="mb-8" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <fieldset hidden={stepper.current.id !== "address"} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
            <label className="block">
              <span className={LABEL}>{t("addressLabel")}</span>
              <input {...register("address")} maxLength={100} spellCheck={false} autoComplete="off" placeholder={t("addressPh")} className={`${INPUT} font-mono`} aria-invalid={!!errors.address} />
              {fieldError("address")}
            </label>
            <label className="block">
              <span className={LABEL}>{t("networkLabel")}</span>
              <select {...register("network")} className={INPUT}>
                {NETWORK_IDS.map((id) => (
                  <option key={id} value={id}>
                    {NETWORKS[id].label}
                  </option>
                ))}
                <option value="tron">Tron</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset hidden={stepper.current.id !== "category"}>
          <legend className="sr-only">{t("stepCategory")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((value) => (
              <label
                key={value}
                className="flex min-h-12 cursor-pointer items-center gap-3 border border-line p-4 text-silver-1 transition hover:border-silver-3 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
              >
                <input type="radio" {...register("category")} value={value} className="size-4 shrink-0 accent-(--color-accent)" />
                <span>{t(OPTION_KEYS[value])}</span>
              </label>
            ))}
          </div>
          {fieldError("category")}
        </fieldset>

        <fieldset hidden={stepper.current.id !== "details"} className="space-y-5">
          <label className="block">
            <span className={LABEL}>{t("whatHappened")}</span>
            <textarea
              {...register("description")}
              maxLength={2000}
              rows={6}
              placeholder={t("whatPh")}
              className="input h-auto min-h-36 py-3 text-base"
              aria-invalid={!!errors.description}
            />
            {fieldError("description")}
          </label>

          <label className="block">
            <span className={LABEL}>{t("evidence")}</span>
            <input {...register("link")} maxLength={500} placeholder="https://…" className={INPUT} aria-invalid={!!errors.link} />
            {fieldError("link")}
          </label>

          {/* honeypot for bots */}
          <input {...register("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </fieldset>

        {state && !state.ok && <Notice tone="warn">{state.code && tErr.has(state.code) ? tErr(state.code) : state.error}</Notice>}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          {activeIndex > 0 && (
            <button type="button" onClick={() => void stepper.prev()} className="btn-ghost h-12 w-full text-base sm:w-auto">
              <ArrowLeft data-icon="inline-start" /> {t("back")}
            </button>
          )}
          {activeIndex < order.length - 1 ? (
            <button
              type="button"
              onClick={(event) => {
                // the same DOM node becomes the submit button on the next step,
                // so cancel the click default before React swaps its type
                event.preventDefault();
                void goNext();
              }}
              className="btn-primary h-12 w-full text-base sm:ml-auto sm:w-auto sm:min-w-40"
            >
              {t("nextStep")} <ArrowRight data-icon="inline-end" />
            </button>
          ) : (
            <button type="submit" disabled={pending} className="btn-primary h-12 w-full text-base sm:ml-auto sm:w-auto sm:min-w-56">
              {pending && <Loader2 className="size-5 animate-spin" />} {t("submit")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
