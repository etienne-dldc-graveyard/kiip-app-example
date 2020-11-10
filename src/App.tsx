import React, { useState } from 'react';
import { KiipServerClient } from './kiip/KiipServerClient';
import { Connected } from './Connected';

// const client = new KiipServerClient(`http://localhost:3020`);

// client.requestLogin('e.deladonchamps@gmail.com');

function App() {
  const [serverUrl, setServerUrl] = useState(`ws://localhost:3020`);
  const [client, setClient] = useState<KiipServerClient | null>(null);

  // const [loginId, setLoginId] = useState<string | null>(null);
  // const [email, setEmail] = useState<string>('e.deladonchamps@gmail.com');
  // const [loginCode, setLoginCode] = useState<string>('');
  // const [token, setToken] = useState<string | null>(null);

  return (
    <div className="App">
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

  // return (
  //   <div className="App">
  //     <div>
  //       <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
  //       <button
  //         onClick={async () => {
  //           const client = new KiipServerClient(serverUrl);
  //           await client.home();
  //           console.log('OK');
  //         }}
  //       >
  //         Test
  //       </button>
  //     </div>
  //     <div>
  //       <input value={email} onChange={(e) => setEmail(e.target.value)} />
  //       <button
  //         onClick={async () => {
  //           const client = new KiipServerClient(serverUrl);
  //           const res = await client.requestLogin(email);
  //           setLoginId(res);
  //         }}
  //       >
  //         Login
  //       </button>
  //     </div>
  //     {loginId && (
  //       <div>
  //         <input value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
  //         <button
  //           onClick={async () => {
  //             const client = new KiipServerClient(serverUrl);
  //             const res = await client.validateLogin(email, loginId, loginCode);
  //             console.log(res);
  //             setToken(res);
  //           }}
  //         >
  //           Login
  //         </button>
  //       </div>
  //     )}
  //     {token && <Authenticated token={token} server={serverUrl} />}
  //   </div>
  // );
}

export default App;
