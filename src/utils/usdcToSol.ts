const usdcToSol = ({
  amount,
  currency,
}: {
  amount: number;
  currency: "SOL" | "USDC";
}) => {
  const solToUsdcRate = 22.15815322;
  const usdcToSolRate = 1 / solToUsdcRate;

  if (currency === "SOL") {
    return amount * solToUsdcRate;
  }

  return amount * usdcToSolRate;
};

export default usdcToSol;
