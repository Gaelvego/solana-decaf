import type { NextPage } from "next";
import { useRouter } from "next/router";
import Logo from "~/components/brand/Logo";
import { withRedirects } from "~/server/api/firebase/withRedirects";
import { signIn } from "~/utils/firebase/auth";

interface LoginProps {
  children?: React.ReactNode;
}

const Login: NextPage<LoginProps> = () => {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-16 bg-white font-[Poppins]">
      <Logo />
      <div className="flex w-full flex-col space-y-6 px-10">
        <button
          onClick={() =>
            void signIn({
              provider: "google",
              onSuccess: () => router.reload(),
            })
          }
          className="w-full transform rounded-full bg-gradient-to-r from-aquamarine to-pale-azure px-4 py-4 text-lg font-semibold text-prussian-blue shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          Sign in with Google
        </button>
        <button
          onClick={() =>
            void signIn({
              provider: "google",
              onSuccess: () => router.reload(),
            })
          }
          className="w-full rounded-full bg-gradient-to-l from-aquamarine to-pale-azure px-4 py-4 text-lg font-semibold text-prussian-blue shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          Log In
        </button>
      </div>
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
