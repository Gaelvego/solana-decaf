import { getFirestore, or } from "firebase/firestore";
import { collection, orderBy, query, where } from "firebase/firestore";
import React from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { type TransactionT } from "~/pages";
import { USDollar } from "~/pages/account";
import { clientApp } from "~/utils/firebase/app";
import { type UserT } from "~/utils/firebase/auth";

interface TransactionsProps {
  children?: React.ReactNode;
  user: UserT;
}

const Transactions: React.FC<TransactionsProps> = ({ user }) => {
  const db = getFirestore(clientApp);

  const [recipientTransactions, recipientTransactionsLoading] =
    useCollectionData(
      query(
        collection(db, "transactions"),
        or(
          where("sender.uid", "==", user.uid),
          where("recipient.uid", "==", user.uid)
        ),
        orderBy("timestamp", "desc")
      )
    );

  return (
    <div>
      {!recipientTransactionsLoading && recipientTransactions && (
        <div className="flex flex-col space-y-4">
          {recipientTransactions.map((t) => {
            const tr = t as TransactionT;
            return (
              <div
                key={tr.timestamp}
                className="flex items-center justify-between space-x-4 rounded-2xl bg-white p-4 text-prussian-blue"
              >
                <div className="flex items-center space-x-4">
                  <picture>
                    <img
                      className="h-16 w-16 overflow-hidden rounded-full"
                      src={tr.sender?.photoURL}
                      alt=""
                    />
                  </picture>
                  <div>
                    <p className="text-xl">{tr.sender?.displayName}</p>
                    {/* Date in format: 4 Jan 2023 - 5:40 PM  */}
                    <p className="text-xs">
                      {new Date(tr.timestamp).toDateString().slice(4)} -{" "}
                      {new Date(tr.timestamp).toTimeString().split(" ")[0]}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-right">
                    {user.uid == tr.sender?.uid ? "-" : "+"}
                    {USDollar.format(tr.amount)} USDC
                  </p>
                  <p className="text-right text-xs">
                    {user.uid == tr.sender?.uid ? "Transfered" : "Received"}{" "}
                    {tr.type == "bill_split" && "- bill split"}
                    {tr.type == "request" && "- invoice"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Transactions;
