import React, { useState } from "react";
import { useDynamicStore, useStore } from "../hooks/useStore";
import { KiipServerClient } from "../kiip/KiipServerClient";

type Props = {
  client: KiipServerClient;
};

export function Connected({ client }: Props) {
  const [email, setEmail] = useState("e.deladonchamps@gmail.com");
  const [code, setCode] = useState("");

  const state = useStore(client);

  const connectedState = useDynamicStore(state.type === "Connected" ? state.machine : null);

  return (
    <div>
      {state.type === "Connected" && (
        <div>
          <pre>{JSON.stringify(connectedState, null, 2)}</pre>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <button
            onClick={() => {
              client.login(email);
            }}
          >
            Login
          </button>
          {connectedState && connectedState.type === "WaitingForLoginCode" && (
            <div>
              <input value={code} onChange={(e) => setCode(e.target.value)} />
              <button
                onClick={() => {
                  client.sendLoginCode(code);
                }}
              >
                Login
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
