"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FlowBucket } from "@/lib/types";
import { usd } from "@/lib/format";

const hhmm = (t: number) => new Date(t * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

/** Buy vs sell volume per time bucket (sells drawn below zero). */
export function FlowChart({ buckets }: { buckets: FlowBucket[] }) {
  const data = buckets.map((b) => ({ t: b.t, buy: b.buyUsd ?? 0, sell: -(b.sellUsd ?? 0) }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} stackOffset="sign" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2A3448" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="t" tickFormatter={hhmm} tick={{ fill: "#6D7787", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v: number) => usd(Math.abs(v))} tick={{ fill: "#6D7787", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#0E1626", border: "1px solid #2A3448", borderRadius: 6, fontSize: 12 }}
            labelFormatter={(t: number) => hhmm(t)}
            formatter={(v: number, name: string) => [usd(Math.abs(v), false), name === "buy" ? "Покупки" : "Продажи"]}
          />
          <Bar dataKey="buy" stackId="a" fill="#3DDC97" radius={[2, 2, 0, 0]} />
          <Bar dataKey="sell" stackId="a" fill="#FF5A4A" radius={[0, 0, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
