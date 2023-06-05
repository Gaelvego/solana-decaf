import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { withRedirects } from "~/server/api/firebase/withRedirects";
import { clientApp } from "~/utils/firebase/app";
import { type UserT, useAuthUser, type ContactT } from "~/utils/firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import usdcToSol from "~/utils/usdcToSol";

export type TransactionT = {
  amount: number;
  recipient?: ContactT;
  sender?: ContactT;
  timestamp: number;
  status: "pending" | "completed" | "failed";
  type: "direct" | "request" | "bill_split";
};

type action =
  | "transfer"
  | "addContact"
  | "checkBalance"
  | "createInvoice"
  | "splitBill";

const promptKeywords: Record<action, string[]> = {
  transfer: [
    "transfer",
    "transaction",
    "transference",
    "send money",
    "money transfer",
    "funds",
    "wire money",
    "money wiring",
    "send",
  ],
  addContact: [
    "add contact",
    "create contact",
    "new contact",
    "new person",
    "add",
    "contact",
    "save",
    "save contact",
    "details",
    "information",
    "create",
    "new",
  ],
  checkBalance: [
    "check",
    "balance",
    "inquiry",
    "consult",
    "available",
    "account",
    "update",
    "have",
    "status",
    "request",
    "remaining",
  ],
  createInvoice: [
    "send me the payment",
    "send me",
    "pay",
    "invoice",
    "send me the money",
    "send me the funds",
    "give me the payment",
    "give me the money",
    "give me the funds",
    "pay me back",
    "pay me what you owe",
    "pay me the money",
    "pay me the funds",
    "reimburse me",
    "settle up with me",
    "square up with me",
    "hand me",
  ],
  splitBill: [
    "split",
    "divide",
    "share",
    "allocate",
    "apportion",
    "distribute",
    "separate",
    "split up",
    "break up",
    "divvy up",
    "distribute evenly",
    "divide equally",
    "share equally",
    "each of us",
    "each need to pay",
    "each",
    "your part",
    "your share",
    "owes me",
    "their",
    "drop me their",
    "hit me their",
    "gimme their",
    "slide me",
    "cover up their",
    "hand over",
    "hand over their",
    "chip in your",
    "chip in their",
    "chip in his",
    "chip in its",
    "chip in their",
  ],
};

const defineAction = (input: string): action | null => {
  const inputWords = input.toLowerCase().split(" ");
  const action = Object.keys(promptKeywords).find((action) => {
    const keywords = promptKeywords[action as action];
    return keywords.some((keyword) => inputWords.includes(keyword));
  });
  return action as action | null;
};

