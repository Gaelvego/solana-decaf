import { type AppType } from "next/app";
import { api } from "~/utils/api";
import "~/styles/globals.css";
import { Wallet } from "~/components/wallet/Wallet";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <Wallet>
      <div className="font-[Poppins]">
        <Component {...pageProps} />
      </div>
    </Wallet>
  );
};

export default api.withTRPC(MyApp);
