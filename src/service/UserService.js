export class UserService {
  baseUrl = "http://localhost:3000/api";

  async getUsers(limit = 100) {
    const response = await fetch(`${this.baseUrl}/users?limit=${limit}`);
    return await response.json();
  }

  async getUserById(userId) {
    const response = await fetch(`${this.baseUrl}/users/${userId}`);
    return await response.json();
  }

  async getUsersWithHistory() {
    const response = await fetch(`${this.baseUrl}/users/with-history`);
    return await response.json();
  }

  async createUser({ name, age }) {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Falha ao criar usuário (${response.status}): ${text}`);
    }

    return await response.json();
  }
  async getUserHistory(userId) {
    const response = await fetch(`${this.baseUrl}/users/${userId}/history`);
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  }

  async findUserByName(name) {
    const response = await fetch(
      `${this.baseUrl}/users/by-name?name=${encodeURIComponent(name)}`,
    );
    if (!response.ok) return null;
    return await response.json();
  }
}
