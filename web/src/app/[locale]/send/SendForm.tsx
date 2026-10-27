"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BaseError, ContractFunctionRevertedError, createPublicClient, formatEther, formatUnits, getAddress, http, isAddress, parseUnits, type Address, type Hash } from "viem";
import { ExternalLink, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Addr } from "@/components/Addr";
import { Badge, Card, Notice } from "@/components/ui";
import { useWallet } from "@/components/Wallet";
import { REGISTRY, SEND_CHAIN, SEND_RPC, SPIDER_SEND, TOKEN, erc20Abi, registryAbi, sendAbi } from "@/lib/contracts";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { screenRecipient, type Screening } from "./actions";

const pub = createPublicClient({ chain: SEND_CHAIN, transport: http(SEND_RPC) });
const txUrl = (h: Hash) => `${SEND_CHAIN.blockExplorers.default.url}/tx/${h}`;
/** Typical gas of each step, used before the wallet is connected (measured on Arbitrum Sepolia, rounded up). */
const GAS = { approve: 60_000n, send: 90_000n };
const LABEL = "mb-2 block text-sm font-medium text-silver-2";

type OnChain = { allowed: boolean; worst: Address; category: number; level: number };
type Step = "idle" | "approving" | "sending" | "done";

type T = ReturnType<typeof useTranslations<"Send">>;

function explain(e: unknown, t: T, categories: string[]): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName === "Blocked") {
      const [, category] = revert.data.args as [Address, number, number];
      return t("blockedBy", { category: categories[category] ?? t("risk") });
    }
    if (/user rejected|denied/i.test(e.message)) return t("rejected");
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : t("unknown");
}

