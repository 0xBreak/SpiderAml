"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseUnits,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import { ExternalLink, Loader2, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Badge, Card, Notice } from "@/components/ui";
import { REGISTRY, SEND_CHAIN, SEND_RPC, SPIDER_SEND, TOKEN, erc20Abi, registryAbi, sendAbi } from "@/lib/contracts";
import { ERROR_TEXT } from "@/lib/texts";
import { screenRecipient, type Screening } from "./actions";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const pub = createPublicClient({ chain: SEND_CHAIN, transport: http(SEND_RPC) });
const ONCHAIN_CATEGORY = ["—", "Санкционный список", "Взлом или кража", "Фишинг", "Подозрительная активность", "Миксер", "Другое"];
const txUrl = (h: Hash) => `${SEND_CHAIN.blockExplorers.default.url}/tx/${h}`;

type OnChain = { allowed: boolean; worst: Address; category: number; level: number };
type Step = "idle" | "approving" | "sending" | "done";

function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName === "Blocked") {
      const [, category] = revert.data.args as [Address, number, number];
      return `Контракт заблокировал перевод: адрес в реестре как «${ONCHAIN_CATEGORY[category] ?? "риск"}».`;
    }
    if (/user rejected|denied/i.test(e.message)) return "Вы отменили операцию в кошельке.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Неизвестная ошибка";
}

