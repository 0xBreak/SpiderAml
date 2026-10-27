"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { defineStepper } from "@stepperize/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Notice } from "@/components/ui";
import { Steps } from "@/components/ui/stepper";
import { NETWORK_IDS, NETWORKS } from "@/lib/networks";
import { isAnyAddress, isHttpsUrl } from "@/lib/action";
import { submitReport, type ReportState } from "./actions";

const CATEGORIES = ["phishing", "scam", "exploit", "mixer", "sanctioned", "other", "false_positive"] as const;

const reportSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Вставьте адрес.")
    .refine(isAnyAddress, "Это не похоже на адрес. Нужен 0x… или T…"),
  network: z.string().min(1),
  category: z.enum(CATEGORIES, "Выберите, что случилось."),
  description: z
    .string()
    .trim()
    .min(10, "Опишите ситуацию хотя бы парой предложений.")
    .max(2000, "Описание слишком длинное (до 2000 символов)."),
  link: z
    .string()
    .trim()
    .refine((v) => v === "" || isHttpsUrl(v), "Ссылка должна начинаться с https://"),
  website: z.string().optional(),
});

type ReportValues = z.infer<typeof reportSchema>;

const OPTIONS: [ReportValues["category"], string][] = [
  ["phishing", "Фишинг или дрейнер"],
  ["scam", "Обман или схема"],
  ["exploit", "Взлом или кража"],
  ["mixer", "Миксер"],
  ["sanctioned", "Санкции"],
  ["other", "Другое"],
  ["false_positive", "Это ошибка"],
];

const reportStepper = defineStepper(
  [
    { id: "address", title: "Адрес" },
    { id: "category", title: "Что случилось" },
    { id: "details", title: "Подробности" },
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
  const [state, setState] = useState<ReportState | null>(null);
  const [pending, startTransition] = useTransition();
  const stepper = reportStepper.useStepper();
  const {
    register,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportValues>({
    resolver: standardSchemaResolver(reportSchema),
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
          <h2 className="text-2xl font-semibold">Заявка №{state.id} принята</h2>
          <p className="text-base text-silver-2">Сохраните ссылку на статус — другой не будет.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <a href={statusUrl} className="btn-primary h-12 w-full text-base sm:w-auto">
            Открыть статус заявки
          </a>
          <a href="/report" className="btn-ghost h-12 w-full text-base sm:w-auto">
            Сообщить ещё об одном адресе
          </a>
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
      <Steps steps={reportStepper.steps.map((s) => ({ ...s, status: statusOf(s.id) }))} className="mb-8" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <fieldset hidden={stepper.current.id !== "address"} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
            <label className="block">
              <span className={LABEL}>Адрес</span>
              <input {...register("address")} maxLength={100} spellCheck={false} autoComplete="off" placeholder="0x… или T…" className={`${INPUT} font-mono`} aria-invalid={!!errors.address} />
              {fieldError("address")}
            </label>
            <label className="block">
              <span className={LABEL}>Сеть</span>
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
          <legend className="sr-only">Что случилось</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {OPTIONS.map(([value, title]) => (
              <label
                key={value}
                className="flex min-h-12 cursor-pointer items-center gap-3 border border-line p-4 text-silver-1 transition hover:border-silver-3 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
              >
                <input type="radio" {...register("category")} value={value} className="size-4 shrink-0 accent-(--color-accent)" />
                <span>{title}</span>
              </label>
            ))}
          </div>
          {fieldError("category")}
        </fieldset>

        <fieldset hidden={stepper.current.id !== "details"} className="space-y-5">
          <label className="block">
            <span className={LABEL}>Что произошло</span>
            <textarea
              {...register("description")}
              maxLength={2000}
              rows={6}
              placeholder="Когда, сколько, номер транзакции."
              className="input h-auto min-h-36 py-3 text-base"
              aria-invalid={!!errors.description}
            />
            {fieldError("description")}
          </label>

          <label className="block">
            <span className={LABEL}>Доказательства</span>
            <input {...register("link")} maxLength={500} placeholder="https://…" className={INPUT} aria-invalid={!!errors.link} />
            {fieldError("link")}
          </label>

          {/* honeypot for bots */}
          <input {...register("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </fieldset>

        {state && !state.ok && <Notice tone="warn">{state.error}</Notice>}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          {activeIndex > 0 && (
            <button type="button" onClick={() => void stepper.prev()} className="btn-ghost h-12 w-full text-base sm:w-auto">
              <ArrowLeft data-icon="inline-start" /> Назад
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
              Далее <ArrowRight data-icon="inline-end" />
            </button>
          ) : (
            <button type="submit" disabled={pending} className="btn-primary h-12 w-full text-base sm:ml-auto sm:w-auto sm:min-w-56">
              {pending && <Loader2 className="size-5 animate-spin" />} Отправить сообщение
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
