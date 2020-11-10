import React from 'react';
// import { KiipServerClient } from './kiip/KiipServerClient';
// import { useResource } from './hooks/useResource';
// import { DocumentDetails } from './DocumentDetails';

// type Props = {
//   server: string;
//   token: string;
// };

export function Authenticated() {
  return <div>TODO</div>;
  // const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  // const [newDocTitle, setNewDocTitle] = useState<string>('');

  // const fetchDocuments = useCallback(async () => {
  //   const client = new KiipServerClient(server);
  //   return client.getDocuments(token);
  // }, [server, token]);

  // const documentsRes = useResource({
  //   name: 'Documents',
  //   fetchData: fetchDocuments,
  //   initialRequested: true,
  // });

  // const documents = documentsRes.dataOrNull;

  // console.log(documents);

  // return (
  //   <div>
  //     {documents ? (
  //       <div>
  //         <h3>Documents</h3>
  //         <ul>
  //           {documents.map((doc) => (
  //             <li
  //               key={doc.id}
  //               onClick={() => {
  //                 setSelectedDocId(doc.id);
  //               }}
  //             >
  //               {doc.title} ({doc.access})
  //             </li>
  //           ))}
  //         </ul>
  //       </div>
  //     ) : (
  //       <h3>No documents</h3>
  //     )}
  //     <div>
  //       <h3>New Document</h3>
  //       <input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} />
  //       <button
  //         onClick={async () => {
  //           const client = new KiipServerClient(server);
  //           const doc = await client.createDocument(token, newDocTitle);
  //           console.log(doc);
  //           setNewDocTitle('');
  //           documentsRes.outdate();
  //         }}
  //       >
  //         Create
  //       </button>
  //     </div>
  //     {selectedDocId && (
  //       <DocumentDetails server={server} token={token} docId={selectedDocId} key={selectedDocId} />
  //     )}
  //   </div>
  // );
}
