"use client";

import { useEffect, useState } from "react";
import { BaseError, ContractFunctionRevertedError, createPublicClient, formatEther, formatUnits, getAddress, http, isAddress, parseUnits, type Address, type Hash } from "viem";
import { ExternalLink, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Badge, Card, Notice } from "@/components/ui";
import { useWallet } from "@/components/Wallet";
import { REGISTRY, SEND_CHAIN, SEND_RPC, SPIDER_SEND, TOKEN, erc20Abi, registryAbi, sendAbi } from "@/lib/contracts";
import { ERROR_TEXT } from "@/lib/texts";
import { screenRecipient, type Screening } from "./actions";

const pub = createPublicClient({ chain: SEND_CHAIN, transport: http(SEND_RPC) });
const ONCHAIN_CATEGORY = ["—", "Санкционный список", "Взлом или кража", "Фишинг", "Подозрительная активность", "Миксер", "Другое"];
const txUrl = (h: Hash) => `${SEND_CHAIN.blockExplorers.default.url}/tx/${h}`;
/** Typical gas of each step, used before the wallet is connected (measured on Arbitrum Sepolia, rounded up). */
const GAS = { approve: 60_000n, send: 90_000n };

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

export function SendForm({ initialTo, ethUsd }: { initialTo: string; ethUsd: number | null }) {
  const { available, account, chainId, client, connect, ensureChain, error: walletError } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [screen, setScreen] = useState<Screening | null>(null);
  const [onchain, setOnchain] = useState<OnChain | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmRisk, setConfirmRisk] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [hashes, setHashes] = useState<{ approve?: Hash; send?: Hash }>({});
  const [error, setError] = useState<string | null>(null);

  const toValid = isAddress(to.trim(), { strict: false });
  const toAddr = toValid ? getAddress(to.trim().toLowerCase()) : null;
  let value: bigint | null = null;
  try {
    value = amount && Number(amount.replace(",", ".")) > 0 ? parseUnits(amount.replace(",", "."), TOKEN.decimals) : null;
  } catch {
    value = null;
  }

  async function refresh(a: Address) {
    const [b, al, eb] = await Promise.all([
      pub.readContract({ address: TOKEN.address, abi: erc20Abi, functionName: "balanceOf", args: [a] }),
      pub.readContract({ address: TOKEN.address, abi: erc20Abi, functionName: "allowance", args: [a, SPIDER_SEND] }),
      pub.getBalance({ address: a }),
    ]);
    setBalance(b);
    setAllowance(al);
    setEthBalance(eb);
  }

  useEffect(() => {
    pub.getGasPrice().then(setGasPrice).catch(() => {});
  }, []);

  useEffect(() => {
    if (account) refresh(account).catch(() => {});
  }, [account]);

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

  const needApprove = !!value && allowance < value;
  const gas = (needApprove ? GAS.approve : 0n) + GAS.send;
  // L2 gas price is tiny; double it as headroom so the estimate is not optimistic
  const feeWei = gasPrice != null ? gas * gasPrice * 2n : null;
  const feeEth = feeWei != null ? Number(formatEther(feeWei)) : null;

  const blocked = onchain ? !onchain.allowed : false;
  const offchainRisky = screen?.ok && (screen.level === "high" || screen.level === "critical");
  const selfSend = account && toAddr && account.toLowerCase() === toAddr.toLowerCase();
  const noGas = ethBalance != null && feeWei != null && ethBalance < feeWei;
  const canSend =
    !!account && !!toAddr && !!value && !blocked && !selfSend && !noGas && (balance ?? 0n) >= value && (!offchainRisky || confirmRisk) && step !== "approving" && step !== "sending";

  async function send() {
    if (!client || !account || !toAddr || !value) return;
    setError(null);
    setHashes({});
    try {
      await ensureChain();
      if (allowance < value) {
        setStep("approving");
        const approve = await client.writeContract({ account, chain: SEND_CHAIN, address: TOKEN.address, abi: erc20Abi, functionName: "approve", args: [SPIDER_SEND, value] });
        setHashes({ approve });
        await pub.waitForTransactionReceipt({ hash: approve });
      }
      setStep("sending");
      // simulate first: a block shows up as a readable reason instead of a failed transaction
      const { request } = await pub.simulateContract({ account, address: SPIDER_SEND, abi: sendAbi, functionName: "send", args: [toAddr, value] });
      const sendHash = await client.writeContract({ ...request, chain: SEND_CHAIN });
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
      <Card className="lg:col-span-2" title="Перевод" hint={`Сеть: ${SEND_CHAIN.name} (тестовая, деньги не настоящие). Монета: ${TOKEN.symbol}.`}>
        {available === null ? null : !available ? (
          <Notice tone="warn">
            Нужен браузерный кошелёк — например{" "}
            <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="link">
              MetaMask
            </a>{" "}
            или Rabby. Установите его и обновите страницу.
          </Notice>
        ) : !account ? (
          <div className="space-y-2">
            <button onClick={connect} className="btn-primary">
              Подключить кошелёк
            </button>
            {walletError && <p className="text-sm text-warn">{walletError}</p>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-silver-2">
            <span>
              Кошелёк: <Addr value={account} />
            </span>
            <span>
              {TOKEN.symbol}: <b className="text-silver-1">{balance == null ? "…" : formatUnits(balance, TOKEN.decimals)}</b>
            </span>
            <span>
              ETH на газ: <b className="text-silver-1">{ethBalance == null ? "…" : Number(formatEther(ethBalance)).toFixed(5)}</b>
            </span>
            {chainId != null && chainId !== SEND_CHAIN.id && <span className="text-warn">Кошелёк в другой сети — переключим при отправке.</span>}
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
          {value && balance != null && balance < value && (
            <p className="text-sm text-warn">
              Недостаточно {TOKEN.symbol}.{" "}
              <a href={TOKEN.faucet} target="_blank" rel="noopener noreferrer" className="link">
                Получить тестовые
              </a>
            </p>
          )}

          <div className="rounded-md border border-line bg-bg/40 p-3 text-sm">
            <div className="label mb-2">Сколько это стоит</div>
            <dl className="grid grid-cols-1 gap-y-1 sm:grid-cols-[1fr_auto] [&_dd]:mb-1.5 [&_dd]:text-left sm:[&_dd]:mb-0 sm:[&_dd]:text-right">
              <dt className="text-silver-2">Комиссия SpiderAML</dt>
              <dd className="text-right text-ok">0 — бесплатно</dd>
              <dt className="text-silver-2">Комиссия сети (газ){needApprove ? ", 2 транзакции" : ""}</dt>
              <dd className="text-right tabular-nums">
                {feeEth == null ? "…" : `≈ ${feeEth < 0.000001 ? "<0.000001" : feeEth.toFixed(6)} ETH`}
                {feeEth != null && ethUsd != null && <span className="text-silver-3"> (≈ ${(feeEth * ethUsd).toFixed(feeEth * ethUsd < 0.01 ? 4 : 2)})</span>}
              </dd>
              <dt className="text-silver-2">Получатель получит</dt>
              <dd className="text-right tabular-nums">{value ? `${formatUnits(value, TOKEN.decimals)} ${TOKEN.symbol}` : "—"}</dd>
            </dl>
            <p className="mt-2 text-xs text-silver-3">Газ платится в ETH сети Arbitrum Sepolia и уходит сети, не нам. В тестовой сети ETH бесплатный — его выдают краны.</p>
            {noGas && <p className="mt-2 text-sm text-warn">Не хватает ETH на газ — пополните кошелёк через кран Arbitrum Sepolia.</p>}
          </div>

          {offchainRisky && !blocked && (
            <label className="flex items-start gap-2 text-sm text-silver-1">
              <input type="checkbox" checked={confirmRisk} onChange={(e) => setConfirmRisk(e.target.checked)} className="mt-1" />
              Я понимаю риск и всё равно хочу отправить.
            </label>
          )}

          <button onClick={send} disabled={!canSend} data-track="send:submit" className="btn-primary w-full sm:w-auto">
            {(step === "approving" || step === "sending") && <Loader2 className="size-4 animate-spin" />}
            {step === "approving" ? "Шаг 1 из 2: разрешаем списание…" : step === "sending" ? (needApprove ? "Шаг 2 из 2: отправляем…" : "Отправляем…") : needApprove ? "Разрешить и отправить" : "Отправить"}
          </button>
          {needApprove && account && <p className="text-xs text-silver-3">Кошелёк попросит подтвердить два раза: разрешение списать именно эту сумму и сам перевод.</p>}

          {error && <Notice tone="warn">{error}</Notice>}
          {hashes.approve && step !== "done" && (
            <a href={txUrl(hashes.approve)} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 text-sm">
              Транзакция разрешения <ExternalLink className="size-3.5" />
            </a>
          )}
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
