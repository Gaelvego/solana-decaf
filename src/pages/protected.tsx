import type { NextPage } from "next";
import { withRedirects } from "~/server/api/firebase/withRedirects";

interface ProtectedProps {
  children?: React.ReactNode;
}

const Protected: NextPage<ProtectedProps> = () => {
  return (
    <div>
      <h1>This is a protected page</h1>
    </div>
  );
};

export const getServerSideProps = withRedirects({
  onAuthFailure: () => ({ destination: "/login", permanent: false }),
});

export default Protected;
