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
    <div>
      <h1>This is where you add your wallet</h1>
      {!loading && user && (
        <>
          <div>
            <WalletMultiButton />
            <WalletDisconnectButton />
          </div>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </>
      )}
      <pre>{publicKey && JSON.stringify(publicKey.toString(), null, 2)}</pre>
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