export function SendForm({ initialTo, ethUsd }: { initialTo: string; ethUsd: number | null }) {
  const t = useTranslations("Send");
  const tErr = useTranslations("Errors");
  const tLevel = useTranslations("Level");
  const tCat = useTranslations("Category");
  const categories = t.raw("categories") as string[];
  const { available, account, chainId, client, connect, ensureChain, error: walletError } = useWallet();
  const queryClient = useQueryClient();
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [confirmRisk, setConfirmRisk] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [hashes, setHashes] = useState<{ approve?: Hash; send?: Hash }>({});
  const [error, setError] = useState<string | null>(null);

  const toValid = isAddress(to.trim(), { strict: false });
  const toAddr = toValid ? getAddress(to.trim().toLowerCase()) : null;
  // wait until typing stops before screening the recipient
  const debouncedToAddr = useDebouncedValue(toAddr, 400);
  const typing = toAddr !== debouncedToAddr;

  const { data: gasPrice = null } = useQuery({
    queryKey: ["send", "gas-price"],
    queryFn: () => pub.getGasPrice().catch(() => null),
    staleTime: Infinity,
  });

  const { data: wallet } = useQuery({
    queryKey: ["send", "balances", account],
    enabled: !!account,
    queryFn: async () => {
      const a = account as Address;
      const [b, al, eb] = await Promise.all([
        pub.readContract({ address: TOKEN.address, abi: erc20Abi, functionName: "balanceOf", args: [a] }),
        pub.readContract({ address: TOKEN.address, abi: erc20Abi, functionName: "allowance", args: [a, SPIDER_SEND] }),
        pub.getBalance({ address: a }),
      ]);
      return { balance: b, allowance: al, ethBalance: eb };
    },
  });
  const balance = wallet?.balance ?? null;
  const allowance = wallet?.allowance ?? 0n;
  const ethBalance = wallet?.ethBalance ?? null;

  const fromAddr = (account ?? "0x0000000000000000000000000000000000000001") as Address;
  const { data: screening, isFetching: screeningFetching } = useQuery({
    queryKey: ["send", "screen", debouncedToAddr, account],
    enabled: !!debouncedToAddr,
    queryFn: async (): Promise<{ screen: Screening; onchain: OnChain | null }> => {
      const addr = debouncedToAddr as Address;
      const [s, c] = await Promise.all([
        screenRecipient(addr),
        pub.readContract({ address: REGISTRY, abi: registryAbi, functionName: "checkTransfer", args: [fromAddr, addr] }).catch(() => null),
      ]);
      return { screen: s, onchain: c ? { allowed: c[0], worst: c[1], category: c[2], level: c[3] } : null };
    },
  });
  const screen = !typing ? (screening?.screen ?? null) : null;
  const onchain = !typing ? (screening?.onchain ?? null) : null;
  const checking = typing || screeningFetching;

  // a new recipient needs an explicit risk confirmation again
  useEffect(() => {
    setConfirmRisk(false);
  }, [toAddr]);
  let value: bigint | null = null;
  try {
    value = amount && Number(amount.replace(",", ".")) > 0 ? parseUnits(amount.replace(",", "."), TOKEN.decimals) : null;
  } catch {
    value = null;
  }

  // balances refresh automatically when the account changes (see the query above);
  // after a confirmed send, drop the cache so the new balances are re-read.
  async function refresh(a: Address) {
    await queryClient.invalidateQueries({ queryKey: ["send", "balances", a] });
  }

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
      if (rc.status !== "success") throw new Error(t("failed"));
      setStep("done");
      setAmount("");
      toast.success(t("sent"));
      await refresh(account);
    } catch (e) {
      setStep("idle");
      const msg = explain(e, t, categories);
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <Card className="text-base lg:col-span-2" title={t("transfer")} hint={t("hint", { network: SEND_CHAIN.name })}>
        {available === null ? null : !available ? (
          <Notice tone="warn">
            {t("needWallet")}{" "}
            <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="link">
              MetaMask
            </a>{" "}
            {t("needWalletTail")}
          </Notice>
        ) : !account ? (
          <div className="flex flex-col gap-3">
            <button onClick={connect} className="btn-primary h-12 w-full text-base sm:w-auto">
              {t("connect")}
            </button>
            {walletError && <p className="text-sm text-warn">{walletError}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-8 sm:gap-y-3">
            <div className="min-w-0">
              <div className="text-sm text-silver-2">{t("wallet")}</div>
              <Addr value={account} className="mt-1 text-base" />
            </div>
            <div>
              <div className="text-sm text-silver-2">{TOKEN.symbol}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-silver-1">{balance == null ? "…" : formatUnits(balance, TOKEN.decimals)}</div>
            </div>
            <div>
              <div className="text-sm text-silver-2">{t("ethGas")}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-silver-1">{ethBalance == null ? "…" : Number(formatEther(ethBalance)).toFixed(5)}</div>
            </div>
            {chainId != null && chainId !== SEND_CHAIN.id && <p className="text-sm text-warn sm:basis-full">{t("otherChain")}</p>}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <div>
            <label className="block">
              <span className={LABEL}>{t("recipient")}</span>
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" className="input h-12 font-mono text-base" />
            </label>
            {to && !toValid && <p className="mt-2 text-sm text-warn">{tErr("INVALID_ADDRESS")}</p>}
            {selfSend && <p className="mt-2 text-sm text-warn">{t("self")}</p>}
          </div>

          <div>
            <label className="block">
              <span className={LABEL}>{t("amount", { symbol: TOKEN.symbol })}</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="input h-12 text-base" />
            </label>
            {value && balance != null && balance < value && (
              <p className="mt-2 text-sm text-warn">
                {t("notEnough", { symbol: TOKEN.symbol })}{" "}
                <a href={TOKEN.faucet} target="_blank" rel="noopener noreferrer" className="link">
                  {t("faucet")}
                </a>
              </p>
            )}
          </div>

          <div className="border-t border-line pt-5">
            {value && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-silver-2">{t("youGet")}</span>
                <span className="text-2xl font-semibold tabular-nums text-silver-1">{`${formatUnits(value, TOKEN.decimals)} ${TOKEN.symbol}`}</span>
              </div>
            )}
            <dl className={cn("space-y-2", value ? "mt-3" : undefined)}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <dt className="text-silver-2">{t("ourFee")}</dt>
                <dd className="text-ok">{t("free")}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <dt className="text-silver-2">
                  {t("networkFee")}
                  {needApprove ? t("twoTx") : ""}
                </dt>
                <dd className="tabular-nums text-silver-1">
                  {feeEth == null ? "…" : `≈ ${feeEth < 0.000001 ? "<0.000001" : feeEth.toFixed(6)} ETH`}
                  {feeEth != null && ethUsd != null && <span className="text-silver-2"> (≈ ${(feeEth * ethUsd).toFixed(feeEth * ethUsd < 0.01 ? 4 : 2)})</span>}
                </dd>
              </div>
            </dl>
            {noGas && <p className="mt-3 text-sm text-warn">{t("noGas")}</p>}
          </div>

          {offchainRisky && !blocked && (
            <label className="flex items-start gap-3 border border-warn/40 bg-warn/10 p-3 text-silver-1">
              <input type="checkbox" checked={confirmRisk} onChange={(e) => setConfirmRisk(e.target.checked)} className="mt-1 size-4 shrink-0 accent-(--color-warn)" />
              <span>{t("confirmRisk")}</span>
            </label>
          )}

          <button onClick={send} disabled={!canSend} data-track="send:submit" className="btn-primary h-12 w-full text-base sm:w-auto sm:min-w-56">
            {(step === "approving" || step === "sending") && <Loader2 className="size-5 animate-spin" />}
            {step === "approving" ? t("step1") : step === "sending" ? (needApprove ? t("step2") : t("sending")) : needApprove ? t("approveSend") : t("send")}
          </button>

          {error && <Notice tone="warn">{error}</Notice>}
          {hashes.approve && step !== "done" && (
            <a href={txUrl(hashes.approve)} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5 text-base">
              {t("approveTx")} <ExternalLink className="size-4" />
            </a>
          )}
          {step === "done" && hashes.send && (
            <Notice tone="ok">
              {t("sent")}{" "}
              <a href={txUrl(hashes.send)} target="_blank" rel="noopener noreferrer" className="link">
                {t("sentTx")}
              </a>
            </Notice>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {toAddr && (
          <Card className="text-base" title={t("screenTitle")}>
            {checking ? (
              <p className="flex items-center gap-2 text-silver-2">
                <Loader2 className="size-5 animate-spin" /> {t("checking")}
              </p>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-sm text-silver-2">{t("registry")}</div>
                  {onchain == null ? (
                    <span className="text-silver-2">{t("registryFail")}</span>
                  ) : blocked ? (
                    <p className="flex items-start gap-2 text-crit">
                      <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                      {t("willBlock", { category: categories[onchain.category] ?? t("risk") })}
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 text-ok">
                      <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                      {t("willPass")}
                      {onchain.level > 0 ? t("hasMark", { level: onchain.level }) : ""}.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm text-silver-2">{t("ours")}</div>
                  {!screen ? null : !screen.ok ? (
                    <span className="text-silver-2">{screen.code && tErr.has(screen.code) ? tErr(screen.code) : screen.error}</span>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Badge tone={screen.level === "low" ? "ok" : screen.level === "medium" ? "warn" : "crit"} className="text-sm">
                          {tLevel(`${screen.level}.title`)}
                        </Badge>
                        <span className="tabular-nums text-silver-2">{screen.score}/100</span>
                      </div>
                      {screen.categories.length > 0 && <p className="text-silver-2">{screen.categories.map((c) => (tCat.has(c) ? tCat(`${c}.name`) : c)).join(", ")}</p>}
                      <Link href={`/check?address=${toAddr}&network=arbitrum`} className="link inline-block">
                        {t("more")}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
        <Card className="text-base" title={t("how")}>
          <ol className="list-decimal space-y-2 pl-5 text-silver-2">
            {(t.raw("steps") as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <a href={`${SEND_CHAIN.blockExplorers.default.url}/address/${SPIDER_SEND}#code`} target="_blank" rel="noopener noreferrer" className="link mt-4 inline-flex items-center gap-1.5">
            {t("code")} <ExternalLink className="size-4" />
          </a>
        </Card>
      </div>
    </div>
  );
}
