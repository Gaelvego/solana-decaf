import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import type { NextPage } from "next";
import { withRedirects } from "~/server/api/firebase/withRedirects";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useAuthUser } from "~/utils/firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { clientApp } from "~/utils/firebase/app";
import { useRouter } from "next/router";

interface WalletPageProps {
  children?: React.ReactNode;
}

const WalletPage: NextPage<WalletPageProps> = () => {
  const [loading, user] = useAuthUser();
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (publicKey && !loading && user) {
      const db = getFirestore(clientApp);
      const userDocRef = doc(db, "users", user.uid);
      setDoc(userDocRef, { publicKey: publicKey.toString() }, { merge: true })
        .then(() => router.reload())
        .catch(console.error);
    }
  }, [publicKey, loading, user, router]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#5df1b3",
        backgroundImage:
          "linear-gradient(55deg, #5df1b3 0%, #5df1b3 22%, #6cbefe 49%, #008fff 75%)",
      }}
    >
      <div className="flex min-h-screen w-full flex-col items-center space-y-10 bg-white/[0.35] px-8">
        <h1 className="max-w-md pt-24 text-center text-5xl font-semibold leading-[125%] tracking-wide text-prussian-blue">
          Add your wallet
        </h1>
        <p className="text-center">
          <strong>HACKATHON NOTE:</strong> This is a temporary feature. To make
          it as easy as possible for a user to get started using crypto, we
          intend to create a wallet for them automatically. This is too
          difficult to do in little time, so we are asking you to add your own
          wallet to the app.
        </p>

        <p>
          <strong>
            In the final product, THIS STEP WOULD BE COMPLETELY SKIPPED
          </strong>
        </p>
        {!loading && user && (
          <>
            <div>
              <WalletMultiButton />
            </div>
          </>
        )}
        <pre>{publicKey && JSON.stringify(publicKey.toString(), null, 2)}</pre>
      </div>
    </div>
  );
};

export const getServerSideProps = withRedirects({
  onAuthFailure: () => ({ destination: "/login", permanent: false }),
  onAuthSuccess: ({ user }) => {
    return user.publicKey ? { destination: "/", permanent: false } : undefined;
  },
});

export default WalletPage;
