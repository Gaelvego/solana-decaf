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
    .input(z.object({ publicKey: z.string().nonempty() }))
    .query(async ({ input }) => {
      const balance = await shyft.wallet.getBalance({
        wallet: input.publicKey,
      });

      return { publicKey: input.publicKey, balance };
    }),
});
