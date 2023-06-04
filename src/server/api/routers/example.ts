import { Network, ShyftSdk } from "@shyft-to/js";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const shyft = new ShyftSdk({
  apiKey: env.SHYFT_API_KEY,
  network: Network.Devnet,
});

export const mainRouter = createTRPCRouter({
  getBalance: publicProcedure
    .input(z.object({ publicKey: z.string().optional() }))
    .query(async ({ input }) => {
      if (!input.publicKey) {
        return { publicKey: null, balance: null };
      }

      const balance = await shyft.wallet.getBalance({
        wallet: input.publicKey,
      });

      return { publicKey: input.publicKey, balance };
    }),
});