export function SendForm({ initialTo }: { initialTo: string }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [screen, setScreen] = useState<Screening | null>(null);
  const [onchain, setOnchain] = useState<OnChain | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmRisk, setConfirmRisk] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [hashes, setHashes] = useState<{ approve?: Hash; send?: Hash }>({});
  const [error, setError] = useState<string | null>(null);

  // null until mounted: the server cannot know whether the browser has a wallet
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  useEffect(() => setHasWallet(!!window.ethereum), []);
  const wallet = useMemo(() => (hasWallet ? createWalletClient({ chain: SEND_CHAIN, transport: custom(window.ethereum!) }) : null), [hasWallet]);

  const toValid = isAddress(to.trim(), { strict: false });
  const toAddr = toValid ? getAddress(to.trim().toLowerCase()) : null;
  let value: bigint | null = null;
  try {
    value = amount && Number(amount) > 0 ? parseUnits(amount.replace(",", "."), TOKEN.decimals) : null;
  } catch {
    value = null;
  }

  async function refresh(a: Address) {
    const [b, al] = await Promise.all([
      pub.readContract({ address: TOKEN.address, abi: erc20Abi, functionName: "balanceOf", args: [a] }),
      pub.readContract({ address: TOKEN.address, abi: erc20Abi, functionName: "allowance", args: [a, SPIDER_SEND] }),
    ]);
    setBalance(b);
    setAllowance(al);
  }

  async function connect() {
    setError(null);
    if (!wallet) return;
    try {
      const [a] = await wallet.requestAddresses();
      setAccount(a);
      const id = await wallet.getChainId();
      if (id !== SEND_CHAIN.id) {
        try {
          await wallet.switchChain({ id: SEND_CHAIN.id });
        } catch {
          await wallet.addChain({ chain: SEND_CHAIN });
        }
      }
      setChainOk(true);
      await refresh(a);
    } catch (e) {
      setError(explain(e));
    }
  }

  // Screen the recipient off-chain (our data) and on-chain (what the contract will enforce) after typing stops.
  useEffect(() => {
    setScreen(null);
    setOnchain(null);
    setConfirmRisk(false);
    if (!toAddr) return;
    const from = account ?? "0x0000000000000000000000000000000000000001";
    setChecking(true);
    const t = setTimeout(async () => {
      const [s, c] = await Promise.all([
        screenRecipient(toAddr),
        pub.readContract({ address: REGISTRY, abi: registryAbi, functionName: "checkTransfer", args: [from, toAddr] }).catch(() => null),
      ]);
      setScreen(s);
      if (c) setOnchain({ allowed: c[0], worst: c[1], category: c[2], level: c[3] });
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [toAddr, account]);

  const blocked = onchain ? !onchain.allowed : false;
  const offchainRisky = screen?.ok && (screen.level === "high" || screen.level === "critical");
  const selfSend = account && toAddr && account.toLowerCase() === toAddr.toLowerCase();
  const canSend = !!account && chainOk && !!toAddr && !!value && !blocked && !selfSend && (balance ?? 0n) >= value && (!offchainRisky || confirmRisk) && step !== "approving" && step !== "sending";

  async function send() {
    if (!wallet || !account || !toAddr || !value) return;
    setError(null);
    setHashes({});
    try {
      if (allowance < value) {
        setStep("approving");
        const approve = await wallet.writeContract({ account, address: TOKEN.address, abi: erc20Abi, functionName: "approve", args: [SPIDER_SEND, value] });
        setHashes({ approve });
        await pub.waitForTransactionReceipt({ hash: approve });
      }
      setStep("sending");
      // simulate first: a block shows up as a readable revert instead of a failed transaction
      const { request } = await pub.simulateContract({ account, address: SPIDER_SEND, abi: sendAbi, functionName: "send", args: [toAddr, value] });
      const sendHash = await wallet.writeContract(request);
      setHashes((h) => ({ ...h, send: sendHash }));
      const rc = await pub.waitForTransactionReceipt({ hash: sendHash });
      if (rc.status !== "success") throw new Error("Транзакция не прошла.");
      setStep("done");
      setAmount("");
      await refresh(account);
    } catch (e) {
      setStep("idle");
      setError(explain(e));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2" title="Перевод" hint={`Сеть: ${SEND_CHAIN.name} (тестовая). Монета: ${TOKEN.symbol}.`}>
        {hasWallet === null ? null : !hasWallet ? (
          <Notice tone="warn">Нужен браузерный кошелёк (MetaMask, Rabby и т. п.). Установите его и обновите страницу.</Notice>
        ) : !account ? (
          <button onClick={connect} className="btn-primary">
            <Wallet className="size-4" /> Подключить кошелёк
          </button>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-silver-2">
            <span>
              Кошелёк: <Addr value={account} />
            </span>
            <span>
              Баланс: <b className="text-silver-1">{balance == null ? "…" : formatUnits(balance, TOKEN.decimals)}</b> {TOKEN.symbol}
            </span>
            {balance === 0n && (
              <a href={TOKEN.faucet} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                Получить тестовые USDC <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="label">Получатель</span>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" className="input mt-1 font-mono" />
          </label>
          {to && !toValid && <p className="text-sm text-warn">{ERROR_TEXT.INVALID_ADDRESS}</p>}
          {selfSend && <p className="text-sm text-warn">Это ваш собственный адрес.</p>}

          <label className="block">
            <span className="label">Сумма, {TOKEN.symbol}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="input mt-1" />
          </label>
          {value && balance != null && balance < value && <p className="text-sm text-warn">Недостаточно {TOKEN.symbol} на балансе.</p>}

          {offchainRisky && !blocked && (
            <label className="flex items-start gap-2 text-sm text-silver-1">
              <input type="checkbox" checked={confirmRisk} onChange={(e) => setConfirmRisk(e.target.checked)} className="mt-1" />
              Я понимаю риск и всё равно хочу отправить.
            </label>
          )}

          <button onClick={send} disabled={!canSend} className="btn-primary w-full sm:w-auto">
            {(step === "approving" || step === "sending") && <Loader2 className="size-4 animate-spin" />}
            {step === "approving" ? "Разрешаем списание…" : step === "sending" ? "Отправляем…" : value && allowance < value ? "Разрешить и отправить" : "Отправить"}
          </button>
          {value && allowance < value && account && <p className="text-xs text-silver-3">Сначала кошелёк попросит разрешить контракту списать эту сумму, затем — подтвердить перевод.</p>}

          {error && <Notice tone="warn">{error}</Notice>}
          {step === "done" && hashes.send && (
            <Notice tone="ok">
              Отправлено.{" "}
              <a href={txUrl(hashes.send)} target="_blank" rel="noopener noreferrer" className="link">
                Транзакция в обозревателе
              </a>
            </Notice>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Проверка получателя">
          {!toAddr ? (
            <p className="text-sm text-silver-3">Введите адрес — проверим его до отправки.</p>
          ) : checking ? (
            <p className="flex items-center gap-2 text-sm text-silver-2">
              <Loader2 className="size-4 animate-spin" /> Проверяем…
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="label mb-1">Реестр в блокчейне</div>
                {onchain == null ? (
                  <span className="text-silver-3">Не удалось прочитать реестр.</span>
                ) : blocked ? (
                  <p className="flex items-start gap-2 text-crit">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    Перевод будет заблокирован: «{ONCHAIN_CATEGORY[onchain.category]}».
                  </p>
                ) : (
                  <p className="flex items-start gap-2 text-ok">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    Контракт пропустит перевод{onchain.level > 0 ? ` (есть отметка уровня ${onchain.level})` : ""}.
                  </p>
                )}
              </div>
              <div>
                <div className="label mb-1">Наша проверка</div>
                {!screen ? null : !screen.ok ? (
                  <span className="text-silver-3">{ERROR_TEXT[screen.error ?? ""] ?? "Проверка недоступна."}</span>
                ) : (
                  <div className="space-y-1.5">
                    <Badge tone={screen.level === "low" ? "ok" : screen.level === "medium" ? "warn" : "crit"}>
                      {screen.title} · {screen.score}/100
                    </Badge>
                    {screen.reasons && screen.reasons.length > 0 && <p className="text-silver-2">{screen.reasons.join(", ")}</p>}
                    <a href={`/check?address=${toAddr}&network=arbitrum`} className="link block">
                      Подробнее о проверке →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
        <Card title="Как это работает">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-silver-2">
            <li>Вы разрешаете контракту SpiderSend списать нужную сумму USDC.</li>
            <li>Контракт сверяет вас и получателя с реестром SpiderAML в блокчейне.</li>
            <li>Если у кого-то критический уровень риска — перевод отменяется, деньги остаются у вас.</li>
            <li>Иначе USDC уходят напрямую получателю. Контракт не хранит ваши средства.</li>
          </ol>
          <a href={`${SEND_CHAIN.blockExplorers.default.url}/address/${SPIDER_SEND}#code`} target="_blank" rel="noopener noreferrer" className="link mt-3 inline-flex items-center gap-1 text-sm">
            Код контракта <ExternalLink className="size-3.5" />
          </a>
        </Card>
      </div>
    </div>
  );
}
