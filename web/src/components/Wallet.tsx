"use client";

// One browser-wallet connection for the whole site (header button + /send). Injected wallets only (MetaMask, Rabby…).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, type Address, type EIP1193Provider, type WalletClient } from "viem";
import { LogOut, Wallet as WalletIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { SEND_CHAIN } from "@/lib/contracts";
import { short } from "@/lib/format";

declare global {
  interface Window {
    ethereum?: EIP1193Provider & { on?: (e: string, f: (...a: unknown[]) => void) => void; removeListener?: (e: string, f: (...a: unknown[]) => void) => void };
  }
}

interface WalletState {
  /** null until mounted (the server cannot know if the browser has a wallet) */
  available: boolean | null;
  account: Address | null;
  chainId: number | null;
  client: WalletClient | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  ensureChain: () => Promise<void>;
  error: string | null;
}

const Ctx = createContext<WalletState | null>(null);
const KEY = "spideraml:wallet-connected";

export function WalletProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("Ui");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => (available ? createWalletClient({ chain: SEND_CHAIN, transport: custom(window.ethereum!) }) : null), [available]);

  useEffect(() => setAvailable(!!window.ethereum), []);

  // Restore a previous connection silently and follow account / network switches made in the wallet.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth || !client) return;
    const onAccounts = (a: unknown) => setAccount(((a as Address[])[0] as Address | undefined) ?? null);
    const onChain = (id: unknown) => setChainId(Number(id));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    let remembered = false;
    try {
      remembered = localStorage.getItem(KEY) === "1";
    } catch {
      /* storage blocked */
    }
    if (remembered)
      client
        .getAddresses()
        .then(async ([a]) => {
          if (a) (setAccount(a), setChainId(await client.getChainId()));
        })
        .catch(() => {});
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [client]);

  const connect = useCallback(async () => {
    setError(null);
    if (!client) return;
    try {
      const [a] = await client.requestAddresses();
      setAccount(a);
      setChainId(await client.getChainId());
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        /* storage blocked */
      }
    } catch (e) {
      setError(/reject|denied/i.test(String(e)) ? t("walletRejected") : t("walletFailed"));
    }
  }, [client, t]);

  const disconnect = useCallback(() => {
    setAccount(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
  }, []);

  const ensureChain = useCallback(async () => {
    if (!client) return;
    if ((await client.getChainId()) === SEND_CHAIN.id) return setChainId(SEND_CHAIN.id);
    try {
      await client.switchChain({ id: SEND_CHAIN.id });
    } catch {
      await client.addChain({ chain: SEND_CHAIN });
    }
    setChainId(SEND_CHAIN.id);
  }, [client]);

  const value = useMemo(() => ({ available, account, chainId, client, connect, disconnect, ensureChain, error }), [available, account, chainId, client, connect, disconnect, ensureChain, error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}

export function WalletButton() {
  const t = useTranslations("Ui");
  const { available, account, connect, disconnect } = useWallet();
  if (available === null) return <div className="h-9 w-40" />;
  if (!available)
    return (
      <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="btn-ghost h-9 px-3 text-[13px]">
        <WalletIcon className="size-4" /> {t("installWallet")}
      </a>
    );
  if (!account)
    return (
      <button onClick={connect} className="btn-primary h-9 px-3 text-[13px]">
        <WalletIcon className="size-4" /> {t("connectWallet")}
      </button>
    );
  return (
    <div className="flex items-center gap-1">
      <span className="flex h-9 items-center gap-2 rounded-md border border-line px-3 font-mono text-[13px]">
        <span className="size-2 rounded-full bg-ok" aria-hidden />
        {short(account)}
      </span>
      <button onClick={disconnect} className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-silver-3 hover:text-silver-1" aria-label={t("disconnect")} title={t("disconnectShort")}>
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
