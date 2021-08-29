import React, { useState } from "react";
import { KiipServerClient } from "../kiip/KiipServerClient";
import { Connected } from "./Connected";
import { Master } from "../kiip/Master";
import { useStore } from "../hooks/useStore";

const mutex = new Master();

console.log(mutex.id);

export const App: React.FC = () => {
  const [serverUrl, setServerUrl] = useState(`ws://localhost:3020`);
  const [client, setClient] = useState<KiipServerClient | null>(null);

  const isMaster = useStore(mutex);

  // useEffect(() => {
  //   let canceled = false;
  //   mutex.lock().then(() => {
  //     if (!canceled) {
  //       setIsMain(true);
  //     }
  //   });
  //   return () => {
  //     canceled = true;
  //   };
  // }, []);

  return (
    <div className="App">
      <div>Is Main: {isMaster ? "True" : "False"}</div>
      <div>
        <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
        <button
          onClick={() => {
            setClient(new KiipServerClient(serverUrl));
          }}
        >
          Connect
        </button>
      </div>
      {client && <Connected client={client} />}
    </div>
  );
};
