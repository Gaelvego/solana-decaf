import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import {
  type GetServerSidePropsContext,
  type GetServerSideProps,
  type PreviewData,
  type Redirect,
} from "next";
import { type ParsedUrlQuery } from "querystring";
import { serverApp } from "./app";
import { userSchema, type UserT } from "~/utils/firebase/auth";

const verifyUser = async (idToken: string): Promise<null | UserT> => {
  const auth = getAuth(serverApp);
  const db = getFirestore(serverApp);

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userDocRef = db.doc(`users/${decodedToken.uid}`);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return null;
    }

    const user = userDoc.data();

    const parsedUser = userSchema.safeParse(user);

    if (parsedUser.success) {
      return parsedUser.data;
    }

    return null;
  } catch (error) {
    return null;
  }
};

const withRedirects = <T extends { [key: string]: unknown }>(o: {
  getServerSideProps?: GetServerSideProps<T>;
  onAuthSuccess?: (o: {
    ctx: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>;
    user: UserT;
  }) => Redirect | undefined;
  onAuthFailure?: (o: {
    ctx: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>;
  }) => Redirect | undefined;
}) => {
  const { getServerSideProps, onAuthSuccess, onAuthFailure } = o;

  const getServerSidePropsWithRedirects: GetServerSideProps = async (ctx) => {
    let getServerSidePropsReturn = {
      props: {},
      notFound: false,
    };
    const authToken = ctx.req.cookies.authToken;

    if (getServerSideProps) {
      getServerSidePropsReturn = (await getServerSideProps(ctx)) as {
        props: object;
        notFound: boolean;
      };
    }

    if (authToken) {
      const user = await verifyUser(authToken);

      if (user) {
        return {
          props: getServerSidePropsReturn.props,
          notFound: getServerSidePropsReturn.notFound,
          redirect: onAuthSuccess ? onAuthSuccess({ ctx, user }) : undefined,
        };
      } else {
        return {
          props: getServerSidePropsReturn.props,
          notFound: getServerSidePropsReturn.notFound,
          redirect: onAuthFailure ? onAuthFailure({ ctx }) : undefined,
        };
      }
    } else {
      return {
        props: getServerSidePropsReturn.props,
        notFound: getServerSidePropsReturn.notFound,
        redirect: onAuthFailure ? onAuthFailure({ ctx }) : undefined,
      };
    }
  };

  return getServerSidePropsWithRedirects;
};

export { withRedirects };
