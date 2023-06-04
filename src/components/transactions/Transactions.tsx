import { getFirestore, or } from "firebase/firestore";
import { collection, orderBy, query, where } from "firebase/firestore";
import React, { useEffect } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { type TransactionT } from "~/pages";
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
              <div key={tr.timestamp} className="bg-white">
                <picture>
                  <img src={tr.sender.photoURL} alt="" />
                </picture>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Transactions;
