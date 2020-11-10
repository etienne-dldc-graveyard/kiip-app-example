import React, { useLayoutEffect, useState } from 'react';
import { KiipServerClient } from './kiip/KiipServerClient';

type Props = {
  client: KiipServerClient;
};

export function Connected({ client }: Props) {
  const [state, setState] = useState(client.state);
  const [email, setEmail] = useState('e.deladonchamps@gmail.com');

  useLayoutEffect(() => {
    return client.onStateChange(setState);
  }, [client]);

  return (
    <div>
      <pre>{JSON.stringify(state, null, 2)}</pre>
      {state.type === 'Connected' && (
        <div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <button
            onClick={() => {
              client.login(email);
            }}
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
}
