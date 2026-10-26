"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Notice } from "@/components/ui";
import { NETWORK_IDS, NETWORKS } from "@/lib/networks";
import { submitReport, type ReportState } from "./actions";

const OPTIONS = [
  ["phishing", "Фишинг или дрейнер", "поддельный сайт, кошелёк опустел после подписи"],
  ["scam", "Обман или схема", "не вернули деньги, «гарантированный доход», пирамида"],
  ["exploit", "Взлом или кража", "адрес получил украденные средства"],
  ["mixer", "Отмывание через миксер", ""],
  ["sanctioned", "Связан с санкционным лицом", ""],
  ["other", "Другое", ""],
  ["false_positive", "Это ошибка", "адрес помечен как рискованный, но это не так"],
] as const;

export function ReportForm({ address, network }: { address: string; network: string }) {
  const [state, action, pending] = useActionState<ReportState | null, FormData>(submitReport, null);

  if (state?.ok)
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <CheckCircle2 className="size-8 text-ok" />
        <h2 className="text-lg font-semibold">Спасибо, сообщение получено</h2>
        <p className="text-sm text-silver-2">Мы проверим его вручную. Если риск подтвердится, адрес появится в AML-проверке, а для критичных случаев — и в реестре в блокчейне.</p>
        <a href="/report" className="btn-ghost h-9">
          Сообщить ещё об одном адресе
        </a>
      </div>
    );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="label">Адрес</span>
          <input name="address" defaultValue={address} required maxLength={100} spellCheck={false} autoComplete="off" placeholder="0x… или T…" className="input mt-1 font-mono" />
        </label>
        <label className="block">
          <span className="label">Сеть</span>
          <select name="network" defaultValue={network} className="input mt-1">
            {NETWORK_IDS.map((id) => (
              <option key={id} value={id}>
                {NETWORKS[id].label}
              </option>
            ))}
            <option value="tron">Tron</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="label mb-2">Что случилось</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {OPTIONS.map(([value, title, hint]) => (
            <label key={value} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3 text-sm has-[:checked]:border-accent/70 has-[:checked]:bg-accent/5">
              <input type="radio" name="category" value={value} required className="mt-0.5 accent-[#4FB3FF]" />
              <span>
                <span className="text-silver-1">{title}</span>
                {hint && <span className="block text-xs text-silver-3">{hint}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">Описание</span>
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Что произошло, когда, сколько потеряли, хеш транзакции, если есть."
          className="input mt-1 h-auto py-2"
        />
      </label>

      <label className="block">
        <span className="label">Ссылка на доказательства (необязательно)</span>
        <input name="link" type="url" maxLength={500} placeholder="https://…" className="input mt-1" />
      </label>

      {/* honeypot for bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {state?.error && <Notice tone="warn">{state.error}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Loader2 className="size-4 animate-spin" />} Отправить сообщение
        </button>
        <span className="text-sm text-silver-3">Бесплатно · без регистрации · без кошелька</span>
      </div>
    </form>
  );
}