const Home: NextPage = () => {
  const [inputValue, setInputValue] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [loading, user] = useAuthUser();
  const [transfer, setTransfer] = useState<TransactionT | null>(null);
  const [invoice, setInvoice] = useState<TransactionT | null>(null);
  const [currentAction, setCurrentAction] = useState<{
    action: action | null;
    confirmed: boolean;
  }>({ action: null, confirmed: false });

  const { connection } = useConnection();
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { sendTransaction } = useWallet();

  const addContact = async () => {
    if (!newContactEmail) return toast.error("Please enter an email address");
    if (newContactEmail === user?.email)
      return toast.error("Cannot add yourself as a contact");

    const db = getFirestore(clientApp);
    const userCollection = collection(db, "users");
    const userQuery = query(
      userCollection,
      where("email", "==", newContactEmail)
    );

    const newContactSnapshot = await getDocs(userQuery);
    const newContactDoc = newContactSnapshot.docs[0];

    if (!newContactDoc) return toast.error("User not found");

    const newContact = newContactDoc.data() as UserT;
    const userDoc = doc(db, "users", user?.uid || "");
    const contactData: ContactT = {
      email: newContact.email,
      displayName: newContact.displayName,
      publicKey: newContact.publicKey,
      uid: newContact.uid,
      photoURL: newContact.photoURL,
    };

    await toast.promise(
      updateDoc(userDoc, {
        contacts: arrayUnion(contactData),
      }),
      {
        loading: "Adding contact...",
        success: "Contact added!",
        error: "Failed to add contact",
      }
    );
  };

  const makeTransaction = async () => {
    if (!transfer?.sender?.publicKey)
      return toast.error("Please connect your wallet");
    if (!transfer) return toast.error("Please specify an amount and recipient");

    // 890880 lamports as of 2022-09-01
    // const lamports = await connection.getMinimumBalanceForRentExemption(0);

    if (!transfer?.recipient?.publicKey)
      return toast.error("Please add a recipient");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(transfer.sender.publicKey),
        toPubkey: new PublicKey(transfer.recipient.publicKey),
        lamports: Math.round(
          usdcToSol({ amount: transfer.amount, currency: "USDC" }) * 1000000000
        ),
      })
    );

    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    try {
      const signature = await toast.promise(
        sendTransaction(transaction, connection, {
          minContextSlot,
        }),
        {
          loading: "Sending transaction...",
          success: "Transaction sent!",
          error: "Transaction failed",
        }
      );

      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });

      const db = getFirestore(clientApp);
      const transactionCollection = collection(db, "transactions");
      const transactionDoc = doc(transactionCollection, signature);

      const transactionData: TransactionT = {
        amount: transfer.amount,
        recipient: transfer.recipient,
        sender: transfer.sender,
        timestamp: Date.now(),
        status: "completed",
        type: "direct",
      };

      await setDoc(transactionDoc, transactionData);

      setInputValue("");
      setTransfer(null);
      setCurrentAction({ action: null, confirmed: false });
    } catch (error) {}
  };

  const makeInvoice = async () => {
    if (invoice && invoice.sender && invoice.recipient) {
      const db = getFirestore(clientApp);

      const transactionCollection = collection(db, "transactions");
      const transactionDoc = doc(transactionCollection);

      await toast.promise(setDoc(transactionDoc, invoice), {
        error: "Failed to make the invoice",
        loading: "Creating invoice",
        success: "Invoice created!",
      });
    }
  };

  const actionParsing: Record<action, (s: string, u: UserT) => unknown> = {
    transfer: (s, u) => {
      const amount = parseFloat(s.match(/(\d+)/)?.[0] || "0");
      const recipientMatches = s.match(/to (\w+)/g);
      const recipientName = recipientMatches?.[
        recipientMatches.length - 1
      ]?.replace("to ", "");

      const transfer: TransactionT = {
        amount,
        sender: {
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          publicKey: u.publicKey,
          photoURL: u.photoURL,
        },
        timestamp: 0,
        status: "pending",
        type: "direct",
      };

      setTransfer(transfer);

      if (recipientName) {
        const recipient = u.contacts.find((c) => {
          const foundName = c.displayName
            .toLowerCase()
            .includes(recipientName.toLowerCase());

          const emailUsername = c.email.split("@")[0];
          let foundEmail = false;

          if (emailUsername) {
            foundEmail = emailUsername
              .toLowerCase()
              .includes(recipientName.toLowerCase());
          }

          return foundName || foundEmail;
        });

        setTransfer({ ...transfer, recipient });
      }
    },
    addContact: () => {
      return null;
    },
    checkBalance: () => {
      return null;
    },
    createInvoice: (s, u) => {
      setInvoice({
        amount: 0,
        recipient: {
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          publicKey: u.publicKey,
          uid: u.uid,
        },
        sender: undefined,
        status: "pending",
        timestamp: Date.now(),
        type: "request",
      });
    },
    splitBill: () => {
      return null;
    },
  };

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {!loading && user && (
        <div
          className="min-h-screen"
          style={{
            backgroundColor: "#5df1b3",
            backgroundImage:
              "linear-gradient(55deg, #5df1b3 0%, #5df1b3 22%, #6cbefe 49%, #008fff 75%)",
          }}
        >
          <div className="flex min-h-screen w-full flex-col items-center space-y-10 bg-white/[0.35]">
            <h1 className="max-w-md pt-24 text-center text-5xl font-semibold leading-[125%] tracking-wide text-prussian-blue">
              What do you want to do?
            </h1>
            <div className="w-full px-8">
              <input
                placeholder="Type your command here"
                className="w-full rounded-full px-6 py-4 focus:outline-none"
                value={inputValue}
                onChange={(e) => {
                  const action = defineAction(e.target.value);

                  if (action) {
                    actionParsing[action]?.(e.target.value, user);
                    setCurrentAction({
                      ...currentAction,
                      action: action,
                    });
                  } else {
                    setCurrentAction({ ...currentAction, action: null });
                  }

                  setInputValue(e.target.value);
                }}
              />
              {!currentAction.action && (
                <div className="mt-8 grid grid-cols-3 gap-x-2 ">
                  <div
                    className="flex flex-col items-center justify-center space-y-4 rounded-2xl bg-white px-2 py-8"
                    onClick={() => {
                      setCurrentAction({
                        ...currentAction,
                        action: "transfer",
                      });
                      setInputValue("I want to transfer");
                      actionParsing.transfer("I want to transfer", user);
                    }}
                  >
                    <Image
                      src="/transfer.png"
                      height={100}
                      width={100}
                      alt=""
                    />
                    <p className="text-center text-sm font-medium text-prussian-blue">
                      Transfer money
                    </p>
                  </div>
                  <div
                    className="flex flex-col items-center justify-center space-y-4 rounded-2xl bg-white px-2 py-8"
                    onClick={() => {
                      setCurrentAction({
                        ...currentAction,
                        action: "createInvoice",
                      });
                      setInputValue("I want to receive money");
                      actionParsing.createInvoice(
                        "I want to receive money",
                        user
                      );
                    }}
                  >
                    <Image src="/receive.png" height={100} width={100} alt="" />
                    <p className="text-center text-sm font-medium text-prussian-blue">
                      Receive money
                    </p>
                  </div>
                  <div
                    className="flex flex-col items-center justify-center space-y-4 rounded-2xl bg-white px-2 py-8"
                    onClick={() => {
                      setCurrentAction({
                        ...currentAction,
                        action: "splitBill",
                      });
                      setInputValue("I want to split a bill");
                    }}
                  >
                    <Image src="/split.png" height={100} width={100} alt="" />
                    <p className="text-center text-sm font-medium text-prussian-blue">
                      Split Bills
                    </p>
                  </div>
                </div>
              )}

              {currentAction.action && (
                <div className="flex flex-col space-y-4 pt-4">
                  {/* <p className="bg-red-400">
                    Is this what you want to do? If so please confirm
                  </p>
                  <p className="mt-1 bg-red-400">
                    transaction and if it´s not ask again! :&#41;
                  </p> */}
                  {currentAction.action === "transfer" && transfer && (
                    <div className="overflow-hidden rounded-2xl">
                      <div className="bg-white px-10 py-4">
                        <h2 className="text-center text-xl font-semibold uppercase text-prussian-blue">
                          Transfer
                        </h2>
                      </div>
                      <div className="flex items-center justify-between bg-[#EFEFEF] px-8 py-4">
                        <p className="font-semibold text-prussian-blue">
                          Send money to:
                        </p>

                        <select
                          className="block w-full max-w-[11rem] rounded-full border bg-non-photo-blue px-6 py-2.5 text-left text-sm text-prussian-blue focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                          value={JSON.stringify(transfer.recipient)}
                          onChange={(e) => {
                            if (!(e.target.value === "--SELECT--")) {
                              const contact = JSON.parse(
                                e.target.value
                              ) as UserT;
                              setTransfer({ ...transfer, recipient: contact });
                            }
                          }}
                          defaultValue={"--SELECT--"}
                        >
                          {user.contacts.map((c) => (
                            <option key={c.uid} value={JSON.stringify(c)}>
                              {c.displayName}
                            </option>
                          ))}
                          <option>--SELECT--</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-white px-8 py-4">
                        <p className="font-semibold text-prussian-blue">
                          Amount:
                        </p>
                        <div>
                          <input
                            onChange={(e) => {
                              setTransfer({
                                ...transfer,
                                amount: parseFloat(e.target.value),
                              });
                            }}
                            value={transfer.amount}
                            type="number"
                            className="block w-full max-w-[11rem] rounded-full border bg-non-photo-blue px-6 py-2.5 text-left text-sm text-prussian-blue focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-center bg-[#EFEFEF] px-8 py-4">
                        <button
                          onClick={() => {
                            void makeTransaction();
                          }}
                          className="transform rounded-full bg-gradient-to-l from-ruddy-blue to-pale-azure px-6 py-2.5 text-prussian-blue transition-all hover:scale-105 active:scale-95"
                        >
                          Confirm transaction
                        </button>
                      </div>
                    </div>
                  )}

                  {currentAction.action === "addContact" && (
                    <div className="overflow-hidden rounded-2xl">
                      <div className="bg-white px-10 py-4">
                        <h2 className="text-center text-xl font-semibold uppercase text-prussian-blue">
                          Add Contact
                        </h2>
                      </div>
                      <div className="flex flex-col space-y-2 bg-[#EFEFEF] px-10 pb-6 pt-4">
                        <p className="font-semibold text-prussian-blue">
                          Enter the user&apos;s email:
                        </p>
                        <input
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          className="w-full rounded-xl px-6 py-2 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-center bg-white px-8 py-4">
                        <button
                          onClick={() => {
                            void addContact();
                          }}
                          className="transform rounded-full bg-gradient-to-l from-ruddy-blue to-pale-azure px-6 py-2.5 text-prussian-blue transition-all hover:scale-105 active:scale-95"
                        >
                          Add Contact
                        </button>
                      </div>
                    </div>
                  )}

                  {currentAction.action === "createInvoice" && invoice && (
                    <div className="overflow-hidden rounded-2xl">
                      <div className="bg-white px-10 py-4">
                        <h2 className="text-center text-xl font-semibold uppercase text-prussian-blue">
                          Invoice
                        </h2>
                      </div>
                      <div className="flex items-center justify-between bg-[#EFEFEF] px-8 py-4">
                        <p className="font-semibold text-prussian-blue">
                          Send invoice to:
                        </p>

                        <select
                          className="block w-full max-w-[11rem] rounded-full border bg-non-photo-blue px-6 py-2.5 text-left text-sm text-prussian-blue focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                          value={JSON.stringify(invoice.sender)}
                          onChange={(e) => {
                            if (!(e.target.value === "--SELECT--")) {
                              const contact = JSON.parse(
                                e.target.value
                              ) as UserT;
                              setInvoice({ ...invoice, sender: contact });
                            }
                          }}
                          defaultValue={"--SELECT--"}
                        >
                          {user.contacts.map((c) => (
                            <option key={c.uid} value={JSON.stringify(c)}>
                              {c.displayName}
                            </option>
                          ))}
                          <option>--SELECT--</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-white px-8 py-4">
                        <p className="font-semibold text-prussian-blue">
                          Amount:
                        </p>
                        <div>
                          <input
                            onChange={(e) => {
                              setInvoice({
                                ...invoice,
                                amount: parseFloat(e.target.value),
                              });
                            }}
                            value={invoice.amount}
                            type="number"
                            className="block w-full max-w-[11rem] rounded-full border bg-non-photo-blue px-6 py-2.5 text-left text-sm text-prussian-blue focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-center bg-[#EFEFEF] px-8 py-4">
                        <button
                          onClick={() => {
                            void makeInvoice();
                          }}
                          className="transform rounded-full bg-gradient-to-l from-ruddy-blue to-pale-azure px-6 py-2.5 text-prussian-blue transition-all hover:scale-105 active:scale-95"
                        >
                          Send Invoice
                        </button>
                      </div>
                    </div>
                  )}
                  {currentAction.action === "checkBalance" && (
                    <div>Balance UI</div>
                  )}
                  {currentAction.action === "splitBill" && (
                    <div className="flex items-center justify-center">
                      <picture>
                        <img src="/split.svg" alt="" className="max-w-sm" />
                      </picture>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="fixed bottom-0 flex w-full justify-around bg-white py-4 shadow-inner">
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
          <Toaster position="top-right" reverseOrder={false} />
        </div>
      )}
    </>
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

export default Home;
