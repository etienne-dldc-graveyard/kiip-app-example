export type Documents = Array<{ id: string }>;

export type Access = 'Owner' | 'Editor';

export type Document = {
  id: string;
  title: string;
  access: { [email: string]: Access };
};

export class KiipServerClient {
  readonly url: string;

  constructor(url: string) {
    this.url = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  async home(): Promise<void> {
    const res = await fetch(`${this.url}/`);
    if (res.status !== 200) {
      throw new Error('Fail');
    }
    return;
  }

  async requestLogin(email: string): Promise<string> {
    const res = await fetch(`${this.url}/request-login`, {
      method: 'post',
      body: JSON.stringify({ email }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (res.status !== 200) {
      throw new Error('Fail');
    }
    const data: { loginId: string } = await res.json();
    return data.loginId;
  }

  async validateLogin(email: string, loginId: string, loginCode: string): Promise<string> {
    const res = await fetch(`${this.url}/validate-login`, {
      method: 'post',
      body: JSON.stringify({ email, loginId, loginCode }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (res.status !== 200) {
      throw new Error('Fail');
    }
    const data: { token: string } = await res.json();
    return data.token;
  }

  async getDocuments(token: string): Promise<Documents> {
    const res = await fetch(`${this.url}/validate-login`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status !== 200) {
      throw new Error('Fail');
    }
    return await res.json();
  }

  async createDocument(token: string, title: string): Promise<void> {
    const res = await fetch(`${this.url}/create-document`, {
      method: 'post',
      body: JSON.stringify({ title }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(res.status);
  }
}
