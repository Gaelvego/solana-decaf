import type { NextPage } from "next";
import { useRouter } from "next/router";
import { withRedirects } from "~/server/api/firebase/withRedirects";
import { signIn } from "~/utils/firebase/auth";

interface LoginProps {
  children?: React.ReactNode;
}

const Login: NextPage<LoginProps> = () => {
  const router = useRouter();

  return (
    <div>
      <h1>This is the login page</h1>
      <button
        onClick={() =>
          void signIn({ provider: "google", onSuccess: () => router.reload() })
        }
      >
        SIGN IN
      </button>
    </div>
  );
};

export const getServerSideProps = withRedirects({
  onAuthSuccess: ({ user }) => {
    return user.publicKey
      ? { destination: "/", permanent: false }
      : { destination: "/wallet", permanent: false };
  },
});

export default Login;
