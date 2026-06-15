"use client";

import React from "react";

export type KOTItem = {
  name: string;
  qty: number;
};

export type KOTData = {
  tableId?: number | null;
  tableName?: string;
  orderId?: number | null;
  time: string;
  items: KOTItem[];
};

export function KOTPrintReceipt({ data }: { data: KOTData | null }) {
  if (!data) return null;

  return (
    <div className="hidden print:block text-black bg-white p-4 font-mono w-[80mm] mx-auto text-sm">
      <div className="text-center mb-4 border-b-2 border-black pb-2">
        <h1 className="text-xl font-black uppercase">Kitchen Order Ticket</h1>
        <h2 className="text-2xl font-black mt-1">
          {data.tableName ? `${data.tableName}` : "TAKEAWAY"}
        </h2>
        {data.orderId && <p className="font-bold">Order #{data.orderId}</p>}
        <p className="mt-1">Time: {data.time}</p>
      </div>

      <table className="w-full text-left font-bold mb-4">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1">QTY</th>
            <th className="py-1">ITEM</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-dashed border-gray-400">
              <td className="py-2 text-lg w-12">{item.qty}</td>
              <td className="py-2 text-lg uppercase leading-tight">{item.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center text-xs mt-6 pt-2 border-t-2 border-black">
        <p>*** END OF KOT ***</p>
      </div>
    </div>
  );
}
