import React, { useCallback, useState } from 'react';
import { KiipServerClient } from './kiip/KiipServerClient';
import { useResource } from './hooks/useResource';

type Props = {
  server: string;
  token: string;
};

export function Authenticated({ token, server }: Props) {
  // const [documents, setDocuments] = useState<Documents | null>(null);
  const [newDocTitle, setNewDocTitle] = useState<string>('');

  const fetchDocuments = useCallback(async () => {
    const client = new KiipServerClient(server);
    return client.getDocuments(token);
  }, [server, token]);

  const documentsRes = useResource({
    name: 'Documents',
    fetchData: fetchDocuments,
    initialRequested: true,
  });

  const documents = documentsRes.dataOrNull;

  console.log(documents);

  return (
    <div>
      {documents ? (
        <div>
          <h3>Documents</h3>
          <ul>
            {documents.map((doc) => (
              <li key={doc.id}>{doc.id}</li>
            ))}
          </ul>
        </div>
      ) : (
        <h3>No documents</h3>
      )}
      <div>
        <h3>New Document</h3>
        <input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} />
        <button
          onClick={async () => {
            const client = new KiipServerClient(server);
            const doc = await client.createDocument(token, newDocTitle);
            console.log(doc);
            setNewDocTitle('');
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}
