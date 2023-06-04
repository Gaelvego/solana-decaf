import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { withRedirects } from "~/server/api/firebase/withRedirects";
import { type ContactT, useAuthUser } from "~/utils/firebase/auth";

interface ContactProps {
  children?: React.ReactNode;
}

const groupByAlphabet = (contacts: ContactT[]) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const result: { [key: string]: ContactT[] } = {};

  alphabet.split("").forEach((letter) => {
    const matching = contacts.filter((contact) => {
      const name = contact.displayName || "";
      const firstLetter = name[0]?.toUpperCase();

      return firstLetter === letter;
    });

    if (matching.length > 0) {
      result[letter] = matching;
    }
  });

  return result;
};

const Contact: NextPage<ContactProps> = () => {
  const [search, setSearch] = useState("");
  const [loading, user] = useAuthUser();
  const [groupedContacts, setGroupedContacts] = useState<
    Record<string, ContactT[]>
  >({});

  useEffect(() => {
    if (!loading && user) {
      const grouped = groupByAlphabet(user?.contacts || []);
      setGroupedContacts(grouped);
    }
  }, [loading, user]);

  return (
    <div>
      <div className="relative flex w-full items-center justify-center bg-gradient-to-r from-[#70DEE0] via-[#70DEE0] to-[#70DEE0]/50 pb-6 pt-8">
        <h1 className="text-3xl text-prussian-blue">Contacts</h1>
        <button className="absolute right-6 top-8">
          <svg
            width="30"
            height="30"
            viewBox="0 0 122 123"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="bg-blend-color-dodge mix-blend-overlay"
          >
            <path
              d="M56.8931 92.125H66.0181V66.7063H91.416V57.5187H66.0181V30.875H56.8931V57.5187H30.5827V66.7063H56.8931V92.125ZM61.0398 122.75C52.6515 122.75 44.7685 121.142 37.3908 117.927C30.0132 114.711 23.5615 110.321 18.0358 104.758C12.5101 99.1943 8.15039 92.6946 4.95664 85.2587C1.76289 77.823 0.166016 69.8779 0.166016 61.4234C0.166016 52.969 1.76289 45.0239 4.95664 37.5882C8.15039 30.1523 12.5101 23.6781 18.0358 18.1656C23.5615 12.6531 30.017 8.28906 37.4022 5.07344C44.7874 1.85781 52.6785 0.25 61.0754 0.25C69.4723 0.25 77.3634 1.85781 84.7485 5.07344C92.1338 8.28906 98.5639 12.6531 104.039 18.1656C109.514 23.6781 113.848 30.1604 117.042 37.6125C120.236 45.0646 121.833 53.0135 121.833 61.4593C121.833 69.905 120.236 77.842 117.042 85.2702C113.848 92.6984 109.514 99.1849 104.039 104.73C98.5639 110.274 92.1257 114.664 84.7243 117.898C77.323 121.133 69.4281 122.75 61.0398 122.75Z"
              fill="black"
            />
          </svg>
        </button>
      </div>
      <div className="flex flex-col space-y-8 px-8 pt-8">
        <div className="w-full">
          <input
            className="w-full rounded-2xl bg-[#75DAEB]/30 px-6 py-2 text-prussian-blue/70 focus:outline-none"
            placeholder="search contact"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="w-full rounded-2xl bg-gradient-to-br from-[#79D6F4] to-[#70DEDF] px-4 py-8">
          {Object.keys(groupedContacts)
            .filter((k) => {
              if (!search[0]) return true;

              return k.toUpperCase() == search[0].toUpperCase();
            })
            .map((k) => {
              const contacts = groupedContacts[k];

              return (
                <div key={k}>
                  <p className="w-full py-3">{k} -</p>
                  {contacts &&
                    contacts.map((contact) => {
                      return (
                        <div
                          key={contact.uid}
                          className="relative flex rounded-2xl bg-white px-4 py-4"
                        >
                          <picture>
                            <img
                              src={contact.photoURL}
                              alt={`${contact.displayName}'s Profile picture`}
                              className="h-16 w-16 rounded-full"
                            />
                          </picture>
                          <div className="flex flex-col justify-center px-4">
                            <p className="text-2xl">{contact.displayName}</p>
                            <p className="text-sm">{contact.email}</p>
                            <div className="absolute right-4 top-0">
                              <svg
                                width="28"
                                height="85"
                                viewBox="0 0 88 85"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M43.9866 70.8332C42.773 70.8332 41.7385 70.4158 40.8829 69.581C40.0274 68.7463 39.5996 67.7428 39.5996 66.5706C39.5996 65.3984 40.0317 64.3991 40.896 63.5728C41.7601 62.7464 42.799 62.3332 44.0126 62.3332C45.2262 62.3332 46.2607 62.7506 47.1163 63.5853C47.9718 64.42 48.3996 65.4235 48.3996 66.5957C48.3996 67.7679 47.9675 68.7672 47.1033 69.5936C46.2391 70.42 45.2002 70.8332 43.9866 70.8332ZM43.9866 46.7498C42.773 46.7498 41.7385 46.3325 40.8829 45.4977C40.0274 44.663 39.5996 43.6595 39.5996 42.4873C39.5996 41.3151 40.0317 40.3158 40.896 39.4894C41.7601 38.663 42.799 38.2498 44.0126 38.2498C45.2262 38.2498 46.2607 38.6672 47.1163 39.502C47.9718 40.3367 48.3996 41.3402 48.3996 42.5124C48.3996 43.6846 47.9675 44.6839 47.1033 45.5103C46.2391 46.3366 45.2002 46.7498 43.9866 46.7498ZM43.9866 22.6665C42.773 22.6665 41.7385 22.2491 40.8829 21.4143C40.0274 20.5796 39.5996 19.5762 39.5996 18.4039C39.5996 17.2318 40.0317 16.2325 40.896 15.4061C41.7601 14.5797 42.799 14.1665 44.0126 14.1665C45.2262 14.1665 46.2607 14.5839 47.1163 15.4187C47.9718 16.2534 48.3996 17.2568 48.3996 18.4291C48.3996 19.6013 47.9675 20.6005 47.1033 21.4269C46.2391 22.2533 45.2002 22.6665 43.9866 22.6665Z"
                                  fill="#002940"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
        </div>
        <div className="fixed bottom-0 right-0 flex w-full justify-around bg-white py-4 shadow-inner">
          <Link href="/">
            <Image src="home.svg" width={60} height={200} alt="Logo" />
          </Link>
          <Link href="/account">
            <Image src="account.svg" width={60} height={200} alt="Logo" />
          </Link>
          <Link href="/contacts">
            <Image src="contacts.svg" width={60} height={200} alt="Logo" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = withRedirects({
  onAuthFailure: () => ({ destination: "/login", permanent: false }),
  onAuthSuccess: ({ user }) => {
    return user.publicKey
      ? undefined
      : { destination: "/wallet", permanent: false };
  },
});

export default Contact;
