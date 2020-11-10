import React from 'react';
// import { useResource } from './hooks/useResource';
// import { KiipServerClient } from './kiip/KiipServerClient';

// type Props = {
//   server: string;
//   token: string;
//   docId: string;
// };

export function DocumentDetails() {
  return <div>TODO</div>;
  // const fetchDocument = useCallback(async () => {
  //   const client = new KiipServerClient(server);
  //   return client.getDocument(token, docId);
  // }, [docId, server, token]);

  // const docRes = useResource({
  //   name: 'Document',
  //   fetchData: fetchDocument,
  //   initialRequested: true,
  // });

  // const doc = docRes.dataOrNull;

  // console.log(doc);

  // if (docRes.pending) {
  //   return <div>Loading...</div>;
  // }

  // if (doc === null) {
  //   return <div>Error</div>;
  // }

  // return (
  //   <div>
  //     <h3>{doc.title}</h3>
  //     <pre>{JSON.stringify(doc.access, null, 2)}</pre>
  //   </div>
  // );
}
